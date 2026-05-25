import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7일

export async function POST(request: NextRequest) {
  const { keyword, topic, posts } = await request.json()

  if (!posts || posts.length === 0) {
    return NextResponse.json({ sections: [] })
  }

  const supabase = adminClient()

  // 캐시 확인
  const { data: cached } = await supabase
    .from('sections_cache')
    .select('sections, created_at')
    .eq('keyword', keyword)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    if (ageMs < TTL_MS) {
      return NextResponse.json({ sections: cached.sections, fromCache: true })
    }
  }

  const postsText = posts.map((p: { title: string; fullText: string }, i: number) =>
    `[글 ${i + 1}] ${p.title}\n${p.fullText}`
  ).join('\n\n---\n\n')

  try {
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `키워드: "${keyword}"
주제: "${topic}"

아래는 이 키워드로 네이버 상위노출된 블로그 글 ${posts.length}개입니다.

${postsText}

이 글들에서 독자에게 실질적으로 유용한 공통 섹션/토픽을 추출해줘.

topic은 반드시 2~4글자 핵심 명사만 사용해. (예: 주차, 웨이팅, 위치, 메뉴, 가격, 인테리어, 방문팁)
절대 "~안내", "~정보", "~추천" 같은 수식어 붙이지 마.

JSON 배열로만 응답해줘 (다른 설명 없이):
[{"topic":"주차","note":"왜 중요한지 한 줄"},...]
최대 6개.`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const sections = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    // 캐시 저장
    await supabase
      .from('sections_cache')
      .upsert({ keyword, sections, created_at: new Date().toISOString() })

    return NextResponse.json({ sections })
  } catch (e: any) {
    return NextResponse.json({ sections: [], error: e.message })
  }
}
