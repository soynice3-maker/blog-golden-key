'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

function validatePassword(pw: string): string {
  if (!pw) return ''
  if (
    pw.length < 8 || pw.length > 16 ||
    !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) ||
    !/\d/.test(pw) ||
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
  ) return '8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해 주세요.'
  return ''
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'done'>('loading')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)
  const [pwConfirmTouched, setPwConfirmTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus('ready')
      } else {
        setStatus('error')
        setErrorMsg('링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 시도해주세요.')
      }
    })
  }, [])

  const pwError = pwTouched ? validatePassword(password) : ''
  const pwConfirmError = pwConfirmTouched && passwordConfirm && password !== passwordConfirm
    ? '비밀번호가 일치하지 않습니다.' : ''

  const handleSubmit = async () => {
    setPwTouched(true)
    setPwConfirmTouched(true)
    if (validatePassword(password) || password !== passwordConfirm) return

    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setStatus('done')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 text-center block">
        <div className="text-2xl font-bold text-gray-900">블로그황금키 🔑</div>
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm px-8 py-8 shadow-sm">
        {status === 'loading' && (
          <p className="text-center text-sm text-gray-500">확인 중...</p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
            <Link href="/login" className="text-sm text-blue-500 font-medium hover:text-blue-600">
              ← 로그인 페이지로
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <h2 className="text-lg font-bold text-center mb-6">새 비밀번호 설정</h2>

            <div className="mb-2">
              <div className={`border rounded-xl overflow-hidden focus-within:bg-blue-50 ${pwError ? 'border-red-400' : 'border-gray-300'}`}>
                <div className="flex items-center">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="새 비밀번호"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwTouched(true) }}
                    className={`flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 ${pwError ? 'text-red-500' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="pr-4 bg-transparent text-gray-400 hover:text-gray-600 self-stretch flex items-center">
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>
              {pwError
                ? <p className="text-xs text-red-500 mt-1 pl-1">• {pwError}</p>
                : <p className="text-xs text-gray-400 mt-1 pl-1">8~16자의 영문 대/소문자, 숫자, 특수문자</p>
              }
            </div>

            <div className="mb-5">
              <div className={`border rounded-xl overflow-hidden focus-within:bg-blue-50 ${pwConfirmError ? 'border-red-400' : 'border-gray-300'}`}>
                <div className="flex items-center">
                  <input
                    type={showPwConfirm ? 'text' : 'password'}
                    placeholder="새 비밀번호 확인"
                    value={passwordConfirm}
                    onChange={e => { setPasswordConfirm(e.target.value); setPwConfirmTouched(true) }}
                    className={`flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 ${pwConfirmError ? 'text-red-500' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="pr-4 bg-transparent text-gray-400 hover:text-gray-600 self-stretch flex items-center">
                    <EyeIcon open={showPwConfirm} />
                  </button>
                </div>
              </div>
              {pwConfirmError && <p className="text-xs text-red-500 mt-1 pl-1">• {pwConfirmError}</p>}
            </div>

            {errorMsg && <p className="text-xs text-red-500 text-center mb-3">{errorMsg}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '처리 중...' : '비밀번호 변경'}
            </button>
          </>
        )}

        {status === 'done' && (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-bold mb-2">비밀번호가 변경되었습니다</h2>
            <p className="text-sm text-gray-500 mb-6">새 비밀번호로 로그인해주세요.</p>
            <Link href="/login" className="block w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors text-center">
              로그인 페이지로
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
