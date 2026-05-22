import { getBlogCountsBatch } from './naver-blog-api'

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001'

export async function getBlogCounts(keywords: string[]): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>()
  if (keywords.length === 0) return map

  try {
    const response = await fetch(`${CRAWLER_URL}/blog-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords }),
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error('crawler error')
    const data: { keyword: string; blogCount: number | null }[] = await response.json()
    data.forEach(({ keyword, blogCount }) => map.set(keyword, blogCount))
  } catch {
    // 크롤러 없을 때 네이버 블로그 검색 API로 폴백
    return getBlogCountsBatch(keywords)
  }

  return map
}
