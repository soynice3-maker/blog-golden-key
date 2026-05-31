import Link from 'next/link'
import { TrendingUp, ChevronLeft } from 'lucide-react'

export const metadata = {
  title: '환불정책 | 키라이즈',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg flex items-center gap-1.5">
            키라이즈 <TrendingUp className="w-4 h-4 text-blue-500" />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">환불정책</h1>
        <p className="text-sm text-gray-500 mb-10">시행일: 2026년 5월 31일</p>

        <div className="space-y-10 text-[15px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 환불 원칙</h2>
            <p>
              소이크리에이티브가 운영하는 키라이즈(이하 &quot;회사&quot;)는 「전자상거래 등에서의 소비자보호에 관한 법률」 및
              관련 법령을 준수하여 합리적인 환불 정책을 운영합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 청약철회</h2>
            <p className="mb-3">
              회원은 결제 완료일로부터 <span className="font-bold">7일 이내</span>에 청약철회를 할 수 있습니다.
            </p>
            <p className="mb-3 font-semibold">단, 다음의 경우 청약철회가 제한될 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>서비스 제공이 이미 시작되어 일부 또는 전부가 사용된 경우</li>
              <li>디지털 콘텐츠 특성상 결제 직후 즉시 이용이 가능한 경우</li>
              <li>분할 가능한 서비스 중 일부가 이미 사용된 경우 (사용된 부분에 한정)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 환불 절차</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>회원이 마이페이지 또는 이메일(lavidacarinosa@naver.com)로 환불 신청</li>
              <li>회사가 신청 내용을 확인 (영업일 기준 1~3일)</li>
              <li>환불 가능 여부 결정 후 회원에게 통지</li>
              <li>환불 승인 시 결제 수단(카드, 계좌)으로 환불 처리 (영업일 기준 3~7일 소요)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 부분 환불 기준</h2>
            <p className="mb-3">월간/연간 정기 결제 서비스의 경우, 다음 기준으로 부분 환불됩니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-semibold">월간 결제:</span> 결제일로부터 7일 이내 + 사용 이력 없음 → 전액 환불</li>
              <li><span className="font-semibold">월간 결제:</span> 사용 이력 있음 → 사용일수 비례 차감 후 환불</li>
              <li><span className="font-semibold">연간 결제:</span> 7일 이내 미사용 → 전액 환불 / 사용 시 월 단위 환산 후 잔여분 환불</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 환불 불가 사유</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>본인의 사정 변경으로 인한 단순 변심 (7일 경과 후)</li>
              <li>결제일로부터 7일 경과 후의 환불 신청</li>
              <li>약관 위반으로 인한 강제 해지 회원</li>
              <li>이미 결제된 분(月)의 중도 해지 (다음 결제 주기 적용)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 결제 오류 환불</h2>
            <p>
              회사의 시스템 오류 또는 결제 시스템의 오류로 인한 중복 결제, 과오 결제의 경우
              <span className="font-bold"> 100% 전액 환불</span>해드립니다. 해당 사실을 확인하신 즉시 고객센터로 문의해주세요.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 문의처</h2>
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="mb-1">서비스명: 키라이즈</p>
              <p className="mb-1">운영: 소이크리에이티브 (대표: 강소이)</p>
              <p className="mb-1">이메일: lavidacarinosa@naver.com</p>
              <p>처리 시간: 영업일 기준 1~3일</p>
            </div>
          </section>

          <p className="text-sm text-gray-500 mt-10">공고일자: 2026년 5월 31일 / 시행일자: 2026년 5월 31일</p>
        </div>
      </main>
    </div>
  )
}
