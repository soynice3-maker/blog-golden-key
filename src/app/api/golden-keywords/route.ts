import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!category) return NextResponse.json({ error: '카테고리를 선택해주세요' }, { status: 400 })

  const { data, error, count } = await supabase
    .from('keywords')
    .select('keyword, pc_volume, mobile_volume, total_volume, blog_count, competition_label, trend_score', { count: 'exact' })
    .eq('category', category)
    .gte('total_volume', 1000)
    .lte('total_volume', 10000)
    .gte('blog_count', 100)
    .in('competition_label', ['매우좋음', '좋음'])
    .order('competition_ratio', { ascending: true })
    .range(offset, offset + 9)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    category,
    results: data || [],
    hasMore: (count ?? 0) > offset + 10,
    total: count ?? 0,
  })
}
