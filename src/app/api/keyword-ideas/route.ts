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

[제목 작성 원칙]
1. 핵심 키워드를 제목 앞쪽에 배치 (검색어와 일치할수록 유리)
2. 자극적 표현 금지 — 정확하고 구체적인 표현 사용
3. "무조건", "최고", "전부" 같은 과장 표현 사용 금지
4. "|" 구분자 절대 사용 금지
5. 연도(2025·2026), 숫자(3가지, TOP5), "모르면 손해", "지금" 같은 감정 유도 단어 적절히 활용
6. 사람의 검색 의도 중심으로 작성

[요청]
이 키워드로 상위노출 가능성이 높은 글감 3개를 추천하세요.
각 글감은 서로 다른 제목 형태여야 합니다:
- 1번: 후기·경험형 ("~다녀왔어요", "~해봤어요", "~후기")
- 2번: 정보·가이드형 ("~방법", "~하는 법", "~총정리", "~이렇게 하면")
- 3번: 숫자·리스트형 ("~N가지", "TOP N", "~전 알아야 할 것")

각 글감마다:
- title: 위 원칙을 지킨 제목 (30~45자)
- points: 글에 들어갈 핵심 내용 2~3줄

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
