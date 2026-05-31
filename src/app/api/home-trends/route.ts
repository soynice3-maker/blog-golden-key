import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 홈 트렌드 키워드 — 비로그인 공개, 캐시 짧게
export async function GET() {
  const admin = adminClient()

  // 가장 최근 수집 시점
  const { data: latest } = await admin
    .from('trend_datalab')
    .select('collected_at')
    .order('collected_at', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return NextResponse.json({ keywords: [] })

  // 전 카테고리 통합 — ratio 상위 20개 가져와서 dedupe 후 N개 반환
  const { data, error } = await admin
    .from('trend_datalab')
    .select('keyword, ratio, category')
    .eq('collected_at', latest.collected_at)
    .order('ratio', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seen = new Set<string>()
  const unique: { keyword: string }[] = []
  for (const row of data || []) {
    if (!seen.has(row.keyword) && unique.length < 6) {
      seen.add(row.keyword)
      unique.push({ keyword: row.keyword })
    }
  }

  return NextResponse.json({ keywords: unique })
}
