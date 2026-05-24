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

const TITLE_EXAMPLES: Record<string, string[]> = {
  travel: [
    '발리 4박5일 여행 코스 지도 & 스노쿨링 후기',
    '경주 황리단길 신상 숙소 신라헌 한옥 예약정보 및 조식',
    '경주한옥숙소 10만원대 가성비 시은재 예약 후기',
    '경주 1박 2일 뚜벅이 여행 코스 (황리단길 한옥숙소, 맛집 추천)',
    '부산 해운대 맛집 신선도가 놀라운 미포횟집',
  ],
  fashion: [
    '5월 출근룩 데일리룩(더캐시미어, 써머레브, 시에, 베뉴엣)',
    '데일리룩 | 직장인 늦봄 출근룩 모음',
    '여름 코디｜지금 입기 좋은 여자 데일리룩 브랜드 BEST 5',
    '30대 일상 데일리룩 5월 코디 | 더로우 가방, 르메르 벨티드 호보백',
    '20대 첫 여자 명품가방 브랜드 추천 200만원대 생로랑 6가지 입문용 정리',
  ],
  beauty: [
    '드라이샴푸 내돈내산 올리브영 세일 추천템 바티스트 후기',
    '지성두피 관리 드라이샴푸 떡진 머리 사용법 비행기 수술 추천',
    '향 좋은 샴푸 추천 올리브영 샴푸 미용실 제품 실크테라피 내돈내산 후기',
    '여름 쿨톤 염색 추천 애쉬베이지',
    '쿨샴푸 추천 바디브 미오 마테 루트 샴푸 후기 올리브영 헤어케어 랭킹 1위의 이유',
  ],
  food: [
    '부산 해운대 맛집 건강한 한쌈 광안리 현지인 맛집',
    '광화문 디타워 맛집 호불호 없는 금성회관',
    '부산역 앞 맛집 이재모피자 주말 포장 웨이팅 후기',
    '부산 해운대 맛집 신선도가 놀라운 미포횟집',
    '경주 보문단지 갈비 맛집 보문갈비 내돈내산',
  ],
  tech_it: [
    '갤럭시북6 대신 갤럭시북5 프로 삼성 대학생 노트북 할인 추천하는 이유',
    'LG그램 노트북 추천 16인치 대화면 가성비 그램 써보니',
    '무선 블루투스 마우스 추천 지클릭커 오피스프로 버티컬',
    '사무실 마우스 추천 사무용 무선마우스 버티컬 내돈내산',
    '고등학생 노트북 저라면 레노버 아이디어패드5 삽니다 고성능 AMD 2in1 터치 추천',
  ],
  auto: [
    '셀프 세차용품 세트 로드위너 세차용품 18종 순서 방법',
    '봄 세차 준비 다이소 자동차 셀프 세차용품 3종 추천할 만한가',
    '핸드폰 네비게이션 추천 내비 앱스토어 카카오내비 주차부터 중고차까지',
    '테슬라를 위한 세차용품 초간편 습식코팅제 더클래스 워터에이징',
    '푸조2008 차량 네비게이션 추천 이제 안드로이드 입니다',
  ],
  living: [
    '시디즈 사무실의자 오래 써보니 결국 허리가 답이더라고요 내돈내산 후기',
    '삼성 로봇청소기 추천 기술력의 차이 드리미 솔직 후기',
    'LG 퓨리케어 공기청정기 추천 반값 구매 팁 거실 미세먼지 후기',
    '작은방 삼성 공기청정기 추천 가성비 블루스카이 5500',
    '미니 공기청정기 추천 자취방 평수도 추천 벤딕트',
  ],
  parenting: [
    '신생아 분유 추천 루비락 경험담',
    '국산 분유 추천 아이엠마더 60년 모유 연구로 완성된 분유',
    '아기띠 추천 올인원 힙시트 아이엔젤 닥터다이얼 3개월 후기',
    '신생아 디럭스 유모차 추천 어파베이비 비스타 V3 배시넷 컵홀더까지',
    '신생아용품 분유 추천 비교 끝에 선택한 국산분유',
  ],
  health: [
    '영양제 추천 면역력 높이는 비타민D 내돈내산 후기',
    '다이어트 식단 일주일 식단표 직접 해본 후기',
    '건강검진 전 주의사항 금식 시간 총정리',
    '피로회복 영양제 추천 직장인 필수 챙겨먹는 영양제',
    '혈당 낮추는 음식 추천 당뇨 식단 실천 후기',
  ],
  game: [
    '브롤스타즈 크로우 가젯 스타파워 기어 추천',
    '브롤스타즈 브롤패스 가격 인상 열쇠 시스템 완벽 분석',
    '스팀게임 추천 친구랑 함께하기 좋은 친구패스 게임 5가지',
    '닌텐도 스위치 게임 추천 5월 할인 게임 TOP3',
    '시작하면 1년 날아가는 싱글 PC RPG 게임 추천 TOP4',
  ],
  pet: [
    '고양이모래 종류 장단점 특징 비교 벤토나이트 실사용기',
    '강아지 사료 순위 비교 후 결정한 강아지 알러지 사료',
    '고양이 두부모래 추천 변기 막힘 문제 해결 방법',
    '강아지 사료 거부 시작된 우리 아이 식욕 부진 해결한 후기',
    '먼지없는 고양이모래 추천 마이도미넌트 벤토나이트',
  ],
  sports: [
    '2026 러닝화 계급도 초보 러너가 알파플라이를 사면 안 되는 이유',
    '아디다스 러닝화 추천 아디제로 보스턴13 에보슬 비교 사이즈 추천',
    '내돈내산 초보 러너 러닝화 추천 아디다스 아디제로 에보슬 착용 후기',
    '골프용품 볼마커 추천 방법 5가지 골프 매너 좋아 보입니다',
    '여성 골프웨어 브랜드 어뉴골프 스커트 모자 5월 봄 여자 골프복 추천',
  ],
  entertain: [
    '디즈니플러스 가격 절약 방법 OTT 공유로 월 3천원대',
    'SKT 디즈니플러스 요금제 종류 가격 혜택 총정리',
    '[BTS 방탄소년단] 월드투어 아리랑 라스베이거스 DAY1 막콘 셋리스트',
    '블랙핑크 리사 멧갈라 애프터파티 에스파 닝닝과 친목',
    'SKT 디즈니플러스 할인 방법 OTT 공유 서비스',
  ],
  movie: [
    '넷플릭스 무서운 영화 순위 추천 한국 TOP3',
    'MCU 뜻 순서 정리 마블 영화 보는 순서 페이즈1~페이즈5',
    '고독한 우주를 그린 해외 SF 영화 추천 마션 등 4편',
    '다 보고 나면 멍해지는 넷플릭스 디스토피아 SF 영화 추천 5편',
    '마블 영화 드라마 순서 2026 Ver.',
  ],
  book: [
    '웹소설 순위 추천 명작 모음 무료 사이트 플랫폼 비교 정리',
    '밀리의서재 전독시 완결 웹소설 추천 K-판타지 정주행 중',
    '완결 웹소설 추천 외투 작가의 판타지 소설 3선',
    '웹툰화되면 좋겠는 웹소설 추천 카카오페이지 리디 완결로판',
    '[로판웹소설 추천리뷰] 그 책에 마음을 주지 마세요 웹툰화 원작소설 후기',
  ],
  business: [
    '스타트업 마케팅 전략 초기 기업이 먼저 잡아야 할 실행법',
    '[망한 기업 리뷰] 옐로모바일 143개 스타트업 연합체의 허무한 엔딩',
    '자격증 추천 취업에 도움되는 자격증 순위 총정리',
    '비트코인 투자 방법 초보자가 알아야 할 기초 정리',
    '스타트업 지원사업 이번 주 마감 전 꼭 확인하세요',
  ],
  education: [
    '듀오링고 영어 공부 방법 하루 10분 3개월 후기',
    '공무원 시험 준비 처음 시작하는 방법 과목별 공부 순서',
    '영어 단어 외우는 법 직장인 실천 가능한 방법 총정리',
    '토익 900점 공부법 독학으로 한 달 만에 올린 후기',
    '공무원 시험 과목 선택 기준 이렇게 고르세요',
  ],
}

const TITLE_RULES: Record<string, string> = Object.fromEntries(
  Object.entries(TITLE_EXAMPLES).map(([cat, examples]) => [
    cat,
    `실제 상위노출 제목 예시 (이 형식과 동일한 스타일로 작성):\n${examples.map(e => `"${e}"`).join('\n')}`,
  ])
)

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

  const titleRules = TITLE_RULES[category] || '- 키워드를 제목 앞에 배치\n- 구체적인 정보 포함\n- 20~40자 내외\n- | 구분자 사용 금지'

  const prompt = `당신은 네이버 블로그 SEO 및 트렌드 전문가입니다.

[카테고리]
${categoryKr}

[현재 트렌딩 키워드 (검색량 상승 중)]
${trendKeywords.length > 0 ? trendKeywords.join(', ') : '데이터 준비 중'}

[황금 키워드 (검색량 대비 경쟁 낮음)]
${goldenKeywords.length > 0 ? goldenKeywords.join(' / ') : '데이터 준비 중'}

[이번 달 시즌 트렌드]
${seasonTopics.length > 0 ? seasonTopics.join(', ') : '데이터 준비 중'}

[제목 작성 규칙 — 절대 준수, 예외 없음]
아래 규칙은 네이버 ${categoryKr} 카테고리 실제 상위노출 제목 수십 개를 직접 크롤링해 분석한 결과입니다.
이 패턴에서 벗어난 형식(규칙에 없는 구분자, 클리셰 문구, 두 문장 연결 구조 등)은 절대 사용하지 마세요.
규칙에 명시된 형식만 사용하세요. 규칙에 없는 건 실제 상위노출 제목에 없다는 뜻입니다.

✅ ${categoryKr} 카테고리 실제 상위노출 제목 패턴:
${titleRules}

[요청]
위 데이터를 종합해 지금 당장 작성하면 네이버 상위 노출 가능성이 높은 블로그 글감 정확히 5개를 추천하세요.
트렌딩 키워드와 황금 키워드, 시즌성을 적절히 조합하세요.
각 글감마다:
- title: 위 ✅ 패턴을 반드시 따른 제목 (⛔ 금지 사항 철저히 준수)
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
