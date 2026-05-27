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
  return str.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
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

  const [male, female, teen, twenty, thirty, forty, fifty, newsRes, blogRes, adRes] = await Promise.all([
    datalabCall({ ...base, gender: 'm' }),
    datalabCall({ ...base, gender: 'f' }),
    datalabCall({ ...base, ages: ['2'] }),             // 10대
    datalabCall({ ...base, ages: ['3', '4'] }),        // 20대
    datalabCall({ ...base, ages: ['5', '6'] }),        // 30대
    datalabCall({ ...base, ages: ['7', '8'] }),        // 40대
    datalabCall({ ...base, ages: ['9', '10', '11'] }), // 50대+
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

  // 연령 분포 (10대~50대+)
  const teenAvg = avgRatio(teen?.results?.[0]?.data)
  const twentyAvg = avgRatio(twenty?.results?.[0]?.data)
  const thirtyAvg = avgRatio(thirty?.results?.[0]?.data)
  const fortyAvg = avgRatio(forty?.results?.[0]?.data)
  const fiftyAvg = avgRatio(fifty?.results?.[0]?.data)
  const ageTotal = teenAvg + twentyAvg + thirtyAvg + fortyAvg + fiftyAvg || 1
  const ageRatio = {
    teen: Math.round((teenAvg / ageTotal) * 100),
    twenty: Math.round((twentyAvg / ageTotal) * 100),
    thirty: Math.round((thirtyAvg / ageTotal) * 100),
    forty: Math.round((fortyAvg / ageTotal) * 100),
    fifty: Math.round((fiftyAvg / ageTotal) * 100),
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

  // 해시태그
  const allWords = topic.split(/\s+/).filter((w: string) => w.length > 1)
  const common = ['일상', '블로그', '정보', '이슈', '추천']
  const hashtags = [...new Set([...allWords, ...common])].slice(0, 12)

  return NextResponse.json({
    genderRatio,
    ageRatio,
    newsHeadlines,
    blogCount,
    searchVolume,
    hashtags,
  })
}
