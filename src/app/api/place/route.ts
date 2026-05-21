import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL이 없습니다' }, { status: 400 })

  try {
    const res = await fetch(`http://localhost:3001/extract-place?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: '크롤러 서버에 연결할 수 없습니다' }, { status: 500 })
  }
}
