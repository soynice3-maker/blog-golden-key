// @ts-ignore
import googleTrends from 'google-trends-api'

const CATEGORY_MAP: Record<string, string[]> = {
  food: ['맛집', '음식', '카페', '식당', '레스토랑', '빵', '커피', '디저트', '치킨', '피자', '분식', '한식', '중식', '일식', '양식', '술집', '이자카야', '라멘', '파스타', '버거', '샌드위치', '도넛', '케이크', '아이스크림', '떡볶이', '순대', '고기', '삼겹살', '곱창', '쌀국수', '팥빙수', '젤라또', '크림'],
  travel: ['여행', '호텔', '펜션', '리조트', '관광', '숙소', '항공', '비행기', '해외여행', '국내여행', '투어', '캠핑', '글램핑', '제주', '부산', '강원', '경주', '전주', '서울 여행', '공항'],
  fashion: ['패션', '코디', '스타일', '브랜드', '신발', '가방', '의류', '아우터', '원피스', '자켓', '청바지', '니트', '트렌치코트', '스니커즈', '하이힐', '명품', '한정판'],
  beauty: ['화장품', '뷰티', '스킨케어', '메이크업', '향수', '선크림', '세럼', '마스크팩', '헤어', '미용', '파운데이션', '립스틱', '아이섀도', '클렌징', '토너', '로션', '에센스'],
  health: ['건강', '영양제', '다이어트', '헬스', '병원', '비타민', '보충제', '약', '한의원', '피부과', '성형', '체중', '근육', '단백질', '오메가3', '유산균', '콜라겐'],
  tech_it: ['IT', '테크', '스마트폰', '아이폰', '갤럭시', '노트북', '태블릿', '애플', '삼성', '앱', '게임', 'AI', '인공지능', '챗GPT', '유튜브', '넷플릭스', '스트리밍'],
  auto: ['자동차', '차', '전기차', 'SUV', '세단', '현대', '기아', '테슬라', 'BMW', '벤츠', '아우디', '중고차', '렌트카', '오토바이', '자전거'],
  living: ['인테리어', '리빙', '가구', '청소', '수납', '주방', '욕실', '소파', '침대', '조명', '화분', '식물', '원룸', '아파트', '이사'],
  parenting: ['육아', '아기', '임신', '출산', '어린이집', '유치원', '초등학교', '장난감', '유모차', '분유', '이유식', '아이', '어린이', '키즈'],
  game: ['게임', '롤', '리그오브레전드', '배그', '배틀그라운드', '오버워치', '마인크래프트', '포트나이트', 'PS5', '닌텐도', '스위치', 'PC방'],
  pet: ['강아지', '고양이', '펫', '반려동물', '애완', '사료', '동물병원', '강아지 옷', '고양이 용품', '반려견', '반려묘'],
  sports: ['운동', '축구', '야구', '농구', '테니스', '골프', '수영', '등산', '마라톤', '요가', '필라테스', '배드민턴', '스키', '서핑', '클라이밍'],
  entertain: ['연예인', '아이돌', '콘서트', '팬미팅', '드라마', '예능', '뮤직비디오', '컴백', '데뷔', '방탄소년단', 'BTS', '블랙핑크', '뉴진스', '아이브'],
  movie: ['영화', '개봉', '박스오피스', '넷플릭스', '디즈니', '마블', '애니메이션', '다큐', '공포영화', '로맨스영화', '액션영화'],
  book: ['책', '도서', '소설', '베스트셀러', '독서', '만화', '웹툰', '작가', '출판', '북클럽'],
  business: ['주식', '코인', '비트코인', '부동산', '경제', '재테크', '투자', '창업', '스타트업', '취업', '면접', '연봉', '부업', '사이드잡'],
  education: ['공부', '영어', '수능', '자격증', '토익', '토플', '학원', '과외', '유학', '어학연수', '일본어', '중국어', '스페인어'],
}

export function categorizeKeyword(keyword: string): string | null {
  const kw = keyword.toLowerCase()
  for (const [category, words] of Object.entries(CATEGORY_MAP)) {
    if (words.some(w => kw.includes(w.toLowerCase()))) {
      return category
    }
  }
  return null
}

export interface GoogleTrendItem {
  keyword: string
  category: string
  rank: number
}

export async function getDailyTrendingKeywords(): Promise<GoogleTrendItem[]> {
  try {
    const result = await googleTrends.dailyTrends({ geo: 'KR' })
    const data = JSON.parse(result)
    const stories = data?.default?.trendingSearchesDays?.[0]?.trendingSearches || []

    const items: GoogleTrendItem[] = []
    let rank = 1

    for (const story of stories) {
      const title: string = story.title?.query || ''
      const related: string[] = (story.relatedQueries || []).map((q: any) => q.query)
      const allKeywords = [title, ...related]

      for (const kw of allKeywords) {
        if (!kw) continue
        const category = categorizeKeyword(kw)
        if (category) {
          items.push({ keyword: kw, category, rank: rank++ })
          break // 스토리당 1개만
        }
      }
    }

    return items
  } catch {
    return []
  }
}
