import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const FREE_LIMIT = 5

// GET — 등록된 키워드 목록 + 최근 순위
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: keywords, error } = await supabase
    .from('tracked_keywords')
    .select('id, keyword, target_url, created_at, last_checked, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 각 키워드의 최근 순위 가져오기
  const enriched = await Promise.all(
    (keywords || []).map(async (k) => {
      const { data: latest } = await supabase
        .from('rank_history')
        .select('rank, checked_at')
        .eq('tracked_id', k.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return { ...k, latestRank: latest?.rank ?? null, latestChecked: latest?.checked_at ?? null }
    })
  )

  return NextResponse.json({ keywords: enriched, limit: FREE_LIMIT })
}

// POST — 키워드 등록
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { keyword, targetUrl } = await request.json()
  if (!keyword?.trim() || !targetUrl?.trim()) {
    return NextResponse.json({ error: '키워드와 URL이 필요합니다' }, { status: 400 })
  }

  // 무료 한도 체크
  const { count } = await supabase
    .from('tracked_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((count ?? 0) >= FREE_LIMIT) {
    return NextResponse.json({ error: `무료 플랜은 최대 ${FREE_LIMIT}개까지 등록 가능해요` }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('tracked_keywords')
    .insert({
      user_id: user.id,
      keyword: keyword.trim(),
      target_url: targetUrl.trim(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 키워드+URL 조합이에요' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tracked: data })
}

// DELETE — 키워드 삭제 (soft delete: is_active = false)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const { error } = await supabase
    .from('tracked_keywords')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
