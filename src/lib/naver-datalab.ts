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

// 키워드 트렌드 방향: 최근 7일 vs 이전 7일 비교
export async function getTrendDirection(keyword: string): Promise<{ direction: '상승' | '하락' | '유지'; changeRate: number }> {
  const groups = [{ groupName: keyword, keywords: [keyword] }]
  const [recent, previous] = await Promise.all([
    getSearchTrends(groups, 7).catch(() => null),
    getSearchTrends(groups, 14).catch(() => null),
  ])
  if (!recent || !previous) return { direction: '유지', changeRate: 0 }
  const recentScore = recent[0]?.avgRatio ?? 0
  const previousScore = Math.max((previous[0]?.avgRatio ?? 0) * 2 - recentScore, 0)
  if (previousScore === 0) return { direction: '유지', changeRate: 0 }
  const changeRate = ((recentScore - previousScore) / previousScore) * 100
  const direction = changeRate > 10 ? '상승' : changeRate < -10 ? '하락' : '유지'
  return { direction, changeRate: Math.round(changeRate) }
}

// 계절성: 12개월 데이터에서 피크 월 추출
export async function getSeasonality(keyword: string): Promise<{ peakMonths: number[]; note: string }> {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setFullYear(startDate.getFullYear() - 1)

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
      timeUnit: 'month',
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return { peakMonths: [], note: '' }
  const data = await response.json()
  const monthData: { period: string; ratio: number }[] = data.results?.[0]?.data || []
  if (monthData.length === 0) return { peakMonths: [], note: '' }

  const avg = monthData.reduce((s, d) => s + d.ratio, 0) / monthData.length
  const peakMonths = monthData
    .filter(d => d.ratio > avg * 1.3)
    .map(d => parseInt(d.period.split('-')[1]))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const note = peakMonths.length > 0
    ? `${peakMonths.map(m => monthNames[m - 1]).join(', ')}에 검색량이 높아요`
    : ''
  return { peakMonths, note }
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
