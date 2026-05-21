process.env.NAVER_CLIENT_ID = 'lfuxCOrUModFcHr4cmpZ'
process.env.NAVER_CLIENT_SECRET = 'ZH2iutlcLE'

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
const { chromium } = require('playwright')

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

app.get('/analyze-top-posts', async (req, res) => {
  const keyword = req.query.keyword
  if (!keyword) return res.json({ error: '키워드 없음' })

  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(`https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)

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

    console.log('스마트블록:', searchData.smartBlocks.map(b => `${b.blockName}(${b.links.length}개)`))

    // 제목은 9개 전부 수집
    const allTitles = []
    searchData.smartBlocks.forEach(block => {
      block.links.forEach(link => {
        allTitles.push({ title: link.title, blockName: block.blockName, type: link.type })
      })
    })

    // 본문은 스마트블록별 대표 글 1개씩만 (총 3개)
    const representativeLinks = searchData.smartBlocks.map(block => ({
      ...block.links[0],
      blockName: block.blockName
    })).filter(link => link && link.href)

    const posts = []
    for (const link of representativeLinks) {
      if (!link.href) continue
      try {
        await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(3000)

        const iframeSrc = await page.evaluate(() => {
          const iframe = document.querySelector('iframe#mainFrame')
          return iframe ? iframe.src : null
        })

        if (iframeSrc) {
          await page.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 15000 })
          await page.waitForTimeout(2000)
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
          // SE3 본문 이미지만 카운트 (가장 정확)
          let imageEls = Array.from(content.querySelectorAll(
            '.se-component.se-image img, .se-imageStrip img'
          ))
          // SE3 선택자가 없으면 postfiles CDN URL 기준 fallback
          if (imageEls.length === 0) {
            imageEls = Array.from(content.querySelectorAll('img')).filter(img => {
              const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || ''
              return /postfiles\.pstatic\.net|blogfiles\.naver\.net/i.test(src) &&
                     !/icon|emoji|sticker|emoticon|profile/i.test(src)
            })
          }
          // 중복 src 제거
          const uniqueSrcs = new Set(imageEls.map(img =>
            img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || img.src || ''
          ).filter(Boolean))
          const images = { length: uniqueSrcs.size }
          // 소제목 추출: CSS 헤딩 우선, 없으면 숫자형(1. 제목) 패턴 fallback
          const headingEls = Array.from(content.querySelectorAll([
            '.se-component.se-heading',
            '.se-l-heading1', '.se-l-heading2', '.se-l-heading3',
            '.se-heading2', '.se-heading3',
            '.htitle', '.pcol2',
            'h2', 'h3',
          ].join(', ')))
          let headingTexts = headingEls.map(el => el.textContent?.trim()).filter(t => t && t.length > 0)

          if (headingTexts.length === 0) {
            // 숫자형 소제목 패턴 추출: "1. 외관", "2. 메뉴" 등
            const numbered = (text.match(/(?:^|\n)[ \t]*(\d+\.\s+[^\n]{2,40})/gm) || [])
              .map(m => m.trim()).filter(Boolean)
            headingTexts = numbered
          }
          const headings = { length: headingTexts.length }

          // 해시태그 추출 (SE3 셀렉터 우선, fallback 정규식)
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
            charCount: text.replace(/\s/g, '').length,
            imageCount: images.length,
            headingCount: headings.length,
            headingTexts: headingTexts.slice(0, 10),
            hashtags,
            fullText: text,
            preview: text.slice(0, 300).trim()
          }
        })

        // 해시태그 후처리: 조사 제거 + 의미없는 단어 필터
        postData.hashtags = cleanHashtags(postData.hashtags || [])
        posts.push({ title: link.title, url: link.href, type: link.type, blockName: link.blockName, ...postData })
        console.log(`완료: ${link.href.slice(0, 60)} | 글자:${postData.charCount} 이미지:${postData.imageCount}`)
      } catch (e) {
        console.log('실패:', e.message)
      }
    }

    await browser.close()

    const average = posts.length > 0 ? {
      charCount: Math.round(posts.reduce((s, p) => s + (p.charCount || 0), 0) / posts.length),
      imageCount: Math.round(posts.reduce((s, p) => s + (p.imageCount || 0), 0) / posts.length),
      headingCount: Math.round(posts.reduce((s, p) => s + (p.headingCount || 0), 0) / posts.length),
    } : null

    // 해시태그 빈도 집계
    const hashtagFreq = {}
    posts.forEach(p => {
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
      posts,
      average,
      topHashtags
    })

  } catch (e) {
    if (browser) await browser.close()
    res.json({ keyword, posts: [], allTitles: [], average: null, error: e.message })
  }
})

app.get('/extract-place', async (req, res) => {
  let targetUrl = req.query.url
  if (!targetUrl) return res.json({ error: 'URL 없음' })

  // 플레이스 ID 추출 → pcmap URL로 변환 (더 안정적인 스크래핑)
  const placeIdMatch = targetUrl.match(/place\/(\d+)/)
  if (placeIdMatch) {
    targetUrl = `https://pcmap.place.naver.com/place/${placeIdMatch[1]}/home`
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(2000)

    const data = await page.evaluate(() => {
      const getText = (...selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          const t = el?.textContent?.trim()
          if (t) return t
        }
        return ''
      }

      const name = getText(
        'span.GHAhO',
        '.zD5Nm span',
        '.Fc1rA span',
        'h2.place_section_header_title',
      )
      const category = getText('span.lnJFt', '.DJJvD', '.category_name')
      const address = getText('span.LDgIH', '.zDTQ span', '.addr span')
      const phone = getText('span.xlx3J', '.fvwqf span', 'a[href^="tel:"]')
      const hours = getText('.y6tNq', '.O8qbU', '[class*="businessHour"] span')

      const menuEls = document.querySelectorAll(
        '.MXkFw li .name, [class*="menuItem"] .name, .lwo7m .name, .tByHM'
      )
      const menuItems = Array.from(menuEls)
        .slice(0, 8)
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length < 80)

      return { name, category, address, phone, hours, menuItems }
    })

    await browser.close()

    if (!data.name) {
      return res.json({ error: '가게 정보를 찾지 못했습니다. 네이버 플레이스 URL인지 확인해주세요.' })
    }

    const lines = []
    if (data.name) lines.push(`가게명: ${data.name}`)
    if (data.category) lines.push(`카테고리: ${data.category}`)
    if (data.address) lines.push(`주소: ${data.address}`)
    if (data.phone) lines.push(`전화: ${data.phone}`)
    if (data.hours) lines.push(`영업시간: ${data.hours}`)
    if (data.menuItems.length > 0) lines.push(`메뉴: ${data.menuItems.join(', ')}`)

    res.json({ success: true, ...data, formatted: lines.join('\n') })
  } catch (e) {
    if (browser) await browser.close()
    res.json({ error: e.message })
  }
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Crawler running on port ${PORT}`))