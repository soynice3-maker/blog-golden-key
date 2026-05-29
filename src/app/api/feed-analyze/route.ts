import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { queryKeywords } from '@/lib/naver-ad-api'

async function datalabCall(body: object): Promise<any> {
  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function naverSearch(type: 'news' | 'blog', query: string, display = 5): Promise<any> {
  try {
    const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function avgRatio(data: any[] | undefined | null): number {
  if (!data || data.length === 0) return 0
  return data.reduce((s, d) => s + (d.ratio || 0), 0) / data.length
}

function stripHtml(str: string): string {
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '…').replace(/&middot;/g, '·')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
}

function cleanArticleText(text: string): string {
  return text
    .replace(/\[[^\]]{0,30}[ㅣ|│]?[^\]]{0,20}기자[^\]]{0,10}\]/g, '')  // [더팩트ㅣ홍길동 기자]
    .replace(/\([^)]{0,20}기자[^)]{0,10}\)/g, '')                        // (홍길동 기자)
    .replace(/[가-힣a-zA-Z\s]{1,15}\s*기자\s*[=◆▶]/g, '')               // 홍길동 기자 =
    .replace(/^[가-힣a-zA-Z\s]{1,15}\s*기자/gm, '')                      // 줄 시작 "홍길동 기자"
    .replace(/[가-힣a-zA-Z\s]{1,15}\s*기자$/gm, '')                      // 줄 끝 "홍길동 기자"
    .replace(/ⓒ[^\n]*/g, '')                                             // ⓒ 저작권 표시
    .replace(/©[^\n]*/g, '')
    .replace(/무단\s*전재[^\n]*/g, '')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function extractDicArea(html: string): string {
  const marker = 'id="dic_area"'
  const startIdx = html.indexOf(marker)
  if (startIdx < 0) return ''
  const openEnd = html.indexOf('>', startIdx)
  if (openEnd < 0) return ''
  let depth = 1
  let pos = openEnd + 1
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos)
    const nextClose = html.indexOf('</div>', pos)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + 4
    } else {
      depth--
      if (depth === 0) {
        return stripHtml(html.slice(openEnd + 1, nextClose)).replace(/\s+/g, ' ').trim()
      }
      pos = nextClose + 6
    }
  }
  return ''
}

function extractByClass(html: string, className: string): string {
  const marker = `class="${className}"`
  const altMarker = `class="${className} `
  let startIdx = html.indexOf(marker)
  if (startIdx < 0) startIdx = html.indexOf(altMarker)
  if (startIdx < 0) return ''
  const openEnd = html.indexOf('>', startIdx)
  if (openEnd < 0) return ''
  let depth = 1
  let pos = openEnd + 1
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos)
    const nextClose = html.indexOf('</div>', pos)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; pos = nextOpen + 4 }
    else { depth--; if (depth === 0) return stripHtml(html.slice(openEnd + 1, nextClose)).replace(/\s+/g, ' ').trim(); pos = nextClose + 6 }
  }
  return ''
}

function normalizeNewsUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'news.naver.com') {
      const oid = u.searchParams.get('oid')
      const aid = u.searchParams.get('aid')
      if (oid && aid) return `https://n.news.naver.com/mnews/article/${oid}/${aid}`
    }
    if (u.hostname.endsWith('.naver.com')) {
      const m = u.pathname.match(/\/article\/(\d+)\/(\d+)/)
      if (m) return `https://n.news.naver.com/mnews/article/${m[1]}/${m[2]}`
    }
  } catch {}
  return url
}

function extractById(html: string, id: string): string {
  const marker = `id="${id}"`
  const startIdx = html.indexOf(marker)
  if (startIdx < 0) return ''
  const openEnd = html.indexOf('>', startIdx)
  if (openEnd < 0) return ''
  let depth = 1, pos = openEnd + 1
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos)
    const nextClose = html.indexOf('</div>', pos)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; pos = nextOpen + 4 }
    else { depth--; if (depth === 0) return stripHtml(html.slice(openEnd + 1, nextClose)).replace(/\s+/g, ' ').trim(); pos = nextClose + 6 }
  }
  return ''
}

const META_PATTERN = /기자\s*[=｜|]|입력\s*[:：]|수정\s*[:：]|조회수|ⓒ|©|무단전재|저작권|Copyright|\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/

function extractParagraphs(html: string): string {
  // 한국 뉴스 사이트 공통 컨테이너 먼저 시도
  for (const id of ['articleBodyContents', 'article_txt', 'newsEndContents', 'articleBody', 'article-view-content-div', 'news_body_area']) {
    const body = extractById(html, id)
    if (body.length > 100) return body
  }
  // fallback: <p> 태그 필터링 추출
  const parts: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const t = stripHtml(m[1]).trim()
    if (t.length < 30 || META_PATTERN.test(t)) continue
    parts.push(t)
    if (parts.join(' ').length > 1200) break
  }
  return parts.join(' ')
}

async function crawlArticle(url: string): Promise<string> {
  if (!url.startsWith('http')) return ''
  const targetUrl = normalizeNewsUrl(url)
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.naver.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const raw = extractDicArea(html) || extractByClass(html, 'newsct_article _article_body') || extractByClass(html, 'go_trans _article_content') || extractParagraphs(html)
    return cleanArticleText(raw).slice(0, 1500)
  } catch {
    return ''
  }
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { topic } = await request.json()
  if (!topic) return NextResponse.json({ error: '주제가 필요합니다' }, { status: 400 })

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 30)

  const topicWords = topic.split(/\s+/).filter((w: string) => w.length > 1).slice(0, 2)
  const keywords = topicWords.length > 0 ? topicWords : [topic]

  const base = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: 'date',
    keywordGroups: [{ groupName: topic, keywords }],
  }

  const [male, female, teen, twenty, thirty, forty, fifty, sixty, newsRes, blogRes, adRes] = await Promise.all([
    datalabCall({ ...base, gender: 'm' }),
    datalabCall({ ...base, gender: 'f' }),
    datalabCall({ ...base, ages: ['2'] }),        // 10대 (13~18)
    datalabCall({ ...base, ages: ['3', '4'] }),   // 20대 (19~29)
    datalabCall({ ...base, ages: ['5', '6'] }),   // 30대 (30~39)
    datalabCall({ ...base, ages: ['7', '8'] }),   // 40대 (40~49)
    datalabCall({ ...base, ages: ['9', '10'] }),  // 50대 (50~59)
    datalabCall({ ...base, ages: ['11'] }),        // 60대+ (60~)
    naverSearch('news', topic, 5),
    naverSearch('blog', keywords.join(' '), 1),
    queryKeywords(keywords).catch(() => [] as any[]),
  ])

  // 성별 분포
  const maleAvg = avgRatio(male?.results?.[0]?.data)
  const femaleAvg = avgRatio(female?.results?.[0]?.data)
  const genderTotal = maleAvg + femaleAvg || 1
  const genderRatio = {
    male: Math.round((maleAvg / genderTotal) * 100),
    female: Math.round((femaleAvg / genderTotal) * 100),
  }

  // 연령 분포 (10대~60대+)
  const teenAvg = avgRatio(teen?.results?.[0]?.data)
  const twentyAvg = avgRatio(twenty?.results?.[0]?.data)
  const thirtyAvg = avgRatio(thirty?.results?.[0]?.data)
  const fortyAvg = avgRatio(forty?.results?.[0]?.data)
  const fiftyAvg = avgRatio(fifty?.results?.[0]?.data)
  const sixtyAvg = avgRatio(sixty?.results?.[0]?.data)
  const ageTotal = teenAvg + twentyAvg + thirtyAvg + fortyAvg + fiftyAvg + sixtyAvg || 1
  const ageRatio = {
    teen: Math.round((teenAvg / ageTotal) * 100),
    twenty: Math.round((twentyAvg / ageTotal) * 100),
    thirty: Math.round((thirtyAvg / ageTotal) * 100),
    forty: Math.round((fortyAvg / ageTotal) * 100),
    fifty: Math.round((fiftyAvg / ageTotal) * 100),
    sixty: Math.round((sixtyAvg / ageTotal) * 100),
  }

  // 최신 뉴스 헤드라인
  const newsHeadlines: { title: string; link: string; pubDate: string }[] =
    (newsRes?.items || []).slice(0, 5).map((item: any) => ({
      title: stripHtml(item.title || ''),
      link: item.originallink || item.link || '',
      pubDate: item.pubDate ? item.pubDate.slice(0, 16) : '',
    }))

  // 블로그 글 현황
  const blogCount: number = blogRes?.total ?? 0

  // 검색량 (검색광고 API) - 키워드별 최대값 사용
  const parseCount = (v: number | string) => typeof v === 'number' ? v : v === '<10' ? 5 : Number(v) || 0
  const adList = adRes as any[]
  let pcVolume = 0, mobileVolume = 0
  for (const kw of keywords) {
    const clean = kw.replace(/\s/g, '').toLowerCase()
    const match = adList.find((r: any) => r.relKeyword?.replace(/\s/g, '').toLowerCase() === clean)
    if (match) {
      const pc = parseCount(match.monthlyPcQcCnt)
      const mobile = parseCount(match.monthlyMobileQcCnt)
      if (pc + mobile > pcVolume + mobileVolume) { pcVolume = pc; mobileVolume = mobile }
    }
  }
  // 정확히 매칭 안 되면 API 결과 중 가장 높은 값 사용
  if (pcVolume === 0 && mobileVolume === 0 && adList.length > 0) {
    const best = adList.reduce((a: any, b: any) =>
      parseCount(a.monthlyPcQcCnt) + parseCount(a.monthlyMobileQcCnt) >
      parseCount(b.monthlyPcQcCnt) + parseCount(b.monthlyMobileQcCnt) ? a : b
    )
    pcVolume = parseCount(best.monthlyPcQcCnt)
    mobileVolume = parseCount(best.monthlyMobileQcCnt)
  }
  const searchVolume = { pc: pcVolume, mobile: mobileVolume, total: pcVolume + mobileVolume }

  // 트렌드 감지 (최근 7일 vs 이전 7일, 30% 이상 상승)
  function computeTrend(data: any[] | undefined | null): boolean {
    if (!data || data.length < 14) return false
    const sorted = [...data].sort((a, b) => (a.period || '').localeCompare(b.period || ''))
    const last7Avg = sorted.slice(-7).reduce((s, d) => s + (d.ratio || 0), 0) / 7
    const prev7Avg = sorted.slice(-14, -7).reduce((s, d) => s + (d.ratio || 0), 0) / 7
    if (prev7Avg === 0) return last7Avg > 0
    return (last7Avg - prev7Avg) / prev7Avg >= 0.3
  }
  const isTrending = computeTrend(male?.results?.[0]?.data) || computeTrend(female?.results?.[0]?.data)

  // 해시태그
  const allWords = topic.split(/\s+/).filter((w: string) => w.length > 1)
  const common = ['일상', '블로그', '정보', '이슈', '추천']
  const hashtags = [...new Set([...allWords, ...common])].slice(0, 12)

  // 뉴스 기사 본문 크롤링 (첫 번째 성공한 기사)
  let articleBody = ''
  for (const item of newsHeadlines) {
    const body = await crawlArticle(item.link)
    if (body.length > 80) { articleBody = body; break }
  }

  return NextResponse.json({
    genderRatio,
    ageRatio,
    newsHeadlines,
    blogCount,
    searchVolume,
    isTrending,
    hashtags,
    articleBody,
  })
}
