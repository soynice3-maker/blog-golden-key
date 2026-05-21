'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mode = 'login' | 'signup' | 'findPassword' | 'findId'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [findName, setFindName] = useState('')
  const [findPhone, setFindPhone] = useState('')
  const [foundEmail, setFoundEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const reset = (next: Mode) => {
    setMode(next)
    setMessage('')
    setEmail('')
    setPassword('')
    setFindName('')
    setFindPhone('')
    setFoundEmail('')
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    if (mode === 'findId') {
      if (!findName || findPhone.replace(/\D/g, '').length < 10) {
        setMessageType('error')
        setMessage('이름과 휴대전화번호를 모두 입력해주세요.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: findName, phone: findPhone }),
      })
      const data = await res.json()
      if (data.found) {
        setFoundEmail(data.email)
        setMessage('')
      } else {
        setMessageType('error')
        setMessage(data.message)
      }
      setLoading(false)
      return
    }

    if (mode === 'findPassword') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) {
        setMessageType('error')
        setMessage('이메일 주소를 확인해주세요.')
      } else {
        setMessageType('success')
        setMessage('비밀번호 재설정 링크를 이메일로 보냈습니다.')
      }
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessageType('error')
        setMessage(error.message)
      } else {
        setMessageType('success')
        setMessage('가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessageType('error')
        setMessage('이메일 또는 비밀번호가 틀렸습니다.')
      } else {
        localStorage.setItem('bgk-stay-logged-in', stayLoggedIn ? 'true' : 'false')
        sessionStorage.setItem('bgk-session-active', 'true')
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  const title = mode === 'login' ? '로그인' : mode === 'signup' ? '회원가입' : mode === 'findPassword' ? '비밀번호 찾기' : '아이디 찾기'
  const buttonLabel = loading ? '처리 중...' : title

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 text-center block">
        <div className="text-2xl font-bold text-gray-900">블로그황금키 🔑</div>
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm px-8 py-8 shadow-sm">
        {/* 입력 필드 그룹 */}
        {mode === 'findId' ? (
          <div className="mb-4 space-y-2">
            <div className="border border-gray-300 rounded-xl overflow-hidden">
              <input
                type="text"
                placeholder="이름"
                value={findName}
                onChange={e => setFindName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-4 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400"
              />
            </div>
            <div className="border border-gray-300 rounded-xl overflow-hidden">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="휴대전화번호"
                value={findPhone}
                onChange={e => setFindPhone(formatPhone(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-4 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400"
              />
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-xl overflow-hidden mb-4">
            <input
              type="email"
              placeholder="아이디(이메일)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-4 text-sm focus:outline-none focus:bg-blue-50 border-b border-gray-200 placeholder-gray-400"
            />
            {mode !== 'findPassword' && (
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-4 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400"
              />
            )}
          </div>
        )}

        {/* 로그인 상태 유지 (로그인 모드만) */}
        {mode === 'login' && (
          <label onClick={() => setStayLoggedIn(v => !v)} className="flex items-center gap-2 mb-5 cursor-pointer select-none">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${stayLoggedIn ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}
            >
              {stayLoggedIn && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-600">로그인 상태 유지</span>
          </label>
        )}

        {/* 제출 버튼 */}
        {!(mode === 'findId' && foundEmail) && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors mb-4"
          >
            {buttonLabel}
          </button>
        )}

        {/* 아이디 찾기 결과 */}
        {mode === 'findId' && foundEmail && (
          <div className="text-center mb-4 py-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">회원님의 아이디는</p>
            <p className="text-base font-bold text-blue-600 my-1">{foundEmail}</p>
            <p className="text-xs text-gray-400">입니다</p>
          </div>
        )}

        {/* 메시지 */}
        {message && (
          <p className={`text-center text-sm mb-3 ${messageType === 'success' ? 'text-blue-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        {/* 하단 링크 */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 mt-2">
          {mode === 'login' ? (
            <>
              <button onClick={() => reset('findPassword')} className="hover:text-gray-500 transition-colors font-medium text-gray-600">비밀번호찾기</button>
              <span>|</span>
              <button onClick={() => reset('findId')} className="hover:text-gray-500 transition-colors font-medium text-gray-600">아이디찾기</button>
              <span>|</span>
              <Link href="/signup" className="hover:text-gray-500 transition-colors font-medium text-gray-600">회원가입</Link>
            </>
          ) : (
            <button onClick={() => reset('login')} className="hover:text-gray-700 transition-colors">← 로그인으로 돌아가기</button>
          )}
        </div>
      </div>
    </div>
  )
}
