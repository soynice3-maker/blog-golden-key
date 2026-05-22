import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  if (!category) return NextResponse.json({ error: '카테고리를 선택해주세요' }, { status: 400 })

  const admin = adminClient()

  // 가장 최근 수집 날짜 조회
  const { data: latest } = await admin
    .from('trend_datalab')
    .select('collected_at')
    .eq('category', category)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return NextResponse.json({ keywords: [] })

  const { data, error } = await admin
    .from('trend_datalab')
    .select('keyword, ratio, rank, collected_at')
    .eq('category', category)
    .eq('collected_at', latest.collected_at)
    .order('ratio', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keywords: data || [] })
}
