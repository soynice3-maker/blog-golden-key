import crypto from 'crypto'

export interface RawKeywordStat {
  relKeyword: string
  monthlyPcQcCnt: number | string
  monthlyMobileQcCnt: number | string
}

export interface KeywordStat {
  keyword: string
  pcVolume: number
  mobileVolume: number
  totalVolume: number
}

function makeSignature(timestamp: string, method: string, path: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

function parseCount(val: number | string): number {
  if (typeof val === 'number') return val
  if (val === '<10') return 5
  return Number(val) || 0
}

export async function queryKeywords(hintKeywords: string[]): Promise<RawKeywordStat[]> {
  const customerId = process.env.NAVER_API_CUSTOMER_ID!
  const accessLicense = process.env.NAVER_API_ACCESS_LICENSE!
  const secretKey = process.env.NAVER_API_SECRET_KEY!

  const timestamp = Date.now().toString()
  const path = '/keywordstool'
  const signature = makeSignature(timestamp, 'GET', path, secretKey)

  const cleaned = hintKeywords.map(k => k.replace(/\s/g, ''))
  const params = new URLSearchParams({ hintKeywords: cleaned.join(','), showDetail: '1' })

  const response = await fetch(`https://api.naver.com/keywordstool?${params}`, {
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': accessLicense,
      'X-Customer': customerId,
      'X-Signature': signature,
    },
  })

  if (!response.ok) throw new Error(`네이버 검색광고 API 오류: ${response.status}`)
  const data = await response.json()
  return (data.keywordList || []) as RawKeywordStat[]
}

function findExact(results: RawKeywordStat[], keyword: string): KeywordStat {
  const cleanKeyword = keyword.replace(/\s/g, '').toLowerCase()
  const match = results.find(r => r.relKeyword.replace(/\s/g, '').toLowerCase() === cleanKeyword)
  if (match) {
    const pc = parseCount(match.monthlyPcQcCnt)
    const mobile = parseCount(match.monthlyMobileQcCnt)
    return { keyword, pcVolume: pc, mobileVolume: mobile, totalVolume: pc + mobile }
  }
  return { keyword, pcVolume: 0, mobileVolume: 0, totalVolume: 0 }
}

export async function getMainAndRelated(keyword: string): Promise<{
  main: KeywordStat
  related: KeywordStat[]
}> {
  const results = await queryKeywords([keyword])
  const main = findExact(results, keyword)
  const cleanKeyword = keyword.replace(/\s/g, '').toLowerCase()

  const related = results
    .filter(r => r.relKeyword.replace(/\s/g, '').toLowerCase() !== cleanKeyword)
    .map(r => {
      const pc = parseCount(r.monthlyPcQcCnt)
      const mobile = parseCount(r.monthlyMobileQcCnt)
      return { keyword: r.relKeyword, pcVolume: pc, mobileVolume: mobile, totalVolume: pc + mobile }
    })
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10)

  return { main, related }
}

export async function getStatsForKeywords(keywords: string[]): Promise<Map<string, KeywordStat>> {
  if (keywords.length === 0) return new Map()

  const statsMap = new Map<string, KeywordStat>()
  // Batch in groups of 5 to stay within API limits
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5)
    const results = await queryKeywords(batch)
    batch.forEach(kw => statsMap.set(kw, findExact(results, kw)))
  }
  return statsMap
}
