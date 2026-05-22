import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrendingKeywords } from '@/lib/naver-datalab'
import { getDailyTrendingKeywords } from '@/lib/google-trends'

const CATEGORIES = [
  'travel', 'fashion', 'beauty', 'food', 'tech_it', 'auto', 'living',
  'parenting', 'health', 'game', 'pet', 'sports', 'entertain', 'movie',
  'book', 'business', 'education',
]

// 카테고리별 시드 키워드 최대 수 (DataLab 배치: 5그룹/요청)
const SEEDS_PER_CATEGORY = 20
const TOP_N = 10

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const today = new Date().toISOString().split('T')[0]
  const results: Record<string, number> = {}

  const errors: Record<string, string> = {}

  for (const category of CATEGORIES) {
    try {
      // 해당 카테고리의 시드 키워드 가져오기
      const { data: seeds, error: seedErr } = await supabase
        .from('seed_keywords')
        .select('keyword')
        .eq('category', category)
        .limit(SEEDS_PER_CATEGORY)

      if (seedErr) { errors[category] = `seed error: ${seedErr.message}`; continue }
      if (!seeds || seeds.length === 0) { errors[category] = 'no seeds'; continue }

      const keywords = seeds.map(s => s.keyword)
      const trends = await getTrendingKeywords(keywords)
      const top = trends.slice(0, TOP_N)

      if (top.length === 0) continue

      const rows = top.map((t, i) => ({
        category,
        keyword: t.keyword,
        ratio: t.ratio,
        rank: i + 1,
        collected_at: today,
      }))

      // 성공한 경우에만 기존 데이터 교체
      await supabase
        .from('trend_datalab')
        .delete()
        .eq('category', category)
        .eq('collected_at', today)

      await supabase
        .from('trend_datalab')
        .insert(rows)

      results[category] = top.length

      // 카테고리 간 API 과부하 방지
      await new Promise(r => setTimeout(r, 500))

} catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors[category] = msg
      console.error(`트렌드 수집 실패 [${category}]`, e)
    }
  }

  // Google Trends 급상승 키워드 추가
  try {
    const googleItems = await getDailyTrendingKeywords()
    const byCategory: Record<string, typeof googleItems> = {}
    googleItems.forEach(item => {
      if (!byCategory[item.category]) byCategory[item.category] = []
      byCategory[item.category].push(item)
    })

    for (const [category, items] of Object.entries(byCategory)) {
      const rows = items.slice(0, 5).map((item, i) => ({
        category,
        keyword: item.keyword,
        ratio: 100 - (item.rank - 1) * 5, // 순위 기반 점수
        rank: 100 + i + 1, // 기존 DataLab 순위와 구분 (100번대)
        collected_at: today,
      }))
      await supabase.from('trend_datalab').upsert(rows, { onConflict: 'category,keyword,collected_at' })
    }
    results['google_trends'] = googleItems.length
  } catch (e) {
    errors['google_trends'] = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ date: today, categories: results, errors })
}
