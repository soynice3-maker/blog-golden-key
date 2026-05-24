import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'

// 네이버 숏텐츠 실제 탭 이름 기준 (없으면 null → 숏텐츠 섹션 스킵)
const SHORTENTS_CATEGORIES: Record<string, string | null> = {
  travel: '여행맛집 종합',
  food: '맛집/카페',
  fashion: '패션뷰티 종합',
  beauty: '뷰티',
  living: '리빙푸드 종합',
  game: '게임',
  sports: '스포츠 종합',
  entertain: '엔터 종합',
  movie: '영화',
  business: '경제 종합',
  auto: '자동차',
  // 매칭 없는 카테고리
  tech_it: null,
  parenting: null,
  health: null,
  pet: null,
  book: null,
  education: null,
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  if (!category) return NextResponse.json({ error: '카테고리 없음' }, { status: 400 })

  const shortentsCategory = SHORTENTS_CATEGORIES[category]

  if (!shortentsCategory) {
    return NextResponse.json({ shortentsTitles: [] })
  }

  try {
    const res = await fetch(
      `${CRAWLER_URL}/shortents?query=${encodeURIComponent(shortentsCategory)}`,
      { signal: AbortSignal.timeout(20000) }
    )
    const data = await res.json()
    return NextResponse.json({ shortentsTitles: data.titles || [] })
  } catch {
    return NextResponse.json({ shortentsTitles: [] })
  }
}
