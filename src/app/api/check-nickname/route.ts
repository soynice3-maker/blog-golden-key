import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { nickname } = await req.json()
  if (!nickname) return NextResponse.json({ available: false, message: '닉네임을 입력해 주세요.' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ available: true, message: '사용 가능한 닉네임입니다.' })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return NextResponse.json({ available: false, message: '확인 중 오류가 발생했습니다.' })

  const taken = data.users.some(u => u.user_metadata?.nickname === nickname)
  return NextResponse.json({
    available: !taken,
    message: taken ? '이미 사용 중인 닉네임입니다.' : '사용 가능한 닉네임입니다.',
  })
}
