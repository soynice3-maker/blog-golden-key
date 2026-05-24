import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getMainAndRelated, getStatsForKeywords } from '@/lib/naver-ad-api'
import { getAutocomplete } from '@/lib/naver-autocomplete'
import { getBlogCounts } from '@/lib/blog-crawler'
import { getCompetitionLevel } from '@/lib/competition'
import { getTrendDirection, getSeasonality } from '@/lib/naver-datalab'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const DAILY_LIMIT = 10

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await request.json()
  const keyword = body.keyword?.trim()
  if (!keyword) {
    return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
  }

  // Check daily usage limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'insight')
    .gte('used_at', today.toISOString())

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `일일 사용 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해주세요.` },
      { status: 429 }
    )
  }

  // Check cache (24h TTL)
  const { data: cached } = await supabase
    .from('insight_cache')
    .select('result, created_at')
    .eq('keyword', keyword)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'insight' })
      return NextResponse.json({ ...cached.result, fromCache: true })
    }
  }

  try {
    // 1. Main keyword stats + related from searchad API
    const { main: mainStat, related: relatedStats } = await getMainAndRelated(keyword)

    // 2. Autocomplete keywords (failure → empty array, not a full error)
    const autocompleteKeywords = await getAutocomplete(keyword)

    // 3. Stats for autocomplete keywords
    const autocompleteStatsMap = await getStatsForKeywords(autocompleteKeywords)

    // 4. Blog counts for all keywords in one batch
    const allKeywords = [
      mainStat.keyword,
      ...relatedStats.map(r => r.keyword),
      ...autocompleteKeywords,
    ]
    const blogCountMap = await getBlogCounts(allKeywords)

    const buildItem = (stat: { keyword: string; pcVolume: number; mobileVolume: number; totalVolume: number }) => {
      const blogCount = blogCountMap.get(stat.keyword) ?? null
      return {
        keyword: stat.keyword,
        pcVolume: stat.pcVolume,
        mobileVolume: stat.mobileVolume,
        totalVolume: stat.totalVolume,
        blogCount,
        competition: getCompetitionLevel(blogCount, stat.totalVolume),
      }
    }

    // 5. 트렌드 방향 + 계절성 (비동기, 실패해도 무시)
    const admin = adminClient()
    const { data: cachedKeyword } = await admin
      .from('keywords')
      .select('trend_score, trend_updated_at, peak_months')
      .eq('keyword', keyword)
      .maybeSingle()

    const today = new Date().toISOString().split('T')[0]
    let trendDirection: { direction: '상승' | '하락' | '유지'; changeRate: number } = { direction: '유지', changeRate: 0 }
    let seasonality: { peakMonths: number[]; note: string } = { peakMonths: [], note: '' }

    // 오늘 이미 계산된 게 있으면 재사용, 없으면 DataLab 호출
    if (cachedKeyword?.trend_updated_at === today) {
      const score = cachedKeyword.trend_score ?? 0
      trendDirection = { direction: score > 60 ? '상승' : score < 30 ? '하락' : '유지', changeRate: 0 }
      if (cachedKeyword.peak_months) {
        const months = cachedKeyword.peak_months.split(',').map(Number).filter(Boolean)
        const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
        seasonality = {
          peakMonths: months,
          note: months.length > 0 ? `${months.map((m: number) => monthNames[m-1]).join(', ')}에 검색량이 높아요` : ''
        }
      }
    } else {
      const [td, sea] = await Promise.allSettled([
        getTrendDirection(keyword),
        getSeasonality(keyword),
      ])
      if (td.status === 'fulfilled') trendDirection = td.value
      if (sea.status === 'fulfilled') {
        seasonality = sea.value
        // 계절성 DB 캐싱
        if (seasonality.peakMonths.length > 0) {
          await admin.from('keywords').update({
            peak_months: seasonality.peakMonths.join(','),
            trend_updated_at: today,
          }).eq('keyword', keyword)
        }
      }
    }

    const result = {
      main: buildItem(mainStat),
      related: relatedStats.map(buildItem),
      autocomplete: autocompleteKeywords.map(kw =>
        buildItem(autocompleteStatsMap.get(kw) ?? { keyword: kw, pcVolume: 0, mobileVolume: 0, totalVolume: 0 })
      ),
      trendDirection,
      seasonality,
    }

    // Save to cache
    await supabase.from('insight_cache').upsert({
      keyword,
      result,
      created_at: new Date().toISOString(),
    })

    // Log usage
    await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'insight' })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '분석 중 오류가 발생했습니다' }, { status: 500 })
  }
}
