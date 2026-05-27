import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildPromptText(
  keyword: string,
  subKeywords: string,
  topic: string,
  notes: string,
  kd: any,
  cd: any,
  a: any,
  postType: string
): string {
  const kw = keyword.trim()
  const titles = cd?.allTitles?.slice(0, 5).map((t: any, i: number) => `  ${i + 1}. ${t.title}`) || []
  const blocks = a?.smartBlocks?.join(', ') || '블로그 VIEW'
  const hashtags = a?.topHashtags?.slice(0, 10).map((h: any) => `#${h.tag}`).join(' ') || ''
  const insightLines = a?.insights?.map((ins: string) => `• ${ins}`).join('\n') || ''
  const titlePoints = a?.strategy?.titleStructure?.map((t: string) => `- ${t}`).join('\n') || ''
  const contentPoints = a?.strategy?.contentPoints?.map((p: string) => `- ${p}`).join('\n') || ''

  const subKwLine = subKeywords.trim()
    ? `\n서브 키워드: ${subKeywords.trim().split(/[,，\s]+/).filter(Boolean).join(', ')}`
    : ''

  const hasPlaceInfo = /가게명:|전화:|주소:|영업시간:/.test(notes)
  const kwPos = a && a.frontCount >= (a.titleTotal || 1) * 0.5 ? '앞부분' : '중반부'
  const kwForm = a && a.joinedCount > a.spacedCount ? kw.replace(/\s/g, '') : kw

  const postTypeGuide = postType === 'review'
    ? '글 유형: 후기·리뷰 — 직접 방문·사용한 경험을 중심으로, 솔직하고 생생한 구어체로 서술'
    : postType === 'info'
    ? '글 유형: 정보·가이드 — 독자에게 유용한 정보 중심으로, 명확하고 신뢰감 있는 문체로 구성'
    : postType === 'simple'
    ? '글 유형: 일상·기록 — 자연스러운 일상 기록 형식으로, 편안한 구어체로 서술'
    : ''

  return `네이버 SEO 상위노출 블로그 글 작성 요청

키워드: ${kw}${subKwLine}${topic ? `\n주제: ${topic}` : ''}${postTypeGuide ? `\n${postTypeGuide}` : ''}

━━━ 제목 작성 ━━━
[분석 데이터]
• 평균 길이: ${a?.avgTitleLength || '-'}자
• 키워드 위치: 제목 ${kwPos}
• 키워드 표기: '${kwForm}' 권장
• 자주 쓰인 수식어: ${a?.modifiers?.slice(0, 4).map((m: any) => m.word).join(', ') || '-'}

[참고 제목 — 절대 표절 금지, 길이·위치·수식어 패턴만 참고]
${titles.join('\n') || '  (없음)'}

[제목 작성 규칙]
- 위 참고 제목들을 표절하지 말고 패턴만 참고해서 완전히 새로운 제목을 써줘
${titlePoints}

━━━ 본문 작성 ━━━
[알고리즘 분석]
• 목표 글자수: ${a?.avgChars?.toLocaleString() || '-'}자 (공백·해시태그 제외)
• 이미지: ${a?.avgImages || '-'}장 이상
• 소제목: ${a?.avgHeadings || '-'}개 (이모지 또는 숫자형)
• 목표 블록: ${blocks}
• 키워드 등장: ${a?.avgKwCount || '-'}회 이상 (밀도 ${a?.avgKwDensity || '-'}‰)
• 키워드 첫 등장: ${a?.avgFirstPos || '-'}

[인사이트]
${insightLines || '  (없음)'}

[작성 포인트]
${contentPoints || '  (없음)'}

[작성 규칙]
- 인트로: 첫 200자 내 키워드 자연스럽게 등장${a && a.postsAnalyzed > 0 && a.introKwCount === a.postsAnalyzed ? ' (상위노출 글 전체 공통, 필수)' : a && a.introKwCount > 0 ? ' (상위노출 글 다수 공통, 권장)' : ''}${hasPlaceInfo ? '\n- 가게 기본 정보(가게명·주소·전화번호·영업시간)는 인트로 직후 방문 전 체크 섹션에 배치 (맨 아래 요약 박스 X, 본문 초반 필수)' : ''}
- 키워드 '${kwForm}' ${a?.avgKwCount || 5}회 이상, 밀도 ${a?.avgKwDensity || 3}‰ 수준으로 자연스럽게 반복
- 서브 키워드를 본문에 자연스럽게 포함
- 마크다운 헤더(##), HTML 태그 사용 금지
- 참고사항에 오타가 있으면 자연스럽게 수정해서 반영
${notes ? `\n[내 정보 / 참고사항]\n${notes}` : ''}

━━━ 해시태그 ━━━
아래 해시태그로 마무리해줘. 글자수는 해시태그 제외 ${a?.avgChars?.toLocaleString() || 2000}자 이상 기준:
${hashtags || '관련 해시태그 5~7개'}

위 분석 데이터를 반영해서 제목부터 해시태그까지 완성해줘.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = adminClient()
    const { data: planData } = await admin
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const isPro = planData?.plan === 'pro' || planData?.plan === 'biz'

    const { keyword, subKeywords, topic, notes, keywordData, crawlData, analysis, postType } = await request.json()

    const fullPrompt = buildPromptText(keyword, subKeywords, topic, notes, keywordData, crawlData, analysis, postType)

    if (isPro) {
      return NextResponse.json({ prompt: fullPrompt, isPro: true })
    }

    // 무료 유저: 제목 작성 섹션까지만 반환
    const lines = fullPrompt.split('\n')
    const cutIndex = lines.findIndex(l => l.includes('━━━ 본문 작성 ━━━'))
    const truncated = cutIndex > 0 ? lines.slice(0, cutIndex).join('\n') : lines.slice(0, 20).join('\n')

    return NextResponse.json({ prompt: truncated, isPro: false })
  } catch (e) {
    console.error('[build-prompt]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
