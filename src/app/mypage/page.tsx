'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

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

type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'unchanged'

export default function MyPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  // 프로필
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [originalNickname, setOriginalNickname] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>('unchanged')
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | ''>('')
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // 비밀번호 변경
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showNewPwConfirm, setShowNewPwConfirm] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)
  const [pwConfirmTouched, setPwConfirmTouched] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const m = user.user_metadata
setUserEmail(user.email ?? '')
      setName(m?.name ?? '')
      setNickname(m?.nickname ?? '')
      setOriginalNickname(m?.nickname ?? '')
      setPhone(m?.phone ?? '')
      setBirthdate(m?.birthdate ?? '')
      setGender(m?.gender ?? '')
      setLoading(false)
    })
  }, [])

  const handleNicknameChange = (val: string) => {
    setNickname(val)
    setNicknameStatus(val === originalNickname ? 'unchanged' : 'idle')
    setProfileErrors(p => ({ ...p, nickname: '' }))
  }

  const checkNickname = async () => {
    if (!nickname) { setProfileErrors(p => ({ ...p, nickname: '닉네임을 입력해 주세요.' })); return }
    setNicknameStatus('checking')
    const res = await fetch('/api/check-nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const data = await res.json()
    setNicknameStatus(data.available ? 'available' : 'taken')
    if (!data.available) setProfileErrors(p => ({ ...p, nickname: data.message }))
  }

  const handleSaveProfile = async () => {
    const errors: Record<string, string> = {}
    if (!name) errors.name = '이름을 입력해 주세요.'
    if (!nickname) errors.nickname = '닉네임을 입력해 주세요.'
    else if (nickname !== originalNickname && nicknameStatus !== 'available') {
      errors.nickname = '닉네임 중복확인을 완료해주세요.'
    }
    if (phone && phone.replace(/\D/g, '').length < 10) errors.phone = '올바른 휴대전화번호를 입력해 주세요.'
    if (birthdate.length > 0 && birthdate.length < 8) errors.birthdate = '생년월일 8자리를 입력해 주세요.'
    setProfileErrors(errors)
    if (Object.keys(errors).length > 0) return

    setProfileSaving(true)
    setProfileSuccess(false)
    const { error } = await supabase.auth.updateUser({
      data: { name, nickname, phone, birthdate, gender },
    })
    if (error) {
      setProfileErrors({ submit: error.message })
    } else {
      setOriginalNickname(nickname)
      setNicknameStatus('unchanged')
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setProfileSaving(false)
  }

  const handleChangePw = async () => {
    setPwTouched(true)
    setPwConfirmTouched(true)
    const err = validatePassword(newPw)
    if (err || newPw !== newPwConfirm) return
    setPwSaving(true)
    setPwError('')
    setPwSuccess(false)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSuccess(true)
      setNewPw('')
      setNewPwConfirm('')
      setPwTouched(false)
      setPwConfirmTouched(false)
      setTimeout(() => setPwSuccess(false), 3000)
    }
    setPwSaving(false)
  }

  const newPwValidationError = pwTouched ? validatePassword(newPw) : ''
  const newPwConfirmError = pwConfirmTouched && newPwConfirm && newPw !== newPwConfirm
    ? '비밀번호가 일치하지 않습니다.' : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">블로그황금키 🔑</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{userEmail}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-gray-400 hover:text-gray-600"
          >로그아웃</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold">마이페이지</h1>

        {/* 프로필 수정 */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-6">
          <h2 className="text-base font-bold mb-5">프로필 수정</h2>

          {/* 이름 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">이름</label>
            <div className={`border rounded-xl overflow-hidden ${profileErrors.name ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type="text" placeholder="이름" value={name}
                onChange={e => { setName(e.target.value); setProfileErrors(p => ({ ...p, name: '' })) }}
                className="w-full px-4 py-3 text-sm focus:outline-none placeholder-gray-400" />
            </div>
            {profileErrors.name && <p className="text-xs text-red-500 mt-1 pl-1">• {profileErrors.name}</p>}
          </div>

          {/* 닉네임 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">닉네임</label>
            <div className={`border rounded-xl overflow-hidden ${profileErrors.nickname || nicknameStatus === 'taken' ? 'border-red-400' : nicknameStatus === 'available' ? 'border-blue-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type="text" placeholder="닉네임" value={nickname}
                onChange={e => handleNicknameChange(e.target.value)}
                className="w-full px-4 py-3 text-sm focus:outline-none placeholder-gray-400" />
            </div>
            {nickname !== originalNickname && (
              <button type="button" onClick={checkNickname}
                disabled={nicknameStatus === 'checking' || nicknameStatus === 'available'}
                className={`mt-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors ${nicknameStatus === 'available' ? 'bg-blue-50 text-blue-500 cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                {nicknameStatus === 'available' ? '✓ 사용 가능' : nicknameStatus === 'checking' ? '확인 중...' : '중복확인'}
              </button>
            )}
            {profileErrors.nickname && <p className="text-xs text-red-500 mt-1 pl-1">• {profileErrors.nickname}</p>}
          </div>

          {/* 휴대전화번호 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">휴대전화번호</label>
            <div className={`border rounded-xl overflow-hidden ${profileErrors.phone ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type="tel" inputMode="numeric" placeholder="휴대전화번호" value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setProfileErrors(p => ({ ...p, phone: '' })) }}
                className="w-full px-4 py-3 text-sm focus:outline-none placeholder-gray-400" />
            </div>
            {profileErrors.phone && <p className="text-xs text-red-500 mt-1 pl-1">• {profileErrors.phone}</p>}
          </div>

          {/* 생년월일 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">생년월일</label>
            <div className={`border rounded-xl overflow-hidden ${profileErrors.birthdate ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type="text" inputMode="numeric" placeholder="생년월일 8자리 (예: 19900101)" value={birthdate}
                onChange={e => { setBirthdate(e.target.value.replace(/\D/g, '').slice(0, 8)); setProfileErrors(p => ({ ...p, birthdate: '' })) }}
                className="w-full px-4 py-3 text-sm focus:outline-none placeholder-gray-400" />
            </div>
            {profileErrors.birthdate && <p className="text-xs text-red-500 mt-1 pl-1">• {profileErrors.birthdate}</p>}
          </div>

          {/* 성별 */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1 block">성별</label>
            <div className="flex gap-2">
              {(['M', 'F'] as const).map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${gender === g ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
                  {g === 'M' ? '남자' : '여자'}
                </button>
              ))}
            </div>
          </div>

          {profileErrors.submit && <p className="text-xs text-red-500 text-center mb-3">{profileErrors.submit}</p>}
          {profileSuccess && <p className="text-xs text-blue-500 text-center mb-3">✓ 저장되었습니다.</p>}

          <button type="button" onClick={handleSaveProfile} disabled={profileSaving}
            className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {profileSaving ? '저장 중...' : '저장'}
          </button>
        </section>

        {/* 비밀번호 변경 */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-6">
          <h2 className="text-base font-bold mb-5">비밀번호 변경</h2>

          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">새 비밀번호</label>
            <div className={`border rounded-xl overflow-hidden flex items-center ${newPwValidationError ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type={showNewPw ? 'text' : 'password'} placeholder="새 비밀번호" value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwTouched(true); setPwError('') }}
                className="flex-1 px-4 py-3 text-sm focus:outline-none bg-transparent placeholder-gray-400" />
              <button type="button" onClick={() => setShowNewPw(v => !v)} className="pr-4 text-gray-400 hover:text-gray-600">
                {showNewPw
                  ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                }
              </button>
            </div>
            {newPwValidationError
              ? <p className="text-xs text-red-500 mt-1 pl-1">• {newPwValidationError}</p>
              : <p className="text-xs text-gray-400 mt-1 pl-1">8~16자의 영문 대/소문자, 숫자, 특수문자</p>}
          </div>

          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1 block">새 비밀번호 확인</label>
            <div className={`border rounded-xl overflow-hidden flex items-center ${newPwConfirmError ? 'border-red-400' : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500'}`}>
              <input type={showNewPwConfirm ? 'text' : 'password'} placeholder="새 비밀번호 확인" value={newPwConfirm}
                onChange={e => { setNewPwConfirm(e.target.value); setPwConfirmTouched(true) }}
                className="flex-1 px-4 py-3 text-sm focus:outline-none bg-transparent placeholder-gray-400" />
              <button type="button" onClick={() => setShowNewPwConfirm(v => !v)} className="pr-4 text-gray-400 hover:text-gray-600">
                {showNewPwConfirm
                  ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                }
              </button>
            </div>
            {newPwConfirmError && <p className="text-xs text-red-500 mt-1 pl-1">• {newPwConfirmError}</p>}
          </div>

          {pwError && <p className="text-xs text-red-500 text-center mb-3">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-blue-500 text-center mb-3">✓ 비밀번호가 변경되었습니다.</p>}

          <button type="button" onClick={handleChangePw} disabled={pwSaving}
            className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {pwSaving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </section>
      </main>
    </div>
  )
}
