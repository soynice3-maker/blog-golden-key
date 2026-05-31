import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateInsights } from '@/lib/diagnose-insights'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'
const CACHE_HOURS = 24

// 본문 분석 (Pro 영역): 내 글 + 상위 글 본문 추출 (Playwright 병렬)
// 입력: url, keyword, topPosts (quick에서 미리 받은 상위 글 URL 목록), rank
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { url, keyword, topPosts, rank } = await request.json()
  if (!url) return NextResponse.json({ error: 'url 필요' }, { status: 400 })
  if (!keyword?.trim()) return NextResponse.json({ error: 'keyword 필요' }, { status: 400 })

  // 24시간 캐시
  const cacheAfter = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString()
  const { data: cached } = await supabase
    .from('diagnosis_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_url', url)
    .eq('keyword', keyword.trim())
    .gte('created_at', cacheAfter)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({
      cached: true,
      myPost: cached.my_post,
      competitors: cached.competitors,
      insights: cached.insights,
      rank: cached.rank,
    })
  }

  try {
    // 상위 글 URL 결정 (quick에서 받은 것 우선, 없으면 빈 배열)
    const competitorUrls: string[] = (topPosts || []).slice(0, 2).map((p: { url: string }) => p.url)

    // 내 글 + 상위 글 본문 분석 병렬
    const tasks = [
      fetch(`${CRAWLER_URL}/analyze-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, keyword: keyword.trim() }),
        signal: AbortSignal.timeout(30000),
      }).then(r => r.json()),
      ...competitorUrls.map((compUrl, idx) =>
        fetch(`${CRAWLER_URL}/analyze-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: compUrl, keyword: keyword.trim() }),
          signal: AbortSignal.timeout(30000),
        }).then(r => r.json()).then(d => ({ ...d, rank: idx + 1, url: compUrl })),
      ),
    ]

    const results = await Promise.all(tasks)
    const myPost = results[0]
    const competitors = results.slice(1).filter(r => !r.error)

    if (myPost.error) {
      return NextResponse.json({ error: `내 글 분석 실패: ${myPost.error}` }, { status: 500 })
    }

    // 인사이트 생성
    const insights = generateInsights(
      {
        wordCount: myPost.wordCount || 0,
        imageCount: myPost.imageCount || 0,
        videoCount: myPost.videoCount || 0,
        keywordDensity: myPost.keywordDensity,
        hashtagCount: myPost.hashtags?.length || 0,
        title: myPost.title,
        textPreview: myPost.text?.slice(0, 500),
      },
      competitors,
      { keyword: keyword.trim(), rank: rank ?? null }
    )

    // DB 저장
    await supabase.from('diagnosis_snapshots').insert({
      user_id: user.id,
      post_url: url,
      keyword: keyword.trim(),
      my_post: myPost,
      competitors,
      insights,
      rank: rank ?? null,
    })

    return NextResponse.json({
      cached: false,
      myPost,
      competitors,
      insights,
      rank: rank ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '본문 분석 실패' }, { status: 500 })
  }
}
