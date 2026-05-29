'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart2, Trophy, TrendingUp, Newspaper, Key, Tag, FileText, Smartphone, Link2, Hash, Lightbulb, PenLine, Copy, Flame, RefreshCw, Zap, Search, Calendar, Pencil, Plane, Shirt, Sparkles, Utensils, Monitor, Car, Home, Baby, Heart, Gamepad2, PawPrint, Dumbbell, Tv, Film, BookOpen, Briefcase, GraduationCap, Gem, User, LogOut, ChevronRight, Info, Circle, Check, type LucideIcon } from 'lucide-react'

const WordCloud = dynamic(() => import('react-d3-cloud'), { ssr: false })

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
  { id: 'fashion', label: '패션', icon: Shirt, color: 'text-gray-700' },
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
  { id: 'wedding', label: '웨딩', icon: Gem, color: 'text-pink-400' },
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

  const relatedKeywords: { word: string; count: number }[] = []

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
    insights.push(`키워드 밀도 평균 ${avgKwDensity}‰ (1,000자당 ${avgKwDensity}회) — 과도한 반복 없이 ${avgKwCount}회 자연스럽게 분산`)

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

  // 5개 미만이면 키워드로 보완
  if (topHashtags.length < 5) {
    const existing = new Set(topHashtags.map(h => h.tag))
    const candidates = [
      kwNospace,
      ...kw.split(/\s+/).filter(p => p.length >= 2),
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

function buildPrompt(keyword: string, subKeywords: string, topic: string, notes: string, kd: KeywordResult | null, cd: CrawlData | null, analysis: Analysis | null, postType: 'review' | 'info' | 'simple' | '' = '') {
  const kw = keyword.trim()
  const a = analysis
  const titles = cd?.allTitles?.slice(0, 5).map((t, i) => `  ${i + 1}. ${t.title}`) || []
  const blocks = a?.smartBlocks.join(', ') || '블로그 VIEW'
  const hashtags = a?.topHashtags.slice(0, 10).map(h => `#${h.tag}`).join(' ') || ''
  const insightLines = a?.insights.map(ins => `• ${ins}`).join('\n') || ''
  const titlePoints = a?.strategy.titleStructure.map(t => `- ${t}`).join('\n') || ''
  const contentPoints = a?.strategy.contentPoints.map(p => `- ${p}`).join('\n') || ''

  const subKwLine = subKeywords.trim()
    ? `\n서브 키워드: ${subKeywords.trim().split(/[,，\s]+/).filter(Boolean).join(', ')}`
    : ''

  const hasPlaceInfo = /가게명:|전화:|주소:|영업시간:/.test(notes)
  const kwPos = a && a.frontCount >= (a.titleTotal || 1) * 0.5 ? '앞부분' : '중반부'
  const kwForm = a && a.joinedCount > a.spacedCount ? kw.replace(/\s/g, '') : kw

  const postTypeGuide = postType === 'review'
    ? '글 유형: 후기·리뷰 — 직접 방문·사용한 경험을 중심으로, 솔직하고 생생한 구어체로 서술'
    : postType === 'info'
    ? '글 유형: 정보·가이드 — 독자에게 유용한 정보 중심으로, 명확하고 신뢰감 있는 문체로 구성'
    : postType === 'simple'
    ? '글 유형: 일상·기록 — 자연스러운 일상 기록 형식으로, 편안한 구어체로 서술'
    : ''

  return `네이버 SEO 상위노출 블로그 글 작성 요청

키워드: ${kw}${subKwLine}${topic ? `\n주제: ${topic}` : ''}${postTypeGuide ? `\n${postTypeGuide}` : ''}

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
${titlePoints}

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

[작성 규칙]
- 인트로: 첫 200자 내 키워드 자연스럽게 등장${a && a.postsAnalyzed > 0 && a.introKwCount === a.postsAnalyzed ? ' (상위노출 글 전체 공통, 필수)' : a && a.introKwCount > 0 ? ' (상위노출 글 다수 공통, 권장)' : ''}${hasPlaceInfo ? '\n- 가게 기본 정보(가게명·주소·전화번호·영업시간)는 인트로 직후 방문 전 체크 섹션에 배치 (맨 아래 요약 박스 X, 본문 초반 필수)' : ''}
- 키워드 '${kwForm}' ${a?.avgKwCount || 5}회 이상, 밀도 ${a?.avgKwDensity || 3}‰ 수준으로 자연스럽게 반복
- 서브 키워드를 본문에 자연스럽게 포함
- 마크다운 헤더(##), HTML 태그 사용 금지
- 참고사항에 오타가 있으면 자연스럽게 수정해서 반영
${notes ? `\n[내 정보 / 참고사항]\n${notes}` : ''}

━━━ 해시태그 ━━━
아래 해시태그로 마무리해줘. 글자수는 해시태그 제외 ${a?.avgChars?.toLocaleString() || 2000}자 이상 기준:
${hashtags || '관련 해시태그 5~7개'}

위 분석 데이터를 반영해서 제목부터 해시태그까지 완성해줘.`
}

const MOCK_HOT_NICHES = [
  { rank: 1, slug: 'wedding', name: '웨딩', icon: '💍', weekly_increase_pct: 320, hot_post_count: 47, headline: '스드메 거품 논란 폭발' },
  { rank: 2, slug: 'finance', name: '재테크', icon: '📈', weekly_increase_pct: 180, hot_post_count: 32, headline: '30대 1억 모으기 vs 부동산 논쟁' },
  { rank: 3, slug: 'diet', name: '다이어트', icon: '💪', weekly_increase_pct: 90, hot_post_count: 28, headline: 'GLP-1 비만약 한국 출시 이슈' },
]

const MOCK_WEDDING_HOT_POSTS = [
  { source_label: '다이렉트결혼준비', title: '스드메 800에 했는데 친구는 1500... 거품인가요?', comments: 234, suggested_idea: '스드메 가격 거품의 진실' },
  { source_label: '다이렉트결혼준비', title: '웨딩홀 vs 야외결혼식 비용 솔직 비교 후기', comments: 178, suggested_idea: '웨딩홀 vs 야외결혼 비용 완전 비교' },
  { source_label: '다이렉트결혼준비', title: '식장 예약 6개월 전 vs 1년 전, 차이가 진짜 있나요?', comments: 156, suggested_idea: '결혼식장 예약 타이밍 완벽 가이드' },
  { source_label: '맥마웨', title: '드레스샵 3곳 비교 후기 — 가격대별 솔직한 의견', comments: 143, suggested_idea: '웨딩드레스 가격대별 업체 비교 가이드' },
  { source_label: '맥마웨', title: '작은결혼식 했다가 후회한 이유 5가지', comments: 129, suggested_idea: '작은결혼식 장단점 솔직 후기' },
  { source_label: '네이버 뉴스', title: '2026년 평균 결혼 비용 8000만원 돌파...', comments: 98, suggested_idea: '결혼 비용 절약 꿀팁 10가지' },
]

const MOCK_WEDDING_PAIN_POINTS = [
  { rank: 1, pain_point: '스드메 견적 비교 어려움', mention_count: 312, related_keywords: ['스드메 견적', '스드메 비교', '스드메 패키지'], suggested_idea: '스드메 견적표 양식 무료 배포', sample_quotes: ['견적표가 너무 복잡해서 비교가 안 돼요', '업체마다 포함 사항이 달라요'] },
  { rank: 2, pain_point: '웨딩홀 계약 후 추가 비용 폭탄', mention_count: 267, related_keywords: ['웨딩홀 추가비용', '결혼식 비용 초과', '식장 계약'], suggested_idea: '웨딩홀 계약 시 꼭 확인해야 할 숨은 조항 5가지', sample_quotes: ['계약서에 없던 비용이 계속 나와요', '예산의 30%나 초과됐어요'] },
  { rank: 3, pain_point: '신혼여행 일정 vs 예산 조율 갈등', mention_count: 198, related_keywords: ['신혼여행 예산', '신혼여행 추천', '신혼여행 일정'], suggested_idea: '신혼여행 예산별 최적 코스 추천', sample_quotes: ['남편이랑 의견이 안 맞아요', '예산은 한정적인데 가고 싶은 곳이 너무 많아요'] },
  { rank: 4, pain_point: '청첩장 디자인·수량 결정 어려움', mention_count: 145, related_keywords: ['청첩장 디자인', '청첩장 수량', '청첩장 제작'], suggested_idea: '청첩장 수량 계산법 + 업체 비교 후기', sample_quotes: ['몇 장 만들어야 할지 모르겠어요', '종이 vs 모바일 청첩장 고민이에요'] },
  { rank: 5, pain_point: '양가 부모님 의견 충돌', mention_count: 134, related_keywords: ['결혼 준비 갈등', '양가 의견 차이', '결혼식 규모'], suggested_idea: '양가 의견 충돌 없이 결혼 준비하는 방법', sample_quotes: ['양가 어머니가 서로 다른 걸 원하세요', '시댁에서 하객이 너무 많이 초대됐어요'] },
]

const NICHE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  wedding: { icon: Gem, color: 'text-pink-400' },
  finance: { icon: TrendingUp, color: 'text-blue-500' },
  diet: { icon: Dumbbell, color: 'text-green-500' },
}

function DashboardPageInner() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)
  const [showProModal, setShowProModal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'write-input' | 'analyzing' | 'pattern-preview' | 'supplement-input' | 'result' | 'keyword-insight-input' | 'keyword-insight-loading' | 'keyword-insight-result' | 'golden-category' | 'golden-loading' | 'golden-result' | 'golden-guide' | 'trend-category' | 'trend-loading' | 'trend-result' | 'news-loading' | 'news-result' | 'feed-input' | 'feed-analyze' | 'feed-title' | 'feed-body' | 'feed-loading' | 'feed-result' | 'search-trend-category' | 'search-trend-loading' | 'search-trend-result' | 'niche-home' | 'niche-detail'>('keyword-insight-input')
  const [activeTab, setActiveTab] = useState<'keyword' | 'content' | 'prompt' | 'niche'>('keyword')
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'insight' | 'golden' | 'trend' | 'news' | 'search-trend'>('insight')
  const [promptSubTab, setPromptSubTab] = useState<'search' | 'feed'>('search')
  const [writeMode, setWriteMode] = useState<'search' | 'feed'>('search')
  const [postType, setPostType] = useState<'review' | 'info' | 'simple' | ''>('')

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
  const [proToast, setProToast] = useState(false)

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
  const [ideasMap, setIdeasMap] = useState<Record<string, KeywordIdea[] | 'loading' | 'error' | 'pro'>>({})

  const [autoSelectedKeyword, setAutoSelectedKeyword] = useState('')

  // trend & issue state
  const [trendCategory, setTrendCategory] = useState('')
  const [trendError, setTrendError] = useState('')
  const [issueTitles, setIssueTitles] = useState<string[]>([])
  const [issueError, setIssueError] = useState('')
  const [issueExpandedTopic, setIssueExpandedTopic] = useState<string | null>(null)
  const [issueIdeasMap, setIssueIdeasMap] = useState<Record<string, ShortentsIdea[] | 'loading' | string>>({})

  const [searchTrendCategory, setSearchTrendCategory] = useState('')
  const [searchTrendKeywords, setSearchTrendKeywords] = useState<{ keyword: string; ratio: number; rank: number }[]>([])
  const [searchTrendError, setSearchTrendError] = useState('')
  const [writeTooltipPos, setWriteTooltipPos] = useState<{x: number, y: number} | null>(null)
  const [trendBadgeTooltipPos, setTrendBadgeTooltipPos] = useState<{x: number, y: number} | null>(null)
  const writeTooltipRef = useRef<HTMLSpanElement>(null)

  // news ranking state
  const [newsRankingItems, setNewsRankingItems] = useState<{ title: string; url: string }[]>([])
  const [newsRankingFetchedAt, setNewsRankingFetchedAt] = useState<string | null>(null)
  const [newsRankingError, setNewsRankingError] = useState('')
  const [newsIdeasMap, setNewsIdeasMap] = useState<Record<string, ShortentsIdea[] | 'loading' | 'error' | 'pro'>>({})

  // 노출형 프롬프트 state
  const [feedTopic, setFeedTopic] = useState('')
  const [feedSnippet, setFeedSnippet] = useState('')
  const [feedSnippetLoading, setFeedSnippetLoading] = useState(false)
  const [feedNotes, setFeedNotes] = useState('')
  const [feedPrompt, setFeedPrompt] = useState('')
  const [feedError, setFeedError] = useState('')
  const [feedCopied, setFeedCopied] = useState(false)
  const [feedOrigin, setFeedOrigin] = useState<'news' | 'tab' | 'trend'>('tab')
  const [writeOrigin, setWriteOrigin] = useState<'trend' | null>(null)
  const [feedAnalysis, setFeedAnalysis] = useState<any>(null)
  const [feedAnalysisLoading, setFeedAnalysisLoading] = useState(false)
  const [feedTitleDir, setFeedTitleDir] = useState('감성형')
  const [feedStyle, setFeedStyle] = useState('스토리텔링')
  const [newsExpandedItem, setNewsExpandedItem] = useState<string | null>(null)
  const [articleBodyExpanded, setArticleBodyExpanded] = useState(true)
  const [includeArticleInPrompt, setIncludeArticleInPrompt] = useState(false)
  const [includeAudienceInPrompt, setIncludeAudienceInPrompt] = useState(false)
  const [feedContentType, setFeedContentType] = useState<'image' | 'text'>('text')
  const [feedRecommendBasis, setFeedRecommendBasis] = useState('주제 분석 기반')
  const [feedTitles, setFeedTitles] = useState<string[]>([])
  const [feedCustomTitle, setFeedCustomTitle] = useState('')

  const [nicheDetailSlug, setNicheDetailSlug] = useState<string | null>(null)
  const [nicheDetailTab, setNicheDetailTab] = useState<'hot-posts' | 'pain-points'>('hot-posts')

  const [guideKeyword, setGuideKeyword] = useState('')
  const [guideIdeas, setGuideIdeas] = useState<KeywordIdea[] | 'loading' | null>(null)
  const [guideTitles, setGuideTitles] = useState<string[] | 'loading' | null>(null)

  // supplement-input state
  const [commonSections, setCommonSections] = useState<{ topic: string; note: string }[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [supplementMap, setSupplementMap] = useState<Record<string, string>>({})
  const [savedKeyword, setSavedKeyword] = useState('')
  const [savedKeywords, setSavedKeywords] = useState<string[]>([])
  const [savedSubKws, setSavedSubKws] = useState('')

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const requireLogin = (): boolean => {
    if (user) return true
    setShowLoginModal(true)
    return false
  }

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser(user)
        const { data: planData } = await supabase
          .from('user_plans')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        setIsPro(planData?.plan === 'pro' || planData?.plan === 'biz')
      }
      setLoading(false)
      const tab = searchParams.get('tab')
      if (tab === 'prompt') {
        localStorage.setItem('blogkey_visited', '1')
        setShowOnboarding(false)
        setActiveTab('prompt')
      } else if (tab === 'content') {
        localStorage.setItem('blogkey_visited', '1')
        setShowOnboarding(false)
        setActiveTab('content')
      } else if (tab === 'keyword') {
        localStorage.setItem('blogkey_visited', '1')
        setShowOnboarding(false)
        setActiveTab('keyword')
      } else if (tab === 'niche') {
        localStorage.setItem('blogkey_visited', '1')
        setShowOnboarding(false)
        setActiveTab('niche')
        setMode('niche-home')
      }
    })
  }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) {
      setShowOnboarding(true)
    } else if (tab === 'keyword') {
      setShowOnboarding(false)
      setActiveTab('keyword')
    } else if (tab === 'content') {
      setShowOnboarding(false)
      setActiveTab('content')
    } else if (tab === 'prompt') {
      setShowOnboarding(false)
      setActiveTab('prompt')
    } else if (tab === 'niche') {
      setShowOnboarding(false)
      setActiveTab('niche')
      setMode('niche-home')
    }
  }, [searchParams])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetAll = () => {
    setTopic(''); setBrandName(''); setKeywords([]); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink(''); setPostType('')
    setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setAutoSelectedKeyword('')
    setError(''); setPlaceError('')
    setCopied(false); setHashtagCopied(false)
    setInsightKeyword(''); setInsightData(null); setInsightError('')
    setGoldenCategory(''); setGoldenResults([]); setGoldenHasMore(false); setGoldenOffset(0); setGoldenError(''); setExpandedKeyword(null)
    setTrendCategory(''); setTrendError('')
    setIssueTitles([]); setIssueError(''); setIssueExpandedTopic(null); setIssueIdeasMap({})
    setSearchTrendCategory(''); setSearchTrendKeywords([]); setSearchTrendError('')
    setNewsRankingItems([]); setNewsRankingFetchedAt(null); setNewsRankingError(''); setNewsIdeasMap({}); setNewsExpandedItem(null)
    setCommonSections([]); setSectionsLoading(false); setSupplementMap({}); setSavedKeyword(''); setSavedKeywords([]); setSavedSubKws('')
    setNicheDetailSlug(null)
    setNicheDetailTab('hot-posts')
    setActiveTab('keyword')
    setActiveSubTab('insight')
    setMode('keyword-insight-input')
  }

  const isCoveredInNotes = (sectionTopic: string): boolean => {
    if (!notes) return false
    const words = sectionTopic.replace(/[·\/]+/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    return words.some(w => notes.includes(w))
  }

  const proceedToPrompt = async () => {
    if (!requireLogin()) return
    const supplementEntries = Object.entries(supplementMap).filter(([, v]) => v.trim())
    const supplementText = supplementEntries.map(([t, v]) => `${t}: ${v}`).join('\n')
    const finalNotes = notes && supplementText ? `${notes}\n${supplementText}` : notes || supplementText

    setMode('result')
    window.scrollTo({ top: 0 })
    setPrompt('')

    try {
      const res = await fetch('/api/build-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: savedKeyword,
          subKeywords: savedSubKws,
          topic,
          notes: finalNotes,
          keywordData,
          crawlData,
          analysis,
          postType,
        }),
      })
      const data = await res.json()
      setPrompt(data.prompt || '')
      setIsPro(data.isPro ?? isPro)
    } catch {
      setPrompt(buildPrompt(savedKeyword, savedSubKws, topic, finalNotes, keywordData, crawlData, analysis, postType))
    }
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

  const startGoldenGuide = (keyword: string) => {
    setGuideKeyword(keyword)
    setGuideIdeas('loading')
    setGuideTitles('loading')
    setMode('golden-guide')

    if (isPro) {
      fetch('/api/keyword-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, category: goldenCategory }),
      })
        .then(r => r.json())
        .then(data => setGuideIdeas(data.ideas || []))
        .catch(() => setGuideIdeas([]))
    } else {
      setGuideIdeas([])
    }

    fetch(`http://localhost:3001/top-titles?keyword=${encodeURIComponent(keyword)}`)
      .then(r => r.json())
      .then((data: { titles?: { title: string }[] }) => setGuideTitles((data.titles || []).slice(0, 5).map(t => t.title)))
      .catch(() => setGuideTitles([]))
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

    if (!isPro) { setIdeasMap(prev => ({ ...prev, [keyword]: 'pro' })); return }
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
    if (!requireLogin()) return
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
    setTrendError('')
    setIssueTitles([])
    setIssueError('')
    setIssueExpandedTopic(null)
    setIssueIdeasMap({})
    setMode('trend-loading')

    try {
      const res = await fetch(`/api/shortents-topics?category=${category}`)
      const data = await res.json()
      setIssueTitles(data.shortentsTitles || [])
    } catch {
      setIssueError('이슈 데이터를 불러오지 못했습니다.')
    }

    setMode('trend-result')
  }

  const startSearchTrend = async (category: string) => {
    setSearchTrendCategory(category)
    setSearchTrendKeywords([])
    setSearchTrendError('')
    setMode('search-trend-loading')
    try {
      const res = await fetch(`/api/trend-keywords?category=${category}`)
      const data = await res.json()
      if (data.error) setSearchTrendError(data.error)
      else setSearchTrendKeywords(data.keywords || [])
    } catch {
      setSearchTrendError('트렌드 데이터를 불러오지 못했습니다.')
    }
    setMode('search-trend-result')
  }

  const generateIssueIdea = async (topic: string) => {
    if (issueExpandedTopic === topic) { setIssueExpandedTopic(null); return }
    setIssueExpandedTopic(topic)
    if (issueIdeasMap[topic]) return

    if (!isPro) { setIssueIdeasMap(prev => ({ ...prev, [topic]: 'pro' })); return }
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
    if (!requireLogin()) return
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

  const switchTab = (tab: 'keyword' | 'content' | 'prompt' | 'niche') => {
    router.push(`/?tab=${tab}`)
    setShowOnboarding(false)
    setActiveTab(tab)
    if (tab === 'keyword') {
      setActiveSubTab('insight')
      setInsightKeyword(''); setInsightData(null); setInsightError('')
      setMode('keyword-insight-input')
    } else if (tab === 'content') {
      setActiveSubTab('trend')
      setTrendCategory(''); setTrendError('')
      setIssueTitles([]); setIssueError(''); setIssueExpandedTopic(null); setIssueIdeasMap({})
      setMode('trend-category')
    } else if (tab === 'niche') {
      setNicheDetailSlug(null)
      setNicheDetailTab('hot-posts')
      setMode('niche-home')
    } else {
      setPromptSubTab('search')
      setTopic(''); setBrandName(''); setKeywords([]); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink('')
      setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setAutoSelectedKeyword('')
      setError(''); setPlaceError('')
      setCommonSections([]); setSectionsLoading(false); setSupplementMap({}); setSavedKeyword(''); setSavedKeywords([]); setSavedSubKws('')
      setMode('write-input')
    }
  }

  const goToFeed = async (title: string, origin: 'news' | 'trend' = 'news') => {
    setActiveTab('prompt')
    setPromptSubTab('feed')
    setFeedOrigin(origin)
    setFeedTopic(title)
    setFeedSnippet('')
    setFeedNotes('')
    setFeedPrompt('')
    setFeedError('')
    setFeedCopied(false)
    setMode('feed-input')
    setFeedSnippetLoading(true)
    try {
      const res = await fetch(`/api/news-snippet?q=${encodeURIComponent(title)}`)
      const data = await res.json()
      if (data.snippet) setFeedSnippet(data.snippet)
    } catch {}
    setFeedSnippetLoading(false)
  }

  const analyzeFeedTopic = async () => {
    if (!requireLogin()) return
    if (!feedTopic.trim()) return
    setFeedAnalysis(null)
    setFeedTitleDir('')
    setFeedStyle('')
    setFeedTitles([])
    setFeedCustomTitle('')
    setFeedAnalysisLoading(true)
    setMode('feed-analyze')
    try {
      const res = await fetch('/api/feed-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: feedTopic }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedAnalysis(data)
        if (data.articleBody) setFeedSnippet(data.articleBody)
        // 뉴스 헤드라인 키워드 기반 추천
        const headlineText = (data.newsHeadlines || []).map((h: any) => h.title).join(' ')
        const topicAndHeadlines = feedTopic + ' ' + headlineText
        const controversyWords = ['논란', '폭로', '경고', '사태', '위기', '충격', '의혹', '갈등', '비판', '규탄', '반발', '거부', '파문', '고발', '폭탄']
        const infoWords = ['방법', '이유', '분석', '전망', '가이드', '정보', '팁', '비교', '정리', '완벽', '총정리']
        const reviewWords = ['후기', '리뷰', '솔직', '경험', '다녀왔']
        const photoWords = ['맛집', '카페', '식당', '여행', '뷰티', '패션', '인테리어', '요리', '레시피', '코디', '숙소', '호텔']
        const hasControversy = controversyWords.some(w => headlineText.includes(w))
        const hasInfo = infoWords.some(w => headlineText.includes(w))
        const hasReview = reviewWords.some(w => headlineText.includes(w))
        const hasPhoto = photoWords.some(w => topicAndHeadlines.includes(w))
        if (hasControversy) {
          setFeedTitleDir('궁금증형'); setFeedStyle('솔직한 의견'); setFeedRecommendBasis('논란·이슈 뉴스 감지')
        } else if (hasReview) {
          setFeedTitleDir('감성형'); setFeedStyle('스토리텔링'); setFeedRecommendBasis('후기·경험 뉴스 감지')
        } else if (hasInfo) {
          setFeedTitleDir('공감형'); setFeedStyle('정보+공감'); setFeedRecommendBasis('정보성 뉴스 감지')
        } else {
          setFeedTitleDir('감성형'); setFeedStyle('스토리텔링'); setFeedRecommendBasis('주제 분석 기반')
        }
        setFeedContentType(hasPhoto ? 'image' : 'text')
      }
    } catch {}
    setFeedAnalysisLoading(false)
  }

  const generateFeedPrompt = async () => {
    if (!requireLogin()) return
    setMode('feed-loading')
    setFeedError('')
    try {
      const res = await fetch('/api/feed-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: feedTopic,
          snippet: includeArticleInPrompt ? feedSnippet : '',
          notes: feedNotes,
          titleDir: feedTitleDir,
          style: feedStyle,
          hashtags: feedAnalysis?.hashtags || [],
          genderRatio: includeAudienceInPrompt ? (feedAnalysis?.genderRatio || null) : null,
          ageRatio: includeAudienceInPrompt ? (feedAnalysis?.ageRatio || null) : null,
          contentType: feedContentType,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFeedError(data.error || '오류가 발생했습니다'); setMode('feed-body') }
      else { setFeedPrompt(data.prompt); setMode('feed-result') }
    } catch {
      setFeedError('오류가 발생했습니다')
      setMode('feed-body')
    }
  }

  const goToWrite = (title: string, kws: string[], origin: 'trend' | null = null) => {
    setActiveTab('prompt')
    setPromptSubTab('search')
    setWriteOrigin(origin)
    setTopic(title); setBrandName(''); setKeywords(kws.slice(0, 3)); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink('')
    setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setAutoSelectedKeyword('')
    setError(''); setPlaceError('')
    setCommonSections([]); setSectionsLoading(false); setSupplementMap({}); setSavedKeyword(''); setSavedKeywords([]); setSavedSubKws('')
    setMode('write-input')
  }

  const switchSubTab = (subTab: 'insight' | 'golden' | 'trend' | 'news' | 'search-trend') => {
    setShowOnboarding(false)
    setActiveSubTab(subTab)
    if (subTab === 'insight') {
      setInsightKeyword(''); setInsightData(null); setInsightError('')
      setMode('keyword-insight-input')
    } else if (subTab === 'golden') {
      setGoldenCategory(''); setGoldenResults([]); setGoldenHasMore(false); setGoldenOffset(0); setGoldenError(''); setExpandedKeyword(null); setIdeasMap({})
      setMode('golden-category')
    } else if (subTab === 'trend') {
      setTrendCategory(''); setTrendError('')
      setIssueTitles([]); setIssueError(''); setIssueExpandedTopic(null); setIssueIdeasMap({})
      setMode('trend-category')
    } else if (subTab === 'search-trend') {
      setSearchTrendCategory(''); setSearchTrendKeywords([]); setSearchTrendError('')
      setMode('search-trend-category')
    } else {
      startNewsRanking()
    }
  }

  const generateNewsIdea = async (item: string) => {
    if (newsExpandedItem === item) { setNewsExpandedItem(null); return }
    setNewsExpandedItem(item)
    if (newsIdeasMap[item]) return

    if (!isPro) { setNewsIdeasMap(prev => ({ ...prev, [item]: 'pro' })); return }
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
    if (!requireLogin()) return
    const allKws = keywordInput.trim() ? [...keywords, keywordInput.trim()] : [...keywords]
    if (!topic.trim()) { setError('작성 주제를 입력해 주세요'); return }
    if (allKws.length === 0) { setError('타겟 키워드를 입력해 주세요'); return }
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
      setSavedKeywords(allKws)
      setSavedSubKws(allSubKws)
      setCommonSections([])
      setSupplementMap({})
      setSectionsLoading(true)
      setMode('pattern-preview')
      window.scrollTo({ top: 0 })

      // 비동기로 공통 섹션 분석 (pro 전용, 화면 전환 후 백그라운드)
      ;(async () => {
        try {
          if (!isPro) return
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
    if (!requireLogin()) return
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

  const renderFeedProgress = (step: number) => {
    const steps = ['포화도', '제목', '본문', '완성']
    return (
      <div className="flex mb-2">
        {steps.map((label, i) => {
          const done = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} className="flex flex-1 last:flex-none items-start">
              <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done || active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${active ? 'text-blue-500' : done ? 'text-blue-300' : 'text-gray-300'}`}>{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mt-3.5 transition-colors ${done ? 'bg-blue-400' : 'bg-gray-100'}`} />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" onContextMenu={e => e.preventDefault()}>
      {/* Pro 업그레이드 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={() => setShowLoginModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-7">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <Key className="w-7 h-7 text-blue-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1">로그인이 필요한 서비스입니다</h2>
              <p className="text-gray-400 text-sm mt-2">상위노출 글쓰기, 지금 바로 시작하세요!</p>
            </div>
            <button
              onClick={() => { setShowLoginModal(false); router.push('/login') }}
              className="w-full py-3 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 transition-colors text-sm"
            >
              로그인하기
            </button>
          </div>
        </div>
      )}
      {showProModal && (() => {
        const configs: Record<string, { title: string; desc: string; features: React.ReactNode[]; cta: string }> = {
          trend: {
            title: '트렌드 글감을 전부 확인하세요',
            desc: '지금 이 순간 뜨는 글감을 경쟁자보다 먼저 잡아요',
            features: [
              <span>{'놓쳤던 '}<span className="font-bold">{'트렌드 글감'}</span>{'을 전부 볼 수 있어요'}</span>,
              <span>{'상위노출 가능한 '}<span className="font-bold">{'키워드'}</span>{'를 자동으로 추천해드려요'}</span>,
              <span>{'상위노출 '}<span className="font-bold">{'필수 항목'}</span>{'을 분석해드려요'}</span>,
              <span>{'상위노출 확률을 높이는 '}<span className="font-bold">{'체크리스트'}</span>{'를 제공해드려요'}</span>,
              <span>{'홈피드 노출에 최적화된 '}<span className="font-bold">{'콘텐츠'}</span>{'를 추천해드려요'}</span>,
            ],
            cta: '지금 글감 전체보기',
          },
        }
        const cfg = configs[showProModal] ?? configs['trend']
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={() => setShowProModal(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowProModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="text-center mb-6">
                <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">Pro</span>
                <h2 className="text-xl font-bold mb-1">{cfg.title}</h2>
                <p className="text-gray-400 text-sm">{cfg.desc}</p>
              </div>
              <ul className="space-y-3.5 mb-7">
                {cfg.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-gray-700">
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setShowProModal(null); window.location.href = '/pricing' }}
                className="w-full py-3 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-1"
              >
                {cfg.cta} <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-gray-400 mt-2.5">월 59,000원 · 연간 결제 시 월 47,200원 (20% 할인)</p>
            </div>
          </div>
        )
      })()}
      {/* Pro 전용 토스트 */}
      {proToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 whitespace-nowrap">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span>Pro 전용 기능이에요.</span>
          <button onClick={() => window.open('/pricing', '_blank')} className="text-blue-400 font-semibold hover:text-blue-300">업그레이드 →</button>
        </div>
      )}
      {/* 트렌드 배지 툴팁 */}
      {trendBadgeTooltipPos && (
        <div
          className="fixed z-[9999] bg-gray-800/85 text-white rounded-lg px-3 py-2 pointer-events-none -translate-y-1/2 whitespace-nowrap"
          style={{ left: trendBadgeTooltipPos.x, top: trendBadgeTooltipPos.y, fontSize: '10px' }}
        >
          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid rgba(31,41,55,0.85)' }} />
          최근 검색량이 급상승 중인 키워드예요
        </div>
      )}
      {/* 글쓰기 헤더 툴팁 (fixed, overflow 컨테이너 탈출) */}
      {writeTooltipPos && (
        <div
          className="fixed z-[9999] w-56 bg-gray-800/85 text-white text-xs rounded-lg px-3 py-2 pointer-events-none -translate-y-1/2 leading-relaxed"
          style={{ left: writeTooltipPos.x, top: writeTooltipPos.y }}
        >
          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid rgba(31,41,55,0.85)' }} />
          <p className="mb-1.5"><span className="font-semibold text-blue-300">검색형</span> 키워드 중심 제목으로 네이버 검색 상위노출에 최적화된 글쓰기</p>
          <p><span className="font-semibold text-orange-300">노출형</span> 클릭을 유도하는 제목으로 홈피드 노출에 최적화된 글쓰기</p>
        </div>
      )}
      {/* ── 헤더 + Lv1 탭 (같은 줄) ── */}
      <header className="bg-white border-b border-gray-200 px-6 flex items-stretch">
        <div className="flex-1 flex items-center">
          <div className="font-bold text-lg cursor-pointer flex items-center gap-1.5" onClick={() => { router.push('/'); setShowOnboarding(true) }}>블로그황금키 <Key className="w-4 h-4 text-yellow-400" /></div>
        </div>
        <div className="flex gap-10">
          {(['keyword', 'content', 'prompt'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`py-4 text-sm transition-all ${
                !showOnboarding && activeTab === tab
                  ? 'font-bold text-gray-900'
                  : 'font-medium text-gray-500 hover:font-bold hover:text-gray-800'
              }`}
            >
              {tab === 'keyword' ? '키워드 분석' : tab === 'content' ? '글감 추천' : '글쓰기'}
            </button>
          ))}
          <button
            onClick={() => switchTab('niche')}
            className={`py-4 text-sm transition-all flex items-center gap-1 ${
              !showOnboarding && activeTab === 'niche'
                ? 'font-bold text-red-500'
                : 'font-medium text-gray-500 hover:font-bold hover:text-red-500'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-500" />틈새 발굴
            <span className="self-start -mt-1 -ml-1 text-[7px] font-extrabold text-red-500 leading-none">HOT</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-end">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {user?.user_metadata?.nickname || user?.user_metadata?.name || user?.email}
                  </span>
                </div>
                <div className="h-px bg-gray-100" />
                <a
                  href="/mypage"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  마이페이지
                </a>
                {user?.email === 'damdamss@naver.com' && (
                  <>
                    <div className="h-px bg-gray-100" />
                    <a
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      관리자페이지
                    </a>
                  </>
                )}
                <div className="h-px bg-gray-100" />
                <button
                  onClick={async () => { setDropdownOpen(false); await supabase.auth.signOut(); router.push('/') }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <div className="text-left">
                    <p>로그아웃</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                  </div>
                  <LogOut className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Lv2: 회색 배경 밴드 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex justify-center gap-8">
            {activeTab === 'keyword' && (
              <>
                <button onClick={() => switchSubTab('insight')} className={`py-3 text-sm transition-all ${!showOnboarding && activeSubTab === 'insight' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>키워드 인사이트</button>
                <button onClick={() => switchSubTab('golden')} className={`py-3 text-sm transition-all ${!showOnboarding && activeSubTab === 'golden' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>황금키워드 발굴</button>
              </>
            )}
            {activeTab === 'content' && (
              <>
                <button onClick={() => switchSubTab('trend')} className={`py-3 text-sm transition-all ${activeSubTab === 'trend' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>트렌드·이슈</button>
                <button onClick={() => switchSubTab('news')} className={`py-3 text-sm transition-all ${activeSubTab === 'news' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>실시간 뉴스</button>
                <button onClick={() => switchSubTab('search-trend')} className={`py-3 text-sm transition-all ${activeSubTab === 'search-trend' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>검색 트렌드</button>
              </>
            )}
            {activeTab === 'prompt' && (
              <>
                <button onClick={() => { setPromptSubTab('search'); setMode('write-input') }} className={`py-3 text-sm transition-all ${promptSubTab === 'search' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>검색형</button>

                <button onClick={() => { setPromptSubTab('feed'); setFeedOrigin('tab'); setMode('feed-input') }} className={`py-3 text-sm transition-all ${promptSubTab === 'feed' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:font-bold hover:text-gray-800'}`}>노출형</button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* ── 홈 카드 ── */}
        {showOnboarding && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">오늘 뭐 쓰실 건가요?</h2>
            <p className="text-sm text-gray-400 mb-8">목적에 맞는 도구를 바로 열어드릴게요</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              <button
                onClick={() => { setShowOnboarding(false); switchTab('prompt') }}
                className="group text-left bg-white border border-gray-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <PenLine className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-base font-bold text-gray-900 mb-1.5">쓸 주제가 있어요</p>
                <p className="text-sm text-gray-500 leading-relaxed">키워드 분석부터 제목, 본문 프롬프트까지 단계별로 도와드려요</p>
                <div className="mt-5 text-sm font-semibold text-blue-500 group-hover:text-blue-600 flex items-center gap-1">
                  글쓰기 시작 <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
              <button
                onClick={() => { setShowOnboarding(false); switchTab('content') }}
                className="group text-left bg-white border border-gray-200 rounded-2xl p-8 hover:border-amber-400 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-base font-bold text-gray-900 mb-1.5">아직 없어요</p>
                <p className="text-sm text-gray-500 leading-relaxed">요즘 뜨는 키워드와 트렌드에서 쓸 거리를 찾아드릴게요</p>
                <div className="mt-5 text-sm font-semibold text-amber-500 group-hover:text-amber-600 flex items-center gap-1">
                  글감 찾기 <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── 탭 콘텐츠 (온보딩 이후) ── */}
        {!showOnboarding && <>

        {/* ── feed-input ── */}
        {mode === 'feed-input' && (
          <div>
            {feedOrigin === 'news' && (
              <button onClick={() => { setActiveTab('content'); setActiveSubTab('news'); setMode('news-result') }} className="text-gray-400 text-sm hover:text-gray-600 mb-4 block">← 뒤로</button>
            )}
            {feedOrigin === 'trend' && (
              <button onClick={() => { setActiveTab('content'); setActiveSubTab('trend'); setMode('trend-result') }} className="text-gray-400 text-sm hover:text-gray-600 mb-4 block">← 뒤로</button>
            )}
            <h2 className="text-xl font-bold mb-2 pl-2">홈피드 노출형 프롬프트 생성</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">홈피드 알고리즘에 최적화된 글쓰기 프롬프트를 만들어드려요</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">작성 주제 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="예: 스타벅스 충전금 환불 논란" value={feedTopic} onChange={e => setFeedTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-300" />
              </div>
              {feedOrigin === 'news' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">뉴스 내용 요약 <span className="text-gray-400 font-normal">(자동입력 · 수정 가능)</span></label>
                  {feedSnippetLoading ? (
                    <div className="w-full h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ) : (
                    <textarea value={feedSnippet} onChange={e => setFeedSnippet(e.target.value)} rows={3}
                      placeholder="뉴스 내용 요약이 자동으로 입력돼요. 직접 수정하거나 추가할 수 있어요."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-300" />
                  )}
                </div>
              )}
              <button onClick={analyzeFeedTopic} disabled={!feedTopic.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── feed-analyze ── */}
        {mode === 'feed-analyze' && (
          <div className="space-y-4">
            <button onClick={() => setMode('feed-input')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            {renderFeedProgress(1)}
            <div className="pl-2">
              <h2 className="text-xl font-bold">콘텐츠 포화도</h2>
              <p className="text-sm text-gray-400 mt-1">주제: <span className="text-gray-700 font-medium">{feedTopic}</span></p>
            </div>

            {feedAnalysisLoading ? (
              <div className="space-y-4 animate-pulse">
                {[100, 60].map((h, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm" style={{ height: h }} />
                ))}
              </div>
            ) : (
              <>
                {feedAnalysis?.blogCount != null && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-800 mb-5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 콘텐츠 포화도</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-500">{feedAnalysis.blogCount.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">블로그 글 수</p>
                        <p className="text-xs text-transparent mt-0.5">-</p>
                      </div>
                      {feedAnalysis.searchVolume?.total > 0 && (
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <p className="text-2xl font-bold text-purple-500">{feedAnalysis.searchVolume.total.toLocaleString()}</p>
                            {feedAnalysis.isTrending && (
                              <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full font-medium text-[10px] shrink-0">
                                <Flame className="w-2.5 h-2.5" /> 트렌드
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">월간 검색량</p>
                          <p className="text-xs text-gray-300 mt-0.5">PC {feedAnalysis.searchVolume.pc.toLocaleString()} · 모바일 {feedAnalysis.searchVolume.mobile.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    {(() => {
                      const bc = feedAnalysis.blogCount
                      const sv = feedAnalysis.searchVolume?.total || 0
                      const ratio = sv > 0 ? bc / sv : null
                      const dot = ratio === null ? 'bg-gray-300' : ratio < 3 ? 'bg-green-400' : ratio < 8 ? 'bg-yellow-400' : ratio < 15 ? 'bg-orange-400' : 'bg-red-400'
                      const msg = bc > 500000 ? '경쟁이 치열한 주제예요. 차별화된 시각이 필요해요.' : bc > 100000 ? '적당한 경쟁 수준이에요. 좋은 콘텐츠면 노출 가능해요.' : '경쟁이 낮아 노출 가능성이 높아요.'
                      return (
                        <p className="text-sm font-medium text-gray-700 text-center mt-4 flex items-center justify-center gap-1.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                          {msg}
                        </p>
                      )
                    })()}
                  </div>
                )}
                {/* 독자 힌트 */}
                {feedAnalysis?.genderRatio && (feedAnalysis.genderRatio.male > 0 || feedAnalysis.genderRatio.female > 0) && (() => {
                  const gr = feedAnalysis.genderRatio
                  const ar = feedAnalysis.ageRatio
                  const dr = feedAnalysis.deviceRatio
                  const wr: number[] | undefined = feedAnalysis.weekdayRatio
                  const hint = gr.female >= 60 ? '감성적이고 공감되는 언어로 쓰면 반응이 좋아요' : gr.male >= 60 ? '정보 중심의 명확한 내용이 효과적이에요' : '다양한 독자층이 공감할 수 있는 균형 잡힌 내용을 담아보세요'
                  const ageGroups = ar ? [
                    { label: '10대', v: ar.teen }, { label: '20대', v: ar.twenty },
                    { label: '30대', v: ar.thirty }, { label: '40대', v: ar.forty },
                    { label: '50대', v: ar.fifty }, { label: '60대+', v: ar.sixty },
                  ] : []
                  const ageMax = Math.max(...ageGroups.map(a => a.v), 1)
                  const topAge = [...ageGroups].sort((a, b) => b.v - a.v)[0]
                  const weekdays = ['월', '화', '수', '목', '금', '토', '일']
                  const wrMax = wr ? Math.max(...wr, 1) : 1
                  const topWrIdx = wr ? wr.indexOf(Math.max(...wr)) : -1
                  return (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" /> 검색 사용자 분석
                          <span className="relative group -ml-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="cursor-pointer shrink-0 text-gray-400 hover:text-gray-500 transition-colors" fill="currentColor" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap text-[10px] text-white bg-gray-700 rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              최근 30일 기준 분석 결과
                            </span>
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">프롬프트에 포함</span>
                          <button onClick={() => setIncludeAudienceInPrompt(p => !p)}
                            className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${includeAudienceInPrompt ? 'bg-blue-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${includeAudienceInPrompt ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1.5">성별</p>
                          <p className="text-xs font-bold text-gray-800 mb-2">{gr.female > gr.male ? `여성 ${gr.female}%` : `남성 ${gr.male}%`}</p>
                          <div className="flex h-1.5 rounded-full overflow-hidden">
                            <div className="bg-pink-400 h-full" style={{ width: `${gr.female}%` }} />
                            <div className="bg-blue-400 h-full" style={{ width: `${gr.male}%` }} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-gray-400">여 {gr.female}%</span>
                            <span className="text-[9px] text-gray-400">남 {gr.male}%</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1.5">기기별</p>
                          <p className="text-xs font-bold text-gray-800 mb-2">{dr ? (dr.mobile >= dr.pc ? `모바일 ${dr.mobile}%` : `PC ${dr.pc}%`) : '-'}</p>
                          {dr && (
                            <>
                              <div className="flex h-1.5 rounded-full overflow-hidden">
                                <div className="bg-green-400 h-full" style={{ width: `${dr.mobile}%` }} />
                                <div className="bg-gray-300 h-full" style={{ width: `${dr.pc}%` }} />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-gray-400">모바일 {dr.mobile}%</span>
                                <span className="text-[9px] text-gray-400">PC {dr.pc}%</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1.5">연령별</p>
                          <p className="text-xs font-bold text-gray-800 mb-2">{topAge ? `${topAge.label} 중심` : '-'}</p>
                          <div className="flex items-end gap-0.5 h-8">
                            {ageGroups.map(({ label, v }) => {
                              const isTop = v === ageMax
                              return (
                                <div key={label} className="flex flex-col items-center gap-0.5 flex-1">
                                  <div className={`w-full rounded-sm ${isTop ? 'bg-purple-500' : 'bg-purple-200'}`} style={{ height: `${Math.max((v / ageMax) * 28, 2)}px` }} />
                                  <span className={`text-[8px] leading-none ${isTop ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>{label.replace('대+', '+')}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-1.5">요일별</p>
                          <p className="text-xs font-bold text-gray-800 mb-2">{wr && topWrIdx >= 0 ? `${weekdays[topWrIdx]}요일` : '-'}</p>
                          {wr && wr.some(v => v > 0) && (
                            <div className="flex items-end gap-0.5 h-8">
                              {weekdays.map((day, i) => {
                                const isTop = i === topWrIdx
                                return (
                                  <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                                    <div className={`w-full rounded-sm ${isTop ? 'bg-green-500' : 'bg-gray-200'}`} style={{ height: `${Math.max((wr[i] / wrMax) * 28, 2)}px` }} />
                                    <span className={`text-[9px] leading-none ${isTop ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>{day}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>
                    </div>
                  )
                })()}
                <div className="sticky bottom-4 z-10">
                  <button onClick={() => { setMode('feed-title'); window.scrollTo({ top: 0 }) }}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 shadow-lg transition-colors">
                    <span className="flex items-center justify-center gap-1">글쓰기 시작 <ChevronRight className="w-4 h-4" /></span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── feed-title ── */}
        {mode === 'feed-title' && (
          <div>
            <button onClick={() => { setMode('feed-analyze'); window.scrollTo({ top: 0 }) }} className="text-gray-400 text-sm hover:text-gray-600 mb-4 block">← 뒤로</button>
            {renderFeedProgress(2)}
            <div className="pl-2 mt-4 mb-6">
              <h2 className="text-xl font-bold">제목 만들기</h2>
              <p className="text-sm text-gray-400 mt-1">주제: <span className="text-gray-700 font-medium">{feedTopic}</span></p>
            </div>

            <div className="relative">
              {/* 뉴스 헤드라인 */}
              {feedAnalysis?.newsHeadlines?.length > 0 && (
                <div className="flex gap-3 pb-5">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Newspaper className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-gray-800 mb-4">지금 이 주제 뉴스</p>
                      <ul>
                        {feedAnalysis.newsHeadlines.map((item: { title: string; link: string; pubDate: string }, i: number) => (
                          <li key={i}>
                            {i > 0 && <div className="mx-3 h-px bg-gray-100 my-4" />}
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
                              <span className="shrink-0 text-xs text-gray-300 mt-0.5 font-medium w-4">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 group-hover:text-blue-500 leading-snug transition-colors line-clamp-2">{item.title}</p>
                                {item.pubDate && <p className="text-xs text-gray-400 mt-0.5">{item.pubDate}</p>}
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 제목 스타일 */}
              <div className="flex gap-3 pb-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">1</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> 제목 스타일
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <Zap className="w-2.5 h-2.5" />{feedRecommendBasis}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mb-5">뉴스 헤드라인을 분석해 자동 추천됐어요. 변경할 수 있어요.</p>
                    <div className="flex gap-2">
                      {[
                        { key: '감성형', desc: '감정을 자극하는 따뜻하고 공감되는 제목' },
                        { key: '궁금증형', desc: '클릭하지 않으면 궁금한 정보를 숨기는 제목' },
                        { key: '공감형', desc: '내 이야기인 것 같은 느낌을 주는 제목' },
                      ].map(({ key, desc }) => (
                        <button key={key} onClick={() => setFeedTitleDir(key)}
                          className={`flex-1 py-2.5 px-2 rounded-xl text-sm font-medium transition-all group relative ${feedTitleDir === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {feedTitleDir === key && (
                            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-white text-blue-500 px-1.5 py-0.5 rounded-full shadow-sm border border-blue-100 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />추천</span>
                          )}
                          <span className="block">{key}</span>
                          <span className={`block text-xs font-normal mt-1 leading-snug ${feedTitleDir === key ? 'text-blue-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}>{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-4 z-10">
              <button onClick={() => { setMode('feed-body'); window.scrollTo({ top: 0 }) }}
                className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 shadow-lg transition-colors">
                <span className="flex items-center justify-center gap-1">다음 <ChevronRight className="w-4 h-4" /></span>
              </button>
            </div>
          </div>
        )}

        {/* ── feed-body ── */}
        {mode === 'feed-body' && (
          <div>
            <button onClick={() => { setMode('feed-title'); window.scrollTo({ top: 0 }) }} className="text-gray-400 text-sm hover:text-gray-600 mb-4 block">← 뒤로</button>
            {renderFeedProgress(3)}
            <div className="pl-2 mt-4 mb-6">
              <h2 className="text-xl font-bold">본문 만들기</h2>
              <p className="text-sm text-gray-400 mt-1">주제: <span className="text-gray-700 font-medium">{feedTopic}</span></p>
            </div>

            <div className="relative">
              {/* 참고 기사 */}
              {feedAnalysis?.newsHeadlines?.length > 0 && (
                <div className="flex gap-3 pb-5">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Newspaper className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                        참고 기사
                        {feedAnalysis?.articleBody && (
                          <span className="ml-auto text-[10px] font-medium bg-green-50 text-green-600 px-2 py-0.5 rounded-full">기사 내용 자동 수집됨</span>
                        )}
                      </p>
                      <ul>
                        {feedAnalysis.newsHeadlines.map((item: { title: string; link: string; pubDate: string }, i: number) => (
                          <li key={i}>
                            {i > 0 && <div className="mx-3 h-px bg-gray-100 my-4" />}
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
                              <span className="shrink-0 text-xs text-gray-300 mt-0.5 font-medium w-4">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 group-hover:text-blue-500 leading-snug transition-colors line-clamp-2">{item.title}</p>
                                {item.pubDate && <p className="text-xs text-gray-400 mt-0.5">{item.pubDate}</p>}
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                      {feedAnalysis?.articleBody && (
                        <div className="mt-5 flex flex-col items-center">
                          <button onClick={() => setArticleBodyExpanded(p => !p)} className="text-gray-300 hover:text-gray-400 cursor-pointer transition-colors">
                            <ChevronRight className={`w-4 h-4 transition-transform ${articleBodyExpanded ? '-rotate-90' : 'rotate-90'}`} />
                          </button>
                          {articleBodyExpanded && (
                            <div className="w-full mt-2">
                              <div className="flex items-center justify-end gap-2 mb-2">
                                <span className="text-xs text-gray-400">프롬프트에 포함</span>
                                <button onClick={() => setIncludeArticleInPrompt(p => !p)}
                                  className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${includeArticleInPrompt ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${includeArticleInPrompt ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed max-h-64 overflow-y-auto">{feedAnalysis.articleBody}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 글 스타일 */}
              <div className="flex gap-3 pb-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">1</span>
                  </div>
                  <div className="w-px flex-1 bg-gray-200 mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                      <PenLine className="w-3.5 h-3.5" /> 글 스타일
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <Zap className="w-2.5 h-2.5" />{feedRecommendBasis}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mb-5">뉴스 헤드라인을 분석해 자동 추천됐어요. 변경할 수 있어요.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: '스토리텔링', desc: '경험을 이야기로 풀어내는 방식' },
                        { key: '정보+공감', desc: '유용한 정보에 내 생각을 더하는 방식' },
                        { key: '솔직한 의견', desc: '직접적이고 솔직한 내 시각 중심' },
                        { key: '유머+경험', desc: '가볍고 재밌게 경험을 전달하는 방식' },
                      ].map(({ key, desc }) => (
                        <button key={key} onClick={() => setFeedStyle(key)}
                          className={`p-3 rounded-xl text-left transition-all group relative ${feedStyle === key ? 'bg-blue-50 border-2 border-blue-400' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'}`}>
                          {feedStyle === key && (
                            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-white text-blue-500 px-1.5 py-0.5 rounded-full shadow-sm border border-blue-100 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />추천</span>
                          )}
                          <p className={`text-sm font-semibold mb-0.5 ${feedStyle === key ? 'text-blue-600' : 'text-gray-700'}`}>{key}</p>
                          <p className={`text-xs leading-snug ${feedStyle === key ? 'text-blue-400' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}>{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 유형 */}
              <div className="flex gap-3 pb-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">2</span>
                  </div>
                  <div className="w-px flex-1 bg-gray-200 mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> 콘텐츠 유형
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <Zap className="w-2.5 h-2.5" />주제 분석 기반
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mb-4">주제 키워드를 분석해 자동 추천됐어요. 변경할 수 있어요.</p>
                    <div className="flex gap-2">
                      {([
                        { key: 'image' as const, label: '이미지 위주', desc: '사진 중심 · 400~600자' },
                        { key: 'text' as const, label: '텍스트 위주', desc: '글 중심 · 600~1000자' },
                      ]).map(({ key, label, desc }) => (
                        <button key={key} onClick={() => setFeedContentType(key)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all group relative ${feedContentType === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {feedContentType === key && (
                            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-white text-blue-500 px-1.5 py-0.5 rounded-full shadow-sm border border-blue-100 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />추천</span>
                          )}
                          <span className="block">{label}</span>
                          <span className={`block text-xs font-normal mt-1 ${feedContentType === key ? 'text-blue-100' : 'text-gray-400'}`}>{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 해시태그 */}
              {feedAnalysis?.hashtags?.length > 0 && (
                <div className="flex gap-3 pb-5">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Hash className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-gray-800 mb-3">추천 해시태그</p>
                      <div className="flex flex-wrap gap-2">
                        {feedAnalysis.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-600 border border-purple-100">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 메모 */}
              <div className="flex gap-3 pb-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${feedNotes ? 'bg-blue-500' : 'bg-blue-500'}`}>
                    <span className="text-[10px] font-bold text-white">3</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 더 담고 싶은 내용</p>
                    <p className="text-xs text-gray-400 mb-4">내 시각·경험·의견을 적으면 더 개성 있는 프롬프트가 만들어져요</p>
                    <textarea
                      value={feedNotes}
                      onChange={e => setFeedNotes(e.target.value)}
                      rows={7}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none placeholder:text-gray-300"
                      placeholder={`예:\n이 주제에 대한 나의 직접 경험\n가장 강조하고 싶은 포인트\n독자에게 전하고 싶은 메시지`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {feedError && <p className="text-sm text-red-400 pl-1 mb-2">{feedError}</p>}

            <div className="sticky bottom-4 z-10">
              <button onClick={generateFeedPrompt}
                className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 shadow-lg transition-colors">
                <span className="flex items-center justify-center gap-1">프롬프트 생성 <ChevronRight className="w-4 h-4" /></span>
              </button>
            </div>
          </div>
        )}

        {/* ── feed-loading ── */}
        {mode === 'feed-loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <PenLine className="w-8 h-8 text-blue-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">홈피드 프롬프트 생성 중</h2>
            <p className="text-gray-500 text-sm">최적화된 글쓰기 프롬프트를 만들고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
          </div>
        )}

        {/* ── feed-result ── */}
        {mode === 'feed-result' && feedPrompt && (
          <div className="space-y-4">
            <button onClick={() => { setMode('feed-body'); window.scrollTo({ top: 0 }) }} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            {renderFeedProgress(4)}
            <h2 className="text-xl font-bold pl-2">노출형 프롬프트</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">아래 프롬프트를 복사해서 Claude나 ChatGPT에 붙여넣으세요</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm relative">
              <button onClick={() => { navigator.clipboard.writeText(feedPrompt); setFeedCopied(true); setTimeout(() => setFeedCopied(false), 2000) }}
                className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <Copy className="w-3.5 h-3.5" />
                {feedCopied ? '복사됨' : '복사'}
              </button>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans pr-12">{feedPrompt}</pre>
            </div>
          </div>
        )}

        {/* ── write-input ── */}
        {mode === 'write-input' && (
          <div>
            {writeOrigin === 'trend' && (
              <button onClick={() => { setActiveTab('content'); setActiveSubTab('trend'); setMode('trend-result'); setWriteOrigin(null) }} className="text-gray-400 text-sm hover:text-gray-600 mb-4 block">← 뒤로</button>
            )}
            <h2 className="text-xl font-bold mb-2 pl-2">검색형 상위노출 프롬프트 생성</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">키워드를 입력하면 상위노출 패턴을 분석하고 프롬프트를 만들어드려요</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">글 유형</label>
                <div className="flex gap-2">
                  {([['review', '후기·리뷰'], ['info', '정보·가이드'], ['simple', '일상·기록']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPostType(prev => prev === val ? '' : val)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        postType === val
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">작성 주제 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="예: 문래 라멘 로라멘 후기" value={topic} onChange={e => setTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">가게·브랜드명 <span className="text-gray-400 font-normal">(선택)</span></label>
                <input type="text" placeholder="예: 몽밀, 로라멘, 스타벅스"
                  value={brandName} onChange={e => setBrandName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-300" />
                <p className="text-xs text-gray-400 mt-1">입력하면 내 가게·브랜드에 딱 맞는 분석 결과가 나와요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">타겟 키워드 <span className="text-red-400">*</span> <span className="text-gray-400 font-normal">(최대 3개)</span></label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus-within:border-blue-500 flex flex-wrap gap-2 min-h-[46px] cursor-text"
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
                <p className="text-xs text-gray-400 mt-1">최대 3개까지 쉼표(,)로 구분해서 입력하면 상위노출에 가장 유리한 키워드를 자동으로 골라드려요</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">서브 키워드 <span className="text-gray-400 font-normal">(선택)</span></label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus-within:border-blue-500 flex flex-wrap gap-2 min-h-[46px] cursor-text"
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
                <p className="text-xs text-gray-400 mt-1">함께 노출되길 원하는 키워드를 쉼표(,)로 구분해서 입력하세요</p>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={startAnalysis} disabled={!mainKeyword}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {!mainKeyword ? '필수 항목을 모두 입력해야 분석을 시작할 수 있어요' : <span className="flex items-center justify-center gap-1">상위노출 분석 시작 <ChevronRight className="w-4 h-4" /></span>}
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
            <p className="text-gray-500 text-sm mb-1">상위 노출 패턴을 분석하고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── pattern-preview ── */}
        {mode === 'pattern-preview' && analysis && (
          <div className="space-y-4">
            <button onClick={() => setMode('write-input')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <div className="space-y-2">
              <h2 className="text-xl font-bold pl-2 mb-3">상위노출 패턴 분석</h2>
              <p className="text-gray-600 text-sm pl-2">키워드: {savedKeywords.length > 0 ? savedKeywords.join(', ') : savedKeyword}</p>
              {autoSelectedKeyword && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500 border-2 border-blue-500 mr-2 align-middle">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span><strong>'{autoSelectedKeyword}'</strong>을 타겟 키워드로 선정했어요 <span className="ml-1 text-xs bg-blue-500 text-white px-2.5 py-1 rounded-full font-medium">🏆 상위노출 최적 키워드</span>
                </div>
              )}
            </div>

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
                    <p className="text-sm font-bold flex items-center justify-center gap-1">
                      <Circle className={`w-3 h-3 ${gradeCircleColor(keywordData.grade)}`} fill="currentColor" />
                      {gradeLabel(keywordData.grade)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 제목 패턴 분석 */}
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


            {/* 추천 해시태그 */}
            {analysis.topHashtags.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> 추천 해시태그</p>
                  {isPro && (
                    <button onClick={copyHashtags}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        hashtagCopied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {hashtagCopied ? '복사됨 ✓' : '전체 복사'}
                    </button>
                  )}
                </div>
                <div className={`flex flex-wrap gap-2 min-h-[140px] ${!isPro ? 'select-none pointer-events-none' : ''}`}>
                  {analysis.topHashtags.map((h, i) => (
                    <span key={i} onClick={() => isPro && copySingleTag(h.tag)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80 bg-purple-50 text-purple-600 border border-purple-100">
                      #{h.tag}{h.count > 1 && <span className="opacity-70 ml-1">({h.count})</span>}
                    </span>
                  ))}
                  {!isPro && ['일상', '블로그', '정보공유', '추천', '꿀팁', '생활정보', '리뷰', '후기', '소통', '맞팔'].map((t, i) => (
                    <span key={`dummy-${i}`} className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-600 border border-purple-100">
                      #{t}
                    </span>
                  ))}
                </div>
                {!isPro && (
                  <div className="absolute top-10 inset-x-0 bottom-0 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-2 rounded-b-2xl">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">Pro 전용</p>
                    <button onClick={() => window.open('/pricing', '_blank')} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                  </div>
                )}
              </div>
            )}

            {/* 알고리즘 인사이트 */}
            {analysis.insights.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> 알고리즘 인사이트 & 작성 전략</p>

                {/* 인사이트 리스트 — 무료는 블러 오버레이 */}
                <div className="relative overflow-hidden rounded-xl">
                  <ul className={`space-y-3 ${!isPro ? 'select-none pointer-events-none' : ''}`}>
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
                  {!isPro && (
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-2 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <p className="text-sm font-bold text-gray-700">Pro 전용</p>
                      <button onClick={() => window.open('/pricing', '_blank')} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                    </div>
                  )}
                </div>

                {/* 목표 스마트블록 — 헤더 항상 노출, 태그만 블러 */}
                {analysis.smartBlocks.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">목표 스마트블록</p>
                    <div className={`flex flex-wrap gap-2 ${!isPro ? 'blur-sm select-none pointer-events-none' : ''}`}>
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
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 작성 포인트</p>
                <div className={`space-y-4 ${!isPro ? 'select-none pointer-events-none' : ''}`}>
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
                  {!isPro && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-2">키워드 전략</p>
                        <ul className="space-y-1.5">
                          {['메인 키워드는 제목 앞 10자 이내 배치 권장', '서브 키워드 2~3개 본문 자연스럽게 분산', '키워드 밀도 2~4‰ 유지 (과최적화 주의)'].map((t, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 shrink-0">•</span><span>{t}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-2">체류시간 전략</p>
                        <ul className="space-y-1.5">
                          {['인트로 첫 문장에 핵심 정보 배치 — 이탈 방지', '소제목으로 구간 나눠 스크롤 유도', '마무리에 관련 키워드 자연스럽게 언급'].map((t, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 shrink-0">•</span><span>{t}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                {!isPro && (
                  <div className="absolute top-10 inset-x-0 bottom-0 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-2 rounded-b-2xl">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">Pro 전용</p>
                    <button onClick={() => window.open('/pricing', '_blank')} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                  </div>
                )}
              </div>
            )}

            {/* 상위노출 필수 항목 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <p className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-500" /> 상위노출 필수 항목</p>
              {!isPro ? (
                <>
                  <div className="space-y-2.5 select-none pointer-events-none min-h-[180px]">
                    <div className="flex flex-wrap gap-2">
                      {['위치·교통', '메뉴·가격', '웨이팅', '주차', '분위기', '방문팁'].map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['음식 맛', '서비스', '재방문 의사', '포장·배달', '주변 정보'].map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['사진·인테리어', '주문 방법', '혼밥 가능 여부', '예약 필요'].map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['가성비', '특이사항', '재방문 계획', '추천 메뉴'].map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="absolute top-10 inset-x-0 bottom-0 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-2 rounded-b-2xl">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">Pro 전용</p>
                    <button onClick={() => window.open('/pricing', '_blank')} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                  </div>
                </>
              ) : sectionsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[0,1,2].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg" />)}
                </div>
              ) : commonSections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {commonSections.map((s, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{s.topic}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">분석 결과가 없어요</p>
              )}
            </div>

            <div className="sticky bottom-4 z-10">
              <button
                onClick={() => { setMode('supplement-input'); window.scrollTo({ top: 0 }) }}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 shadow-lg"
              >
                <span className="flex items-center justify-center gap-1">내 글 정보 입력하기 <ChevronRight className="w-4 h-4" /></span>
              </button>
            </div>
          </div>
        )}

        {/* ── supplement-input ── */}
        {mode === 'supplement-input' && (
          <div className="space-y-4">
            <button onClick={() => setMode('pattern-preview')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">추가 정보 입력</h2>

            {/* 참고사항 + 참고링크 */}
            <h3 className="text-base font-bold pl-2">방문·사용 경험</h3>
            <p className="text-gray-600 text-sm -mt-2 pl-2">아래 정보를 채울수록 더 구체적이고 좋은 글을 만들 수 있어요.</p>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">참고사항 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="가게 위치, 분위기, 메뉴 가격 등 글에 넣고 싶은 내용을 자유롭게 적어주세요"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-300 bg-white"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">직접 경험한 내용을 구체적으로 쓸수록 상위 노출 확률이 올라가요. 두서없이 막 적어도 괜찮아요.</p>
                  {notes.trim() && <span className="text-xs text-blue-500 font-medium shrink-0 ml-2">✓ 프롬프트에 반영돼요</span>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">참고 링크 <span className="text-gray-400 font-normal">(선택)</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="네이버 지도·플레이스 링크를 붙여넣으세요"
                    value={referenceLink}
                    onChange={e => setReferenceLink(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-300 bg-white"
                  />
                  <button
                    onClick={extractPlace}
                    disabled={!referenceLink.trim() || placeLoading}
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {placeLoading ? '불러오는 중...' : '가게정보 불러오기'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">네이버 지도·플레이스 링크를 붙여넣으면 가게 정보를 자동으로 불러와요. 장소 후기에 유용해요.</p>
                {placeError && <p className="text-red-500 text-xs mt-1">{placeError}</p>}
              </div>
            </div>

            <h3 className="text-base font-bold pl-2 mt-10 flex items-center gap-2">상위노출 최적화 체크리스트 <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Pro 전용</span></h3>
            <p className="text-gray-600 text-sm -mt-2 pl-2">
              상위노출을 위해 꼭 담아야 할 항목들이에요. <span className="text-blue-500">체크되지 않은 항목에 내용을 입력하면</span> 자동으로 체크돼요. <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">선택사항</span>이지만 많이 채울수록 상위 노출 확률이 올라가요.
            </p>

            {!isPro ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="space-y-3 select-none pointer-events-none">
                  {['위치·교통', '메뉴·가격', '웨이팅', '주차'].map((topic, i) => (
                    <div key={i} className="rounded-2xl p-5 bg-blue-50">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded shrink-0 mt-0.5 border-2 bg-white border-gray-300" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-800">{topic} <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">추가필요</span></p>
                          <div className="mt-2 h-8 bg-gray-100 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <p className="text-base font-bold text-gray-700">Pro 전용</p>
                  <p className="text-base text-gray-500 flex items-center justify-center gap-1">체크리스트 활용 시 상위노출 확률 최대 <span className="text-xl font-bold text-blue-500">60%</span> 상승<TrendingUp className="w-4 h-4 text-blue-400" /></p>
                  <button onClick={() => window.open('/pricing', '_blank')} className="px-5 py-2.5 bg-blue-500 text-white text-base font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                </div>
              </div>
            ) : sectionsLoading ? (
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
                              className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-300 bg-white"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="h-4" />
          </div>
        )}

        {mode === 'supplement-input' && (
          <div className="sticky bottom-0 left-0 right-0 px-4 pt-8 pb-3 flex flex-col gap-2 bg-gradient-to-t from-white via-white to-transparent">
            <button
              onClick={proceedToPrompt}
              className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600"
            >
              {Object.values(supplementMap).some(v => v.trim()) ? <span className="flex items-center justify-center gap-1">추가하고 프롬프트 생성 <ChevronRight className="w-4 h-4" /></span> : <span className="flex items-center justify-center gap-1">프롬프트 생성 <ChevronRight className="w-4 h-4" /></span>}
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
        )}

        {/* ── result ── */}
        {mode === 'result' && analysis && (
          <div className="space-y-4">
            <button onClick={() => { setTopic(''); setBrandName(''); setKeywords([]); setKeywordInput(''); setSubKeywords([]); setSubKeywordInput(''); setNotes(''); setReferenceLink(''); setKeywordData(null); setCrawlData(null); setAnalysis(null); setPrompt(''); setMode('write-input') }} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <div className="flex items-center justify-between pl-2">
              <div>
                <h2 className="text-xl font-bold">상위노출 프롬프트</h2>
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> 사용하는 AI에 붙여넣으세요</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                {copied ? '복사됨 ✓' : '전체 프롬프트 복사'}
              </button>
            </div>

            {/* 프롬프트 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-2"><span className="text-gray-400">•</span> 제목</p>
                <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed">{(() => {
                  const sep = '━━━ 본문 작성 ━━━'
                  return prompt.includes(sep) ? prompt.split(sep)[0].trimEnd() : prompt
                })()}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-2"><span className="text-gray-400">•</span> 본문</p>
                {isPro && prompt.includes('━━━ 본문 작성 ━━━') ? (
                  <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed">{'━━━ 본문 작성 ━━━' + prompt.split('━━━ 본문 작성 ━━━')[1]}</pre>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-5 flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 mb-1.5">상위노출을 결정하는 건 제목이 아니라 <span className="text-blue-500">본문</span>이에요</p>
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed">실제 상위노출을 만드는 본문 최적화 전략·해시태그·전체 프롬프트는 Pro에서만 사용할 수 있어요.</p>
                      <button onClick={() => window.open('/pricing', '_blank')} className="text-sm font-semibold text-blue-500 hover:text-blue-700">Pro 업그레이드 하러 가기 →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── golden-category ── */}
        {mode === 'golden-category' && (
          <div>
            <h2 className="text-xl font-bold mb-2 pl-2">황금키워드 발굴</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">내 블로그 카테고리를 선택하세요</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.filter(cat => cat.id !== 'wedding').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startGolden(cat.id)}
                  className="bg-white border border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-gray-50/70 p-4 rounded-2xl text-center transition-all group flex flex-col items-center"
                >
                  <cat.icon className={`w-6 h-6 mb-2 ${cat.color}`} />
                  <p className="font-medium text-sm">{cat.label}</p>
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
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Trophy className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">황금키워드 찾는 중</h2>
            <p className="text-gray-500 text-sm">경쟁이 적고 검색량이 좋은 키워드를 찾고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── golden-result ── */}
        {mode === 'golden-result' && (
          <div className="space-y-4">
            <button onClick={() => setMode('golden-category')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">황금키워드 발굴</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2 flex items-center gap-1">
              카테고리:
              {(() => { const cat = CATEGORIES.find(c => c.id === goldenCategory); return cat ? <cat.icon className="w-3.5 h-3.5" /> : null })()}
              <span className="text-gray-400 font-medium">{CATEGORIES.find(c => c.id === goldenCategory)?.label}</span>
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
                <table className="w-full text-xs table-fixed">
                  <thead>
                    <tr className="text-[11px] text-gray-400 border-b border-gray-100 bg-gray-50">
                      <th className="text-center px-4 py-3 font-medium w-[30%]">키워드</th>
                      <th className="text-center px-3 py-3 font-medium w-[10%]">PC</th>
                      <th className="text-center px-3 py-3 font-medium w-[10%]">모바일</th>
                      <th className="text-center px-3 py-3 font-medium w-[10%]">블로그</th>
                      <th className="text-center px-3 py-3 font-medium w-[14%]">경쟁강도</th>
                      <th className="text-center px-3 py-3 font-medium w-[26%]">
                        <span className="inline-flex items-center justify-center gap-1">
                          글쓰기
                          <span
                            ref={writeTooltipRef}
                            className="cursor-default"
                            onMouseEnter={() => {
                              if (writeTooltipRef.current) {
                                const r = writeTooltipRef.current.getBoundingClientRect()
                                setWriteTooltipPos({ x: r.right + 8, y: r.top + r.height / 2 })
                              }
                            }}
                            onMouseLeave={() => setWriteTooltipPos(null)}
                          >
                            <Info className="w-3 h-3 text-gray-400" />
                          </span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {goldenResults.map((kw, i) => (
                        <tr
                          key={kw.keyword}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <span className="flex items-center gap-1.5">
                              {kw.keyword}
                              {(kw.trend_score ?? 0) >= 50 && (
                                <span
                                  className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-500 px-1 py-px rounded-full font-medium shrink-0 cursor-default"
                                  style={{fontSize:'9px'}}
                                  onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTrendBadgeTooltipPos({ x: r.right + 8, y: r.top + r.height / 2 }) }}
                                  onMouseLeave={() => setTrendBadgeTooltipPos(null)}
                                ><Flame className="w-2 h-2" /> 트렌드</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-600">{kw.pc_volume.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-gray-600">{kw.mobile_volume.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-gray-600">{kw.blog_count?.toLocaleString() ?? '-'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1 text-[11px] text-green-600 font-medium">
                              <Circle className="w-2 h-2 text-green-500 shrink-0" fill="currentColor" />
                              <span>{kw.competition_label}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startGoldenGuide(kw.keyword)} className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-0.5 whitespace-nowrap">검색형 <ChevronRight className="w-2.5 h-2.5" /></button>
                              <button onClick={() => goToFeed(kw.keyword)} className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors flex items-center gap-0.5 whitespace-nowrap">노출형 <ChevronRight className="w-2.5 h-2.5" /></button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
                {goldenHasMore && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <button
                      onClick={loadMoreGolden}
                      disabled={goldenLoadingMore}
                      className="px-6 py-2 bg-blue-400 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:border-gray-400 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-300"
                  autoFocus
                />
              </div>
              {insightError && <p className="text-red-500 text-sm">{insightError}</p>}
              <button
                onClick={startInsight}
                disabled={!insightKeyword.trim()}
                className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-1">분석 시작 <ChevronRight className="w-4 h-4" /></span>
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
            <h2 className="text-xl font-bold mb-2 pl-2">트렌드·이슈 글감 발굴</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">내 블로그 카테고리를 선택하세요</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.filter(cat => cat.id !== 'wedding').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startTrend(cat.id)}
                  className="bg-white border border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-gray-50/70 p-4 rounded-2xl text-center transition-all group flex flex-col items-center"
                >
                  <cat.icon className={`w-6 h-6 mb-2 ${cat.color}`} />
                  <p className="font-medium text-sm">{cat.label}</p>
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
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">트렌드·이슈 불러오는 중</h2>
            <p className="text-gray-500 text-sm">트렌드 키워드와 지금 뜨는 이슈를 동시에 불러오고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── trend-result ── */}
        {mode === 'trend-result' && (
          <div className="space-y-4">
            <button onClick={() => setMode('trend-category')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">트렌드·이슈 글감 발굴</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2 flex items-center gap-1">
              카테고리:
              {(() => { const cat = CATEGORIES.find(c => c.id === trendCategory); return cat ? <cat.icon className="w-3.5 h-3.5" /> : null })()}
              <span className="text-gray-400 font-medium">{CATEGORIES.find(c => c.id === trendCategory)?.label}</span>
            </p>

            {issueError && <p className="text-red-500 text-sm">{issueError}</p>}
            {issueTitles.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center">
                  <span className="flex-1 text-xs font-medium text-gray-400 text-center">트렌드·이슈</span>
                  <span className="shrink-0 w-36 text-xs font-medium text-gray-400 text-center">글쓰기</span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {(isPro ? issueTitles : issueTitles.slice(0, 8)).map((title, i) => (
                    <li key={i} className="hover:bg-gray-50 transition-colors">
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-sm text-gray-700 leading-snug">{title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => goToWrite(title, [], 'trend')} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-0.5">검색형 <ChevronRight className="w-3 h-3" /></button>
                          <button onClick={() => goToFeed(title, 'trend')} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center gap-0.5">노출형 <ChevronRight className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {!isPro && issueTitles.length > 8 && (
                  <div className="relative">
                    <ul className="divide-y divide-gray-50 select-none pointer-events-none">
                      {issueTitles.slice(8, 14).map((title, i) => (
                        <li key={i}>
                          <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 9).padStart(2, '0')}</span>
                              <span className="text-sm text-gray-700 leading-snug">{title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 flex items-center gap-0.5">검색형 <ChevronRight className="w-3 h-3" /></span>
                              <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-orange-50 text-orange-600 flex items-center gap-0.5">노출형 <ChevronRight className="w-3 h-3" /></span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/90 via-20% to-white flex flex-col items-center justify-center gap-2 rounded-b-2xl">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <p className="text-sm font-bold text-gray-700">Pro 전용</p>
                      <p className="text-xs text-gray-500">Pro 유저는 훨씬 더 많은 상위노출 글감을 쓰고 있어요</p>
                      <button onClick={() => setShowProModal('trend')} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Pro 업그레이드</button>
                    </div>
                  </div>
                )}
              </div>
            ) : !issueError && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                <Zap className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">이 카테고리는 이슈 데이터가 없어요</p>
                <p className="text-sm">검색 트렌드 탭에서 지금 뜨는 트렌드 키워드를 확인해보세요</p>
              </div>
            )}
          </div>
        )}

        {/* ── search-trend-category ── */}
        {mode === 'search-trend-category' && (
          <div>
            <h2 className="text-xl font-bold mb-2 pl-2">검색 트렌드</h2>
            <p className="text-gray-400 text-sm mb-6 pl-2">카테고리를 선택하면 지금 뜨는 키워드를 보여드려요</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.filter(cat => cat.id !== 'wedding').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startSearchTrend(cat.id)}
                  className="bg-white border border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-gray-50/70 p-4 rounded-2xl text-center transition-all group flex flex-col items-center"
                >
                  <cat.icon className={`w-6 h-6 mb-2 ${cat.color}`} />
                  <p className="font-medium text-sm">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── search-trend-loading ── */}
        {mode === 'search-trend-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">검색 트렌드 불러오는 중</h2>
            <p className="text-gray-500 text-sm">지금 가장 많이 검색되는 키워드를 불러오고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── search-trend-result ── */}
        {mode === 'search-trend-result' && (
          <div className="space-y-4">
            <button onClick={() => setMode('search-trend-category')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <h2 className="text-xl font-bold pl-2">검색 트렌드</h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2 flex items-center gap-1">
              카테고리:
              {(() => { const cat = CATEGORIES.find(c => c.id === searchTrendCategory); return cat ? <cat.icon className="w-3.5 h-3.5" /> : null })()}
              <span className="text-gray-400 font-medium">{CATEGORIES.find(c => c.id === searchTrendCategory)?.label}</span>
            </p>
            {searchTrendError && <p className="text-red-500 text-sm">{searchTrendError}</p>}
            {searchTrendKeywords.length > 0 ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden wordcloud-wrap">
                  <style>{`.wordcloud-wrap text { cursor: pointer; transition: fill 0.15s; } .wordcloud-wrap text:hover { fill: #3b82f6 !important; }`}</style>
                  <WordCloud
                    data={searchTrendKeywords.map(kw => ({ text: kw.keyword, value: Math.round(kw.ratio) }))}
                    width={560}
                    height={420}
                    font="Pretendard, sans-serif"
                    fontWeight={(w: any) => w.value >= 65 ? 'bold' : w.value >= 35 ? '600' : '400'}
                    fontSize={(w: any) => Math.max(12, Math.round(w.value * 0.45))}
                    rotate={(w: any) => {
                      const seed = w.text.charCodeAt(0) % 5
                      return seed === 1 ? 90 : seed === 3 ? -90 : 0
                    }}
                    fill={(w: any) => {
                      const v = w.value
                      if (v >= 75) return '#111827'
                      if (v >= 55) return '#1f2937'
                      if (v >= 40) return '#374151'
                      if (v >= 25) return '#4b5563'
                      return '#9ca3af'
                    }}
                    padding={4}
                  />
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 pl-8">키워드</span>
                    <span className="shrink-0 w-32 text-xs font-medium text-gray-400 text-center">트렌드 지수</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {searchTrendKeywords.map((kw, i) => (
                      <li key={kw.keyword}>
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 1).padStart(2, '0')}</span>
                            <span className="text-sm text-gray-700 font-medium truncate">{kw.keyword}</span>
                          </div>
                          <div className="shrink-0 w-32 flex items-center justify-center gap-1.5">
                            <span className="text-xs text-gray-500 font-medium">{Math.round(kw.ratio)}</span>
                            {kw.ratio >= 80 && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">핫해요</span>}
                            {kw.ratio >= 60 && kw.ratio < 80 && <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">상승 중</span>}
                            {kw.ratio < 60 && <span className="text-xs bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full font-medium">보통</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : !searchTrendError && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">아직 데이터가 준비 중이에요</p>
                <p className="text-sm">트렌드 수집은 매일 새벽 5시에 진행돼요</p>
              </div>
            )}
          </div>
        )}

        {/* ── news-loading ── */}
        {mode === 'news-loading' && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Newspaper className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">뉴스 랭킹 불러오는 중</h2>
            <p className="text-gray-500 text-sm">지금 가장 주목받는 뉴스를 불러오고 있어요</p>
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* ── news-result ── */}
        {mode === 'news-result' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => switchTab('content')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
              <button onClick={startNewsRanking} className="text-gray-400 text-sm hover:text-gray-600 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> 새로고침</button>
            </div>
            <h2 className="text-xl font-bold pl-2 flex items-baseline gap-2">
              실시간 인기 뉴스
              {newsRankingFetchedAt && (
                <span className="text-xs font-normal text-gray-400">
                  {(() => {
                    const d = new Date(newsRankingFetchedAt)
                    const yy = d.getFullYear()
                    const mm = String(d.getMonth() + 1).padStart(2, '0')
                    const dd = String(d.getDate()).padStart(2, '0')
                    const hh = String(d.getHours()).padStart(2, '0')
                    return `(${yy}/${mm}/${dd} ${hh}:00 기준)`
                  })()}
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-sm -mt-2 pl-2">오늘 화제의 뉴스로 블로그 글감을 만들어보세요</p>

            {newsRankingError && <p className="text-red-500 text-sm">{newsRankingError}</p>}

            {newsRankingItems.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between gap-3">
                  <span className="flex-1 text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> 인기 뉴스 TOP {newsRankingItems.length}</span>
                  <span className="shrink-0 w-[150px] text-xs font-medium text-gray-400 text-center">글쓰기</span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {newsRankingItems.map((item, i) => (
                    <li key={i} className="hover:bg-gray-50 transition-colors">
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-gray-300 font-medium shrink-0">#{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-sm text-gray-700 leading-snug">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 w-[150px] justify-end">
                          <button
                            onClick={() => goToWrite(item.title, [])}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-0.5"
                          >
                            검색형 <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => goToFeed(item.title)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center gap-0.5"
                          >
                            노출형 <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
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

        {/* ── golden-guide ── */}
        {mode === 'golden-guide' && (
          <div className="space-y-5">
            <button onClick={() => setMode('golden-result')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>
            <div>
              <h2 className="text-xl font-bold pl-2 mb-1">
                <span className="text-blue-500">'{guideKeyword}'</span> 글쓰기 가이드
              </h2>
              <p className="text-gray-400 text-sm pl-2">상위노출 글 패턴과 추천 주제를 확인하고 바로 글쓰기를 시작하세요</p>
            </div>

            {/* 상위노출 글들은 이렇게 써요 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-400" /> 상위노출 글들은 이렇게 써요
                </p>
              </div>
              {guideTitles === 'loading' ? (
                <div className="px-5 py-6 space-y-2 animate-pulse">
                  {[0,1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-100 rounded w-full" />)}
                </div>
              ) : !guideTitles || guideTitles.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-gray-400">상위노출 제목을 불러오지 못했어요</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {guideTitles.map((title, i) => (
                    <li key={i} className="px-5 py-3 flex items-start gap-2">
                      <span className="text-xs text-gray-300 font-medium shrink-0 mt-0.5">#{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm text-gray-700">{title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 이런 주제로 써보세요 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-blue-400" /> 이런 주제로 써보세요
                </p>
              </div>
              {guideIdeas === 'loading' ? (
                <div className="px-5 py-4">
                  <KeywordIdeaSkeleton />
                </div>
              ) : !guideIdeas || guideIdeas.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-gray-400">추천 아이디어를 불러오지 못했어요</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {(guideIdeas as KeywordIdea[]).map((idea, i) => (
                    <li key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 mb-1.5">{idea.title}</p>
                          <ul className="space-y-1">
                            {idea.points.map((pt, j) => (
                              <li key={j} className="text-xs text-gray-500 flex gap-1.5">
                                <span className="shrink-0 text-sm text-gray-400 leading-none">·</span>{pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          onClick={() => goToWrite(idea.title, [guideKeyword])}
                          className="shrink-0 text-xs text-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-0.5 whitespace-nowrap"
                        >
                          이걸로 쓸게요 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── niche-home ── */}
        {activeTab === 'niche' && mode === 'niche-home' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">틈새 인사이트</h2>
                <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">미리보기</span>
              </div>
              <p className="text-sm text-gray-400">지금 뜨고 있는 마이크로 니치 시장의 화제 글감을 발굴해보세요</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-bold text-gray-800">오늘의 핫 틈새</p>
                <span className="text-xs text-gray-400">목업 데이터</span>
              </div>
              <div className="space-y-3">
                {MOCK_HOT_NICHES.map(niche => (
                  <div key={niche.slug} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-gray-300 mt-0.5 w-4 shrink-0">#{niche.rank}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {(() => { const cfg = NICHE_CONFIG[niche.slug]; return cfg ? <cfg.icon className={`w-4 h-4 shrink-0 ${cfg.color}`} /> : null })()}
                            <span className="font-semibold text-gray-900 text-sm">{niche.name}</span>
                            <span className="text-xs text-green-500 font-medium">+{niche.weekly_increase_pct}%</span>
                            <span className="text-xs text-gray-400">화제글 {niche.hot_post_count}건</span>
                          </div>
                          <p className="text-sm text-gray-600">"{niche.headline}"</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setNicheDetailSlug(niche.slug); setNicheDetailTab('hot-posts'); setMode('niche-detail') }}
                        className="shrink-0 text-xs text-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-0.5"
                      >
                        상세보기 <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-3">다른 틈새 찾기</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="틈새 키워드를 입력하세요 (예: 미니멀라이프, 부업)"
                  disabled
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none placeholder:text-gray-300 bg-gray-50 cursor-not-allowed"
                />
                <button disabled className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium opacity-40 cursor-not-allowed">검색</button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-xs text-gray-400">자주 검색되는 틈새:</span>
                {['신혼여행', '부업', '미니멀라이프', '타로', '투자', '다이어트'].map(tag => (
                  <span key={tag} className="text-xs bg-gray-50 text-gray-400 px-2.5 py-1 rounded-full border border-gray-100">#{tag}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">틈새 검색 기능은 준비 중이에요</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-2">내 즐겨찾기</p>
              <p className="text-sm text-gray-400 text-center py-4">즐겨찾기 기능은 준비 중이에요</p>
            </div>
          </div>
        )}

        {/* ── niche-detail ── */}
        {activeTab === 'niche' && mode === 'niche-detail' && nicheDetailSlug === 'wedding' && (
          <div className="space-y-4">
            <button onClick={() => setMode('niche-home')} className="text-gray-400 text-sm hover:text-gray-600">← 뒤로</button>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Gem className="w-5 h-5 text-pink-400" />
                <h2 className="text-xl font-bold">웨딩</h2>
                <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">미리보기</span>
              </div>
              <p className="text-sm text-gray-400">다이렉트결혼준비 · 맥마웨 · 네이버 검색 데이터 기반</p>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setNicheDetailTab('hot-posts')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${nicheDetailTab === 'hot-posts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Flame className="w-3.5 h-3.5 text-red-400" /> 화제글
              </button>
              <button
                onClick={() => setNicheDetailTab('pain-points')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${nicheDetailTab === 'pain-points' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> 페인포인트
              </button>
            </div>

            {nicheDetailTab === 'hot-posts' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 pl-1">실시간 화제글 TOP 6 (목업 데이터)</p>
                {MOCK_WEDDING_HOT_POSTS.map((post, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">{post.source_label}</span>
                          <span className="text-xs text-gray-400">댓글 {post.comments}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 leading-snug">{post.title}</p>
                        <span className="flex items-center gap-1 text-xs text-blue-500 mt-1.5"><Lightbulb className="w-3 h-3 shrink-0" />{post.suggested_idea}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => goToWrite(post.suggested_idea, [])}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-0.5"
                        >
                          검색형 <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => goToFeed(post.suggested_idea)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center gap-0.5"
                        >
                          노출형 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {nicheDetailTab === 'pain-points' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 pl-1">이번 주 주요 페인포인트 TOP 5 (목업 데이터)</p>
                {MOCK_WEDDING_PAIN_POINTS.map(pp => (
                  <div key={pp.rank} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-orange-50 text-orange-500 text-xs font-bold rounded-full">#{pp.rank}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{pp.pain_point}</p>
                          <span className="shrink-0 text-xs text-gray-400">{pp.mention_count}건 언급</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {pp.related_keywords.map((kw, j) => (
                            <span key={j} className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{kw}</span>
                          ))}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                          {pp.sample_quotes.map((q, j) => (
                            <p key={j} className="text-xs text-gray-500">"{q}"</p>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-blue-600 font-medium flex items-center gap-1"><Lightbulb className="w-3 h-3 shrink-0" />{pp.suggested_idea}</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => goToWrite(pp.suggested_idea, pp.related_keywords)}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-0.5"
                            >
                              검색형 <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => goToFeed(pp.suggested_idea)}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center gap-0.5"
                            >
                              노출형 <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

        </>}

      </main>
    </div>
  )
}

function ShortentsIdeaSkeleton() {
  return (
    <div className="space-y-2 pt-2 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="rounded-lg px-3 py-2 bg-gray-100 space-y-1.5">
            <div className="h-2.5 bg-gray-200 rounded w-10" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-100 space-y-1.5">
            <div className="h-2.5 bg-gray-200 rounded w-12" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-5 bg-gray-200 rounded-full w-16" />
            <div className="h-5 bg-gray-200 rounded-full w-12" />
            <div className="h-5 bg-gray-200 rounded-full w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

function KeywordIdeaSkeleton() {
  return (
    <div className="space-y-2 pt-2 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ShortentsIdeaBlock({ ideasState, onWriteSearch, onWriteFeed }: { ideasState: ShortentsIdea[] | 'loading' | string | undefined; onWriteSearch?: (title: string, keywords: string[]) => void; onWriteFeed?: (title: string) => void }) {
  if (!ideasState || ideasState === 'loading') {
    return <ShortentsIdeaSkeleton />
  }
  if (typeof ideasState === 'string') {
    return <p className="text-sm text-red-400 py-2">오류: {ideasState}</p>
  }
  return (
    <div className="space-y-4 pt-4">
      {(ideasState as ShortentsIdea[]).map((idea, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          {idea.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.keywords.map((kw, j) => (
                <span key={j} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          )}
          <div className="space-y-1 mt-1">
            <p className="text-xs text-blue-400 font-medium flex items-center gap-1"><Search className="w-3 h-3" /> 검색형</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">{idea.searchTitle}</p>
              {onWriteSearch && (
                <button onClick={() => onWriteSearch(idea.searchTitle, idea.keywords)} className="text-xs text-blue-500 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-0.5 shrink-0 transition-colors">
                  <PenLine className="w-3 h-3" /> 글쓰기
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="space-y-1">
            <p className="text-xs text-orange-400 font-medium flex items-center gap-1"><Smartphone className="w-3 h-3" /> 홈피드형</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">{idea.feedTitle}</p>
              {onWriteFeed && (
                <button onClick={() => onWriteFeed(idea.feedTitle)} className="text-xs text-orange-500 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-0.5 shrink-0 transition-colors">
                  <PenLine className="w-3 h-3" /> 글쓰기
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function gradeCircleColor(grade: string): string {
  if (grade.includes('🟢')) return 'text-green-500'
  if (grade.includes('🟡')) return 'text-yellow-400'
  if (grade.includes('🟠')) return 'text-orange-400'
  if (grade.includes('🔴')) return 'text-red-500'
  return 'text-gray-400'
}

function gradeLabel(grade: string): string {
  return grade.replace(/[🟢🟡🟠🔴⚫⏳]\s*/u, '').trim()
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
                    <Circle className={`w-2 h-2 ${item.competition.color === 'green' ? 'text-green-500' : item.competition.color === 'yellow' ? 'text-yellow-400' : item.competition.color === 'orange' ? 'text-orange-400' : 'text-red-400'}`} fill="currentColor" />
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

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  )
}
