import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'damdamss@naver.com'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

// 카테고리별 시드 통계 조회 / 카테고리 내 키워드 목록
export async function GET(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = adminClient()
  const category = request.nextUrl.searchParams.get('category')

  if (category) {
    const { data: seeds } = await supabase
      .from('seed_keywords')
      .select('id, keyword, built_at')
      .eq('category', category)
      .order('keyword')
    return NextResponse.json({ seeds: seeds || [] })
  }

  const { data: seeds } = await supabase
    .from('seed_keywords')
    .select('category, built_at')
    .order('category')

  if (!seeds) return NextResponse.json({ stats: [] })

  const statsMap: Record<string, { total: number; pending: number }> = {}
  for (const seed of seeds) {
    if (!statsMap[seed.category]) statsMap[seed.category] = { total: 0, pending: 0 }
    statsMap[seed.category].total++
    if (!seed.built_at) statsMap[seed.category].pending++
  }

  const stats = Object.entries(statsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, counts]) => ({ category, ...counts }))

  const totalPending = stats.reduce((sum, s) => sum + s.pending, 0)

  return NextResponse.json({ stats, totalPending })
}

// 시드 추가
export async function POST(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keywords, category } = await request.json()
  if (!keywords || !category) {
    return NextResponse.json({ error: '키워드와 카테고리를 입력해주세요' }, { status: 400 })
  }

  const keywordList: string[] = keywords
    .split('\n')
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 0)

  if (keywordList.length === 0) {
    return NextResponse.json({ error: '유효한 키워드가 없습니다' }, { status: 400 })
  }

  const supabase = adminClient()

  // 중복 제거
  const { data: existing } = await supabase
    .from('seed_keywords')
    .select('keyword')
    .in('keyword', keywordList)

  const existingSet = new Set((existing || []).map(r => r.keyword))
  const newKeywords = keywordList.filter(k => !existingSet.has(k))

  if (newKeywords.length === 0) {
    return NextResponse.json({ message: '모두 이미 존재하는 시드예요', added: 0 })
  }

  const rows = newKeywords.map(keyword => ({ keyword, category, source: 'admin' }))
  const { error } = await supabase.from('seed_keywords').insert(rows)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ added: newKeywords.length, skipped: keywordList.length - newKeywords.length })
}

// 시드 삭제
export async function DELETE(request: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const supabase = adminClient()
  const { error } = await supabase.from('seed_keywords').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
