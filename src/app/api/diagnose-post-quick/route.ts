import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'

// 빠른 진단: Playwright로 실제 네이버 검색 → 정확한 순위 + 상위 10개 글
// 정확도 우선 (사용자가 실제 보는 순위와 일치)
// 소요: 8~10초
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { url, keyword } = await request.json()
  if (!url) return NextResponse.json({ error: '글 URL이 필요합니다' }, { status: 400 })

  const finalKeyword = keyword?.trim() || ''
  if (!finalKeyword) {
    return NextResponse.json({ error: '타겟 키워드가 필요해요' }, { status: 400 })
  }

  try {
    const res = await fetch(`${CRAWLER_URL}/track-rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: finalKeyword, targetUrl: url }),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 })

    return NextResponse.json({
      url,
      keyword: finalKeyword,
      rank: data.rank ?? null,
      matchedTitle: data.matchedTitle ?? null,
      topPosts: (data.top10 || []).map((t: { rank: number; title: string; url: string }) => ({
        rank: t.rank,
        title: t.title,
        url: t.url,
        description: '',
      })),
      totalResults: 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '빠른 진단 실패' }, { status: 500 })
  }
}
