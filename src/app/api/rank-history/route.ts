import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET ?trackedId=xxx&days=30
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const trackedId = searchParams.get('trackedId')
  const days = parseInt(searchParams.get('days') || '30')
  if (!trackedId) return NextResponse.json({ error: 'trackedId 필요' }, { status: 400 })

  // 소유권 확인
  const { data: tracked } = await supabase
    .from('tracked_keywords')
    .select('id, keyword, target_url')
    .eq('id', trackedId)
    .eq('user_id', user.id)
    .single()

  if (!tracked) return NextResponse.json({ error: '키워드를 찾을 수 없어요' }, { status: 404 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: history, error } = await supabase
    .from('rank_history')
    .select('rank, matched_title, checked_at, top10_snapshot')
    .eq('tracked_id', trackedId)
    .gte('checked_at', since)
    .order('checked_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    tracked,
    history: history || [],
    days,
  })
}
