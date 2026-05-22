import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrendingKeywords } from '@/lib/naver-datalab'

const CATEGORIES = [
  'travel', 'fashion', 'beauty', 'food', 'tech_it', 'auto', 'living',
  'parenting', 'health', 'game', 'pet', 'sports', 'entertain', 'movie',
  'book', 'business', 'education',
]
const KEYWORDS_PER_CATEGORY = 25

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
      // 경쟁 낮은 황금키워드 상위 25개 가져오기
      const { data: goldenKws } = await supabase
        .from('keywords')
        .select('keyword')
        .eq('category', category)
        .gte('total_volume', 1000)
        .lte('total_volume', 10000)
        .in('competition_label', ['매우좋음', '좋음'])
        .order('competition_ratio', { ascending: true })
        .limit(KEYWORDS_PER_CATEGORY)

      if (!goldenKws || goldenKws.length === 0) continue

      const keywords = goldenKws.map(k => k.keyword)
      const trends = await getTrendingKeywords(keywords)

      // trend_score 업데이트
      for (const t of trends) {
        await supabase
          .from('keywords')
          .update({ trend_score: t.ratio, trend_updated_at: today })
          .eq('keyword', t.keyword)
          .eq('category', category)
      }

      results[category] = trends.length
      await new Promise(r => setTimeout(r, 500))
    } catch (e) {
      console.error(`트렌드 업데이트 실패 [${category}]`, e)
    }
  }

  return NextResponse.json({ date: today, updated: results })
}
