import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { queryKeywords } from '@/lib/naver-ad-api'
import { getCompetitionLevel } from '@/lib/competition'

// 하루에 처리할 시드 수 (25,000 키워드 한도 기준, 시드당 평균 600개)
const SEEDS_PER_RUN = 40

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 헤더 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()

  // 아직 처리 안 된 시드 가져오기
  const { data: seeds, error } = await supabase
    .from('seed_keywords')
    .select('id, category, keyword')
    .is('built_at', null)
    .limit(SEEDS_PER_RUN)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!seeds || seeds.length === 0) {
    return NextResponse.json({ message: '모든 시드 처리 완료', processed: 0 })
  }

  let totalInserted = 0

  for (const seed of seeds) {
    try {
      const rawResults = await queryKeywords([seed.keyword])

      const keywordRows = rawResults.map(r => {
        const pc = typeof r.monthlyPcQcCnt === 'number' ? r.monthlyPcQcCnt : 5
        const mobile = typeof r.monthlyMobileQcCnt === 'number' ? r.monthlyMobileQcCnt : 5
        const total = pc + mobile
        return {
          keyword: r.relKeyword,
          category: seed.category,
          parent_seed: seed.keyword,
          pc_volume: pc,
          mobile_volume: mobile,
          total_volume: total,
          last_volume_update: new Date().toISOString(),
        }
      })

      if (keywordRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('keywords')
          .upsert(keywordRows, { onConflict: 'keyword', ignoreDuplicates: false })
        if (!upsertError) totalInserted += keywordRows.length
      }

      // 시드 처리 완료 표시
      await supabase
        .from('seed_keywords')
        .update({ built_at: new Date().toISOString() })
        .eq('id', seed.id)

    } catch (e) {
      console.error(`시드 처리 실패: ${seed.keyword}`, e)
    }
  }

  return NextResponse.json({
    processed: seeds.length,
    inserted: totalInserted,
    remaining: await getRemainingCount(supabase),
  })
}

async function getRemainingCount(supabase: ReturnType<typeof adminClient>) {
  const { count } = await supabase
    .from('seed_keywords')
    .select('*', { count: 'exact', head: true })
    .is('built_at', null)
  return count ?? 0
}
