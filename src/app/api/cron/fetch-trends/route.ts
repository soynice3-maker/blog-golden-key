import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrendingKeywords } from '@/lib/naver-datalab'

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

  for (const category of CATEGORIES) {
    try {
      // 해당 카테고리의 시드 키워드 가져오기
      const { data: seeds } = await supabase
        .from('seed_keywords')
        .select('keyword')
        .eq('category', category)
        .limit(SEEDS_PER_CATEGORY)

      if (!seeds || seeds.length === 0) continue

      const keywords = seeds.map(s => s.keyword)
      const trends = await getTrendingKeywords(keywords)
      const top = trends.slice(0, TOP_N)

      if (top.length === 0) continue

      // trend_datalab 테이블에 upsert
      const rows = top.map((t, i) => ({
        category,
        keyword: t.keyword,
        ratio: t.ratio,
        rank: i + 1,
        collected_at: today,
      }))

      await supabase
        .from('trend_datalab')
        .upsert(rows, { onConflict: 'category,keyword,collected_at' })

      results[category] = top.length

      // entertain 카테고리는 trend_broadcast에도 저장
      if (category === 'entertain') {
        const broadcastRows = top.map((t, i) => ({
          keyword: t.keyword,
          ratio: t.ratio,
          rank: i + 1,
          collected_at: today,
        }))
        await supabase
          .from('trend_broadcast')
          .upsert(broadcastRows, { onConflict: 'keyword,collected_at' })
      }
    } catch (e) {
      console.error(`트렌드 수집 실패 [${category}]`, e)
    }
  }

  return NextResponse.json({ date: today, categories: results })
}
