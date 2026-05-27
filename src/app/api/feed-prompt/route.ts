import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { topic, snippet, notes, titleDir, style, hashtags, genderRatio, ageRatio } = await request.json()
  if (!topic) return NextResponse.json({ error: '주제가 필요합니다' }, { status: 400 })

  const hashtagLine = Array.isArray(hashtags) && hashtags.length > 0
    ? hashtags.map((h: string) => `#${h}`).join(' ')
    : ''

  // 독자 분석 기반 지침 생성
  const audienceLines: string[] = []
  if (genderRatio) {
    const dominant = genderRatio.female >= 60 ? `여성 독자 중심 (여성 ${genderRatio.female}%)`
      : genderRatio.male >= 60 ? `남성 독자 중심 (남성 ${genderRatio.male}%)`
      : `남녀 고른 분포 (여성 ${genderRatio.female}% / 남성 ${genderRatio.male}%)`
    audienceLines.push(`성별: ${dominant}`)
  }
  if (ageRatio) {
    const ages = [
      { label: '10대', v: ageRatio.teen },
      { label: '20대', v: ageRatio.twenty },
      { label: '30대', v: ageRatio.thirty },
      { label: '40대', v: ageRatio.forty },
      { label: '50대+', v: ageRatio.fifty },
    ]
    const top = ages.sort((a, b) => b.v - a.v).slice(0, 2).filter(a => a.v > 0)
    if (top.length > 0) audienceLines.push(`주요 연령: ${top.map(a => `${a.label}(${a.v}%)`).join(', ')}`)
  }

  const audienceGuide = audienceLines.length > 0
    ? `\n[독자 분석]\n${audienceLines.join('\n')}\n→ 위 독자층의 관심사와 언어 습관에 맞게 글을 써주세요.`
    : ''

  const prompt = `당신은 네이버 홈피드 블로그 전문 작가입니다.

[뉴스 주제]
${topic}
${snippet ? `\n[뉴스 내용 요약]\n${snippet}` : ''}
${notes ? `\n[작성자가 다루고 싶은 내용]\n${notes}` : ''}

[제목 방향]: ${titleDir || '감성형'}
[글 스타일]: ${style || '스토리텔링'}
${audienceGuide}

위 내용을 바탕으로 네이버 홈피드 상위노출에 최적화된 블로그 글쓰기 프롬프트를 만들어주세요.

홈피드 최적화 원칙:
- 제목: 호기심·감성·공감 유발 (검색 키워드 X), '${titleDir || '감성형'}' 방식으로 작성
- 도입부: 개인 경험·공감 스토리로 시작
- 본문: '${style || '스토리텔링'}' 스타일로, 짧은 문단·질문형 전개·시각적 구분
- 체류시간: 스토리텔링 + 정보 혼합 구조
- 마무리: 공유·댓글 유도${hashtagLine ? `\n- 해시태그: ${hashtagLine}` : ''}

아래 형식으로 출력해주세요:

## 제목 아이디어 (3가지)
1. [${titleDir || '감성형'}]
2. [${titleDir || '감성형'}]
3. [${titleDir || '감성형'}]

## 글쓰기 프롬프트
(Claude/GPT에 붙여넣을 완성된 프롬프트. 도입부-본문구조-마무리 지침 포함)
${hashtagLine ? `\n## 해시태그\n${hashtagLine}` : ''}`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ prompt: text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '프롬프트 생성 실패' }, { status: 500 })
  }
}
