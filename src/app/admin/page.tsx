'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, ChevronDown } from 'lucide-react'

const CATEGORIES = [
  { id: 'travel', label: '여행' },
  { id: 'fashion', label: '패션' },
  { id: 'beauty', label: '뷰티' },
  { id: 'food', label: '푸드' },
  { id: 'tech_it', label: 'IT테크' },
  { id: 'auto', label: '자동차' },
  { id: 'living', label: '리빙' },
  { id: 'parenting', label: '육아' },
  { id: 'health', label: '생활건강' },
  { id: 'game', label: '게임' },
  { id: 'pet', label: '동물·펫' },
  { id: 'sports', label: '운동·레저' },
  { id: 'entertain', label: '방송·연예' },
  { id: 'movie', label: '영화' },
  { id: 'book', label: '도서' },
  { id: 'business', label: '경제·비즈니스' },
  { id: 'education', label: '어학·교육' },
  { id: 'wedding', label: '웨딩' },
]

const MENU_ITEMS = [
  { id: 'seeds', label: '시드 키워드 관리', icon: Sprout },
]

interface SeedStat {
  category: string
  total: number
  pending: number
}

interface SeedItem {
  id: string
  keyword: string
  built_at: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [activeMenu, setActiveMenu] = useState('seeds')
  const [stats, setStats] = useState<SeedStat[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('food')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const [keywords, setKeywords] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState('')

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [seedItemsMap, setSeedItemsMap] = useState<Record<string, SeedItem[] | 'loading'>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchStats() {
    setLoading(true)
    const res = await fetch('/api/admin/seeds')
    if (res.status === 401) { router.push('/dashboard'); return }
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setStats(data.stats)
    setTotalPending(data.totalPending)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult('')
    const res = await fetch('/api/admin/seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, category }),
    })
    const data = await res.json()
    if (data.error) {
      setResult(`오류: ${data.error}`)
    } else {
      setResult(`✓ ${data.added}개 추가${data.skipped ? `, ${data.skipped}개 중복 스킵` : ''}`)
      setKeywords('')
      fetchStats()
    }
    setSubmitting(false)
  }

  const getCategoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label ?? id

  const toggleCategory = async (cat: string) => {
    if (expandedCategory === cat) { setExpandedCategory(null); return }
    setExpandedCategory(cat)
    setSeedItemsMap(prev => ({ ...prev, [cat]: 'loading' }))
    const res = await fetch(`/api/admin/seeds?category=${cat}`)
    const data = await res.json()
    setSeedItemsMap(prev => ({ ...prev, [cat]: data.seeds || [] }))
  }

  const deleteSeed = async (id: string, cat: string) => {
    setDeletingId(id)
    const res = await fetch('/api/admin/seeds', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setSeedItemsMap(prev => {
        const items = prev[cat]
        if (!items || items === 'loading') return prev
        return { ...prev, [cat]: items.filter(s => s.id !== id) }
      })
      fetchStats()
    }
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5 flex items-center gap-1"
          >
            ← 뒤로
          </button>
          <p className="text-sm font-bold text-gray-900">관리자페이지</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeMenu === item.id
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 px-8 py-8">
        {activeMenu === 'seeds' && (
          <>
            <div className="flex gap-6 items-stretch">
            {/* 시드 추가 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="font-semibold text-gray-800">시드 키워드 추가</h2>
                <span className="text-xs text-gray-400">매일 오전 11시에 처리돼요</span>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
                  <div className="relative" ref={categoryRef}>
                    <button
                      type="button"
                      onClick={() => setCategoryOpen(prev => !prev)}
                      className="w-full flex items-center justify-between pl-3 pr-2.5 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 transition-colors"
                    >
                      <span className="text-gray-800">{CATEGORIES.find(c => c.id === category)?.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {categoryOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {CATEGORIES.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setCategory(c.id); setCategoryOpen(false) }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              c.id === category
                                ? 'text-blue-500 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-xs text-gray-500 mb-1 block">키워드 (한 줄에 하나씩)</label>
                  <textarea
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder={'두쫀쿠\n흑백요리사\n선재 업고 튀어'}
                    className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                </div>

                {result && (
                  <p className={`text-sm ${result.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
                    {result}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !keywords.trim()}
                  className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors mt-auto"
                >
                  {submitting ? '추가 중...' : '시드 추가'}
                </button>
              </form>
            </div>

            {/* 시드 현황 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">카테고리별 시드 현황</h2>
                {totalPending > 0 && (
                  <span className="text-xs bg-orange-50 text-orange-500 px-2 py-1 rounded-full font-medium">
                    미처리 {totalPending}개
                  </span>
                )}
              </div>

              {loading ? (
                <p className="text-sm text-gray-400">로딩 중...</p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <div>
                  <div className="grid grid-cols-3 text-xs text-gray-400 border-b border-gray-100 pb-2 mb-1 px-1">
                    <span>카테고리</span>
                    <span className="text-center">총 시드</span>
                    <span className="text-center">미처리</span>
                  </div>
                  {stats.map(s => (
                    <div key={s.category}>
                      <button
                        onClick={() => toggleCategory(s.category)}
                        className="w-full grid grid-cols-3 items-center py-2 px-1 text-sm hover:bg-gray-100/50 rounded-lg transition-colors"
                      >
                        <span className="flex items-center gap-1.5 text-gray-700 text-left">
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${expandedCategory === s.category ? 'rotate-180' : ''}`} />
                          {getCategoryLabel(s.category)}
                        </span>
                        <span className="text-center text-gray-600">{s.total}</span>
                        <span className="text-center">
                          {s.pending > 0
                            ? <span className="text-orange-500 font-medium">{s.pending}</span>
                            : <span className="text-gray-300">-</span>
                          }
                        </span>
                      </button>
                      {expandedCategory === s.category && (
                        <div className="grid grid-cols-3 px-1 pb-2">
                          {/* 카테고리 컬럼: 전체 시드 */}
                          <div className="col-start-1 border-l-2 border-gray-100 ml-4 pl-3">
                            {seedItemsMap[s.category] === 'loading' ? (
                              <p className="text-xs text-gray-400 py-1">로딩 중...</p>
                            ) : (seedItemsMap[s.category] as SeedItem[])?.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1">시드 없음</p>
                            ) : (
                              (seedItemsMap[s.category] as SeedItem[])?.map(item => (
                                <div key={item.id} className="flex items-center justify-between py-0.5 group">
                                  <span className={`text-xs ${item.built_at ? 'text-gray-500' : 'text-gray-300'}`}>{item.keyword}</span>
                                  <button
                                    onClick={() => deleteSeed(item.id, s.category)}
                                    disabled={deletingId === item.id}
                                    className="text-xs text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 ml-2 shrink-0"
                                  >
                                    삭제
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                          {/* 미처리 컬럼: 미처리 시드만 + 삭제 */}
                          <div className="col-start-3 flex flex-col items-center">
                            {Array.isArray(seedItemsMap[s.category]) && (seedItemsMap[s.category] as SeedItem[]).filter(i => !i.built_at).map(item => (
                              <div key={item.id} className="relative w-full flex justify-center items-center py-0.5 group">
                                <span className="text-xs text-orange-500">{item.keyword}</span>
                                <button
                                  onClick={() => deleteSeed(item.id, s.category)}
                                  disabled={deletingId === item.id}
                                  className="absolute right-3 text-xs text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                >
                                  삭제
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
