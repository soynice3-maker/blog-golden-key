import Link from 'next/link'
import { Key, ChevronLeft, Mail, Briefcase, Building2, GraduationCap, Heart } from 'lucide-react'

export const metadata = {
  title: '비즈니스 문의 | 블로그황금키',
}

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg flex items-center gap-1.5">
            블로그황금키 <Key className="w-4 h-4 text-yellow-400" />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            <Briefcase className="w-3.5 h-3.5" />
            상위노출 대행 · 비즈니스 제휴
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-snug">
            전문 업종 블로그,<br />
            상위노출 대행해드립니다
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            법무·의료·웨딩 등 고단가 전문 업종 전용 상위노출 대행 서비스
          </p>
        </div>

        {/* 추천 업종 */}
        <section className="bg-white rounded-2xl p-8 mb-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-5">이런 업종에 추천드려요</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: Building2, label: '법무·세무' },
              { Icon: Heart, label: '의료·성형' },
              { Icon: GraduationCap, label: '교육·학원' },
              { Icon: Briefcase, label: '웨딩·산후조리' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-xl">
                <Icon className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 제공 서비스 */}
        <section className="bg-white rounded-2xl p-8 mb-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-5">제공 서비스</h2>
          <ul className="space-y-3 text-[15px] text-gray-700">
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">01</span>
              <div>
                <p className="font-semibold mb-0.5">키워드 전략 수립</p>
                <p className="text-sm text-gray-500">업종별 황금키워드 + 경쟁 분석 + 시즌별 전략</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">02</span>
              <div>
                <p className="font-semibold mb-0.5">전문 작가 콘텐츠 작성</p>
                <p className="text-sm text-gray-500">업종 전문 지식 기반 글 + 상위노출 최적화</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">03</span>
              <div>
                <p className="font-semibold mb-0.5">월간 리포트 + 순위 추적</p>
                <p className="text-sm text-gray-500">키워드별 순위 변화 + 트래픽 분석 + 다음 달 전략 제안</p>
              </div>
            </li>
          </ul>
        </section>

        {/* 문의 */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">상담 문의</h2>
          <p className="text-base text-gray-700 mb-6">
            업종, 운영 중인 블로그, 목표 등을 알려주시면 맞춤 견적 보내드려요
          </p>
          <a
            href="mailto:lavidacarinosa@naver.com?subject=[블로그황금키] 비즈니스 문의"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-amber-500 text-white text-base font-bold rounded-xl hover:bg-amber-600 transition-colors"
          >
            <Mail className="w-5 h-5" />
            lavidacarinosa@naver.com
          </a>
        </section>
      </main>
    </div>
  )
}
