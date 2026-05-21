// Naver Blog Search API — 블로그 글수 조회 (Vercel 서버사이드용)
export async function getBlogCount(keyword: string): Promise<number | null> {
  try {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1`
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.total === 'number' ? data.total : null
  } catch {
    return null
  }
}

export async function getBlogCountsBatch(keywords: string[]): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>()
  // Sequential with small delay to respect rate limits
  for (const kw of keywords) {
    map.set(kw, await getBlogCount(kw))
    await new Promise(r => setTimeout(r, 100))
  }
  return map
}
