'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export function SessionGuard() {
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    // 인증 플로우 페이지에서는 세션을 건드리지 않음
    if (pathname.startsWith('/auth/')) return

    const stayLoggedIn = localStorage.getItem('bgk-stay-logged-in')
    const sessionActive = sessionStorage.getItem('bgk-session-active')

    // 로그인 상태 유지 OFF + 브라우저 닫혔다 재시작된 경우 → 로그아웃
    if (stayLoggedIn === 'false' && !sessionActive) {
      supabase.auth.signOut()
    }
  }, [pathname])

  return null
}
