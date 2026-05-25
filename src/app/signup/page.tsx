'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const DOMAINS = ['naver.com', 'daum.net', 'nate.com', 'gmail.com', 'direct']
const DOMAIN_LABELS: Record<string, string> = {
  'naver.com': 'naver.com', 'daum.net': 'daum.net',
  'nate.com': 'nate.com', 'gmail.com': 'gmail.com', 'direct': '직접입력',
}

const TERMS = [
  { id: 'service', label: '서비스 이용약관', required: true },
  { id: 'privacy', label: '개인정보 수집·이용', required: true },
  { id: 'marketing', label: '마케팅 정보 수신', required: false },
]

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken'
type OtpStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function validatePassword(pw: string): string {
  if (!pw) return ''
  if (pw.length < 8 || pw.length > 16 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
    return '비밀번호: 8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해 주세요.'
  return ''
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-blue-500 flex-shrink-0 mt-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
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

function CheckBadge({ status }: { status: CheckStatus }) {
  if (status === 'idle') return null
  if (status === 'checking') return <span className="text-xs text-gray-400">확인 중...</span>
  if (status === 'available') return <span className="text-xs text-blue-500 font-medium">✓ 사용 가능</span>
  return <span className="text-xs text-red-500 font-medium">✗ 사용 불가</span>
}

export default function SignupPage() {
  const [idLocal, setIdLocal] = useState('')
  const [domain, setDomain] = useState('naver.com')
  const [customDomain, setCustomDomain] = useState('')
  const [idStatus, setIdStatus] = useState<CheckStatus>('idle')
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle')
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [password, setPassword] = useState('')
  const [pwTouched, setPwTouched] = useState(false)
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [pwConfirmTouched, setPwConfirmTouched] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState<CheckStatus>('idle')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | ''>('')
  const [phone, setPhone] = useState('')

  const [termsOpen, setTermsOpen] = useState(false)
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const allAgreed = TERMS.every(t => agreed[t.id])
  const pwError = pwTouched ? validatePassword(password) : ''
  const pwConfirmError = pwConfirmTouched && passwordConfirm && password !== passwordConfirm
    ? '비밀번호와 비밀번호 확인이 일치하지 않습니다.' : ''

  const getFullEmail = () => `${idLocal}@${domain === 'direct' ? customDomain : domain}`

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const requestOtp = async () => {
    if (!idLocal || (domain === 'direct' && !customDomain)) {
      setErrors(p => ({ ...p, id: '아이디와 도메인을 입력해주세요.' })); return
    }
    setOtpStatus('sending')
    setErrors(p => ({ ...p, id: '' }))
    setOtpError('')
    try {
      const res = await fetch('/api/check-id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: getFullEmail() }) })
      const data = await res.json()
      if (!data.available) {
        setErrors(p => ({ ...p, id: data.message }))
        setOtpStatus('idle')
        return
      }
    } catch { setOtpStatus('idle'); return }

    const { error } = await supabase.auth.signInWithOtp({
      email: getFullEmail(),
      options: { shouldCreateUser: true },
    })
    if (error) {
      setErrors(p => ({ ...p, id: error.message }))
      setOtpStatus('idle')
    } else {
      setOtpStatus('sent')
      setOtpCode('')
      startCooldown(60)
    }
  }

  const confirmOtp = async () => {
    if (!otpCode) { setOtpError('인증번호를 입력해주세요.'); return }
    setOtpStatus('verifying')
    setOtpError('')
    const { error } = await supabase.auth.verifyOtp({
      email: getFullEmail(),
      token: otpCode,
      type: 'email',
    })
    if (error) {
      setOtpError('인증번호가 올바르지 않습니다. 다시 확인해주세요.')
      setOtpStatus('sent')
    } else {
      setOtpStatus('verified')
      setIdStatus('available')
    }
  }

  const checkNickname = async () => {
    if (!nickname) { setErrors(p => ({ ...p, nickname: '닉네임을 입력해주세요.' })); return }
    setNicknameStatus('checking')
    setErrors(p => ({ ...p, nickname: '' }))
    try {
      const res = await fetch('/api/check-nickname', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) })
      const data = await res.json()
      setNicknameStatus(data.available ? 'available' : 'taken')
      if (!data.available) setErrors(p => ({ ...p, nickname: data.message }))
    } catch { setNicknameStatus('idle') }
  }

  const toggleAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !allAgreed
    const newAgreed: Record<string, boolean> = {}
    TERMS.forEach(t => { newAgreed[t.id] = next })
    setAgreed(newAgreed)
  }

  const handleSignup = async () => {
    setPwTouched(true); setPwConfirmTouched(true)
    const newErrors: Record<string, string> = {}
    if (!idLocal) newErrors.id = '아이디는 필수 입력 항목입니다.'
    else if (otpStatus !== 'verified') newErrors.id = '이메일 인증을 완료해주세요.'
    const pwErr = validatePassword(password)
    if (pwErr) newErrors.password = pwErr
    if (password !== passwordConfirm) newErrors.passwordConfirm = '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
    if (!name) newErrors.name = '이름은 필수 입력 항목입니다.'
    if (!nickname) newErrors.nickname = '닉네임은 필수 입력 항목입니다.'
    else if (nicknameStatus !== 'available') newErrors.nickname = '닉네임 중복확인을 완료해주세요.'
    if (birthdate.length > 0 && birthdate.length < 8) newErrors.birthdate = '생년월일 8자리를 입력해주세요.'
    if (!gender) newErrors.gender = '성별을 선택해주세요.'
    if (phone.replace(/\D/g, '').length < 10) newErrors.phone = '휴대전화번호를 입력해주세요.'
    if (!TERMS.filter(t => t.required).every(t => agreed[t.id])) newErrors.terms = '필수 약관에 동의해주세요.'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    const { error: dataError } = await supabase.auth.updateUser({
      data: { name, nickname, gender, birthdate, phone, marketing: agreed['marketing'] ?? false },
    })
    if (dataError) { setErrors({ submit: dataError.message }); setLoading(false); return }

    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) setErrors({ submit: pwError.message })
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm px-8 py-10 shadow-sm text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-bold mb-2">가입이 완료되었습니다!</h2>
          <p className="text-sm text-gray-500 mb-6"><span className="font-medium text-gray-700">{getFullEmail()}</span>으로<br />가입하셨습니다. 지금 바로 시작하세요.</p>
          <Link href="/login" className="block w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors">로그인 페이지로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-6 block text-center">
        <div className="text-2xl font-bold text-gray-900">블로그황금키 🔑</div>
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm px-8 py-8 shadow-sm">
        <h2 className="text-lg font-bold text-center mb-5">회원가입</h2>
        <div className="flex items-center gap-1 justify-end mb-4">
          <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-gray-400">표시는 필수 입력 항목입니다</span>
        </div>

        {/* 아이디 */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1 min-w-0">
              <div className={`border rounded-xl overflow-hidden focus-within:bg-blue-50 ${errors.id ? 'border-red-400' : otpStatus === 'verified' ? 'border-blue-400' : 'border-gray-300'}`}>
                <div className="flex items-center min-w-0">
                  <input type="text" placeholder="아이디" value={idLocal}
                    disabled={otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'verified'}
                    onChange={e => { setIdLocal(e.target.value); setOtpStatus('idle'); setErrors(p => ({ ...p, id: '' })) }}
                    className="flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 min-w-0 disabled:text-gray-400" />
                  <span className="text-gray-400 text-sm px-1 flex-shrink-0">@</span>
                  {domain === 'direct' ? (
                    <>
                      <input type="text" placeholder="도메인 직접입력" value={customDomain}
                        disabled={otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'verified'}
                        onChange={e => { setCustomDomain(e.target.value); setOtpStatus('idle') }}
                        className="flex-1 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 min-w-0 disabled:text-gray-400" />
                      <button type="button" onClick={() => { setDomain('naver.com'); setCustomDomain(''); setOtpStatus('idle') }}
                        disabled={otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'verified'}
                        className="pr-3 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 disabled:opacity-40">✕</button>
                    </>
                  ) : (
                    <div className="relative w-28 flex-shrink-0">
                      <select value={domain}
                        disabled={otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'verified'}
                        onChange={e => { setDomain(e.target.value); setCustomDomain(''); setOtpStatus('idle') }}
                        className="w-full appearance-none pl-2 pr-6 py-3.5 text-sm text-gray-500 focus:outline-none bg-transparent cursor-pointer disabled:cursor-default disabled:opacity-60">
                        {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* 인증요청 / 인증완료 버튼 */}
              {otpStatus !== 'verified' && (
                <button type="button" onClick={requestOtp}
                  disabled={otpStatus === 'sending' || otpStatus === 'verifying'}
                  className="mt-1.5 w-full py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                  {otpStatus === 'sending' ? '발송 중...' : otpStatus === 'sent' ? `인증번호 재발송${resendCooldown > 0 ? ` (${resendCooldown}s)` : ''}` : '인증요청'}
                </button>
              )}
              {otpStatus === 'verified' && (
                <div className="mt-1.5 w-full py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-500 text-center">
                  ✓ 인증완료
                </div>
              )}

              {/* OTP 입력란 */}
              {(otpStatus === 'sent' || otpStatus === 'verifying') && (
                <div className="mt-2">
                  <div className={`border rounded-xl overflow-hidden flex items-center focus-within:bg-blue-50 ${otpError ? 'border-red-400' : 'border-gray-300'}`}>
                    <input type="text" inputMode="numeric" placeholder="인증번호 입력" value={otpCode} maxLength={8}
                      onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                      className="flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400" />
                    <button type="button" onClick={confirmOtp} disabled={otpStatus === 'verifying'}
                      className="px-4 py-3.5 text-xs font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex-shrink-0">
                      {otpStatus === 'verifying' ? '확인 중...' : '확인'}
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-red-500 mt-1 pl-1">• {otpError}</p>}
                </div>
              )}

              {errors.id && <p className="text-xs text-red-500 mt-1 pl-1">• {errors.id}</p>}
            </div>
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="mb-1">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className={`border rounded-xl overflow-hidden focus-within:bg-blue-50 ${pwError ? 'border-red-400' : 'border-gray-300'}`}>
                <div className="flex items-center">
                  <input type={showPw ? 'text' : 'password'} placeholder="비밀번호" value={password}
                    onChange={e => { setPassword(e.target.value); setPwTouched(true) }}
                    className={`flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 ${pwError ? 'text-red-500' : ''}`} />
                  {pwError && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded mr-1 whitespace-nowrap">사용불가</span>}
                  <button type="button" onClick={() => setShowPw(v => !v)} className="pr-4 bg-transparent text-gray-400 hover:text-gray-600 self-stretch flex items-center">
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>
              {pwError
                ? <p className="text-xs text-red-500 mt-1 pl-1">• {pwError}</p>
                : <p className="text-xs text-gray-400 mt-1 pl-1">8~16자의 영문 대/소문자, 숫자, 특수문자</p>}
            </div>
          </div>
        </div>

        {/* 비밀번호 확인 */}
        <div className="mb-3 mt-2">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className={`border rounded-xl overflow-hidden focus-within:bg-blue-50 ${pwConfirmError ? 'border-red-400' : 'border-gray-300'}`}>
                <div className="flex items-center">
                  <input type={showPwConfirm ? 'text' : 'password'} placeholder="비밀번호 확인" value={passwordConfirm}
                    onChange={e => { setPasswordConfirm(e.target.value); setPwConfirmTouched(true) }}
                    className={`flex-1 px-4 py-3.5 text-sm focus:outline-none bg-transparent placeholder-gray-400 ${pwConfirmError ? 'text-red-500' : ''}`} />
                  <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="pr-4 bg-transparent text-gray-400 hover:text-gray-600 self-stretch flex items-center">
                    <EyeIcon open={showPwConfirm} />
                  </button>
                </div>
              </div>
              {pwConfirmError && <p className="text-xs text-red-500 mt-1 pl-1">• {pwConfirmError}</p>}
            </div>
          </div>
        </div>

        {/* 이름 */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className={`border rounded-xl overflow-hidden ${errors.name ? 'border-red-400' : 'border-gray-300'}`}>
                <input type="text" placeholder="이름" value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                  className="w-full px-4 py-3.5 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400" />
              </div>
              {errors.name
                ? <p className="text-xs text-red-500 mt-1 pl-1">• {errors.name}</p>
                : <p className="text-xs text-gray-400 mt-1 pl-1">실명으로 입력해 주세요.</p>
              }
            </div>
          </div>
        </div>

        {/* 닉네임 */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className="flex items-center justify-end mb-1">
                <CheckBadge status={nicknameStatus} />
              </div>
              <div className={`border rounded-xl overflow-hidden ${errors.nickname || nicknameStatus === 'taken' ? 'border-red-400' : nicknameStatus === 'available' ? 'border-blue-400' : 'border-gray-300'}`}>
                <input type="text" placeholder="닉네임" value={nickname}
                  onChange={e => { setNickname(e.target.value); setNicknameStatus('idle'); setErrors(p => ({ ...p, nickname: '' })) }}
                  className="w-full px-4 py-3.5 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400" />
              </div>
              <button type="button" onClick={checkNickname} disabled={nicknameStatus === 'checking' || nicknameStatus === 'available'}
                className={`mt-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors ${nicknameStatus === 'available' ? 'bg-blue-50 text-blue-500 cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                {nicknameStatus === 'available' ? '✓ 사용 가능' : nicknameStatus === 'checking' ? '확인 중...' : '중복확인'}
              </button>
              {errors.nickname
                ? <p className="text-xs text-red-500 mt-1 pl-1">• {errors.nickname}</p>
                : <p className="text-xs text-gray-400 mt-1 pl-1">서비스 내 표시 이름</p>
              }
            </div>
          </div>
        </div>

        {/* 생년월일 */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className={`border rounded-xl overflow-hidden ${(errors.birthdate || (birthdate.length > 0 && birthdate.length < 8)) ? 'border-red-400' : 'border-gray-300'}`}>
                <input type="text" inputMode="numeric" placeholder="생년월일 8자리 (예: 19900101)" value={birthdate}
                  onChange={e => { setBirthdate(e.target.value.replace(/\D/g, '').slice(0, 8)); setErrors(p => ({ ...p, birthdate: '' })) }}
                  className="w-full px-4 py-3.5 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400" />
              </div>
              {(errors.birthdate || (birthdate.length > 0 && birthdate.length < 8)) && (
                <p className="text-xs text-red-500 mt-1 pl-1">• 숫자 8자리 형식으로 입력해주세요.</p>
              )}
            </div>
          </div>
        </div>

        {/* 성별 */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className="flex gap-2">
                {(['M', 'F'] as const).map(g => (
                  <button key={g} type="button" onClick={() => { setGender(g); setErrors(p => ({ ...p, gender: '' })) }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${gender === g ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
                    {g === 'M' ? '남자' : '여자'}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-red-500 mt-1 pl-1">• {errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* 휴대전화번호 (필수) */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1">
              <div className={`border rounded-xl overflow-hidden ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}>
                <input type="tel" inputMode="numeric" placeholder="휴대전화번호" value={phone}
                  onChange={e => { setPhone(formatPhone(e.target.value)); setErrors(p => ({ ...p, phone: '' })) }}
                  className="w-full px-4 py-3.5 text-sm focus:outline-none focus:bg-blue-50 placeholder-gray-400" />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1">• {errors.phone}</p>}
            </div>
          </div>
        </div>

        {/* 약관 동의 */}
        <div className="flex items-start gap-2 mb-2">
          <CheckIcon />
          <div className="flex-1 min-w-0">
            <div className={`border rounded-xl overflow-hidden ${errors.terms ? 'border-red-400' : 'border-gray-300'}`}>
              <button type="button" onClick={() => setTermsOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div onClick={toggleAll}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${allAgreed ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {allAgreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="text-sm"><span className="text-blue-500 font-semibold">[필수]</span> 인증 약관 전체동의</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${termsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {termsOpen && (
                <div className="border-t border-gray-200 px-4 py-4 grid grid-cols-2 gap-y-4 gap-x-2">
                  {TERMS.map(term => (
                    <button key={term.id} type="button"
                      onClick={() => { setAgreed(p => ({ ...p, [term.id]: !p[term.id] })); setErrors(p => ({ ...p, terms: '' })) }}
                      className="flex items-center gap-2 text-left">
                      <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${agreed[term.id] ? 'text-blue-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-gray-600">{term.required ? '' : '[선택] '}{term.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.terms && <p className="text-xs text-red-500 mt-1 pl-1">• {errors.terms}</p>}
          </div>
        </div>
        {errors.submit && <p className="text-sm text-center text-red-500 mb-3">{errors.submit}</p>}

        <button type="button" onClick={handleSignup} disabled={loading}
          className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors mb-4 mt-2">
          {loading ? '처리 중...' : '회원가입'}
        </button>

        <p className="text-center text-xs text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-500 font-medium hover:text-blue-600">로그인</Link>
        </p>
      </div>
    </div>
  )
}
