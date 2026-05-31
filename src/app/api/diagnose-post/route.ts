import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateInsights } from '@/lib/diagnose-insights'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'
const CACHE_HOURS = 24

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { url, keyword } = await request.json()
  if (!url) return NextResponse.json({ error: '글 URL이 필요합니다' }, { status: 400 })

  // 24시간 캐시 조회
  const cacheAfter = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString()
  const { data: cached } = await supabase
    .from('diagnosis_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_url', url)
    .eq('keyword', keyword || '')
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
    // 1) 내 글 분석
    const myPostRes = await fetch(`${CRAWLER_URL}/analyze-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, keyword }),
      signal: AbortSignal.timeout(45000),
    })
    const myPost = await myPostRes.json()
    if (myPost.error) return NextResponse.json({ error: `내 글 분석 실패: ${myPost.error}` }, { status: 500 })

    // 2) 키워드 결정: 입력 → 해시태그 → 글 제목 추출 순
    const extractFromTitle = (title: string): string => {
      if (!title) return ''
      const stripped = title
        .replace(/\[[^\]]+\]/g, ' ')             // 대괄호 제거
        .replace(/[^\w가-힣\s]/g, ' ')           // 특수문자 제거
        .replace(/\s+/g, ' ')
        .trim()
      const words = stripped.split(' ').filter(w => w.length >= 2 && w.length <= 12)
      return words.slice(0, 2).join(' ')
    }
    const finalKeyword = (keyword?.trim() || myPost.hashtags?.[0] || extractFromTitle(myPost.title) || '').trim()
    if (!finalKeyword) {
      return NextResponse.json({ error: '글 제목과 해시태그에서 키워드를 찾을 수 없어요. 타겟 키워드를 직접 입력해주세요.' }, { status: 400 })
    }

    // 3) 순위 확인
    let myRank: number | null = null
    try {
      const rankRes = await fetch(`${CRAWLER_URL}/track-rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: finalKeyword, targetUrl: url }),
        signal: AbortSignal.timeout(30000),
      })
      const rankData = await rankRes.json()
      myRank = rankData.rank ?? null
    } catch { /* 순위 못 가져오면 null */ }

    // 4) 경쟁 분석 (상위 3개)
    const compRes = await fetch(`${CRAWLER_URL}/analyze-competitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: finalKeyword, topN: 3 }),
      signal: AbortSignal.timeout(120000),
    })
    const compData = await compRes.json()
    if (compData.error) return NextResponse.json({ error: `경쟁 분석 실패: ${compData.error}` }, { status: 500 })

    const competitors = compData.topPosts || []

    // 5) 인사이트 생성 (룰 기반)
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
      { keyword: finalKeyword, rank: myRank }
    )

    // 6) DB 저장
    await supabase.from('diagnosis_snapshots').insert({
      user_id: user.id,
      post_url: url,
      keyword: keyword || '',
      my_post: myPost,
      competitors,
      insights,
      rank: myRank,
    })

    return NextResponse.json({
      cached: false,
      myPost,
      competitors,
      insights,
      rank: myRank,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '진단 실패' }, { status: 500 })
  }
}
