import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBlogCount } from '@/lib/naver-blog-api'
import { getCompetitionLevel } from '@/lib/competition'

// 하루에 처리할 키워드 수 (Naver Blog Search API 일 25,000건 한도 내)
const BATCH_SIZE = 5000

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()

  // 블로그 글수가 없거나 오래된 황금키워드 후보 우선 처리
  const { data: keywords, error } = await supabase
    .from('keywords')
    .select('id, keyword, total_volume')
    .is('blog_count', null)
    .gte('total_volume', 100)
    .order('total_volume', { ascending: false })
    .limit(BATCH_SIZE)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ message: '처리할 키워드 없음', updated: 0 })
  }

  let updated = 0

  for (const kw of keywords) {
    const blogCount = await getBlogCount(kw.keyword)
    if (blogCount === null) continue

    const comp = getCompetitionLevel(blogCount, kw.total_volume)
    const competitionRatio = kw.total_volume > 0 ? blogCount / kw.total_volume : null

    await supabase
      .from('keywords')
      .update({
        blog_count: blogCount,
        competition_ratio: competitionRatio,
        competition_label: comp.label,
        last_blog_update: new Date().toISOString(),
      })
      .eq('id', kw.id)

    updated++

    // 100ms 딜레이 (rate limit 방지)
    await new Promise(r => setTimeout(r, 100))
  }

  return NextResponse.json({ updated, total: keywords.length })
}
