export interface Competition {
  emoji: string
  label: string
  color: string
}

export function getCompetitionLevel(blogCount: number | null, searchVolume: number): Competition {
  if (searchVolume === 0) return { emoji: '⚫', label: '검색없음', color: 'gray' }
  if (blogCount === null) return { emoji: '⏳', label: '집계중', color: 'gray' }
  const ratio = blogCount / searchVolume
  if (ratio < 1.0) return { emoji: '🟢', label: '매우좋음', color: 'green' }
  if (ratio < 3) return { emoji: '🟢', label: '좋음', color: 'green' }
  if (ratio < 8) return { emoji: '🟡', label: '보통', color: 'yellow' }
  if (ratio < 15) return { emoji: '🟠', label: '경쟁중', color: 'orange' }
  return { emoji: '🔴', label: '경쟁치열', color: 'red' }
}
