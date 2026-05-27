'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { router.replace('/dashboard'); return }
      setUser(null)
    })
  }, [])

  const isTrialExpired = (user: any) => {
    if (!user) return false
    const createdAt = new Date(user.created_at)
    const diffDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > 7
  }

  const handleAnalyze = () => {
    if (!user) {
      router.push('/login?tab=signup')
      return
    }
    if (isTrialExpired(user)) {
      router.push('/login')
      return
    }
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-lg">블로그황금키 🔑</div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-gray-500 hover:text-gray-800" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>7일 무료혜택</button>
          <Link href="/login" className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600">가입/로그인</Link>
        </div>
      </header>
      <section className="px-6 py-20 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 leading-tight">황금키워드 발굴부터<br />상위노출 글 완성까지</h1>
        <p className="text-gray-500 mb-8">분석할 키워드를 입력하세요</p>
        <div className="flex gap-2 max-w-lg mx-auto mb-4">
          <input type="text" placeholder="예: 압구정 맛집" className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
          <button onClick={handleAnalyze} className="bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-600">분석</button>
        </div>
        <Link href="/login" className="inline-block w-full max-w-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl text-sm font-medium hover:opacity-90">로그인 후 무료로 사용하기</Link>
      </section>
      <section className="px-6 py-16 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-10">주요 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: '🔍', title: '황금키워드 발굴', desc: '검색량 높고 경쟁 낮은 키워드를 자동으로 찾아드려요' },
            { icon: '📊', title: '상위노출 역분석', desc: '현재 상위노출된 글의 패턴을 분석해 최적화된 글을 작성해요' },
            { icon: '✍️', title: '딸깍 글 완성', desc: '5줄 요약 확인 후 승인하면 상위노출 규격의 글이 완성돼요' },
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="pricing" className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-10">요금제</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: '스타터', price: '29,000', desc: '블로그 시작하는 분', features: ['키워드 분석 무제한', '글 생성 20회/월', '황금키워드 추천'], highlight: false },
            { name: '프로', price: '59,000', desc: '수익화 목표 블로거', features: ['키워드 분석 무제한', '글 생성 60회/월', '역분석 무제한', '발행 캘린더', '순위 추적'], highlight: true },
            { name: '비즈', price: '99,000', desc: '체험단·협찬 전문', features: ['키워드 분석 무제한', '글 생성 100회/월', '전체 기능', '체험단 크롤러', '월간 리포트'], highlight: false },
          ].map((plan, i) => (
            <div key={i} className={`p-6 rounded-2xl border-2 relative ${plan.highlight ? 'border-blue-500' : 'border-gray-100'}`}>
              {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">추천</div>}
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-gray-400 text-xs mb-3">{plan.desc}</p>
              <div className="text-2xl font-bold mb-4">월 {plan.price}원</div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="text-sm text-gray-600 flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/login" className={`block text-center py-2 rounded-xl text-sm font-medium ${plan.highlight ? 'bg-blue-500 text-white' : 'border border-gray-200'}`}>7일 무료체험</Link>
            </div>
          ))}
        </div>
      </section>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Link href="/login" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-full text-sm font-medium shadow-lg hover:opacity-90 whitespace-nowrap">7일 무료체험 시작하기 →</Link>
      </div>
      <footer className="px-6 py-8 border-t border-gray-100 text-center text-gray-400 text-xs">© 2026 블로그황금키. All rights reserved.</footer>
    </div>
  )
}
