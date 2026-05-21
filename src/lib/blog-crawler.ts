const CRAWLER_URL = 'http://localhost:3001'

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
    const data: { keyword: string; blogCount: number | null }[] = await response.json()
    data.forEach(({ keyword, blogCount }) => map.set(keyword, blogCount))
  } catch {
    keywords.forEach(kw => map.set(kw, null))
  }

  return map
}
