export async function getAutocomplete(keyword: string): Promise<string[]> {
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&st=111&frq=0&rc=100&r_format=json`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://search.naver.com/',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []
    const data = await response.json()

    // Format: [version, timestamp, [query], [[keyword, type], ...], status]
    if (Array.isArray(data) && Array.isArray(data[3])) {
      return (data[3] as any[])
        .map(item => (Array.isArray(item) ? String(item[0]) : String(item)))
        .filter(s => s.trim())
    }

    // Alternate format: { query, items: [[[kw, type], ...]] }
    if (data.items && Array.isArray(data.items[0])) {
      return (data.items[0] as any[])
        .map(item => (Array.isArray(item) ? String(item[0]) : String(item)))
        .filter(s => s.trim())
    }

    return []
  } catch {
    return []
  }
}
