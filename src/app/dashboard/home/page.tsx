'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

const FEATURES = [
  {
    tab: 'keyword',
    icon: '🔍',
    name: '키워드 분석',
    desc: '검색량 · 경쟁도 · 트렌드',
  },
  {
    tab: 'content',
    icon: '💡',
    name: '글감 추천',
    desc: '뉴스 · 트렌드 기반 글감',
  },
  {
    tab: 'prompt',
    icon: '✏️',
    name: '글쓰기',
    desc: '검색형 · 노출형 프롬프트',
  },
  {
    tab: 'niche',
    icon: '🏆',
    name: '틈새 발굴',
    desc: '경쟁 적은 키워드 찾기',
  },
]

export default function DashboardHomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100">
        <span className="text-lg font-bold text-gray-900">블로그황금키 🔑</span>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          대시보드 바로가기 →
        </Link>
      </header>

      {/* Feature tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto grid grid-cols-4 gap-2">
          {FEATURES.map(f => (
            <button
              key={f.tab}
              onClick={() => router.push(`/dashboard?tab=${f.tab}`)}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{f.name}</span>
              <span className="text-[11px] text-gray-400 leading-tight text-center">{f.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main question */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">오늘 뭐 쓰실 건가요?</h1>
          <p className="text-gray-500 text-sm">목적에 맞는 도구를 바로 열어드릴게요</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <button
            onClick={() => router.push('/dashboard?tab=prompt')}
            className="group text-left bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="text-3xl mb-4">✏️</div>
            <h2 className="text-base font-bold text-gray-900 mb-1.5">쓸 주제가 있어요</h2>
            <p className="text-sm text-gray-500 leading-relaxed">키워드 분석부터 제목, 본문 프롬프트까지 단계별로 도와드려요</p>
            <div className="mt-5 text-sm font-semibold text-blue-500 group-hover:text-blue-600 flex items-center gap-1">
              글쓰기 시작 <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard?tab=content')}
            className="group text-left bg-white border border-gray-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="text-3xl mb-4">💡</div>
            <h2 className="text-base font-bold text-gray-900 mb-1.5">아직 없어요</h2>
            <p className="text-sm text-gray-500 leading-relaxed">요즘 뜨는 키워드와 트렌드에서 쓸 거리를 찾아드릴게요</p>
            <div className="mt-5 text-sm font-semibold text-amber-500 group-hover:text-amber-600 flex items-center gap-1">
              글감 찾기 <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
