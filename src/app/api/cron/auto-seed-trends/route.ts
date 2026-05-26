import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDailyTrendingKeywords } from '@/lib/google-trends'

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

  // Google Trends 급상승 키워드 수집
  const trendItems = await getDailyTrendingKeywords()
  if (trendItems.length === 0) {
    return NextResponse.json({ message: 'Google Trends 데이터 없음', added: 0 })
  }

  // 기존 seed_keywords 전체 조회 (중복 체크용)
  const { data: existing } = await supabase
    .from('seed_keywords')
    .select('keyword')

  const existingSet = new Set((existing || []).map(r => r.keyword))

  // 신규 시드만 필터링
  const newSeeds = trendItems
    .filter(item => !existingSet.has(item.keyword))
    .map(item => ({
      keyword: item.keyword,
      category: item.category,
    }))

  if (newSeeds.length === 0) {
    return NextResponse.json({ message: '신규 시드 없음', added: 0 })
  }

  const { error } = await supabase
    .from('seed_keywords')
    .insert(newSeeds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    added: newSeeds.length,
    keywords: newSeeds.map(s => `${s.category}: ${s.keyword}`),
  })
}
