import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'

// 등록 직후 또는 사용자가 "지금 체크" 눌렀을 때 즉시 1회 크롤링
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { trackedId } = await request.json()
  if (!trackedId) return NextResponse.json({ error: 'trackedId 필요' }, { status: 400 })

  const { data: tracked } = await supabase
    .from('tracked_keywords')
    .select('id, keyword, target_url')
    .eq('id', trackedId)
    .eq('user_id', user.id)
    .single()

  if (!tracked) return NextResponse.json({ error: '키워드를 찾을 수 없어요' }, { status: 404 })

  try {
    const res = await fetch(`${CRAWLER_URL}/track-rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: tracked.keyword, targetUrl: tracked.target_url }),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 })

    // 히스토리 기록
    await supabase.from('rank_history').insert({
      tracked_id: trackedId,
      rank: data.rank ?? null,
      matched_title: data.matchedTitle ?? null,
      top10_snapshot: data.top10 || [],
    })

    // 마지막 체크 시각 갱신
    await supabase
      .from('tracked_keywords')
      .update({ last_checked: new Date().toISOString() })
      .eq('id', trackedId)

    return NextResponse.json({
      rank: data.rank,
      matchedTitle: data.matchedTitle,
      top10: data.top10,
      checkedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '순위 체크 실패' }, { status: 500 })
  }
}
