import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { topic, titleDir, snippet, genderRatio, ageRatio } = await request.json()
  if (!topic) return NextResponse.json({ error: '주제가 필요합니다' }, { status: 400 })

  const audienceHint = genderRatio?.female >= 60 ? '여성 독자 중심'
    : genderRatio?.male >= 60 ? '남성 독자 중심'
    : ''

  const prompt = `네이버 홈피드 블로그 제목 아이디어 3가지를 만들어주세요.

주제: ${topic}
제목 방향: ${titleDir || '감성형'}
${snippet ? `참고 기사: ${snippet.slice(0, 400)}` : ''}
${audienceHint ? `독자: ${audienceHint}` : ''}

규칙:
- 뉴스 헤드라인처럼 요약하지 말고, 가장 자극적이거나 궁금증을 유발하는 사실 하나를 훅으로 뽑아 '${titleDir || '감성형'}' 방식으로 작성
- 검색 키워드 나열 X, 따옴표 독백 패턴 X

번호 목록만 출력하세요 (설명 없이):
1.
2.
3.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const titles = text.split('\n')
      .filter(l => /^\d+\./.test(l.trim()))
      .map(l => l.trim().replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
    return NextResponse.json({ titles })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '제목 생성 실패' }, { status: 500 })
  }
}
