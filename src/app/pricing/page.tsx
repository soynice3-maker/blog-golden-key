'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft } from 'lucide-react'
import { useState } from 'react'

const plans = [
  {
    name: 'Free',
    price: '0',
    dailyPrice: null,
    annualTotal: null,
    annualMonthly: null,
    annualOriginal: null,
    annualDiscount: null,
    desc: '시작하는 블로거',
    highlight: false,
    features: [
      { label: '황금키워드 발굴', included: true },
      { label: '상위노출 패턴 분석', included: true },
      { label: '기본 프롬프트 생성', included: true },
      { label: '자주 담기는 내용 분석', included: false },
      { label: '상위노출 최적화 체크리스트', included: false },
      { label: '키워드 아이디어 생성', included: false },
      { label: '트렌드·뉴스 아이디어', included: false },
      { label: '피드 콘텐츠 추천', included: false },
    ],
    cta: '/login',
    ctaLabel: '무료 시작하기',
  },
  {
    name: 'Pro',
    price: '59,000',
    dailyPrice: '1,967',
    annualTotal: '566,400',
    annualMonthly: '47,200',
    annualOriginal: '708,000',
    annualDiscount: 20,
    desc: '수익화 목표 블로거',
    highlight: true,
    features: [
      { label: '황금키워드 발굴', included: true },
      { label: '상위노출 패턴 분석', included: true },
      { label: '기본 프롬프트 생성', included: true },
      { label: '자주 담기는 내용 분석', included: true },
      { label: '상위노출 최적화 체크리스트', included: true },
      { label: '키워드 아이디어 생성', included: true },
      { label: '트렌드·뉴스 아이디어', included: true },
      { label: '피드 콘텐츠 추천', included: true },
    ],
    cta: '/login',
    ctaLabel: 'Pro 시작하기',
  },
  {
    name: 'Biz',
    price: '99,000',
    dailyPrice: '3,300',
    annualTotal: '950,400',
    annualMonthly: '79,200',
    annualOriginal: '1,188,000',
    annualDiscount: 20,
    desc: '체험단·협찬 전문',
    highlight: false,
    features: [
      { label: '황금키워드 발굴', included: true },
      { label: '상위노출 패턴 분석', included: true },
      { label: '기본 프롬프트 생성', included: true },
      { label: '자주 담기는 내용 분석', included: true },
      { label: '상위노출 최적화 체크리스트', included: true },
      { label: '키워드 아이디어 생성', included: true },
      { label: '트렌드·뉴스 아이디어', included: true },
      { label: '피드 콘텐츠 추천', included: true },
    ],
    cta: '/login',
    ctaLabel: 'Biz 시작하기',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm">
          <ChevronLeft className="w-4 h-4" />
          뒤로
        </button>
        <span className="font-bold text-base">요금제</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">상위노출부터 수익화까지, 한 단계 업그레이드하세요!</h1>
          <p className="text-gray-500 text-sm text-center">
            상위노출이 곧 <span className="font-bold text-blue-500 text-base">수익</span>이에요. 더 많은 기능으로 상위노출 확률을 높이세요!
          </p>
        </div>

        {/* 월간/연간 토글 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              월간
            </button>
            <div className="relative">
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                연간
              </button>
              <div className="animate-float absolute -top-6 left-8 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none shadow-sm">
                최대 20% 할인
                <span className="absolute -bottom-[5px] left-3 w-0 h-0" style={{ borderRight: '8px solid transparent', borderTop: '6px solid #3b82f6' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl p-6 relative border-2 flex flex-col ${plan.highlight ? 'border-blue-500 shadow-md' : 'border-gray-100 shadow-sm'}`}
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                {plan.highlight && (
                  <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">추천</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mb-3 -mt-0.5">{plan.desc}</p>

              {/* 가격 영역 */}
              <div className={`mb-5 flex flex-col ${billing === 'annual' ? 'min-h-[88px]' : ''}`}>
                {plan.price === '0' ? (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold">무료</span>
                    </div>
                    {billing === 'annual' && (
                      <>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-semibold text-blue-500">무제한</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">무료로 먼저 경험해보세요!</p>
                      </>
                    )}
                  </div>
                ) : billing === 'monthly' ? (
                  <div className="text-2xl font-bold">월 {plan.price}원</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold">{plan.annualTotal}원</span>
                      {plan.annualMonthly && <span className="text-xs text-gray-400">/ 월 {plan.annualMonthly}원</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm text-gray-400 line-through">{plan.annualOriginal}원</span>
                      <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{plan.annualDiscount}% 할인</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">연간 청구</p>
                  </>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className={`text-sm flex items-center gap-2 ${f.included ? 'text-gray-700' : 'text-gray-300'}`}>
                    <Check className={`w-4 h-4 shrink-0 ${f.included ? 'text-blue-500' : 'text-gray-200'}`} />
                    {f.label}
                  </li>
                ))}
              </ul>

              {plan.cta ? (
                <Link
                  href={plan.cta}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold ${plan.highlight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {plan.ctaLabel}
                </Link>
              ) : (
                <div className="block text-center py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-400 cursor-default">
                  {plan.ctaLabel}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">결제 관련 문의: soynice3@gmail.com</p>
      </div>
    </div>
  )
}
