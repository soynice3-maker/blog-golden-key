import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function makeSignature(timestamp: string, method: string, path: string, secretKey: string) {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

export async function GET(request: NextRequest) {
  console.log('ENV CHECK:', {
    customerId: process.env.NAVER_API_CUSTOMER_ID,
    license: process.env.NAVER_API_ACCESS_LICENSE?.slice(0, 10),
    secret: process.env.NAVER_API_SECRET_KEY?.slice(0, 10),
  })

  const keyword = request.nextUrl.searchParams.get('keyword') || '압구정 맛집'
  
  const customerId = process.env.NAVER_API_CUSTOMER_ID!
  const accessLicense = process.env.NAVER_API_ACCESS_LICENSE!
  const secretKey = process.env.NAVER_API_SECRET_KEY!
  
  const timestamp = Date.now().toString()
  const method = 'GET'
  const path = '/keywordstool'
  const signature = makeSignature(timestamp, method, path, secretKey)

  const params = new URLSearchParams({
    hintKeywords: keyword,
    showDetail: '1'
  })

  const response = await fetch(`https://api.naver.com/keywordstool?${params}`, {
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': accessLicense,
      'X-Customer': customerId,
      'X-Signature': signature,
    }
  })

  const data = await response.json()
  return NextResponse.json(data)
}