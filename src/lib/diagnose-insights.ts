/**
 * 룰 기반 인사이트 생성
 * 내 글 통계 + 상위 글 통계 비교 → 개선점 문자열 배열
 */

export interface PostStats {
  wordCount: number
  imageCount: number
  videoCount?: number
  keywordDensity?: number | null
  hashtagCount?: number
  title?: string
  textPreview?: string  // 본문 앞부분 (500자 정도) — 키워드 위치 분석용
}

export interface Competitor extends PostStats {
  rank: number
  title: string
  url: string
  hashtags?: string[]
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface Insight {
  level: 'critical' | 'warning' | 'good' | 'tip'
  category: 'wordCount' | 'images' | 'video' | 'density' | 'hashtags' | 'general'
  message: string
}

export function generateInsights(
  my: PostStats,
  competitors: Competitor[],
  context?: { keyword?: string; rank?: number | null },
): Insight[] {
  const insights: Insight[] = []
  const keyword = context?.keyword?.trim() || ''
  const rank = context?.rank ?? null
  const outOfRange = rank === null

  if (competitors.length === 0) {
    insights.push({
      level: 'tip',
      category: 'general',
      message: '비교 대상 상위 글을 가져오지 못했어요. 잠시 후 다시 시도해주세요',
    })
    return insights
  }

  // ── 콘텐츠 매칭 점검 (제목/본문 키워드 위치) ──
  if (keyword) {
    const normKw = keyword.replace(/\s+/g, '').toLowerCase()
    const titleNorm = (my.title || '').replace(/\s+/g, '').toLowerCase()
    const previewNorm = (my.textPreview || '').replace(/\s+/g, '').toLowerCase().slice(0, 300)

    if (titleNorm && !titleNorm.includes(normKw)) {
      insights.push({
        level: 'critical',
        category: 'general',
        message: `제목에 타겟 키워드 "${keyword}"가 빠져있어요. 제목 앞쪽에 자연스럽게 포함시켜야 검색 노출에 유리해요`,
      })
    }

    if (previewNorm && !previewNorm.includes(normKw)) {
      insights.push({
        level: 'warning',
        category: 'general',
        message: `본문 앞부분 300자 안에 키워드 "${keyword}"가 안 보여요. 도입부에 자연스럽게 등장시켜주세요`,
      })
    }
  }

  // ── 30위 밖인데 정량 지표는 OK인 경우 — 명시적 안내 ──
  if (outOfRange) {
    insights.push({
      level: 'critical',
      category: 'general',
      message: '검색 노출이 안 되고 있어요. 글의 주제와 키워드가 잘 맞는지, 제목·본문에 키워드가 자연스럽게 포함됐는지 점검해보세요',
    })
  }

  const topAvgWords = Math.round(avg(competitors.map(c => c.wordCount)))
  const topMedianWords = Math.round(median(competitors.map(c => c.wordCount)))
  const topAvgImages = Math.round(avg(competitors.map(c => c.imageCount)))
  const topMedianImages = Math.round(median(competitors.map(c => c.imageCount)))
  const topHasVideo = competitors.filter(c => (c.videoCount || 0) > 0).length

  // 1) 글자수 분석
  if (my.wordCount < topMedianWords * 0.6) {
    insights.push({
      level: 'critical',
      category: 'wordCount',
      message: `글자수가 너무 짧아요. 상위 글 평균은 ${topAvgWords}자인데 내 글은 ${my.wordCount}자예요. 최소 ${Math.round(topMedianWords * 0.9)}자 이상 작성해보세요`,
    })
  } else if (my.wordCount < topMedianWords * 0.85) {
    insights.push({
      level: 'warning',
      category: 'wordCount',
      message: `글자수를 ${topAvgWords}자 이상으로 늘려보세요. 현재 ${my.wordCount}자, 상위 글 평균은 ${topAvgWords}자예요`,
    })
  } else if (my.wordCount >= topAvgWords) {
    insights.push({
      level: 'good',
      category: 'wordCount',
      message: `글자수는 충분해요 (${my.wordCount}자)`,
    })
  }

  // 2) 사진 개수 분석
  if (my.imageCount < topMedianImages * 0.5) {
    insights.push({
      level: 'critical',
      category: 'images',
      message: `사진 수가 부족해요. 상위 글 평균 ${topAvgImages}장, 내 글 ${my.imageCount}장. 시각 자료를 ${topMedianImages}장 이상으로 늘려보세요`,
    })
  } else if (my.imageCount < topMedianImages * 0.8) {
    insights.push({
      level: 'warning',
      category: 'images',
      message: `사진을 ${topMedianImages}장 이상으로 늘려보세요. 현재 ${my.imageCount}장`,
    })
  } else if (my.imageCount >= topAvgImages) {
    insights.push({
      level: 'good',
      category: 'images',
      message: `사진 수는 충분해요 (${my.imageCount}장)`,
    })
  }

  // 3) 동영상 분석
  if ((my.videoCount || 0) === 0 && topHasVideo >= Math.ceil(competitors.length / 2)) {
    insights.push({
      level: 'warning',
      category: 'video',
      message: `상위 ${topHasVideo}개 글이 동영상을 포함하고 있어요. 짧은 영상 1개 추가하면 체류 시간이 늘어요`,
    })
  } else if ((my.videoCount || 0) > 0) {
    insights.push({
      level: 'good',
      category: 'video',
      message: `동영상이 포함되어 있어요 (${my.videoCount}개)`,
    })
  }

  // 4) 키워드 밀도 분석
  if (typeof my.keywordDensity === 'number') {
    const topAvgDensity = avg(competitors.map(c => c.keywordDensity || 0))
    if (my.keywordDensity < topAvgDensity * 0.5 && topAvgDensity > 0.5) {
      insights.push({
        level: 'critical',
        category: 'density',
        message: `타겟 키워드 밀도가 낮아요 (${my.keywordDensity.toFixed(1)}%). 상위 글 평균 ${topAvgDensity.toFixed(1)}%. 본문에 키워드를 더 자연스럽게 노출해보세요`,
      })
    } else if (my.keywordDensity > 5) {
      insights.push({
        level: 'warning',
        category: 'density',
        message: `키워드 밀도가 너무 높아요 (${my.keywordDensity.toFixed(1)}%). 5% 이하로 자연스럽게 분산해주세요 (스팸 패턴 위험)`,
      })
    } else if (my.keywordDensity >= topAvgDensity * 0.7 && my.keywordDensity <= 4) {
      insights.push({
        level: 'good',
        category: 'density',
        message: `키워드 밀도가 적절해요 (${my.keywordDensity.toFixed(1)}%)`,
      })
    }
  }

  // 5) 해시태그 분석
  if ((my.hashtagCount || 0) < 5) {
    insights.push({
      level: 'tip',
      category: 'hashtags',
      message: `해시태그를 10개 정도 추가해보세요`,
    })
  }

  // 6) 인사이트가 너무 적으면 기본 팁
  if (insights.length === 0) {
    insights.push({
      level: 'good',
      category: 'general',
      message: '주요 지표는 상위 글과 비슷한 수준이에요. 콘텐츠 품질·신선도에 집중해보세요',
    })
  }

  // 7) 30위 밖인데 critical/warning이 없으면 — 정량 지표 한계 명시
  const badCount = insights.filter(i => i.level === 'critical' || i.level === 'warning').length
  if (outOfRange && badCount === 0) {
    insights.unshift({
      level: 'tip',
      category: 'general',
      message: '정량 지표(글자수·사진수 등)는 상위 글과 비슷한데도 노출이 안 돼요. 콘텐츠 깊이·정보성·블로그 지수·발행 시점 같은 정성적 요인이 작용했을 수 있어요',
    })
  }

  return insights
}
