interface KeywordGroup {
  groupName: string
  keywords: string[]
}

export interface TrendResult {
  groupName: string
  avgRatio: number
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function getSearchTrends(
  keywordGroups: KeywordGroup[],
  days = 7
): Promise<TrendResult[]> {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days)

  const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: 'date',
      keywordGroups,
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.log('[DataLab 에러]', response.status, errBody.slice(0, 300))
    throw new Error(`DataLab API 오류: ${response.status}`)
  }
  const data = await response.json()
  console.log('[DataLab 응답]', JSON.stringify(data).slice(0, 500))

  return (data.results || []).map((r: any) => ({
    groupName: r.title,
    avgRatio: r.data.length > 0
      ? r.data.reduce((s: number, d: any) => s + (d.ratio || 0), 0) / r.data.length
      : 0,
  }))
}

// 카테고리 키워드들을 DataLab API 형식으로 배치 처리 (최대 5그룹/요청)
export async function getTrendingKeywords(keywords: string[]): Promise<{ keyword: string; ratio: number }[]> {
  const results: { keyword: string; ratio: number }[] = []

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5)
    const groups: KeywordGroup[] = batch.map(kw => ({
      groupName: kw,
      keywords: [kw],
    }))

    try {
      const trends = await getSearchTrends(groups)
      trends.forEach(t => results.push({ keyword: t.groupName, ratio: t.avgRatio }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log('[DataLab 배치 에러]', msg)
      throw e  // 에러를 위로 전달
    }

    // 과도한 요청 방지
    if (i + 5 < keywords.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  return results.sort((a, b) => b.ratio - a.ratio)
}
