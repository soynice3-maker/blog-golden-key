import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { topic, snippet, notes, titleDir, style, hashtags, genderRatio, ageRatio, contentType } = await request.json()
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
      { label: '50대', v: ageRatio.fifty },
      { label: '60대+', v: ageRatio.sixty },
    ]
    const top = ages.sort((a, b) => b.v - a.v).slice(0, 2).filter(a => a.v > 0)
    if (top.length > 0) audienceLines.push(`주요 연령: ${top.map(a => `${a.label}(${a.v}%)`).join(', ')}`)
  }

  const audienceGuide = audienceLines.length > 0
    ? `\n[독자 분석]\n${audienceLines.join('\n')}\n→ 위 독자층의 관심사와 언어 습관에 맞게 글을 써주세요.`
    : ''

  const charGuide = contentType === 'image' ? '400~600자 내외 (이미지 중심 포스팅)' : '600~1000자 내외 (텍스트 중심 포스팅)'

  const prompt = `네이버 홈피드 상위노출 블로그 글 작성 요청

주제: ${topic}

━━━ 제목 작성 ━━━
[제목 방향]: ${titleDir || '감성형'}
[제목 작성 규칙]
- 뉴스 헤드라인처럼 요약하지 말고, 기사에서 가장 자극적이거나 궁금증을 유발하는 한 가지 사실을 훅으로 뽑아서 '${titleDir || '감성형'}' 방식으로 작성
- 검색 키워드 나열 X
- 따옴표 독백 패턴 X (예: '어? 이게 왜?', '뭔가 이상한데...')

━━━ 본문 작성 ━━━
[글 스타일]: ${style || '스토리텔링'}
[분량]: ${charGuide}
${audienceGuide ? audienceGuide : ''}
[본문 작성 규칙]
- 도입부: 독자에게 말 걸듯 시작 — 블로거 본인의 생각이나 시각이 담기면 됨, 구어체로 작성
- 본문: '${style || '스토리텔링'}' 스타일로, 짧은 문단·질문형 전개·시각적 구분
- 체류시간: 정보 + 블로거 시각 혼합 구조
- 마무리: 공유·댓글 유도${snippet ? `\n[참고 기사 — 활용 방식]\n${snippet}\n→ 뉴스처럼 보도·요약 X. 이 정보를 발견한 블로거가 독자에게 말 걸듯 전달하는 방식으로 활용` : ''}${notes ? `\n[더 담을 내용]\n${notes}` : ''}

━━━ 해시태그 ━━━
${hashtagLine || '관련 해시태그 5~7개'}

위 내용을 반영해서 제목부터 해시태그까지 완성해줘.`

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
