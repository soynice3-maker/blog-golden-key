import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCompetitionLevel } from '@/lib/competition'

function makeSignature(timestamp: string, method: string, path: string, secretKey: string) {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

async function getNaverSingleKeyword(keyword: string) {
  const customerId = process.env.NAVER_API_CUSTOMER_ID!
  const accessLicense = process.env.NAVER_API_ACCESS_LICENSE!
  const secretKey = process.env.NAVER_API_SECRET_KEY!

  const timestamp = Date.now().toString()
  const path = '/keywordstool'
  const signature = makeSignature(timestamp, 'GET', path, secretKey)

  const cleanKeyword = keyword.replace(/\s/g, '')
  const params = new URLSearchParams({ hintKeywords: cleanKeyword, showDetail: '1' })
  const response = await fetch(`https://api.naver.com/keywordstool?${params}`, {
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': accessLicense,
      'X-Customer': customerId,
      'X-Signature': signature,
    }
  })
  const data = await response.json()
  const list = data.keywordList || []

  console.log(`[${cleanKeyword}] 결과 개수: ${list.length}`)
  console.log(`[${cleanKeyword}] 전체 키워드:`, list.map((k: any) => k.relKeyword).join(', '))

  const cleanInput = cleanKeyword.toLowerCase()
  const exactMatch = list.find((k: any) =>
    k.relKeyword.replace(/\s/g, '').toLowerCase() === cleanInput
  )

  if (exactMatch) return exactMatch

  if (list.length > 0) {
    return { ...list[0], relKeyword: cleanKeyword }
  }

  return {
    relKeyword: cleanKeyword,
    monthlyPcQcCnt: 0,
    monthlyMobileQcCnt: 0,
    compIdx: '-',
  }
}

async function getBlogCounts(keywords: string[]) {
  const response = await fetch('http://localhost:3001/blog-counts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords })
  })
  return await response.json()
}

function calcResult(k: any, blogCountMap: Record<string, number>) {
  const pc = typeof k.monthlyPcQcCnt === 'number' ? k.monthlyPcQcCnt : 0
  const mobile = typeof k.monthlyMobileQcCnt === 'number' ? k.monthlyMobileQcCnt : 0
  const totalSearch = pc + mobile
  const blogCount = blogCountMap[k.relKeyword] ?? null
  const goldenScore = blogCount ? Math.round((totalSearch / blogCount) * 1000) / 1000 : null

  const comp = getCompetitionLevel(blogCount, totalSearch)
  return {
    keyword: k.relKeyword,
    pcSearch: pc,
    mobileSearch: mobile,
    totalSearch,
    blogCount,
    competition: k.compIdx,
    goldenScore,
    grade: `${comp.emoji} ${comp.label}`,
  }
}

export async function POST(request: NextRequest) {
  const { keywords } = await request.json()
  if (!keywords || !keywords.length) {
    return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
  }

  try {
    const inputDataList = await Promise.all(
      keywords.map((kw: string) => getNaverSingleKeyword(kw))
    )

    const allKeywords = inputDataList.map((k: any) => k.relKeyword)
    const blogCounts = await getBlogCounts(allKeywords)
    const blogCountMap: Record<string, number> = {}
    blogCounts.forEach((b: any) => { blogCountMap[b.keyword] = b.blogCount })

    const inputResults = inputDataList
      .map((k: any) => calcResult(k, blogCountMap))
      .sort((a: any, b: any) => (b.goldenScore ?? 0) - (a.goldenScore ?? 0))

    return NextResponse.json({ inputResults, relatedResults: [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}