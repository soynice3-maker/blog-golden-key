import Link from 'next/link'
import { TrendingUp, ChevronLeft, ChevronRight, Handshake, Users, Megaphone, MessageSquare } from 'lucide-react'

export const metadata = {
  title: '비즈니스 문의 | 키라이즈',
}

const INQUIRY_TYPES = [
  {
    Icon: Handshake,
    label: '제휴 문의',
    desc: '콘텐츠 제공, 데이터 공유, API 연동, 통합 솔루션 등',
    subject: '[키라이즈] 제휴 문의',
    color: 'blue',
  },
  {
    Icon: Users,
    label: '협업 제안',
    desc: '공동 프로젝트, 통합 마케팅, 콘텐츠 협력 등',
    subject: '[키라이즈] 협업 제안',
    color: 'purple',
  },
  {
    Icon: Megaphone,
    label: '광고 문의',
    desc: '서비스 내 광고 게재, 인플루언서·매체 협찬 제안 등',
    subject: '[키라이즈] 광고 문의',
    color: 'amber',
  },
  {
    Icon: MessageSquare,
    label: '기타 문의',
    desc: '미디어 인터뷰, 강연, 투자, 채용 등 기타 비즈니스',
    subject: '[키라이즈] 기타 비즈니스 문의',
    color: 'gray',
  },
] as const

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'hover:border-blue-400' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'hover:border-purple-400' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'hover:border-amber-400' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'hover:border-gray-400' },
}

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg flex items-center gap-1.5">
            키라이즈 <TrendingUp className="w-4 h-4 text-blue-500" />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 mb-4 px-4 py-2 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
            <Handshake className="w-4 h-4" />
            비즈니스 문의
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-snug">
            함께 성장할 파트너를 찾고 있어요
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            제휴, 협업, 광고, 기타 비즈니스 관련 문의는 아래에서 선택해주세요
          </p>
        </div>

        {/* 문의 유형 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {INQUIRY_TYPES.map(({ Icon, label, desc, subject, color }) => {
            const c = COLOR_MAP[color]
            return (
              <a
                key={label}
                href={`mailto:lavidacarinosa@naver.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('안녕하세요, ' + label + '드립니다.\r\n\r\n- 회사/소속:\r\n- 담당자명:\r\n- 연락처:\r\n- 문의 내용:\r\n')}`}
                className={`group bg-white border border-gray-200 rounded-2xl p-7 ${c.border} hover:shadow-md transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <ChevronRight className={`w-5 h-5 ${c.text} transition-transform group-hover:translate-x-1`} />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">{label}</p>
                <p className="text-base text-gray-600 leading-relaxed break-keep">{desc}</p>
              </a>
            )
          })}
        </div>

        {/* 안내 */}
        <section className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
          <p className="text-base text-gray-600 leading-relaxed">
            문의 접수 후 <span className="font-semibold text-gray-900">영업일 기준 2~3일 내</span> 답변드려요.<br />
            긴급한 사안은 메일 제목에 <span className="font-semibold text-gray-900">[긴급]</span>을 표기해주세요.
          </p>
        </section>
      </main>
    </div>
  )
}
