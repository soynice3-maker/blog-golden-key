'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
]

interface SeedStat {
  category: string
  total: number
  pending: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SeedStat[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('food')
  const [keywords, setKeywords] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    fetchStats()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">어드민</h1>
        <p className="text-sm text-gray-400 mb-8">시드 키워드 관리</p>

        {/* 시드 현황 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 font-medium">카테고리</th>
                    <th className="text-center py-2 font-medium">총 시드</th>
                    <th className="text-center py-2 font-medium">미처리</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.category} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">{getCategoryLabel(s.category)}</td>
                      <td className="py-2 text-center text-gray-600">{s.total}</td>
                      <td className="py-2 text-center">
                        {s.pending > 0
                          ? <span className="text-orange-500 font-medium">{s.pending}</span>
                          : <span className="text-gray-300">-</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 시드 추가 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">시드 키워드 추가</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">키워드 (한 줄에 하나씩)</label>
              <textarea
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder={'두쫀쿠\n흑백요리사\n선재 업고 튀어'}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
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
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? '추가 중...' : '시드 추가'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
