export interface NicheRawPost {
  niche_slug: string
  source: string
  source_label: string
  title: string
  content_snippet: string | null
  url: string
  comment_count: number | null
  view_count: number | null
}

export const NICHE_SEARCH_KEYWORDS: Record<string, string[]> = {
  wedding: ['웨딩', '결혼준비', '스드메'],
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#[0-9]+;/g, '')
    .trim()
}

async function searchNaver(query: string, type: 'news' | 'blog' | 'cafearticle', display = 10): Promise<any[]> {
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Naver API ${type} error: ${res.status}`)
  const data = await res.json()
  return data.items || []
}

export async function fetchNaverSearchPosts(nicheSlug: string, keywords: string[]): Promise<NicheRawPost[]> {
  const posts: NicheRawPost[] = []
  const seen = new Set<string>()

  for (const kw of keywords) {
    try {
      const newsItems = await searchNaver(kw, 'news')
      for (const item of newsItems) {
        const url = item.originallink || item.link
        if (!url || seen.has(url)) continue
        seen.add(url)
        posts.push({
          niche_slug: nicheSlug,
          source: 'naver_search',
          source_label: '네이버 뉴스',
          title: stripHtml(item.title || ''),
          content_snippet: stripHtml(item.description || '') || null,
          url,
          comment_count: null,
          view_count: null,
        })
      }
      await new Promise(r => setTimeout(r, 200))

      const blogItems = await searchNaver(kw, 'blog')
      for (const item of blogItems) {
        const url = item.link
        if (!url || seen.has(url)) continue
        seen.add(url)
        posts.push({
          niche_slug: nicheSlug,
          source: 'naver_search',
          source_label: '네이버 블로그',
          title: stripHtml(item.title || ''),
          content_snippet: stripHtml(item.description || '') || null,
          url,
          comment_count: null,
          view_count: null,
        })
      }
      await new Promise(r => setTimeout(r, 200))

      const cafeItems = await searchNaver(kw, 'cafearticle')
      for (const item of cafeItems) {
        const url = item.link
        if (!url || seen.has(url)) continue
        seen.add(url)
        posts.push({
          niche_slug: nicheSlug,
          source: 'naver_cafe',
          source_label: item.cafename ? `${item.cafename}` : '네이버 카페',
          title: stripHtml(item.title || ''),
          content_snippet: stripHtml(item.description || '') || null,
          url,
          comment_count: null,
          view_count: null,
        })
      }
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      console.error(`[naver-search] 검색 실패 [${kw}]`, e)
    }
  }

  return posts
}
