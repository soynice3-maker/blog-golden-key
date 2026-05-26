import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}*@${domain}`
  const visibleEnd = 1
  const visibleStart = local.length <= 4 ? 1 : 2
  const masked = '*'.repeat(local.length - visibleStart - visibleEnd)
  return `${local.slice(0, visibleStart)}${masked}${local.slice(-visibleEnd)}@${domain}`
}

export async function POST(req: Request) {
  const { name, phone } = await req.json()
  if (!name || !phone) {
    return NextResponse.json({ found: false, message: '이름과 휴대전화번호를 입력해 주세요.' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ found: false, message: '서비스 오류가 발생했습니다.' })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    return NextResponse.json({ found: false, message: '조회 중 오류가 발생했습니다.' })
  }

  const phoneDigits = phone.replace(/\D/g, '')
  const user = data.users.find(u => {
    const meta = u.user_metadata
    return meta?.name === name && meta?.phone?.replace(/\D/g, '') === phoneDigits
  })

  if (!user?.email) {
    return NextResponse.json({ found: false, message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' })
  }

  return NextResponse.json({ found: true, email: maskEmail(user.email) })
}
