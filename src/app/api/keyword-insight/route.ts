import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMainAndRelated, getStatsForKeywords } from '@/lib/naver-ad-api'
import { getAutocomplete } from '@/lib/naver-autocomplete'
import { getBlogCounts } from '@/lib/blog-crawler'
import { getCompetitionLevel } from '@/lib/competition'

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

    const result = {
      main: buildItem(mainStat),
      related: relatedStats.map(buildItem),
      autocomplete: autocompleteKeywords.map(kw =>
        buildItem(autocompleteStatsMap.get(kw) ?? { keyword: kw, pcVolume: 0, mobileVolume: 0, totalVolume: 0 })
      ),
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
