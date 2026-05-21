import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const DAILY_LIMIT = 5

const CATEGORY_KR: Record<string, string> = {
  travel: '여행', fashion: '패션', beauty: '뷰티', food: '푸드',
  tech_it: 'IT테크', auto: '자동차', living: '리빙', parenting: '육아',
  health: '생활건강', game: '게임', pet: '동물·펫', sports: '운동·레저',
  entertain: '방송·연예', movie: '영화', book: '도서',
  business: '경제·비즈니스', education: '어학·교육',
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { category } = await request.json()
  if (!category) return NextResponse.json({ error: '카테고리를 선택해주세요' }, { status: 400 })

  // 사용량 한도 확인
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'trend_ideas')
    .gte('used_at', today.toISOString())

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `일일 한도(${DAILY_LIMIT}회)를 초과했습니다` }, { status: 429 })
  }

  const admin = adminClient()
  const todayStr = new Date().toISOString().split('T')[0]
  // 항상 다음 달 시즌 토픽 참조 (한 달 전 포스팅 준비용)
  const nextMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  const month = nextMonthDate.getMonth() + 1
  const year = nextMonthDate.getFullYear()
  const categoryKr = CATEGORY_KR[category] || category

  // 1. 트렌딩 키워드 (최근 7일, 해당 카테고리)
  const { data: trendRows } = await admin
    .from('trend_datalab')
    .select('keyword, ratio, rank')
    .eq('category', category)
    .gte('collected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('ratio', { ascending: false })
    .limit(10)

  // 2. 황금 키워드 (해당 카테고리, competition_label이 좋음 이상)
  const { data: goldenRows } = await admin
    .from('keywords')
    .select('keyword, total_volume, competition_label')
    .eq('category', category)
    .gte('total_volume', 1000)
    .lte('total_volume', 10000)
    .in('competition_label', ['매우좋음', '좋음'])
    .order('competition_ratio', { ascending: true })
    .limit(5)

  // 3. 시즌 토픽 (이번 달)
  const { data: seasonRows } = await admin
    .from('season_topics')
    .select('topic')
    .eq('month', month)
    .eq('year', year)
    .limit(5)

  const trendKeywords = (trendRows || []).map(r => r.keyword)
  const goldenKeywords = (goldenRows || []).map(r => `${r.keyword}(월 ${r.total_volume}회 검색, ${r.competition_label})`)
  const seasonTopics = (seasonRows || []).map(r => r.topic)

  if (trendKeywords.length === 0 && goldenKeywords.length === 0 && seasonTopics.length === 0) {
    return NextResponse.json({ error: '아직 수집된 트렌드 데이터가 없습니다. 내일 다시 시도해주세요.' }, { status: 404 })
  }

  const prompt = `당신은 네이버 블로그 SEO 및 트렌드 전문가입니다.

[카테고리]
${categoryKr}

[현재 트렌딩 키워드 (검색량 상승 중)]
${trendKeywords.length > 0 ? trendKeywords.join(', ') : '데이터 준비 중'}

[황금 키워드 (검색량 대비 경쟁 낮음)]
${goldenKeywords.length > 0 ? goldenKeywords.join(' / ') : '데이터 준비 중'}

[이번 달 시즌 트렌드]
${seasonTopics.length > 0 ? seasonTopics.join(', ') : '데이터 준비 중'}

[요청]
위 데이터를 종합해 지금 당장 작성하면 네이버 상위 노출 가능성이 높은 블로그 글감 5개를 추천하세요.
트렌딩 키워드와 황금 키워드, 시즌성을 적절히 조합하세요.
각 글감마다:
- title: 검색 의도에 부합하고 클릭률 높은 제목
- keywords: 활용할 핵심 키워드 2~3개 (배열)
- reason: 지금 이 주제를 써야 하는 이유 (1~2문장)
- points: 글에 들어갈 핵심 내용 3가지 (배열)

[출력 형식]
JSON만 반환. 다른 설명 없이.
{ "ideas": [{ "title": "...", "keywords": ["...", "..."], "reason": "...", "points": ["...", "...", "..."] }, ...] }`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 파싱 실패')
    const { ideas } = JSON.parse(jsonMatch[0])

    await supabase.from('usage_logs').insert({ user_id: user.id, feature: 'trend_ideas' })

    return NextResponse.json({
      ideas,
      meta: {
        category: categoryKr,
        trendKeywords,
        goldenKeywords: (goldenRows || []).map(r => r.keyword),
        seasonTopics,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '글감 생성 실패' }, { status: 500 })
  }
}
