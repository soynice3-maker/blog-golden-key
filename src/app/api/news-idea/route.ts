import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DAILY_LIMIT = 10

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { topic } = await request.json()
  if (!topic) return NextResponse.json({ error: '주제가 필요합니다' }, { status: 400 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'news_idea')
    .gte('used_at', today.toISOString())

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `일일 한도(${DAILY_LIMIT}회)를 초과했습니다` }, { status: 429 })
  }

  const prompt = `당신은 네이버 블로그 SEO 전문가입니다.

[화제 뉴스 주제]
"${topic}"

[요청]
위 뉴스 주제를 블로그로 전환할 때 네이버 상위노출 가능성이 높은 제목 아이디어를 3개 만들어주세요.

각 아이디어:
- searchTitle: 검색형 제목 — 주제 키워드를 앞에 배치, 정보성/후기/방법/추천 강조, 30~45자
- feedTitle: 홈피드형 제목 — 첫 문장이 호기심 또는 감성 자극, 클릭 유도, 25~40자
- keywords: 블로그 본문에 꼭 들어가야 할 핵심 키워드 2~3개 (배열)

규칙:
- searchTitle은 정보 탐색 의도에 맞게 구체적으로
- feedTitle은 피드에서 멈추게 만드는 후킹형으로
- 두 제목 모두 주제의 핵심 단어를 포함

JSON만 반환. 다른 설명 없이.
{ "ideas": [{ "searchTitle": "...", "feedTitle": "...", "keywords": ["...", "..."] }, ...] }`

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

    await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'news_idea' })

    return NextResponse.json({ ideas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '글감 생성 실패' }, { status: 500 })
  }
}
