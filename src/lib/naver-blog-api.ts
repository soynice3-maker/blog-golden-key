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

// Naver Blog Search API — 검색 결과 목록 + 내 글 순위 찾기
export interface BlogSearchItem {
  title: string         // HTML 태그 포함 (<b>강조</b>)
  link: string
  description: string
  bloggername: string
  bloggerlink: string
  postdate: string
}

// URL 정규화 (host + path)
function normalizeUrl(url: string): string {
  if (!url) return ''
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.host.replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '')
    return `${host}${path}`.toLowerCase()
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
  }
}

function matchesUrl(searchResultLink: string, targetUrl: string): boolean {
  const a = normalizeUrl(searchResultLink)
  const b = normalizeUrl(targetUrl)
  if (!a || !b) return false
  return a === b || a.startsWith(b + '/') || b.startsWith(a + '/')
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

// 키워드 검색 + 타겟 URL 순위 + 상위 N개 글 목록 반환
export async function searchBlogAndFindRank(
  keyword: string,
  targetUrl?: string,
  topN: number = 10
): Promise<{
  rank: number | null
  matchedTitle: string | null
  topPosts: Array<{ rank: number; title: string; url: string; description: string }>
  totalResults: number
}> {
  try {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=30&sort=sim`
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { rank: null, matchedTitle: null, topPosts: [], totalResults: 0 }

    const data = await res.json()
    const items: BlogSearchItem[] = data.items || []

    let rank: number | null = null
    let matchedTitle: string | null = null

    items.forEach((item, idx) => {
      if (rank === null && targetUrl && matchesUrl(item.link, targetUrl)) {
        rank = idx + 1
        matchedTitle = stripHtml(item.title)
      }
    })

    const topPosts = items.slice(0, topN).map((item, idx) => ({
      rank: idx + 1,
      title: stripHtml(item.title),
      url: item.link,
      description: stripHtml(item.description),
    }))

    return {
      rank,
      matchedTitle,
      topPosts,
      totalResults: data.total || 0,
    }
  } catch {
    return { rank: null, matchedTitle: null, topPosts: [], totalResults: 0 }
  }
}
