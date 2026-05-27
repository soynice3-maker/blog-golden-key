import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: '검색어가 필요합니다' }, { status: 400 })

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Naver API 키 없음' }, { status: 500 })

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=3&sort=date`,
      { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } }
    )
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return NextResponse.json({ snippet: '' })

    const snippet = item.description.replace(/<[^>]+>/g, '').trim()
    return NextResponse.json({ snippet })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '스니펫 로딩 실패' }, { status: 500 })
  }
}
