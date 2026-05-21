import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DAILY_LIMIT = 10

const CATEGORY_KR: Record<string, string> = {
  travel: '여행', fashion: '패션', beauty: '뷰티', food: '푸드',
  tech_it: 'IT테크', auto: '자동차', living: '리빙', parenting: '육아',
  health: '생활건강', game: '게임', pet: '동물·펫', sports: '운동·레저',
  entertain: '방송·연예', movie: '영화', book: '도서',
  business: '경제·비즈니스', education: '어학·교육',
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { keyword, category } = await request.json()
  if (!keyword || !category) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  // 사용량 한도 확인
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'ai_ideas')
    .gte('used_at', today.toISOString())

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `일일 한도(${DAILY_LIMIT}회)를 초과했습니다` }, { status: 429 })
  }

  // 캐시 확인 (30일)
  const { data: cached } = await supabase
    .from('keyword_ideas')
    .select('ideas, created_at')
    .eq('keyword', keyword)
    .eq('category', category)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    if (ageMs < 30 * 24 * 60 * 60 * 1000) {
      await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'ai_ideas' })
      return NextResponse.json({ ideas: cached.ideas, fromCache: true })
    }
  }

  const categoryKr = CATEGORY_KR[category] || category
  const prompt = `당신은 네이버 블로그 SEO 전문가입니다.

[입력]
- 카테고리: ${categoryKr}
- 타겟 키워드: ${keyword}

[요청]
이 키워드를 활용해 네이버 블로그 상위노출 가능성이 높은 글감 3개를 추천하세요.
각 글감마다:
- 제목: 검색 의도에 부합하면서 클릭률 높은 형태
- 핵심 포인트: 글에 들어갈 주요 내용 2~3줄

[출력 형식]
JSON만 반환. 다른 설명 없이.
{ "ideas": [{ "title": "...", "points": ["...", "..."] }, ...] }`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 파싱 실패')
    const { ideas } = JSON.parse(jsonMatch[0])

    // 캐시 저장
    await supabase.from('keyword_ideas').upsert({ keyword, category, ideas })

    // 사용량 로그
    await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'ai_ideas' })

    return NextResponse.json({ ideas, fromCache: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'AI 글감 생성 실패' }, { status: 500 })
  }
}
