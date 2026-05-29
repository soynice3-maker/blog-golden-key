require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { chromium } = require('playwright')
const express = require('express')

const HASHTAG_STOPS = new Set([
  '저는','제가','저도','나는','나도','내가','우리가','우리는',
  '이건','그건','이게','그게','여기','저기','거기',
  '이렇게','저렇게','그렇게','이런','그런','저런',
  '그런데','하지만','그리고','그래서','그래도','하지만',
  '있는데','있어요','없어요','합니다','됩니다','입니다','이에요','예요',
  '했는데','이라고','이라서','이어서','이었','였는데',
  '오늘은','오늘도','이번에','지난번','어제는',
  '정말로','너무나','진짜로','너무','정말','진짜',
  '여러분','모두들','다들',
])

function stripKoreanParticle(word) {
  if (word.length < 3) return word
  const two = ['에서','이에','에게','으로','이라','이고','이며','이나','이랑','이랑']
  const one = ['이','가','은','는','을','를','의','도','로','에']
  for (const e of two) {
    if (word.endsWith(e) && word.length > e.length + 1) return word.slice(0, -e.length)
  }
  for (const e of one) {
    if (word.endsWith(e) && word.length >= 3) return word.slice(0, -1)
  }
  return word
}

function cleanHashtags(tags) {
  return [...new Set(
    tags
      .map(t => stripKoreanParticle(t.trim()))
      .filter(t => t.length >= 2 && !HASHTAG_STOPS.has(t))
  )]
}

// 간단한 인메모리 캐시: key → { data, expiresAt }
const crawlCache = new Map()
const TTL_SHORTENTS = 4 * 60 * 60 * 1000  // 4시간
const TTL_NEWS      = 1 * 60 * 60 * 1000  // 1시간

function getCached(key) {
  const entry = crawlCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { crawlCache.delete(key); return null }
  return entry.data
}
function setCached(key, data, ttl) {
  crawlCache.set(key, { data, expiresAt: Date.now() + ttl })
}

// Browser pool
const POOL_SIZE = parseInt(process.env.POOL_SIZE || '4')

const browserPool = {
  browsers: [],
  available: [],
  queue: [],

  async init() {
    console.log(`브라우저 풀 초기화 중... (${POOL_SIZE}개) - 잠시 기다려주세요`)
    for (let i = 0; i < POOL_SIZE; i++) {
      console.log(`  브라우저 ${i + 1}/${POOL_SIZE} 시작 중...`)
      const browser = await this._launch()
      this.browsers.push(browser)
      this.available.push(browser)
      console.log(`  브라우저 ${i + 1}/${POOL_SIZE} 완료`)
    }
    console.log('브라우저 풀 준비 완료')
  },

  _launch() {
    return chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  },

  acquire() {
    return new Promise(resolve => {
      if (this.available.length > 0) {
        resolve(this.available.pop())
      } else {
        this.queue.push(resolve)
      }
    })
  },

  async release(browser, crashed = false) {
    let next = browser
    if (crashed) {
      this.browsers = this.browsers.filter(b => b !== browser)
      try { await browser.close() } catch {}
      next = await this._launch()
      this.browsers.push(next)
    }
    if (this.queue.length > 0) {
      this.queue.shift()(next)
    } else {
      this.available.push(next)
    }
  },
}

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.get('/blog-count', async (req, res) => {
  const keyword = req.query.keyword
  if (!keyword) return res.json({ count: 0 })
  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=1&sort=sim`,
      { headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET } }
    )
    const data = await response.json()
    res.json({ keyword, count: data.total || 0 })
  } catch (e) {
    res.json({ keyword, count: 0, error: e.message })
  }
})

app.post('/blog-counts', async (req, res) => {
  const { keywords } = req.body
  if (!keywords || !keywords.length) return res.json([])
  try {
    const results = []
    for (const keyword of keywords) {
      try {
        const response = await fetch(
          `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=1&sort=sim`,
          { headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET } }
        )
        const data = await response.json()
        results.push({ keyword, blogCount: data.total || 0 })
        await new Promise(r => setTimeout(r, 100))
      } catch {
        results.push({ keyword, blogCount: 0 })
      }
    }
    res.json(results)
  } catch (e) {
    res.json({ error: e.message })
  }
})

async function scrapePost(context, link) {
  const page = await context.newPage()
  try {
    await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 })

    try {
      await page.waitForSelector('iframe#mainFrame, .se-main-container, #postViewArea', { timeout: 4000 })
    } catch {
      await page.waitForTimeout(1500)
    }

    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe#mainFrame')
      return iframe ? iframe.src : null
    })

    if (iframeSrc) {
      await page.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 15000 })
      try {
        await page.waitForSelector('.se-main-container, #postViewArea, .post-view', { timeout: 4000 })
      } catch {
        await page.waitForTimeout(1500)
      }
    }

    const postData = await page.evaluate(() => {
      const selectors = ['.se-main-container', '#postViewArea', '.post-view', '.blog_body']
      let content = null
      for (const sel of selectors) {
        content = document.querySelector(sel)
        if (content) break
      }
      if (!content) content = document.body

      const text = content.innerText || ''

      let imageEls = Array.from(content.querySelectorAll(
        '.se-component.se-image img, .se-imageStrip img'
      ))
      if (imageEls.length === 0) {
        imageEls = Array.from(content.querySelectorAll('img')).filter(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || ''
          return /postfiles\.pstatic\.net|blogfiles\.naver\.net/i.test(src) &&
                 !/icon|emoji|sticker|emoticon|profile/i.test(src)
        })
      }
      const uniqueSrcs = new Set(imageEls.map(img =>
        img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || img.src || ''
      ).filter(Boolean))

      const headingEls = Array.from(content.querySelectorAll([
        '.se-quotation-container',
        '.se-component.se-heading',
        '.se-l-heading1', '.se-l-heading2', '.se-l-heading3',
        '.se-heading2', '.se-heading3',
        '.htitle', '.pcol2',
        'h2', 'h3',
      ].join(', ')))
      let headingTexts = headingEls.map(el => el.textContent?.trim()).filter(t => t && t.length > 0)

      if (headingTexts.length === 0) {
        const numbered = (text.match(/(?:^|\n)[ \t]*(\d+\.\s+[^\n]{2,40})/gm) || [])
          .map(m => m.trim()).filter(Boolean)
        headingTexts = numbered
      }

      const videoEls = Array.from(content.querySelectorAll(
        'video, iframe[src*="tv.naver"], iframe[src*="youtube.com"], iframe[src*="youtu.be"], iframe[src*="naver.me"]'
      ))
      const videoCount = videoEls.length

      const hashEls = Array.from(content.querySelectorAll(
        '.se-component.se-hash .se-hash-item a, .se-hashtag a, .se-hash-link'
      ))
      let hashtags = hashEls
        .map(el => el.textContent?.trim().replace(/^#/, '').trim())
        .filter(t => t && t.length >= 2)
      if (hashtags.length === 0) {
        const hashMatches = text.match(/#([가-힣a-zA-Z0-9_]{2,20})/g) || []
        hashtags = hashMatches.map(h => h.replace(/^#/, ''))
      }
      hashtags = [...new Set(hashtags.flatMap(t => t.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)))]

      return {
        charCount: text.replace(/#[가-힣a-zA-Z0-9_]{2,20}/g, '').replace(/\s/g, '').length,
        imageCount: uniqueSrcs.size,
        videoCount,
        headingCount: headingTexts.length,
        headingTexts: headingTexts.slice(0, 10),
        hashtags,
        fullText: text,
        preview: text.slice(0, 300).trim()
      }
    })

    postData.hashtags = cleanHashtags(postData.hashtags || [])
    console.log(`완료: ${link.href.slice(0, 60)} | 글자:${postData.charCount} 이미지:${postData.imageCount}`)
    return { title: link.title, url: link.href, type: link.type, blockName: link.blockName, ...postData }
  } catch (e) {
    console.log('포스트 실패:', e.message)
    return { title: link.title, url: link.href, type: link.type, blockName: link.blockName, error: e.message }
  } finally {
    await page.close()
  }
}

app.get('/analyze-top-posts', async (req, res) => {
  const keyword = req.query.keyword
  if (!keyword) return res.json({ error: '키워드 없음' })

  const browser = await browserPool.acquire()
  let context
  let crashed = false

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(
      `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    )

    try {
      await page.waitForSelector('h2.sds-comps-text, #main_pack', { timeout: 5000 })
    } catch {
      await page.waitForTimeout(2000)
    }

    const searchData = await page.evaluate(() => {
      const results = { smartBlocks: [], regularLinks: [] }

      const isRealPost = (href) => {
        if (/blog\.naver\.com\/[^/?]+\/\d+/.test(href)) return true
        if (/in\.naver\.com\/[^/?]+\/contents\/internal\/\d+/.test(href)) return true
        return false
      }

      const blockTitles = document.querySelectorAll('h2.sds-comps-text')
      blockTitles.forEach(titleEl => {
        const blockName = titleEl.textContent?.trim()
        if (!blockName) return
        if (blockName.includes('클립') || blockName.includes('Clip')) return

        let container = titleEl.parentElement
        for (let i = 0; i < 4; i++) {
          if (!container) break
          container = container.parentElement
        }
        if (!container) return

        const seen = new Set()
        const links = Array.from(container.querySelectorAll('a'))
          .filter(a => isRealPost(a.href))
          .filter(a => {
            if (seen.has(a.href)) return false
            seen.add(a.href)
            return true
          })
          .slice(0, 3)
          .map(a => ({
            title: a.getAttribute('title') || a.textContent?.trim().slice(0, 100),
            href: a.href,
            type: a.href.includes('in.naver.com') ? 'influencer' : 'blog'
          }))

        if (links.length > 0) {
          results.smartBlocks.push({ blockName, links })
        }
      })

      if (results.smartBlocks.length === 0) {
        const allLinks = Array.from(document.querySelectorAll('a'))
        const seen = new Set()
        results.regularLinks = allLinks
          .filter(a => isRealPost(a.href))
          .filter(a => {
            if (seen.has(a.href)) return false
            seen.add(a.href)
            return true
          })
          .slice(0, 3)
          .map(a => ({
            title: a.textContent?.trim().slice(0, 100),
            href: a.href,
            type: a.href.includes('in.naver.com') ? 'influencer' : 'blog'
          }))
      }

      return results
    })

    await page.close()
    console.log('스마트블록:', searchData.smartBlocks.map(b => `${b.blockName}(${b.links.length}개)`))

    const allTitles = []
    searchData.smartBlocks.forEach(block => {
      block.links.forEach(link => {
        allTitles.push({ title: link.title, blockName: block.blockName, type: link.type })
      })
    })

    const representativeLinks = searchData.smartBlocks
      .map(block => ({ ...block.links[0], blockName: block.blockName }))
      .filter(link => link && link.href)

    // 병렬 크롤링
    const posts = await Promise.all(representativeLinks.map(link => scrapePost(context, link)))
    const validPosts = posts.filter(p => !p.error)

    await context.close()

    const average = validPosts.length > 0 ? {
      charCount: Math.round(validPosts.reduce((s, p) => s + (p.charCount || 0), 0) / validPosts.length),
      imageCount: Math.round(validPosts.reduce((s, p) => s + (p.imageCount || 0), 0) / validPosts.length),
      videoCount: Math.round(validPosts.reduce((s, p) => s + (p.videoCount || 0), 0) / validPosts.length),
      headingCount: Math.round(validPosts.reduce((s, p) => s + (p.headingCount || 0), 0) / validPosts.length),
    } : null

    const hashtagFreq = {}
    validPosts.forEach(p => {
      (p.hashtags || []).forEach(tag => {
        hashtagFreq[tag] = (hashtagFreq[tag] || 0) + 1
      })
    })
    const topHashtags = Object.entries(hashtagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }))

    res.json({
      keyword,
      smartBlocks: searchData.smartBlocks.map(b => b.blockName),
      allTitles,
      posts: validPosts,
      average,
      topHashtags
    })
  } catch (e) {
    crashed = true
    if (context) try { await context.close() } catch {}
    res.json({ keyword, posts: [], allTitles: [], average: null, error: e.message })
  } finally {
    await browserPool.release(browser, crashed)
  }
})

app.get('/top-titles', async (req, res) => {
  const keyword = req.query.keyword
  if (!keyword) return res.json({ error: '키워드 없음' })

  const cached = getCached(`titles:${keyword}`)
  if (cached) return res.json(cached)

  const browser = await browserPool.acquire()
  let context
  let crashed = false

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(
      `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    )

    try {
      await page.waitForSelector('h2.sds-comps-text, #main_pack', { timeout: 5000 })
    } catch {
      await page.waitForTimeout(2000)
    }

    const titles = await page.evaluate(() => {
      const results = []
      const isRealPost = (href) =>
        /blog\.naver\.com\/[^/?]+\/\d+/.test(href) ||
        /in\.naver\.com\/[^/?]+\/contents\/internal\/\d+/.test(href)

      const blockTitles = document.querySelectorAll('h2.sds-comps-text')
      blockTitles.forEach(titleEl => {
        const blockName = titleEl.textContent?.trim()
        if (!blockName) return
        if (blockName.includes('클립') || blockName.includes('Clip')) return

        let container = titleEl.parentElement
        for (let i = 0; i < 4; i++) {
          if (!container) break
          container = container.parentElement
        }
        if (!container) return

        const seen = new Set()
        Array.from(container.querySelectorAll('a'))
          .filter(a => isRealPost(a.href))
          .filter(a => { if (seen.has(a.href)) return false; seen.add(a.href); return true })
          .slice(0, 3)
          .forEach(a => {
            const attrTitle = a.getAttribute('title')?.trim()
            const textTitle = a.textContent?.trim().slice(0, 100)
            const title = attrTitle || (textTitle && !textTitle.includes('›') && !textTitle.includes('.naver.com') && !textTitle.includes('.com') ? textTitle : null)
            if (title) results.push({ title, blockName })
          })
      })

      if (results.length === 0) {
        const seen = new Set()
        Array.from(document.querySelectorAll('a'))
          .filter(a => isRealPost(a.href))
          .filter(a => { if (seen.has(a.href)) return false; seen.add(a.href); return true })
          .slice(0, 5)
          .forEach(a => {
            const attrTitle = a.getAttribute('title')?.trim()
            const textTitle = a.textContent?.trim().slice(0, 100)
            const title = attrTitle || (textTitle && !textTitle.includes('›') && !textTitle.includes('.naver.com') ? textTitle : null)
            if (title) results.push({ title, blockName: 'VIEW' })
          })
      }

      return results
    })

    await context.close()
    const result = { keyword, titles }
    setCached(`titles:${keyword}`, result, TTL_SHORTENTS)
    res.json(result)
  } catch (e) {
    crashed = true
    if (context) try { await context.close() } catch {}
    res.json({ keyword, titles: [], error: e.message })
  } finally {
    await browserPool.release(browser, crashed)
  }
})

app.get('/extract-place', async (req, res) => {
  let targetUrl = req.query.url
  if (!targetUrl) return res.json({ error: 'URL 없음' })

  const placeIdMatch = targetUrl.match(/place\/(\d+)/)
  if (placeIdMatch) {
    targetUrl = `https://pcmap.place.naver.com/place/${placeIdMatch[1]}/home`
  }

  const browser = await browserPool.acquire()
  let context
  let crashed = false

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
    try {
      await page.waitForSelector('span.GHAhO, .zD5Nm span, h2.place_section_header_title', { timeout: 4000 })
    } catch {
      await page.waitForTimeout(2000)
    }

    // 전화번호 보기 버튼 클릭 (Naver Place는 버튼 클릭 후 전화번호 표시)
    try {
      const phoneBtn = page.locator('button').filter({ hasText: /전화/ }).first()
      if (await phoneBtn.count() > 0) {
        await phoneBtn.click()
        await page.waitForTimeout(700)
      }
    } catch {}

    // 영업시간 펼쳐보기 버튼 클릭 (토글 기본값: 닫힘)
    try {
      const expandBtn = page.locator('button').filter({ hasText: '펼쳐보기' }).first()
      if (await expandBtn.count() > 0) {
        await expandBtn.click()
        await page.waitForTimeout(500)
      }
    } catch {}

    const data = await page.evaluate(() => {
      const getText = (...selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          const t = el?.textContent?.trim()
          if (t) return t
        }
        return ''
      }

      const bodyText = document.body.innerText

      const name = getText('span.GHAhO', '.zD5Nm span', '.Fc1rA span', 'h2.place_section_header_title')
      const category = getText('span.lnJFt', '.DJJvD', '.category_name')

      // Phone: tel 링크 href 우선, 없으면 전화번호 패턴으로 폴백
      const telEl = document.querySelector('a[href^="tel:"]')
      let phone = telEl ? (telEl.getAttribute('href') || '').replace('tel:', '').trim() : ''
      if (!phone) {
        const phoneMatch = bodyText.match(/\d{2,4}-\d{3,4}-\d{4}/)
        if (phoneMatch) phone = phoneMatch[0]
      }

      // Address: 셀렉터 시도 후 한국 주소 패턴으로 폴백
      let address = getText('span.LDgIH', '.zDTQ span', '.addr span')
      if (!address) {
        const addrMatch = bodyText.match(/(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{4,60}(?:로|길)\s*\d*(?:-\d+)?/)
        if (addrMatch) address = addrMatch[0].trim()
      }

      // Hours: 펼쳐보기 클릭 후 innerText 기반 추출
      let hours = ''
      for (const sel of ['.y6tNq', '.O8qbU', '[class*="businessHour"]']) {
        const el = document.querySelector(sel)
        if (!el) continue
        let text = el.innerText?.trim() || ''
        // UI 버튼 텍스트 제거
        text = text.replace(/펼쳐보기|접기/g, '')
        // 중복 "XX시 XX분에 라스트오더" 제거
        text = text.replace(/\d+시\s*\d+분에\s*라스트오더\s*/g, '')
        // 한글-숫자 사이 공백 추가
        text = text.replace(/([가-힣])(\d)/g, '$1 $2').replace(/(\d)([가-힣])/g, '$1 $2')
        text = text.replace(/\n{2,}/g, '\n').replace(/[ \t]+/g, ' ').trim()
        if (text) { hours = text; break }
      }
      if (!hours) {
        const m = bodyText.match(/영업\s*(?:중|종료|준비|전)\s*[^\n]{0,40}/)
        if (m) hours = m[0].replace(/펼쳐보기.*$/, '').replace(/\d+시\s*\d+분에\s*라스트오더/g, '').replace(/\s+/g, ' ').trim()
      }

      // Amenities: "편의" 섹션에서 추출
      let amenities = []
      const convMatch = bodyText.match(/\n편의\n([^\n]{2,200})/)
      if (convMatch) {
        amenities = convMatch[1].split(/[,，]/).map(s => s.trim()).filter(t => t.length > 1 && t.length < 30)
      }

      const menuEls = document.querySelectorAll(
        '.MXkFw li .name, [class*="menuItem"] .name, .lwo7m .name, .tByHM'
      )
      const menuItems = Array.from(menuEls)
        .slice(0, 8)
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length < 80)

      return { name, category, address, phone, hours, amenities, menuItems }
    })

    await context.close()

    if (!data.name) {
      return res.json({ error: '가게 정보를 찾지 못했습니다. 네이버 플레이스 URL인지 확인해주세요.' })
    }

    const lines = []
    if (data.name) lines.push(`가게명: ${data.name}`)
    if (data.category) lines.push(`카테고리: ${data.category}`)
    if (data.address) lines.push(`주소: ${data.address}`)
    if (data.phone) lines.push(`전화: ${data.phone}`)
    if (data.hours) lines.push(`영업시간: ${data.hours}`)
    if (data.amenities && data.amenities.length > 0) lines.push(`편의: ${data.amenities.join(', ')}`)
    if (data.menuItems.length > 0) lines.push(`메뉴: ${data.menuItems.join(', ')}`)

    res.json({ success: true, ...data, formatted: lines.join('\n') })
  } catch (e) {
    crashed = true
    if (context) try { await context.close() } catch {}
    res.json({ error: e.message })
  } finally {
    await browserPool.release(browser, crashed)
  }
})

app.get('/shortents', async (req, res) => {
  const query = req.query.query
  if (!query) return res.json({ error: '검색어 없음' })

  const cacheKey = `shortents:${query}`
  const cached = getCached(cacheKey)
  if (cached) {
    console.log(`숏텐츠 캐시 히트 [${query}]`)
    return res.json(cached)
  }

  const browser = await browserPool.acquire()
  let context
  let crashed = false

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    // 숏텐츠 카테고리 탭 browse
    await page.goto(
      `https://search.naver.com/search.naver?category=${encodeURIComponent(query)}&query=%EC%88%8F%ED%85%90%EC%B8%A0&sm=tab_sht.ctg&ssc=tab.shortents.all`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    )

    await page.waitForTimeout(3000)

    const titles = await page.evaluate(() => {
      const seen = new Set()
      const result = []

      const isValidTitle = (t) => {
        if (!t || t.length < 8 || t.length > 42) return false
        if (!(/[가-힣]{2,}/.test(t))) return false
        // 타임스탬프 ("12시간 전", "3일 전" 등)
        if (/^\d+[시일주분]간?\s*전$/.test(t)) return false
        // 종합 카테고리명
        if (/종합$/.test(t)) return false
        // UI 요소
        if (/^(Keep에|내정보|바로가기|로그인|회원가입|저장하기|더보기|접기)/.test(t)) return false
        // 설명문 특징: →, 말줄임, [주석], (주석) 포함
        if (/→|\.{2,}|\[.+\]$|\(.+\)$/.test(t)) return false
        return true
      }

      const tryAdd = (text) => {
        const t = (text || '').replace(/\s+/g, ' ').trim()
        if (isValidTitle(t) && !seen.has(t)) {
          seen.add(t)
          result.push(t)
        }
      }

      const main = document.querySelector('#main_pack') || document.body

      // 1순위: shortents 토픽 카드 제목 (🔍 아이콘과 함께 뜨는 주제 카드)
      const topicSelectors = [
        '[class*="shortents"] [class*="title"]',
        '[class*="clip"] [class*="title"]',
        '[class*="issue"] [class*="title"]',
        '[class*="topic"] [class*="title"]',
        '[class*="sds-comps-text"]',
      ]
      for (const sel of topicSelectors) {
        main.querySelectorAll(sel).forEach(el => {
          if (!el.querySelector('[class*="title"]')) tryAdd(el.textContent)
        })
      }

      // 2순위: a[title] 속성
      if (result.length < 3) {
        main.querySelectorAll('a[title]').forEach(el => tryAdd(el.getAttribute('title')))
      }

      // 3순위: h2/h3 내 텍스트
      if (result.length < 3) {
        main.querySelectorAll('h2, h3').forEach(el => tryAdd(el.textContent))
      }

      // 비슷한 제목 중복 제거 (카드 주제 제목 + 블로그 포스트 제목 쌍 제거)
      const deduped = []
      const dedupedWordSets = []
      for (const t of result) {
        const words = new Set(
          t.replace(/[,!?❣️·\[\]]/g, '').split(/\s+/).filter(w => /[가-힣]{2,}/.test(w))
        )
        let tooSimilar = false
        for (const existing of dedupedWordSets) {
          const overlap = [...words].filter(w => existing.has(w)).length
          if (overlap >= 2 && overlap / Math.min(words.size, existing.size) >= 0.4) {
            tooSimilar = true
            break
          }
        }
        if (!tooSimilar) {
          deduped.push(t)
          dedupedWordSets.push(words)
        }
      }

      return deduped.slice(0, 30)
    })

    await context.close()
    console.log(`숏텐츠 [${query}]: ${titles.length}개 (캐시 저장 4h)`)
    const result = { query, titles }
    setCached(cacheKey, result, TTL_SHORTENTS)
    res.json(result)
  } catch (e) {
    crashed = true
    if (context) try { await context.close() } catch {}
    res.json({ query, titles: [], error: e.message })
  } finally {
    await browserPool.release(browser, crashed)
  }
})

app.get('/news-ranking', async (req, res) => {
  const cached = getCached('news-ranking')
  if (cached) {
    console.log('뉴스랭킹 캐시 히트')
    return res.json(cached)
  }

  const browser = await browserPool.acquire()
  let context
  let crashed = false

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(
      'https://news.naver.com/main/ranking/popularDay.naver',
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    )
    await page.waitForTimeout(2000)

    const items = await page.evaluate(() => {
      const seen = new Set()
      const result = []

      // 뉴스 기사 링크 (news.naver.com/article 또는 n.news.naver.com/article)
      document.querySelectorAll('a').forEach(a => {
        if (!/news\.naver\.com\/article|n\.news\.naver\.com\/article/.test(a.href)) return
        const title = (a.textContent || a.getAttribute('title') || '')
          .replace(/\s+/g, ' ').trim()
        if (title.length >= 8 && title.length <= 80 && /[가-힣]/.test(title) && !seen.has(title)) {
          seen.add(title)
          result.push({ title, url: a.href })
        }
      })

      return result.slice(0, 30)
    })

    await context.close()
    console.log(`뉴스랭킹: ${items.length}개 (캐시 저장 1h)`)
    const result = { items, fetchedAt: new Date().toISOString() }
    setCached('news-ranking', result, TTL_NEWS)
    res.json(result)
  } catch (e) {
    crashed = true
    if (context) try { await context.close() } catch {}
    res.json({ items: [], error: e.message })
  } finally {
    await browserPool.release(browser, crashed)
  }
})

app.get('/health', (req, res) => res.json({
  status: 'ok',
  pool: { size: POOL_SIZE, available: browserPool.available.length, queued: browserPool.queue.length }
}))

const PORT = process.env.PORT || 3001
browserPool.init().then(() => {
  app.listen(PORT, () => console.log(`Crawler running on port ${PORT}`))
})
