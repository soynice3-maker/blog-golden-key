import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  try {
    const res = await fetch(`${CRAWLER_URL}/news-ranking`, { signal: AbortSignal.timeout(20000) })
    const data = await res.json()
    return NextResponse.json({ items: data.items || [], fetchedAt: data.fetchedAt || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '뉴스 랭킹 로딩 실패' }, { status: 500 })
  }
}
