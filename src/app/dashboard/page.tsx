'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wand2, BarChart2, Trophy, TrendingUp, Newspaper, Key, Tag, FileText, Smartphone, Link2, Hash, Lightbulb, PenLine, Copy, Flame, RefreshCw, Zap, Search, Calendar, Pencil, Plane, Shirt, Sparkles, Utensils, Monitor, Car, Home, Baby, Heart, Gamepad2, PawPrint, Dumbbell, Tv, Film, BookOpen, Briefcase, GraduationCap, type LucideIcon } from 'lucide-react'

interface KeywordResult {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number | null
  competition: string
  goldenScore: number | null
  grade: string
}

interface InsightKeywordItem {
  keyword: string
  pcVolume: number
  mobileVolume: number
  totalVolume: number
  blogCount: number | null
  competition: { emoji: string; label: string; color: string }
}

interface InsightResult {
  main: InsightKeywordItem
  related: InsightKeywordItem[]
  autocomplete: InsightKeywordItem[]
  trendDirection?: { direction: '상승' | '하락' | '유지'; changeRate: number }
  seasonality?: { peakMonths: number[]; note: string }
}

interface GoldenKeyword {
  keyword: string
  pc_volume: number
  mobile_volume: number
  total_volume: number
  blog_count: number | null
  competition_label: string | null
  trend_score: number | null
}

interface KeywordIdea {
  title: string
  points: string[]
}

interface TrendIdea {
  title: string
  keywords: string[]
  reason: string
  points: string[]
}

interface TrendMeta {
  category: string
  trendKeywords: string[]
  goldenKeywords: string[]
  seasonTopics: string[]
  generatedAt: string
}

interface ShortentsIdea {
  searchTitle: string
  feedTitle: string
  keywords: string[]
}


const CATEGORIES: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'travel', label: '여행', icon: Plane, color: 'text-sky-400' },
  { id: 'fashion', label: '패션', icon: Shirt, color: 'text-pink-400' },
  { id: 'beauty', label: '뷰티', icon: Sparkles, color: 'text-rose-400' },
  { id: 'food', label: '푸드', icon: Utensils, color: 'text-orange-400' },
  { id: 'tech_it', label: 'IT테크', icon: Monitor, color: 'text-blue-400' },
  { id: 'auto', label: '자동차', icon: Car, color: 'text-slate-500' },
  { id: 'living', label: '리빙', icon: Home, color: 'text-amber-500' },
  { id: 'parenting', label: '육아', icon: Baby, color: 'text-purple-400' },
  { id: 'health', label: '생활건강', icon: Heart, color: 'text-red-400' },
  { id: 'game', label: '게임', icon: Gamepad2, color: 'text-violet-500' },
  { id: 'pet', label: '동물·펫', icon: PawPrint, color: 'text-amber-400' },
  { id: 'sports', label: '운동·레저', icon: Dumbbell, color: 'text-green-500' },
  { id: 'entertain', label: '방송·연예', icon: Tv, color: 'text-indigo-400' },
  { id: 'movie', label: '영화', icon: Film, color: 'text-gray-600' },
  { id: 'book', label: '도서', icon: BookOpen, color: 'text-emerald-500' },
  { id: 'business', label: '경제·비즈니스', icon: Briefcase, color: 'text-blue-600' },
  { id: 'education', label: '어학·교육', icon: GraduationCap, color: 'text-teal-500' },
]

interface CrawlPost {
  title: string
  url: string
  blockName: string
  charCount: number
  imageCount: number
  videoCount?: number
  headingCount: number
  hashtags: string[]
  headingTexts?: string[]
  fullText: string
}

interface CrawlData {
  keyword: string
  smartBlocks: string[]
  allTitles: { title: string; blockName: string; type: string }[]
  posts: CrawlPost[]
  average: { charCount: number; imageCount: number; videoCount: number; headingCount: number } | null
  topHashtags: { tag: string; count: number }[]
  error?: string
}

interface Analysis {
  // 제목 패턴
  titleTotal: number
  frontCount: number
  middleCount: number
  backCount: number
  spacedCount: number
  joinedCount: number
  avgTitleLength: number
  bracketCount: number
  numberCount: number
  modifiers: { word: string; count: number }[]
  // 본문 분석
  avgKwCount: number
  avgFirstPos: string
  avgKwDensity: number
  introKwCount: number
  postsAnalyzed: number
  perPostKw: { title: string; count: number; density: number }[]
  // 연관 키워드
  relatedKeywords: { word: string; count: number }[]
  // 해시태그
  topHashtags: { tag: string; count: number }[]
  // 구조
  avgChars: number
  avgImages: number
  avgVideos: number
  avgHeadings: number
  headingNumbered: boolean
  mobileOptPct: number
  smartBlocks: string[]
  // 인사이트
  insights: string[]
  // 작성 포인트
  strategy: {
    titleStructure: string[]
    contentPoints: string[]
  }
}

const STOP_WORDS = new Set([
  '이','그','저','을','를','은','는','이다','에서','에게','으로','하고','있다',
  '없다','했다','한다','합니다','해요','이에요','예요','이고','그리고','하지만',
  '그런데','그래서','때문에','것이','것은','것을','있어요','없어요','했어요',
  '같아요','있고','없고','하는','되는','지만','에서는','에서도','에도','까지',
  '부터','이랑','랑','과','와','도','만','요','네요','어요','인데','이라',
  '라고','이라고','이나','나서','면서','더라','봤어','갔어','먹었','했는데',
  '라서','여서','이어서','이었','였고','됩니다','입니다','정말','너무','진짜',
  '조금','많이','가장','이번','여기','거기','오늘','어제','그날','이렇게',
])

const HASHTAG_STOPS = new Set([
  '저는','제가','저도','나는','나도','내가','우리가','우리는',
  '이건','그건','이게','그게','여기','저기','거기',
  '이렇게','저렇게','그렇게','이런','그런','저런',
  '그런데','하지만','그리고','그래서',
  '있는데','있어요','없어요','합니다','됩니다','입니다','이에요','예요',
  '했는데','이라고','오늘은','이번에',
  '정말로','너무나','진짜로','너무','정말','진짜','여러분',
  // 동사/형용사 어미형 추가
  '있는','없는','있고','없고','있어','없어','있다','없다',
  '됩니다','됐어','됐고','됐는데','되는','되어','되고',
  '했어','했고','했는데','하는','하고','하여','하며',
  '같아','같은','같이','같고','같은데',
  '이어서','이었고','이었는데','였고','였는데',
  '많아','많은','많이','많고','좋아','좋은','좋고',
  '나와','나오는','나오고','들어','들어가','들어오',
  '받아','받은','받고','보여','보이는','보이고',
  '올라','올라가','내려','내려가','나눠','나누는',
])

// 안 1: 동사/형용사 어미 패턴 필터
const VERB_ADJ_ENDINGS = /(?:습니다|읍니다|있습니다|없습니다|합니다|됩니다|입니다|었습니다|았습니다|겠습니다|어요|아요|이에요|예요|네요|군요|죠|었어|았아|겠어|는데|은데|ㄴ데|지만|면서|니까|더니|거든|잖아|잖은|이잖|구나|구요|고요|고서|어서|아서|면서|이면|라면|다면|는지|은지|ㄹ지|ㄹ까|을까|는가|은가|ㄴ가|는다|은다|ㄴ다|는걸|은걸|ㄴ걸|는걸요|해줘|해줘요|해줘서|해줘야|해주세요|해보|해봐|해봤|하자|하죠|하며|하여|하는|하던|했던|했을|할게|할까|할지|할수|할때|할때는)$/

function stripParticle(word: string): string {
  if (word.length < 3) return word
  const two = ['에서','이에','에게','으로','이라','이고','이며','이나','이랑']
  const one = ['이','가','은','는','을','를','의','도','로','에']
  for (const e of two) {
    if (word.endsWith(e) && word.length > e.length + 1) return word.slice(0, -e.length)
  }
  for (const e of one) {
    if (word.endsWith(e) && word.length >= 3) return word.slice(0, -1)
  }
  return word
}

function cleanTag(t: string) {
  const stripped = stripParticle(t.trim())
  if (stripped.length < 2) return ''
  if (HASHTAG_STOPS.has(stripped)) return ''
  if (VERB_ADJ_ENDINGS.test(stripped)) return ''
  return stripped
}

function runAnalysis(keyword: string, cd: CrawlData, brandName = '', originalInput = ''): Analysis {
  const kw = keyword.trim()
  const kwNospace = kw.replace(/\s+/g, '')
  const kwLower = kw.toLowerCase()
  const kwLowerNospace = kwNospace.toLowerCase()
  const brandLower = brandName.trim().toLowerCase()

  const allTitles = cd.allTitles || []
  const posts = cd.posts || []

  // 키워드가 제목에 포함된 글만 필터링
  const relevantPosts = posts.filter(p =>
    p.title.toLowerCase().replace(/\s+/g, '').includes(kwLowerNospace) ||
    p.title.toLowerCase().includes(kwLower)
  )

  // 브랜드명이 있으면 추가 필터링
  const brandFiltered = brandLower
    ? relevantPosts.filter(p => p.title.toLowerCase().includes(brandLower))
    : relevantPosts

  const analyzePosts = brandFiltered.length >= 2 ? brandFiltered :
    relevantPosts.length >= Math.min(3, posts.length) ? relevantPosts : posts

  // ── 제목 위치
  let frontCount = 0, middleCount = 0, backCount = 0
  let spacedCount = 0, joinedCount = 0

  allTitles.forEach(t => {
    const tClean = t.title.toLowerCase().replace(/\s+/g, '')
    const idx = tClean.indexOf(kwLowerNospace)
    if (idx < 0) return
    const ratio = idx / tClean.length
    if (ratio < 0.25) frontCount++
    else if (ratio < 0.6) middleCount++
    else backCount++
    if (t.title.toLowerCase().includes(kwLower)) spacedCount++
    else joinedCount++
  })

  // ── 제목 심층 분석
  const avgTitleLength = allTitles.length > 0
    ? Math.round(allTitles.reduce((s, t) => s + t.title.length, 0) / allTitles.length)
    : 0
  const bracketCount = allTitles.filter(t => /[\[\]【】〔〕]/.test(t.title)).length
  const numberCount = allTitles.filter(t => /\d/.test(t.title)).length

  // ── 수식어 빈도
  const modifierCandidates = [
    '내돈내산','솔직후기','솔직','리뷰','후기','추천','방문','맛집','웨이팅',
    '예약','주차','혼밥','데이트','점심','저녁','가격','메뉴','1인',
    '코스','런치','디너','오마카세','포장','배달',
  ]
  const modifiers = modifierCandidates
    .map(w => ({ word: w, count: allTitles.filter(t => t.title.includes(w)).length }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ── 본문 키워드 분석 (관련 글만)
  const perPostKw = analyzePosts.map(p => {
    const text = (p.fullText || '').toLowerCase().replace(/\s+/g, '')
    const matches = text.match(new RegExp(kwLowerNospace, 'g')) || []
    const density = text.length > 0 ? Math.round((matches.length / text.length) * 1000 * 10) / 10 : 0
    return { title: p.title, count: matches.length, density }
  })
  const avgKwCount = perPostKw.length > 0
    ? Math.round((perPostKw.reduce((s, p) => s + p.count, 0) / perPostKw.length) * 10) / 10
    : 0
  const avgKwDensity = perPostKw.length > 0
    ? Math.round((perPostKw.reduce((s, p) => s + p.density, 0) / perPostKw.length) * 10) / 10
    : 0

  // ── 첫 등장 위치 (관련 글만)
  const firstPositions = analyzePosts
    .map(p => {
      const text = (p.fullText || '').toLowerCase().replace(/\s+/g, '')
      const idx = text.indexOf(kwLowerNospace)
      return idx >= 0 ? Math.round((idx / text.length) * 100) : -1
    })
    .filter(v => v >= 0)
  const avgFirstPct = firstPositions.length > 0
    ? Math.round(firstPositions.reduce((s, v) => s + v, 0) / firstPositions.length)
    : 0
  const avgFirstPos = avgFirstPct <= 5 ? `본문 최상단 (상위 ${avgFirstPct}%)` :
    avgFirstPct <= 15 ? `본문 초반 (상위 ${avgFirstPct}%)` :
    avgFirstPct <= 35 ? `본문 중반 (상위 ${avgFirstPct}%)` : `본문 후반 (상위 ${avgFirstPct}%)`

  // ── 인트로(첫 200자) 키워드 등장 (관련 글만)
  const introKwCount = analyzePosts.filter(p => {
    const intro = (p.fullText || '').replace(/\s+/g, '').slice(0, 200).toLowerCase()
    return intro.includes(kwLowerNospace)
  }).length

  // ── 연관 키워드 빈도 (관련 글만)
  const wordFreq: Record<string, number> = {}
  const allText = analyzePosts.map(p => p.fullText || '').join(' ')
  const words = allText.match(/[가-힣]{2,6}/g) || []
  words.forEach(w => {
    if (STOP_WORDS.has(w)) return
    if (kwNospace.includes(w) || w.includes(kwNospace)) return
    if (kw.split(/\s+/).some(part => part.length >= 2 && w.includes(part))) return
    wordFreq[w] = (wordFreq[w] || 0) + 1
  })
  const relatedKeywords = Object.entries(wordFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  // ── 평균 구조
  const avg = cd.average
  const avgChars = avg?.charCount || 0
  const avgImages = avg?.imageCount || 0
  const avgVideos = avg?.videoCount || 0
  const avgHeadings = avg?.headingCount || 0

  // ── 모바일 최적화 감지 (줄 평균 글자 수 20자 이하)
  const mobileOptCount = analyzePosts.filter(p => {
    const lines = (p.fullText || '').split('\n').filter(l => l.trim().length > 1)
    if (lines.length < 5) return false
    const avgLineLen = lines.reduce((s, l) => s + l.trim().length, 0) / lines.length
    return avgLineLen <= 20
  }).length
  const mobileOptPct = analyzePosts.length > 0 ? Math.round(mobileOptCount / analyzePosts.length * 100) : 0

  // ── 인사이트 생성 (수치 기반, 구체적)
  const insights: string[] = []
  const total = allTitles.length || 1

  // 제목 길이
  if (avgTitleLength > 0)
    insights.push(`상위노출 제목 평균 ${avgTitleLength}자 — 키워드 포함 수식어 ${modifiers.slice(0, 2).map(m => `'${m.word}'`).join(', ')} 조합 패턴`)

  // 키워드 위치
  if (frontCount >= total * 0.5)
    insights.push(`${total}개 제목 중 ${frontCount}개가 앞 1/4에 키워드 배치 → 제목 시작 직후 키워드가 VIEW 블록 유리`)
  else if (middleCount >= total * 0.4)
    insights.push(`키워드가 제목 중반에 위치한 글이 ${middleCount}개 → 앞에 후킹 문구 배치 후 키워드`)

  // 대괄호 패턴
  if (bracketCount >= total * 0.4)
    insights.push(`${total}개 중 ${bracketCount}개 제목에 [] 대괄호 활용 → 장소·카테고리 강조로 클릭률 상승`)

  // 숫자 패턴
  if (numberCount >= total * 0.4)
    insights.push(`${numberCount}개 제목에 숫자 포함 (가격·방문 횟수 등) → 구체적 수치가 신뢰도·CTR 향상`)

  // 키워드 밀도
  if (avgKwDensity > 0)
    insights.push(`키워드 밀도 평균 ${avgKwDensity}‰ (1000자당 ${avgKwDensity}회) — 과도한 반복 없이 ${avgKwCount}회 자연스럽게 분산`)

  // 인트로 위치
  if (introKwCount === posts.length && posts.length > 0)
    insights.push(`상위노출 ${posts.length}개 글 모두 첫 200자 내 키워드 등장 → 인트로 첫 문장에서 키워드 즉시 노출 필수`)
  else if (introKwCount > 0)
    insights.push(`${posts.length}개 중 ${introKwCount}개 글이 첫 200자 내 키워드 등장 → 인트로 초반 키워드 배치 권장`)

  // 이미지·글자수 구조
  if (avgChars > 0 && avgImages > 0)
    insights.push(`평균 ${avgChars.toLocaleString()}자 + 이미지 ${avgImages}장 구조 — 이 분량 미달 시 VIEW 블록 진입 경쟁력 저하`)

  // 붙임/띄어쓰기
  if (joinedCount > spacedCount && kwNospace !== kwLower)
    insights.push(`제목 키워드 형태: '${kwNospace}' 붙여쓰기(${joinedCount}개) > 띄어쓰기(${spacedCount}개) → 제목에 붙여쓰기 권장`)
  else if (spacedCount > 0)
    insights.push(`제목 키워드 형태: '${kw}' 띄어쓰기(${spacedCount}개) 우세 → 제목에 띄어쓰기 사용`)

  // ── 작성 포인트 생성
  const kwForm = joinedCount > spacedCount ? kwNospace : kw
  const topMod = modifiers.slice(0, 3).map(m => m.word)
  const total2 = allTitles.length || 1

  const titleStructure: string[] = []
  const kwPos = frontCount >= total2 * 0.4 ? '앞부분' : middleCount >= total2 * 0.4 ? '중반부' : '뒷부분'
  titleStructure.push(`키워드 "${kwForm}" 제목 ${kwPos}에 배치 (상위노출 글 기준)`)
  if (avgTitleLength > 0) titleStructure.push(`제목 길이 ${avgTitleLength}자 내외`)
  if (kwNospace !== kwLower && joinedCount !== spacedCount)
    titleStructure.push(`키워드 표기: ${joinedCount > spacedCount ? `붙여쓰기 '${kwNospace}' 권장` : `띄어쓰기 '${kw}' 권장`} (${joinedCount}:${spacedCount})`)
  if (bracketCount >= total2 * 0.3)
    titleStructure.push(`[] 대괄호로 장소·카테고리 강조 (상위 ${bracketCount}/${total2}개 적용)`)
  if (numberCount >= total2 * 0.3)
    titleStructure.push(`숫자 포함으로 구체성 강조 (상위 ${numberCount}/${total2}개 적용)`)
  if (topMod.length > 0)
    titleStructure.push(`자주 쓰인 수식어 활용: ${topMod.join(', ')}`)

  const contentPoints: string[] = []
  if (avgChars > 0) contentPoints.push(`글자 수 ${avgChars.toLocaleString()}자 이상 작성 (해시태그 제외)`)
  if (avgImages > 0) contentPoints.push(`이미지 ${avgImages}장 이상 첨부`)
  if (avgVideos > 0) contentPoints.push(`영상 ${avgVideos}개 이상 삽입`)
  if (mobileOptPct >= 50) contentPoints.push(`모바일 최적화 스타일 — 한 줄 20자 이하로 짧게 줄 바꿈하여 작성`)
  const allHeadingTexts = posts.flatMap(p => p.headingTexts || [])
  const numberedPostCount = posts.filter(p => {
    const ht = p.headingTexts || []
    if (ht.length === 0) return false
    return ht.filter(t => /^\d+\./.test(t)).length > ht.length * 0.5
  }).length
  const headingNumbered = numberedPostCount > posts.filter(p => (p.headingTexts || []).length > 0).length * 0.5
  if (avgHeadings > 0) {
    const sampleHeading = allHeadingTexts.find(t => /^\d+\./.test(t))?.replace(/^\d+\.\s*/, '') || ''
    if (headingNumbered && sampleHeading) {
      contentPoints.push(`소제목 ${avgHeadings}개 — 숫자형 형식 사용 (예: "1. ${sampleHeading}")`)
    } else if (allHeadingTexts.length > 0) {
      contentPoints.push(`소제목 ${avgHeadings}개 — 각 섹션별 주제 명확히 구분`)
    } else {
      contentPoints.push(`소제목 ${avgHeadings}개 (숫자형 또는 이모지 형식 권장)`)
    }
  }
  if (introKwCount === posts.length && posts.length > 0)
    contentPoints.push(`인트로 첫 문장에 키워드 "${kwForm}" 즉시 등장`)
  else if (introKwCount > 0)
    contentPoints.push(`인트로 초반 200자 내 키워드 "${kwForm}" 등장 권장`)
  if (avgKwCount > 0)
    contentPoints.push(`키워드 "${kwForm}" 본문 내 ${avgKwCount}회 이상 자연스럽게 반복 (밀도 ${avgKwDensity}‰)`)
  if (relatedKeywords.length > 0)
    contentPoints.push(`연관 키워드 분산 배치: ${relatedKeywords.slice(0, 4).map(r => r.word).join(', ')}`)

  // ── 해시태그 (V3: 키워드 관련성 필터 추가)
  const hashtagFreq: Record<string, number> = {}
  analyzePosts.forEach(p => {
    (p.hashtags || []).forEach(tag => {
      const cleaned = cleanTag(tag)
      if (cleaned.length >= 2) hashtagFreq[cleaned] = (hashtagFreq[cleaned] || 0) + 1
    })
  })

  const GENERIC_HASHTAGS = ['맛집', '리뷰', '후기', '추천', '내돈내산', '솔직후기', '방문기', '먹스타그램', '밥스타그램', '맛스타그램', '일상', '데이트', '소통', '이웃']
  // 원본 입력(공백 포함)에서 단어 분리 → 복합 키워드도 개별 부분 매칭 가능
  const inputWords = originalInput.split(/\s+/).filter(w => w.length >= 2).map(w => w.toLowerCase())
  const hashRelevantWords = [
    kwNospace.toLowerCase(),
    ...kw.split(/\s+/).filter(w => w.length >= 2).map(w => w.toLowerCase()),
    ...inputWords,
    ...(brandLower ? brandLower.split(/\s+/).filter(w => w.length >= 2) : []),
    ...relatedKeywords.slice(0, 8).map(r => r.word.toLowerCase()),
  ]

  let topHashtags = Object.entries(hashtagFreq)
    .filter(([tag]) => {
      const tLower = tag.toLowerCase()
      if (GENERIC_HASHTAGS.some(g => tLower.includes(g))) return true
      return hashRelevantWords.some(w => tLower.startsWith(w) || tLower === w)
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }))

  // 5개 미만이면 연관 키워드로 보완
  if (topHashtags.length < 5) {
    const existing = new Set(topHashtags.map(h => h.tag))
    const candidates = [
      kwNospace,
      ...kw.split(/\s+/).filter(p => p.length >= 2),
      ...relatedKeywords.map(r => r.word),
    ]
      .map(t => cleanTag(t))
      .filter(t => t.length >= 2)
    for (const tag of candidates) {
      if (topHashtags.length >= 10) break
      if (existing.has(tag)) continue
      topHashtags = [...topHashtags, { tag, count: 0 }]
      existing.add(tag)
    }
  }

  return {
    titleTotal: allTitles.length,
    frontCount, middleCount, backCount,
    spacedCount, joinedCount,
    avgTitleLength, bracketCount, numberCount,
    modifiers,
    avgKwCount, avgFirstPos, avgKwDensity, introKwCount, postsAnalyzed: analyzePosts.length,
    perPostKw,
    relatedKeywords,
    topHashtags,
    avgChars, avgImages, avgVideos, avgHeadings, headingNumbered, mobileOptPct,
    smartBlocks: cd.smartBlocks || [],
    insights,
    strategy: { titleStructure, contentPoints },
  }
}

function buildPrompt(keyword: string, subKeywords: string, topic: string, notes: string, kd: KeywordResult | null, cd: CrawlData | null, analysis: Analysis | null) {
  const kw = keyword.trim()
  const a = analysis
  const titles = cd?.allTitles?.slice(0, 5).map((t, i) => `  ${i + 1}. ${t.title}`) || []
  const related = a?.relatedKeywords.slice(0, 10).map(r => r.word).join(', ') || ''
  const blocks = a?.smartBlocks.join(', ') || '블로그 VIEW'
  const hashtags = a?.topHashtags.slice(0, 10).map(h => `#${h.tag}`).join(' ') || ''
  const insightLines = a?.insights.map(ins => `• ${ins}`).join('\n') || ''
  const titlePoints = a?.strategy.titleStructure.map(t => `  - ${t}`).join('\n') || ''
  const contentPoints = a?.strategy.contentPoints.map(p => `  - ${p}`).join('\n') || ''

  const subKwLine = subKeywords.trim()
    ? `\n서브 키워드: ${subKeywords.trim().split(/[,，\s]+/).filter(Boolean).join(', ')}`
    : ''

  const hasPlaceInfo = /가게명:|전화:|주소:|영업시간:/.test(notes)
  const kwPos = a && a.frontCount >= (a.titleTotal || 1) * 0.5 ? '앞부분' : '중반부'
  const kwForm = a && a.joinedCount > a.spacedCount ? kw.replace(/\s/g, '') : kw

  return `네이버 SEO 상위노출 블로그 글 작성 요청

키워드: ${kw}${subKwLine}${topic ? `\n주제: ${topic}` : ''}

━━━ 제목 작성 ━━━
[분석 데이터]
• 평균 길이: ${a?.avgTitleLength || '-'}자
• 키워드 위치: 제목 ${kwPos}
• 키워드 표기: '${kwForm}' 권장
• 자주 쓰인 수식어: ${a?.modifiers.slice(0, 4).map(m => m.word).join(', ') || '-'}

[참고 제목 — 절대 표절 금지, 길이·위치·수식어 패턴만 참고]
${titles.join('\n') || '  (없음)'}

[제목 작성 규칙]
- 위 참고 제목들을 표절하지 말고 패턴만 참고해서 완전히 새로운 제목을 써줘
- 키워드 '${kwForm}'를 제목 ${kwPos}에 배치, ${a?.avgTitleLength || 20}자 내외
${titlePoints ? titlePoints : ''}

━━━ 본문 작성 ━━━
[알고리즘 분석]
• 목표 글자수: ${a?.avgChars.toLocaleString() || '-'}자 (공백·해시태그 제외)
• 이미지: ${a?.avgImages || '-'}장 이상
• 소제목: ${a?.avgHeadings || '-'}개 (이모지 또는 숫자형)
• 목표 블록: ${blocks}
• 키워드 등장: ${a?.avgKwCount || '-'}회 이상 (밀도 ${a?.avgKwDensity || '-'}‰)
• 키워드 첫 등장: ${a?.avgFirstPos || '-'}

[인사이트]
${insightLines || '  (없음)'}

[작성 포인트]
${contentPoints || '  (없음)'}

[연관 키워드 — 본문에 자연스럽게 녹이기]
${related}

[작성 규칙]
- 인트로: 첫 200자 내 키워드 자연스럽게 등장${a && a.postsAnalyzed > 0 && a.introKwCount === a.postsAnalyzed ? ' (상위노출 글 전체 공통, 필수)' : a && a.introKwCount > 0 ? ' (상위노출 글 다수 공통, 권장)' : ''}
${hasPlaceInfo ? '- 가게 기본 정보(가게명·주소·전화번호·영업시간)는 인트로 직후 방문 전 체크 섹션에 배치 (맨 아래 요약 박스 X, 본문 초반 필수)' : ''}
- 키워드 '${kwForm}' ${a?.avgKwCount || 5}회 이상, 밀도 ${a?.avgKwDensity || 3}‰ 수준으로 자연스럽게 반복
- 서브 키워드를 본문에 자연스럽게 포함
- 연관 키워드 위에서 선별해 본문 전반에 분산 배치
- 마크다운 헤더(##), HTML 태그 사용 금지
- 참고사항에 오타가 있으면 자연스럽게 수정해서 반영
${notes ? `\n[내 정보 / 참고사항]\n${notes}` : ''}

━━━ 해시태그 ━━━
아래 해시태그로 마무리해줘. 글자수는 해시태그 제외 ${a?.avgChars?.toLocaleString() || 2000}자 이상 기준:
${hashtags || '관련 해시태그 5~7개'}

위 분석 데이터를 반영해서 제목부터 해시태그까지 완성해줘.`
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'home' | 'write-input' | 'analyzing' | 'supplement-input' | 'result' | 'keyword-insight-input' | 'keyword-insight-loading' | 'keyword-insight-result' | 'golden-category' | 'golden-loading' | 'golden-result' | 'trend-category' | 'trend-loading' | 'trend-result' | 'news-loading' | 'news-result'>('home')
  const HERO_TITLES = ['블로그 상위노출, 여기서 시작하세요!', '상위노출, 운이 아니라 전략입니다.']
  const [typedTitle, setTypedTitle] = useState('')
  const [titleDone, setTitleDone] = useState(false)
  useEffect(() => {
    if (mode !== 'home') return
    let cancelled = false
    let phraseIdx = 0
    const run = async () => {
      while (!cancelled) {
        const phrase = HERO_TITLES[phraseIdx % HERO_TITLES.length]
        // 타이핑
        for (let i = 1; i <= phrase.length; i++) {
          if (cancelled) return
          setTypedTitle(phrase.slice(0, i))
          setTitleDone(false)
          await new Promise(r => setTimeout(r, 60))
        }
        setTitleDone(true)
        await new Promise(r => setTimeout(r, 1800))
        // 지우기
        for (let i = phrase.length - 1; i >= 0; i--) {
          if (cancelled) return
          setTypedTitle(phrase.slice(0, i))
          setTitleDone(false)
          await new Promise(r => setTimeout(r, 30))
        }
        await new Promise(r => setTimeout(r, 300))
        phraseIdx++
      }
    }
    run()
    return () => { cancelled = true }
  }, [mode])

  const [topic, setTopic] = useState('')
  const [brandName, setBrandName] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [subKeywords, setSubKeywords] = useState<string[]>([])
  const [subKeywordInput, setSubKeywordInput] = useState('')
  const [notes, setNotes] = useState('')
  const [referenceLink, setReferenceLink] = useState('')

  const [keywordData, setKeywordData] = useState<KeywordResult | null>(null)
  const [crawlData, setCrawlData] = useState<CrawlData | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [prompt, setPrompt] = useState('')

  const [placeLoading, setPlaceLoading] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [hashtagCopied, setHashtagCopied] = useState(false)

  // keyword insight state
  const [insightKeyword, setInsightKeyword] = useState('')
  const [insightData, setInsightData] = useState<InsightResult | null>(null)
  const [insightError, setInsightError] = useState('')

  // golden keywords state
  const [goldenCategory, setGoldenCategory] = useState('')
  const [goldenResults, setGoldenResults] = useState<GoldenKeyword[]>([])
  const [goldenHasMore, setGoldenHasMore] = useState(false)
  const [goldenOffset, setGoldenOffset] = useState(0)
  const [goldenError, setGoldenError] = useState('')
  const [goldenLoadingMore, setGoldenLoadingMore] = useState(false)
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null)
  const [ideasMap, setIdeasMap] = useState<Record<string, KeywordIdea[] | 'loading' | 'error'>>({})

  const [autoSelectedKeyword, setAutoSelectedKeyword] = useState('')

  // trend & issue state
  const [trendCategory, setTrendCategory] = useState('')
  const [trendTab, setTrendTab] = useState<'issue' | 'trend'>('issue')
  const [trendKeywords, setTrendKeywords] = useState<{ keyword: string; ratio: number; rank: number }[]>([])
  const [trendError, setTrendError] = useState('')
  const [trendExpandedKeyword, setTrendExpandedKeyword] = useState<string | null>(null)
  const [trendIdeasMap, setTrendIdeasMap] = useState<Record<string, KeywordIdea[] | 'loading' | string>>({})
  const [issueTitles, setIssueTitles] = useState<string[]>([])
  const [issueError, setIssueError] = useState('')
  const [issueExpandedTopic, setIssueExpandedTopic] = useState<string | null>(null)
  const [issueIdeasMap, setIssueIdeasMap] = useState<Record<string, ShortentsIdea[] | 'loading' | string>>({})

  // news ranking state
  const [newsRankingItems, setNewsRankingItems] = useState<string[]>([])
  const [newsRankingFetchedAt, setNewsRankingFetchedAt] = useState<string | null>(null)
  const [newsRankingError, setNewsRankingError] = useState('')
  const [newsIdeasMap, setNewsIdeasMap] = useState<Record<string, ShortentsIdea[] | 'loading' | 'error'>>({})
  const [newsExpandedItem, setNewsExpandedItem] = useState<string | null>(null)

  // supplement-input state
  const [commonSections, setCommonSections] = useState<{ topic: string; note: string }[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [supplementMap, setSupplementMap] = useState<Record<string, string>>({})
  const [savedKeyword, setSavedKeyword] = useState('')
  const [savedSubKws, setSavedSubKws] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
      else setUser(user)
      setLoading(false)
    })
    const handlePopState = () => {
      setMode('home')
      resetAll()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // home이 아닌 모드로 진입할 때 히스토리 쌓기 → 뒤로가기 시 home으로 복귀
  useEffect(() => {
    if (mode !== 'home') {
      window.history.pushState(null, '', '/dashboard')
    }
  }, [mode])

  const resetAll = () => {
    setTopic(''); setBrandName(''); setKeywords([]); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink('')
    setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setAutoSelectedKeyword('')
    setError(''); setPlaceError('')
    setCopied(false); setHashtagCopied(false)
    setInsightKeyword(''); setInsightData(null); setInsightError('')
    setGoldenCategory(''); setGoldenResults([]); setGoldenHasMore(false); setGoldenOffset(0); setGoldenError(''); setExpandedKeyword(null)
    setTrendCategory(''); setTrendTab('issue'); setTrendKeywords([]); setTrendError(''); setTrendExpandedKeyword(null); setTrendIdeasMap({})
    setIssueTitles([]); setIssueError(''); setIssueExpandedTopic(null); setIssueIdeasMap({})
    setNewsRankingItems([]); setNewsRankingFetchedAt(null); setNewsRankingError(''); setNewsIdeasMap({}); setNewsExpandedItem(null)
    setCommonSections([]); setSectionsLoading(false); setSupplementMap({}); setSavedKeyword(''); setSavedSubKws('')
    setMode('home')
  }

  const isCoveredInNotes = (sectionTopic: string): boolean => {
    if (!notes) return false
    const words = sectionTopic.replace(/[·\/]+/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    return words.some(w => notes.includes(w))
  }

  const proceedToPrompt = () => {
    const supplementEntries = Object.entries(supplementMap).filter(([, v]) => v.trim())
    const supplementText = supplementEntries.map(([t, v]) => `${t}: ${v}`).join('\n')
    const finalNotes = notes && supplementText ? `${notes}\n${supplementText}` : notes || supplementText
    setPrompt(buildPrompt(savedKeyword, savedSubKws, topic, finalNotes, keywordData, crawlData, analysis))
    setMode('result')
  }

  const fetchGoldenKeywords = async (category: string, offset: number, append = false) => {
    try {
      const res = await fetch(`/api/golden-keywords?category=${category}&offset=${offset}`)
      const data = await res.json()
      if (!res.ok) { setGoldenError(data.error || '오류가 발생했습니다'); return }
      setGoldenResults(prev => append ? [...prev, ...data.results] : data.results)
      setGoldenHasMore(data.hasMore)
      setGoldenOffset(offset + data.results.length)
    } catch {
      setGoldenError('서버에 연결할 수 없습니다.')
    }
  }

  const startGolden = async (category: string) => {
    setGoldenCategory(category)
    setGoldenResults([])
    setGoldenOffset(0)
    setGoldenError('')
    setExpandedKeyword(null)
    setIdeasMap({})
    setMode('golden-loading')
    await fetchGoldenKeywords(category, 0, false)
    setMode('golden-result')
  }

  const loadMoreGolden = async () => {
    setGoldenLoadingMore(true)
    await fetchGoldenKeywords(goldenCategory, goldenOffset, true)
    setGoldenLoadingMore(false)
  }

  const toggleKeyword = async (keyword: string) => {
    if (expandedKeyword === keyword) { setExpandedKeyword(null); return }
    setExpandedKeyword(keyword)
    if (ideasMap[keyword]) return

    setIdeasMap(prev => ({ ...prev, [keyword]: 'loading' }))
    try {
      const res = await fetch('/api/keyword-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, category: goldenCategory }),
      })
      const data = await res.json()
      if (!res.ok) setIdeasMap(prev => ({ ...prev, [keyword]: 'error' }))
      else setIdeasMap(prev => ({ ...prev, [keyword]: data.ideas }))
    } catch {
      setIdeasMap(prev => ({ ...prev, [keyword]: 'error' }))
    }
  }

  const startInsight = async () => {
    const kw = insightKeyword.trim()
    if (!kw) return
    setMode('keyword-insight-loading')
    setInsightError('')
    setInsightData(null)
    try {
      const res = await fetch('/api/keyword-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInsightError(data.error || '분석 중 오류가 발생했습니다.')
        setMode('keyword-insight-input')
        return
      }
      setInsightData(data)
      setMode('keyword-insight-result')
    } catch {
      setInsightError('서버에 연결할 수 없습니다. 크롤러 서버가 실행 중인지 확인해주세요.')
      setMode('keyword-insight-input')
    }
  }

  const startTrend = async (category: string) => {
    setTrendCategory(category)
    setTrendTab('issue')
    setTrendKeywords([])
    setTrendError('')
    setTrendExpandedKeyword(null)
    setTrendIdeasMap({})
    setIssueTitles([])
    setIssueError('')
    setIssueExpandedTopic(null)
    setIssueIdeasMap({})
    setMode('trend-loading')

    const [trendRes, issueRes] = await Promise.allSettled([
      fetch(`/api/trend-keywords?category=${category}`).then(r => r.json()),
      fetch(`/api/shortents-topics?category=${category}`).then(r => r.json()),
    ])

    if (trendRes.status === 'fulfilled') {
      if (trendRes.value.error) setTrendError(trendRes.value.error)
      else setTrendKeywords(trendRes.value.keywords || [])
    } else {
      setTrendError('트렌드 데이터를 불러오지 못했습니다.')
    }

    if (issueRes.status === 'fulfilled') {
      setIssueTitles(issueRes.value.shortentsTitles || [])
    } else {
      setIssueError('이슈 데이터를 불러오지 못했습니다.')
    }

    setMode('trend-result')
  }

  const toggleTrendKeyword = async (keyword: string) => {
    if (trendExpandedKeyword === keyword) { setTrendExpandedKeyword(null); return }
    setTrendExpandedKeyword(keyword)
    if (trendIdeasMap[keyword]) return

    setTrendIdeasMap(prev => ({ ...prev, [keyword]: 'loading' }))
    try {
      const res = await fetch('/api/keyword-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, category: trendCategory }),
      })
      const data = await res.json()
      if (!res.ok) setTrendIdeasMap(prev => ({ ...prev, [keyword]: data.error || 'error' }))
      else setTrendIdeasMap(prev => ({ ...prev, [keyword]: data.ideas }))
    } catch {
      setTrendIdeasMap(prev => ({ ...prev, [keyword]: 'error' }))
    }
  }

  const generateIssueIdea = async (topic: string) => {
    if (issueExpandedTopic === topic) { setIssueExpandedTopic(null); return }
    setIssueExpandedTopic(topic)
    if (issueIdeasMap[topic]) return

    setIssueIdeasMap(prev => ({ ...prev, [topic]: 'loading' }))
    try {
      const res = await fetch('/api/shortents-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: trendCategory, topic }),
      })
      const data = await res.json()
      if (!res.ok) setIssueIdeasMap(prev => ({ ...prev, [topic]: data.error || 'error' }))
      else setIssueIdeasMap(prev => ({ ...prev, [topic]: data.ideas }))
    } catch {
      setIssueIdeasMap(prev => ({ ...prev, [topic]: 'error' }))
    }
  }

  const startNewsRanking = async () => {
    setNewsRankingItems([])
    setNewsRankingFetchedAt(null)
    setNewsRankingError('')
    setNewsIdeasMap({})
    setNewsExpandedItem(null)
    setMode('news-loading')
    try {
      const res = await fetch('/api/news-ranking')
      const data = await res.json()
      if (!res.ok) setNewsRankingError(data.error || '오류가 발생했습니다')
      else {
        setNewsRankingItems(data.items || [])
        setNewsRankingFetchedAt(data.fetchedAt || null)
      }
    } catch {
      setNewsRankingError('서버에 연결할 수 없습니다.')
    }
    setMode('news-result')
  }

  const generateNewsIdea = async (item: string) => {
    if (newsExpandedItem === item) { setNewsExpandedItem(null); return }
    setNewsExpandedItem(item)
    if (newsIdeasMap[item]) return

    setNewsIdeasMap(prev => ({ ...prev, [item]: 'loading' }))
    try {
      const res = await fetch('/api/news-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: item }),
      })
      const data = await res.json()
      if (!res.ok) setNewsIdeasMap(prev => ({ ...prev, [item]: data.error || 'error' }))
      else setNewsIdeasMap(prev => ({ ...prev, [item]: data.ideas }))
    } catch {
      setNewsIdeasMap(prev => ({ ...prev, [item]: 'error' }))
    }
  }

  const mainKeyword = keywords[0] || keywordInput.trim()

  const addKeyword = (val: string) => {
    const trimmed = val.trim().replace(/,$/, '')
    if (trimmed && keywords.length < 3 && !keywords.includes(trimmed)) {
      setKeywords(prev => [...prev, trimmed])
    }
    setKeywordInput('')
  }

  const handleKeywordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (keywords.length >= 3) return
    const val = e.target.value
    if (val.includes(',')) {
      const parts = val.split(',').map(p => p.trim()).filter(Boolean)
      parts.forEach(p => { if (p && keywords.length < 3 && !keywords.includes(p)) setKeywords(prev => [...prev, p]) })
      setKeywordInput('')
    } else {
      setKeywordInput(val)
    }
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (keywordInput.trim()) { addKeyword(keywordInput); return }
      if (keywords.length > 0) startAnalysis()
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      setKeywords(prev => prev.slice(0, -1))
    }
  }

  const addSubKeyword = (val: string) => {
    const trimmed = val.trim().replace(/,$/, '')
    if (trimmed && !subKeywords.includes(trimmed)) {
      setSubKeywords(prev => [...prev, trimmed])
    }
    setSubKeywordInput('')
  }

  const handleSubKeywordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.includes(',')) {
      const parts = val.split(',').map(p => p.trim()).filter(Boolean)
      parts.forEach(p => { if (p && !subKeywords.includes(p)) setSubKeywords(prev => [...prev, p]) })
      setSubKeywordInput('')
    } else {
      setSubKeywordInput(val)
    }
  }

  const handleSubKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (subKeywordInput.trim()) addSubKeyword(subKeywordInput)
    } else if (e.key === 'Backspace' && !subKeywordInput && subKeywords.length > 0) {
      setSubKeywords(prev => prev.slice(0, -1))
    }
  }

  const startAnalysis = async () => {
    const allKws = keywordInput.trim() ? [...keywords, keywordInput.trim()] : [...keywords]
    if (!topic.trim()) { setError('작성 주제를 입력해주세요'); return }
    if (allKws.length === 0) { setError('타겟 키워드를 입력해주세요'); return }
    if (keywordInput.trim()) addKeyword(keywordInput)
    setMode('analyzing')
    setError('')

    try {
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: allKws })
      })
      const analyzeData = await analyzeRes.json()

      // goldenScore 높은 순(=경쟁 낮은 순)으로 정렬된 결과에서 첫 번째 선택
      const best = analyzeData.inputResults?.[0] || null
      const selectedKw = best?.keyword || allKws[0]
      setAutoSelectedKeyword(allKws.length > 1 ? selectedKw : '')

      // 선택되지 않은 타겟 키워드 → 서브 키워드로
      const remainingKws = allKws.filter(kw => kw !== selectedKw)
      const allSubKws = [...remainingKws, ...subKeywords].join(', ')

      const crawlRes = await fetch(`http://localhost:3001/analyze-top-posts?keyword=${encodeURIComponent(selectedKw)}`)
      const cd: CrawlData = await crawlRes.json()

      const a = runAnalysis(selectedKw, cd, brandName, allKws.join(' '))
      setKeywordData(best)
      setCrawlData(cd)
      setAnalysis(a)
      setSavedKeyword(selectedKw)
      setSavedSubKws(allSubKws)
      setCommonSections([])
      setSupplementMap({})
      setSectionsLoading(true)
      setMode('supplement-input')

      // 비동기로 공통 섹션 분석 (화면 전환 후 백그라운드)
      ;(async () => {
        try {
          const postsForAnalysis = (cd.posts || []).slice(0, 3).map((p: CrawlPost) => ({
            title: p.title,
            fullText: (p.fullText || '').slice(0, 1500)
          }))
          if (postsForAnalysis.length > 0) {
            const res = await fetch('/api/analyze-common-sections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keyword: selectedKw, topic, posts: postsForAnalysis })
            })
            const data = await res.json()
            setCommonSections(data.sections || [])
          }
        } catch {
          setCommonSections([])
        } finally {
          setSectionsLoading(false)
        }
      })()
    } catch {
      setError('분석 중 오류가 발생했습니다. 크롤러 서버가 실행 중인지 확인해주세요.')
      setMode('write-input')
    }
  }

  const extractPlace = async () => {
    if (!referenceLink.trim()) return
    setPlaceLoading(true)
    setPlaceError('')
    try {
      const res = await fetch('/api/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: referenceLink.trim() })
      })
      const data = await res.json()
      if (data.error) { setPlaceError(data.error); return }
      if (data.formatted) setNotes(prev => prev ? `${prev}\n${data.formatted}` : data.formatted)
    } catch {
      setPlaceError('가게 정보를 불러오지 못했습니다.')
    } finally {
      setPlaceLoading(false)
    }
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyHashtags = () => {
    if (!analysis) return
    const tagStr = analysis.topHashtags.slice(0, 10).map(h => `#${h.tag}`).join(' ')
    navigator.clipboard.writeText(tagStr)
    setHashtagCopied(true)
    setTimeout(() => setHashtagCopied(false), 2000)
  }

  const copySingleTag = (tag: string) => {
    navigator.clipboard.writeText(`#${tag}`)
  }

  if (!mounted || loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-lg cursor-pointer flex items-center gap-1.5" onClick={resetAll}>블로그황금키 <Key className="w-4 h-4 text-yellow-400" /></div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{user?.email}</span>
          <a href="/mypage" className="text-gray-400 hover:text-gray-600">마이페이지</a>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-gray-400 hover:text-gray-600">로그아웃</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* ── home ── */}
        {mode === 'home' && (
          <>
            <h2 className="text-3xl font-extrabold mb-2 text-center">
              {typedTitle}
              {!titleDone && <span className="inline-block w-0.5 h-7 bg-gray-800 align-middle ml-0.5 animate-pulse" />}
            </h2>
            <p className="text-gray-400 text-sm mb-8 text-center">키워드만 입력하면 상위노출에 최적화된 글을 바로 쓸 수 있어요</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button onClick={() => setMode('write-input')} className="bg-white border-2 border-gray-100 hover:border-blue-400 p-6 rounded-2xl text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:bg-blue-50 flex flex-col">
                <Wand2 className="w-7 h-7 text-blue-400 group-hover:text-blue-500 mb-4" />
                <h3 className="font-bold mb-1.5 group-hover:text-blue-500">글쓰기 프롬프트 자동 생성</h3>
                <p className="text-gray-400 text-sm leading-snug">키워드에 맞는 최적화 프롬프트를 바로 만들어드려요</p>
              </button>
              <button onClick={() => setMode('keyword-insight-input')} className="bg-white border-2 border-gray-100 hover:border-blue-400 p-6 rounded-2xl text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:bg-blue-50 flex flex-col">
                <BarChart2 className="w-7 h-7 text-blue-400 group-hover:text-blue-500 mb-4" />
                <h3 className="font-bold mb-1.5 group-hover:text-blue-500">키워드 인사이트</h3>
                <p className="text-gray-400 text-sm leading-snug">검색량·블로그수·경쟁강도를 한눈에 비교하고 최적의 키워드를 찾아보세요</p>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => setMode('golden-category')} className="bg-white border-2 border-gray-100 hover:border-yellow-400 p-5 rounded-2xl text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:bg-yellow-50 flex flex-col">
                <Trophy className="w-6 h-6 text-yellow-400 group-hover:text-yellow-500 mb-4" />
                <h3 className="font-bold text-sm mb-1 group-hover:text-yellow-500">황금키워드 발굴</h3>
                <p className="text-gray-400 text-xs leading-snug">검색량은 높고 경쟁은 낮은 키워드를 골라드려요</p>
              </button>
              <button onClick={() => setMode('trend-category')} className="bg-white border-2 border-gray-100 hover:border-green-400 p-5 rounded-2xl text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:bg-green-50 flex flex-col">
                <TrendingUp className="w-6 h-6 text-green-400 group-hover:text-green-500 mb-4" />
                <h3 className="font-bold text-sm mb-1 group-hover:text-green-500">트렌드·이슈 글감</h3>
                <p className="text-gray-400 text-xs leading-snug">지금 가장 핫한 이슈로 글감을 바로 찾아드려요</p>
              </button>
              <button onClick={startNewsRanking} className="bg-white border-2 border-gray-100 hover:border-red-400 p-5 rounded-2xl text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:bg-red-50 flex flex-col">
                <Newspaper className="w-6 h-6 text-red-400 group-hover:text-red-500 mb-4" />
                <h3 className="font-bold text-sm mb-1 group-hover:text-red-500">실시간 인기 뉴스</h3>
                <p className="text-gray-400 text-xs leading-snug">지금 가장 주목받는 뉴스로 글 아이디어를 얻어보세요</p>
              </button>
            </div>
          </>
        )}

        {/* ── write-input ── */}
        {mode === 'write-input' && (
          <div>
            <button onClick={resetAll} className="text-gray-400 text-sm mb-6 hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold mb-2 pl-2">키워드 분석</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">키워드를 입력하면 상위노출 패턴을 분석하고 프롬프트를 만들어드려요</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">작성 주제 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="예: 문래 라멘 로라멘 후기" value={topic} onChange={e => setTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-xl text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-300" />
                <p className="text-xs text-gray-400 mt-1 pl-3">작성하고 싶은 포스팅 주제를 입력하세요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">가게·브랜드명 <span className="text-gray-400 font-normal">(선택)</span></label>
                <input type="text" placeholder="예: 몽밀, 로라멘, 스타벅스"
                  value={brandName} onChange={e => setBrandName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-xl text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-300" />
                <p className="text-xs text-gray-400 mt-1 pl-3">입력하면 내 가게·브랜드에 딱 맞는 분석 결과가 나와요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">타겟 키워드 <span className="text-red-400">*</span></label>
                <div className="w-full px-3 py-2 border border-gray-400 rounded-xl text-sm focus-within:border-blue-400 flex flex-wrap gap-2 min-h-[46px] cursor-text"
                  onClick={() => document.getElementById('keyword-input')?.focus()}>
                  {keywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {kw}
                      <button type="button" onClick={() => setKeywords(prev => prev.filter((_, j) => j !== i))}
                        className="text-blue-400 hover:text-blue-600 leading-none">×</button>
                    </span>
                  ))}
                  {keywords.length < 3 && (
                    <input id="keyword-input" type="text"
                      placeholder={keywords.length === 0 ? '예: 문래 라멘' : '키워드 추가...'}
                      value={keywordInput}
                      onChange={handleKeywordInputChange}
                      onKeyDown={handleKeywordKeyDown}
                      className="flex-1 min-w-[120px] outline-none bg-transparent py-1 placeholder:text-gray-300" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 pl-3">최대 3개까지 쉼표(,)로 구분해서 입력하면 상위노출에 가장 유리한 키워드를 자동으로 골라드려요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">서브 키워드 <span className="text-gray-400 font-normal">(선택)</span></label>
                <div className="w-full px-3 py-2 border border-gray-400 rounded-xl text-sm focus-within:border-blue-400 flex flex-wrap gap-2 min-h-[46px] cursor-text"
                  onClick={() => document.getElementById('sub-keyword-input')?.focus()}>
                  {subKeywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      {kw}
                      <button type="button" onClick={() => setSubKeywords(prev => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-gray-600 leading-none">×</button>
                    </span>
                  ))}
                  <input id="sub-keyword-input" type="text"
                    placeholder={subKeywords.length === 0 ? '예: 문래동 맛집, 영등포 라멘' : '키워드 추가...'}
                    value={subKeywordInput}
                    onChange={handleSubKeywordInputChange}
                    onKeyDown={handleSubKeywordKeyDown}
                    className="flex-1 min-w-[120px] outline-none bg-transparent py-1 placeholder:text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mt-1 pl-3">함께 노출되길 원하는 키워드를 쉼표(,)로 구분해서 입력하세요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">참고사항 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea placeholder={`예:\n주차가 협소해서 대중교통 이용 추천\n웨이팅이 있지만 회전율이 빨라서 금방 입장 가능\n떡볶이보다 튀김이 더 맛있었음\n혼밥하기 좋은 1인석 있음`}
                  value={notes} onChange={e => setNotes(e.target.value)} rows={5}
                  className="w-full px-4 py-3 border border-gray-400 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-300" />
                <p className="text-xs text-gray-400 -mt-0.5 pl-3">포스팅에 담고 싶은 내용이나 경험을 자유롭게 적어주세요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block pl-3">참고 링크 <span className="text-gray-400 font-normal">(선택)</span></label>
                <div className="flex gap-2">
                  <input type="text" placeholder="예: https://map.naver.com/p/... (네이버 플레이스 URL)"
                    value={referenceLink} onChange={e => { setReferenceLink(e.target.value); setPlaceError('') }}
                    className="flex-1 px-4 py-3 border border-gray-400 rounded-xl text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-300" />
                  <button type="button" onClick={extractPlace} disabled={!referenceLink.trim() || placeLoading}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-40 whitespace-nowrap">
                    {placeLoading ? '추출 중...' : '가게정보 불러오기'}
                  </button>
                </div>
                {placeError && <p className="text-xs text-red-400 mt-1">{placeError}</p>}
                {!placeError && <p className="text-xs text-gray-400 mt-1 pl-4">네이버 지도 URL을 붙여넣고 버튼을 누르면 잠시 후 위 참고사항이 자동으로 채워져요</p>}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={startAnalysis} disabled={!mainKeyword}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {!mainKeyword ? '필수 항목을 모두 입력해야 분석을 시작할 수 있어요' : '상위노출 분석 시작 →'}
              </button>
            </div>
          </div>
        )}

        {/* ── analyzing ── */}
        {mode === 'analyzing' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Key className="w-5 h-5 text-blue-500" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">분석 중이에요</h2>
            <p className="text-gray-500 text-sm mb-1">상위 노출 알고리즘을 분석하고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── supplement-input ── */}
        {mode === 'supplement-input' && (
          <div className="space-y-4">
            <button onClick={() => setMode('write-input')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">상위노출 최적화 체크리스트</h2>
            <p className="text-gray-600 text-sm -mt-2 pl-2">
              상위노출을 위해 꼭 담아야 할 항목들이에요. <span className="text-blue-500">체크되지 않은 항목에 내용을 입력하면</span> 자동으로 체크돼요. <span className="inline-block bg-blue-100 text-blue-500 text-xs px-2 py-0.5 rounded-full font-medium">선택사항</span>이지만 많이 채울수록 상위 노출 확률이 올라가요.
            </p>

            {sectionsLoading ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-lg">✨</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium">상위 노출 글 공통 패턴 분석 중...</p>
                <p className="text-xs text-gray-400 mt-1">분석하고 있어요.</p>
              </div>
            ) : commonSections.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center text-gray-400 text-sm">
                공통 섹션 분석 결과가 없어요. 그냥 프롬프트를 생성해주세요.
              </div>
            ) : (
              <div className="space-y-3">
                {commonSections.map(section => {
                  const coveredByNotes = isCoveredInNotes(section.topic)
                  const covered = coveredByNotes || !!(supplementMap[section.topic]?.trim())
                  return (
                    <div key={section.topic} className={`rounded-2xl p-5 shadow-sm ${covered ? 'bg-white opacity-70' : 'bg-blue-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded shrink-0 mt-0.5 border-2 flex items-center justify-center ${covered ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                          {covered && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${covered ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                            {section.topic}
                            {!covered && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">추가필요</span>}
                            {covered && <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">작성완료</span>}
                          </p>
                          <p className={`text-xs text-gray-500 mt-0.5 leading-relaxed ${covered ? 'italic' : ''}`}><span className="text-gray-600 font-medium">예:</span> {section.note}</p>
                          {!coveredByNotes && (
                            <textarea
                              value={supplementMap[section.topic] || ''}
                              onChange={e => setSupplementMap(prev => ({ ...prev, [section.topic]: e.target.value }))}
                              placeholder="이 항목에 대해 작성할 내용을 입력하세요."
                              rows={2}
                              className="mt-3 w-full px-4 py-2 border border-gray-400 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-300 bg-white"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={proceedToPrompt}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600"
              >
                {Object.values(supplementMap).some(v => v.trim()) ? '추가하고 프롬프트 생성 →' : '프롬프트 생성 →'}
              </button>
              {!sectionsLoading && Object.values(supplementMap).some(v => v.trim()) && (
                <button
                  onClick={() => { setSupplementMap({}); proceedToPrompt() }}
                  className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
                >
                  입력 내용 없이 건너뛰기
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── result ── */}
        {mode === 'result' && analysis && (
          <div className="space-y-4">
            <button onClick={() => { setTopic(''); setBrandName(''); setKeywords([]); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink(''); setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setMode('write-input') }} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">분석 결과</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">키워드: <span className="text-blue-500 font-medium">{keywordData?.keyword || mainKeyword}</span></p>
            {autoSelectedKeyword && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500 border-2 border-blue-500 mr-2 align-middle">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span><strong>'{autoSelectedKeyword}'</strong>을 타겟 키워드로 선정했어요 <span className="ml-1 text-xs bg-blue-500 text-white px-2.5 py-1 rounded-full font-medium">🏆 상위노출 최적 키워드</span>
              </div>
            )}

            {/* 키워드 통계 */}
            {keywordData && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> 키워드 데이터</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">월 검색량</p>
                    <p className="text-sm font-bold">{keywordData.totalSearch.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">블로그 글수</p>
                    <p className="text-sm font-bold">{keywordData.blogCount?.toLocaleString() ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">등급</p>
                    <p className="text-sm font-bold">{keywordData.grade}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 제목 패턴 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> 제목 패턴 분석</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">평균 제목 길이</p>
                  <p className="text-sm font-bold text-blue-500">{analysis.avgTitleLength}자</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">키워드 위치</p>
                  <p className="text-sm font-bold text-blue-500">
                    {analysis.frontCount >= analysis.middleCount && analysis.frontCount >= analysis.backCount ? '앞부분' :
                      analysis.middleCount >= analysis.backCount ? '중반부' : '뒷부분'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">키워드 형태</p>
                  <p className="text-sm font-bold text-blue-500">
                    {analysis.joinedCount > analysis.spacedCount ? '붙여쓰기' : '띄어쓰기'}
                  </p>
                </div>
              </div>
              {(analysis.bracketCount >= analysis.titleTotal * 0.3 || analysis.numberCount >= analysis.titleTotal * 0.3) && (
                <div className="flex gap-3">
                  {analysis.bracketCount >= analysis.titleTotal * 0.3 && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg">
                      [] 대괄호 활용 {analysis.bracketCount}/{analysis.titleTotal}개
                    </span>
                  )}
                  {analysis.numberCount >= analysis.titleTotal * 0.3 && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg">
                      숫자 포함 {analysis.numberCount}/{analysis.titleTotal}개
                    </span>
                  )}
                </div>
              )}
              {analysis.modifiers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">자주 쓰인 수식어</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.modifiers.map((m, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                        {m.word} <span className="text-blue-400">({m.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {crawlData?.allTitles && crawlData.allTitles.length > 0 && (() => {
                const kw = (keywordData?.keyword || mainKeyword).trim()
                const kwNs = kw.replace(/\s+/g, '').toLowerCase()
                const kwL = kw.toLowerCase()
                const brandL = brandName.trim().toLowerCase()
                const kwFiltered = crawlData.allTitles.filter(t =>
                  t.title.toLowerCase().replace(/\s+/g, '').includes(kwNs) ||
                  t.title.toLowerCase().includes(kwL)
                )
                const brandFiltered = brandL
                  ? kwFiltered.filter(t => t.title.toLowerCase().includes(brandL))
                  : kwFiltered
                const filtered = brandFiltered.length >= 3 ? brandFiltered : kwFiltered
                const displayTitles = filtered.length >= 3 ? filtered : crawlData.allTitles
                return (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">상위노출 제목</p>
                    <ul className="space-y-1.5">
                      {displayTitles.slice(0, 6).map((t, i) => (
                        <li key={i} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg flex gap-2">
                          <span className="text-xs text-gray-400 shrink-0">[{t.blockName}]</span>
                          <span>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </div>

            {/* 본문 키워드 분석 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 본문 키워드 분석</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">키워드 평균 노출</p>
                  <p className="text-sm font-bold text-blue-500">{analysis.avgKwCount}회</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">키워드 밀도</p>
                  <p className="text-sm font-bold text-blue-500">{analysis.avgKwDensity}‰</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">첫 등장 위치</p>
                  <p className="text-sm font-bold text-blue-500">{analysis.avgFirstPos.split('(')[0].trim()}</p>
                </div>
              </div>
              {analysis.perPostKw.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">글별 키워드 노출</p>
                  <ul className="space-y-1">
                    {analysis.perPostKw.map((p, i) => (
                      <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600 truncate flex-1 mr-2">{p.title}</span>
                        <span className="text-blue-500 font-medium shrink-0">{p.count}회 ({p.density}‰)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">평균 글자수 <span className="text-gray-400">(공백제외)</span></p>
                  <p className="text-sm font-bold">{analysis.avgChars.toLocaleString()}자</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">평균 이미지</p>
                  <p className="text-sm font-bold">{analysis.avgImages}장</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">평균 소제목</p>
                  <p className="text-sm font-bold">{analysis.avgHeadings}개</p>
                </div>
              </div>
            </div>

            {/* 작성 스타일 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> 작성 스타일</p>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${analysis.mobileOptPct >= 50 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Smartphone className="w-3 h-3" /> 모바일 최적화 {analysis.mobileOptPct >= 50 ? '권장' : '해당없음'}
                </span>
                {analysis.avgImages > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full font-medium">
                    <Search className="w-3 h-3" /> 이미지 평균 {analysis.avgImages}장
                  </span>
                )}
                {analysis.avgVideos > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-medium">
                    <Zap className="w-3 h-3" /> 영상 평균 {analysis.avgVideos}개
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${analysis.avgHeadings > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                  <FileText className="w-3 h-3" /> 소제목 {analysis.avgHeadings > 0 ? `평균 ${analysis.avgHeadings}개 (${analysis.headingNumbered ? '숫자형' : '일반형'})` : '미사용'}
                </span>
              </div>
            </div>

            {/* 연관 키워드 */}
            {analysis.relatedKeywords.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> 연관 키워드 분포 <span className="text-gray-400 font-normal">(본문 빈도 기준)</span></p>
                <div className="flex flex-wrap gap-2">
                  {analysis.relatedKeywords.map((r, i) => (
                    <span key={i} className={`text-xs px-3 py-1 rounded-full font-medium ${
                      i < 3 ? 'bg-blue-500 text-white' :
                      i < 8 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.word} <span className="opacity-70">({r.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 추천 해시태그 */}
            {analysis.topHashtags.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> 추천 해시태그</p>
                  <button onClick={copyHashtags}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      hashtagCopied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {hashtagCopied ? '복사됨 ✓' : '전체 복사'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.topHashtags.map((h, i) => (
                    <span key={i} onClick={() => copySingleTag(h.tag)}
                      className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80 ${
                        i < 3 ? 'bg-purple-500 text-white' :
                        i < 8 ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                      #{h.tag}{h.count > 1 && <span className="opacity-70 ml-1">({h.count})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 알고리즘 인사이트 */}
            {analysis.insights.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> 알고리즘 인사이트 & 작성 전략</p>
                <ul className="space-y-3">
                  {analysis.insights.map((ins, i) => {
                    const sep = ins.includes(' — ') ? ' — ' : ins.includes(' → ') ? ' → ' : null
                    if (sep) {
                      const idx = ins.indexOf(sep)
                      const stat = ins.slice(0, idx)
                      const desc = ins.slice(idx + sep.length)
                      return (
                        <li key={i} className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                          <p className="text-sm font-bold text-blue-500">{stat}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                        </li>
                      )
                    }
                    return (
                      <li key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-sm text-gray-700 leading-relaxed">{ins}</p>
                      </li>
                    )
                  })}
                </ul>
                {analysis.smartBlocks.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">목표 스마트블록</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.smartBlocks.map((b, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 작성 포인트 */}
            {analysis.strategy && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 작성 포인트</p>

                {analysis.strategy.titleStructure.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">제목 구조</p>
                    <ul className="space-y-1.5">
                      {analysis.strategy.titleStructure.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-blue-400 shrink-0">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.strategy.contentPoints.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">본문 구조</p>
                    <ul className="space-y-1.5">
                      {analysis.strategy.contentPoints.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-blue-400 shrink-0">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.relatedKeywords.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 추천 서브 키워드</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.relatedKeywords.slice(0, 8).map((r, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {r.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 프롬프트 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Claude / ChatGPT에 붙여넣으세요</p>
                <button onClick={copyPrompt}
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                  {copied ? '복사됨 ✓' : '프롬프트 복사'}
                </button>
              </div>
              <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed">{prompt}</pre>
            </div>

          </div>
        )}

        {/* ── golden-category ── */}
        {mode === 'golden-category' && (
          <div>
            <button onClick={resetAll} className="text-gray-400 text-sm mb-6 hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold mb-2 pl-2">황금키워드 발굴</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">내 블로그 카테고리를 선택하세요</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startGolden(cat.id)}
                  className="bg-white border-2 border-gray-100 hover:border-yellow-400 p-4 rounded-2xl text-center transition-all group flex flex-col items-center"
                >
                  <cat.icon className={`w-6 h-6 mb-2 ${cat.color} group-hover:text-yellow-500`} />
                  <p className="font-medium text-sm group-hover:text-yellow-500">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── golden-loading ── */}
        {mode === 'golden-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-yellow-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Trophy className="w-5 h-5 text-yellow-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">황금키워드 찾는 중</h2>
            <p className="text-gray-500 text-sm">경쟁이 적고 검색량이 좋은 키워드를 찾고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── golden-result ── */}
        {mode === 'golden-result' && (
          <div className="space-y-4">
            <button onClick={() => setMode('golden-category')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">황금키워드 발굴</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">
              카테고리: <span className="text-yellow-500 font-medium inline-flex items-center gap-1">
                {(() => { const cat = CATEGORIES.find(c => c.id === goldenCategory); return cat ? <cat.icon className="w-3.5 h-3.5" /> : null })()}
                {CATEGORIES.find(c => c.id === goldenCategory)?.label}
              </span>
            </p>

            {goldenError && <p className="text-red-500 text-sm">{goldenError}</p>}

            {goldenResults.length === 0 && !goldenError ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">아직 데이터가 준비 중이에요</p>
                <p className="text-sm">키워드 DB가 구축되는 동안 잠시 기다려주세요 (약 12일 소요)</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">키워드</th>
                      <th className="text-right px-3 py-3 font-medium">PC</th>
                      <th className="text-right px-3 py-3 font-medium">모바일</th>
                      <th className="text-right px-3 py-3 font-medium">블로그</th>
                      <th className="text-center px-3 py-3 font-medium">경쟁강도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goldenResults.map((kw, i) => (
                      <>
                        <tr
                          key={kw.keyword}
                          onClick={() => toggleKeyword(kw.keyword)}
                          className="border-b border-gray-50 hover:bg-yellow-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <span className="flex items-center gap-1.5">
                              {kw.keyword}
                              {(kw.trend_score ?? 0) >= 50 && (
                                <span className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full font-medium"><Flame className="w-3 h-3" /> 트렌드</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-gray-600">{kw.pc_volume.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{kw.mobile_volume.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{kw.blog_count?.toLocaleString() ?? '-'}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              kw.competition_label === '매우좋음' ? 'text-green-600 bg-green-50' : 'text-green-700 bg-green-50'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              {kw.competition_label}
                            </span>
                          </td>
                        </tr>
                        {expandedKeyword === kw.keyword && (
                          <tr key={`ideas-${kw.keyword}`} className="bg-yellow-50 border-b border-gray-100">
                            <td colSpan={5} className="px-4 py-4">
                              {ideasMap[kw.keyword] === 'loading' && (
                                <p className="text-sm text-gray-400 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> 글감 생성 중...</p>
                              )}
                              {ideasMap[kw.keyword] === 'error' && (
                                <p className="text-sm text-red-400">글감 생성에 실패했습니다.</p>
                              )}
                              {Array.isArray(ideasMap[kw.keyword]) && (
                                <div className="space-y-3">
                                  <div className="relative inline-block group mb-2">
                                    <p className="text-xs font-semibold text-gray-600 cursor-default flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> 황금 글감 추천</p>
                                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap">
                                      <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg">
                                        상위 노출 가능성이 높은 글감입니다.
                                        <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800" />
                                      </div>
                                    </div>
                                  </div>
                                  {(ideasMap[kw.keyword] as KeywordIdea[]).map((idea, j) => (
                                    <div key={j} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                                      <p className="font-medium text-sm text-gray-800 mb-1.5">
                                        <span className="text-yellow-500 mr-1">{j + 1}.</span>{idea.title}
                                      </p>
                                      <ul className="space-y-0.5">
                                        {idea.points.map((pt, k) => (
                                          <li key={k} className="text-xs text-gray-500 flex gap-1.5">
                                            <span className="text-yellow-400 shrink-0">•</span>{pt}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                {goldenHasMore && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <button
                      onClick={loadMoreGolden}
                      disabled={goldenLoadingMore}
                      className="px-6 py-2 bg-yellow-400 text-white rounded-xl text-sm font-medium hover:bg-yellow-500 disabled:opacity-50"
                    >
                      {goldenLoadingMore ? '불러오는 중...' : '더보기'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── keyword-insight-input ── */}
        {mode === 'keyword-insight-input' && (
          <div>
            <button onClick={resetAll} className="text-gray-400 text-sm mb-6 hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold mb-2 pl-2">키워드 인사이트</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">키워드 하나를 입력하면 검색량과 경쟁강도를 분석해드려요 (일 10회)</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">분석할 키워드</label>
                <input
                  type="text"
                  placeholder="예: 문래 라멘"
                  value={insightKeyword}
                  onChange={e => setInsightKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && insightKeyword.trim()) startInsight() }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-300"
                  autoFocus
                />
              </div>
              {insightError && <p className="text-red-500 text-sm">{insightError}</p>}
              <button
                onClick={startInsight}
                disabled={!insightKeyword.trim()}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                분석 시작 →
              </button>
            </div>
          </div>
        )}

        {/* ── keyword-insight-loading ── */}
        {mode === 'keyword-insight-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Key className="w-5 h-5 text-blue-500" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">분석 중이에요</h2>
            <p className="text-gray-500 text-sm mb-1">검색량과 경쟁강도를 분석하고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── trend-category ── */}
        {mode === 'trend-category' && (
          <div>
            <button onClick={resetAll} className="text-gray-400 text-sm mb-6 hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold mb-2 pl-2">트렌드·이슈 글감 발굴</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">내 블로그 카테고리를 선택하세요</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startTrend(cat.id)}
                  className="bg-white border-2 border-gray-100 hover:border-green-400 p-4 rounded-2xl text-center transition-all group flex flex-col items-center"
                >
                  <cat.icon className={`w-6 h-6 mb-2 ${cat.color} group-hover:text-green-500`} />
                  <p className="font-medium text-sm group-hover:text-green-500">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── trend-loading ── */}
        {mode === 'trend-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">트렌드·이슈 불러오는 중</h2>
            <p className="text-gray-500 text-sm">트렌드 키워드와 지금 뜨는 이슈를 동시에 불러오고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── trend-result ── */}
        {mode === 'trend-result' && (
          <div className="space-y-4">
            <button onClick={() => setMode('trend-category')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">트렌드·이슈 글감 발굴</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">
              카테고리: <span className="text-green-500 font-medium inline-flex items-center gap-1">
                {(() => { const cat = CATEGORIES.find(c => c.id === trendCategory); return cat ? <cat.icon className="w-3.5 h-3.5" /> : null })()}
                {CATEGORIES.find(c => c.id === trendCategory)?.label}
              </span>
            </p>

            {/* 탭 */}
            <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setTrendTab('issue')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${trendTab === 'issue' ? 'bg-orange-50 text-orange-500 border-b-2 border-orange-400' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="flex items-center justify-center gap-1"><Zap className="w-3.5 h-3.5" /> 바이럴</span>
              </button>
              <button
                onClick={() => setTrendTab('trend')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${trendTab === 'trend' ? 'bg-green-50 text-green-500 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="flex items-center justify-center gap-1"><Flame className="w-3.5 h-3.5" /> 키워드</span>
              </button>
            </div>

            {/* 이슈 탭 */}
            {trendTab === 'issue' && (
              <>
                {issueError && <p className="text-red-500 text-sm">{issueError}</p>}
                {issueTitles.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-400">이슈</span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {issueTitles.map((title, i) => (
                        <li key={i}>
                          <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 1).padStart(2, '0')}</span>
                              <span className="text-sm text-gray-700 leading-snug">{title}</span>
                            </div>
                            <button
                              onClick={() => generateIssueIdea(title)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                                issueExpandedTopic === title
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                              }`}
                            >
                              글감 아이디어
                            </button>
                          </div>
                          {issueExpandedTopic === title && (
                            <div className="px-4 pb-4 bg-orange-50">
                              <ShortentsIdeaBlock ideasState={issueIdeasMap[title]} />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : !issueError && (
                  <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                    <Zap className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium mb-1">이 카테고리는 이슈 데이터가 없어요</p>
                    <p className="text-sm">키워드 탭에서 지금 뜨는 트렌드 키워드를 확인해보세요</p>
                  </div>
                )}
              </>
            )}

            {/* 트렌드 탭 */}
            {trendTab === 'trend' && (
              <>
                {trendError && <p className="text-red-500 text-sm">{trendError}</p>}
                {trendKeywords.length === 0 && !trendError ? (
                  <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium mb-1">아직 데이터가 준비 중이에요</p>
                    <p className="text-sm">트렌드 수집은 매일 새벽 5시에 진행돼요</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center">
                      <span className="flex-1 text-xs font-medium text-gray-400 text-center">키워드</span>
                      <span className="flex-1 text-xs font-medium text-gray-400 text-center">트렌드 지수</span>
                      <span className="flex-1"></span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {trendKeywords.map((kw, i) => (
                        <li key={kw.keyword}>
                          <div
                            className="px-4 py-3 flex items-center hover:bg-green-50 cursor-pointer transition-colors"
                            onClick={() => toggleTrendKeyword(kw.keyword)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 1).padStart(2, '0')}</span>
                              <span className="text-sm text-gray-700 font-medium truncate">{kw.keyword}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-1.5">
                              <span className="text-xs text-gray-500 font-medium">{Math.round(kw.ratio)}</span>
                              {kw.ratio >= 80 && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">핫해요</span>}
                              {kw.ratio >= 60 && kw.ratio < 80 && <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">상승 중</span>}
                              {kw.ratio < 60 && <span className="text-xs bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full font-medium">보통</span>}
                            </div>
                            <div className="flex-1 flex justify-end">
                              <button
                                onClick={e => { e.stopPropagation(); toggleTrendKeyword(kw.keyword) }}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                  trendExpandedKeyword === kw.keyword
                                    ? 'bg-green-500 text-white'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                              >
                                글감 아이디어
                              </button>
                            </div>
                          </div>
                          {trendExpandedKeyword === kw.keyword && (
                            <div className="px-4 pb-4 bg-green-50">
                              {trendIdeasMap[kw.keyword] === 'loading' && (
                                <p className="text-sm text-gray-400 pt-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> 글감 생성 중...</p>
                              )}
                              {typeof trendIdeasMap[kw.keyword] === 'string' && trendIdeasMap[kw.keyword] !== 'loading' && (
                                <p className="text-sm text-red-400 pt-2">오류: {trendIdeasMap[kw.keyword] as string}</p>
                              )}
                              {Array.isArray(trendIdeasMap[kw.keyword]) && (
                                <div className="space-y-2 pt-2">
                                  {(trendIdeasMap[kw.keyword] as KeywordIdea[]).map((idea, j) => (
                                    <div key={j} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                                      <p className="font-medium text-sm text-gray-800 mb-1.5">
                                        <span className="text-green-500 mr-1">{j + 1}.</span>{idea.title}
                                      </p>
                                      <ul className="space-y-0.5">
                                        {idea.points.map((pt, k) => (
                                          <li key={k} className="text-xs text-gray-500 flex gap-1.5">
                                            <span className="text-green-400 shrink-0">•</span>{pt}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── news-loading ── */}
        {mode === 'news-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-red-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Newspaper className="w-5 h-5 text-red-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">뉴스 랭킹 불러오는 중</h2>
            <p className="text-gray-500 text-sm">오늘 가장 많이 읽힌 뉴스를 가져오고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── news-result ── */}
        {mode === 'news-result' && (
          <div className="space-y-4">
            <button onClick={resetAll} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">실시간 인기 뉴스</h2>
            <div className="flex items-center justify-between -mt-2 pl-2">
              <p className="text-gray-400 text-sm">오늘 가장 많이 읽힌 뉴스로 블로그 글감을 만들어보세요</p>
              {newsRankingFetchedAt && (
                <p className="text-xs text-gray-400 shrink-0 ml-3">
                  {(() => {
                    const d = new Date(newsRankingFetchedAt)
                    const yy = d.getFullYear()
                    const mm = String(d.getMonth() + 1).padStart(2, '0')
                    const dd = String(d.getDate()).padStart(2, '0')
                    const hh = String(d.getHours()).padStart(2, '0')
                    return `${yy}/${mm}/${dd} ${hh}:00 기준`
                  })()}
                </p>
              )}
            </div>

            {newsRankingError && <p className="text-red-500 text-sm">{newsRankingError}</p>}

            {newsRankingItems.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> 인기 뉴스 TOP {newsRankingItems.length}</p>
                </div>
                <ul className="divide-y divide-gray-50">
                  {newsRankingItems.map((item, i) => (
                    <li key={i}>
                      <div className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs text-red-400 font-medium shrink-0 mt-0.5">#{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-sm text-gray-700 leading-snug">{item}</span>
                        </div>
                        <button
                          onClick={() => generateNewsIdea(item)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                            newsExpandedItem === item
                              ? 'bg-red-500 text-white'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          글감 아이디어
                        </button>
                      </div>
                      {newsExpandedItem === item && (
                        <div className="px-4 pb-4 bg-red-50">
                          <ShortentsIdeaBlock ideasState={newsIdeasMap[item]} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : !newsRankingError && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                <Newspaper className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">뉴스를 불러오지 못했어요</p>
                <p className="text-sm">잠시 후 다시 시도해주세요</p>
              </div>
            )}
          </div>
        )}

        {/* ── keyword-insight-result ── */}
        {mode === 'keyword-insight-result' && insightData && (
          <div className="space-y-4">
            <button onClick={() => { setInsightKeyword(''); setInsightData(null); setMode('keyword-insight-input') }} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">키워드 인사이트</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">키워드: <span className="text-blue-500 font-medium">{insightKeyword}</span></p>

            {/* 트렌드 방향 + 계절성 */}
            {(insightData.trendDirection || insightData.seasonality?.note) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> 검색량 추이</p>
                <div className="space-y-2">
                  {insightData.trendDirection && (
                    <p className={`text-sm font-medium ${
                      insightData.trendDirection.direction === '상승' ? 'text-green-500' :
                      insightData.trendDirection.direction === '하락' ? 'text-red-400' : 'text-gray-600'
                    }`}>
                      {insightData.trendDirection.direction === '상승' ? '검색량이 늘고 있어요' :
                       insightData.trendDirection.direction === '하락' ? '검색량이 줄고 있어요' : '검색량이 꾸준해요'}
                      {insightData.trendDirection.changeRate !== 0 && (
                        <span className="text-xs ml-1 text-gray-400 font-normal">
                          (지난주 대비 {Math.abs(insightData.trendDirection.changeRate)}% {insightData.trendDirection.changeRate > 0 ? '증가' : '감소'})
                        </span>
                      )}
                    </p>
                  )}
                  {insightData.seasonality?.note && (
                    <p className="text-sm text-yellow-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {insightData.seasonality.note}</p>
                  )}
                </div>
              </div>
            )}

            <InsightTable title="메인 키워드" icon="chart" items={[insightData.main]} />
            {insightData.autocomplete.length > 0 && (
              <InsightTable title={`자동완성 키워드 (${insightData.autocomplete.length}개)`} icon="pencil" items={insightData.autocomplete} />
            )}
            {insightData.related.length > 0 && (
              <InsightTable title={`연관 키워드 (${insightData.related.length}개)`} icon="link" items={insightData.related} />
            )}
          </div>
        )}

      </main>
    </div>
  )
}

function ShortentsIdeaBlock({ ideasState }: { ideasState: ShortentsIdea[] | 'loading' | string | undefined }) {
  if (!ideasState || ideasState === 'loading') {
    return <p className="text-sm text-gray-400 py-2">💡 글감 생성 중...</p>
  }
  if (typeof ideasState === 'string') {
    return <p className="text-sm text-red-400 py-2">오류: {ideasState}</p>
  }
  return (
    <div className="space-y-2 pt-2">
      {(ideasState as ShortentsIdea[]).map((idea, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-400 font-medium mb-0.5 flex items-center gap-1"><Search className="w-3 h-3" /> 검색형</p>
            <p className="text-sm font-medium text-gray-800">{idea.searchTitle}</p>
          </div>
          <div className="bg-orange-50 rounded-lg px-3 py-2">
            <p className="text-xs text-orange-400 font-medium mb-0.5 flex items-center gap-1"><Smartphone className="w-3 h-3" /> 홈피드형</p>
            <p className="text-sm font-medium text-gray-800">{idea.feedTitle}</p>
          </div>
          {idea.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.keywords.map((kw, j) => (
                <span key={j} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function competitionClass(color: string) {
  if (color === 'green') return 'text-green-600 bg-green-50'
  if (color === 'yellow') return 'text-yellow-600 bg-yellow-50'
  if (color === 'orange') return 'text-orange-600 bg-orange-50'
  if (color === 'red') return 'text-red-600 bg-red-50'
  return 'text-gray-500 bg-gray-50'
}

function InsightTable({ title, icon, items }: { title: string; icon?: 'chart' | 'pencil' | 'link'; items: InsightKeywordItem[] }) {
  const Icon = icon === 'pencil' ? Pencil : icon === 'link' ? Link2 : BarChart2
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">키워드</th>
              <th className="text-right pb-2 font-medium">PC</th>
              <th className="text-right pb-2 font-medium">모바일</th>
              <th className="text-right pb-2 font-medium">블로그</th>
              <th className="text-center pb-2 font-medium">경쟁강도</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 pr-3 font-medium text-gray-800 max-w-[140px] truncate">{item.keyword}</td>
                <td className="py-2.5 text-right text-gray-600">{item.pcVolume.toLocaleString()}</td>
                <td className="py-2.5 text-right text-gray-600">{item.mobileVolume.toLocaleString()}</td>
                <td className="py-2.5 text-right text-gray-600">
                  {item.blogCount !== null ? item.blogCount.toLocaleString() : '-'}
                </td>
                <td className="py-2.5 text-center">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${competitionClass(item.competition.color)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.competition.color === 'green' ? 'bg-green-500' : item.competition.color === 'yellow' ? 'bg-yellow-400' : item.competition.color === 'orange' ? 'bg-orange-400' : 'bg-red-400'}`} />
                    {item.competition.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
