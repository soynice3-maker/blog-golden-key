import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const MONTH_KR = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now = new Date()

  // 항상 다음 달 기준으로 생성 (한 달 전 포스팅 준비용)
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const month = nextMonthDate.getMonth() + 1
  const year = nextMonthDate.getFullYear()
  const monthKr = MONTH_KR[month - 1]

  const prompt = `당신은 한국 블로그 트렌드 전문가입니다.

${monthKr}에 네이버 블로그에서 특히 인기 있는 시즌성 주제 10가지를 추출하세요.
계절 행사, 기념일, 날씨, 먹거리, 여행, 쇼핑 시즌 등을 고려하세요.

[출력 형식]
JSON만 반환. 다른 설명 없이.
{ "topics": ["주제1", "주제2", ..., "주제10"] }`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 파싱 실패')
    const { topics } = JSON.parse(jsonMatch[0])

    const rows = (topics as string[]).map((topic: string) => ({
      month,
      topic,
      year,
    }))

    // 기존 해당 월 데이터 삭제 후 재삽입
    await supabase.from('season_topics').delete().eq('month', month).eq('year', year)
    await supabase.from('season_topics').insert(rows)

    return NextResponse.json({ month, year, topics })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '시즌 토픽 갱신 실패' }, { status: 500 })
  }
}
