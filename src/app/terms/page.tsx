import Link from 'next/link'
import { TrendingUp, ChevronLeft } from 'lucide-react'

export const metadata = {
  title: '이용약관 | 키라이즈',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
        <p className="text-sm text-gray-500 mb-10">시행일: 2026년 5월 30일</p>

        <div className="space-y-10 text-[15px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 소이크리에이티브(이하 &quot;회사&quot;)가 제공하는 &quot;키라이즈&quot; 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여
              회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>&quot;서비스&quot;란 회사가 제공하는 블로그 키워드 분석, 글감 추천, AI 글쓰기 프롬프트 생성 등 일체의 서비스를 의미합니다.</li>
              <li>&quot;회원&quot;이란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
              <li>&quot;유료서비스&quot;란 회사가 유료로 제공하는 각종 서비스를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (약관의 명시와 개정)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회사는 본 약관의 내용을 회원이 알 수 있도록 서비스 화면에 게시합니다.</li>
              <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 최소 7일 전부터 공지합니다.</li>
              <li>이용자에게 불리한 약관 개정의 경우 30일 전부터 공지하며, 개정 약관에 동의하지 않는 경우 회원 탈퇴할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (회원가입 및 이용계약의 성립)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>이용계약은 이용자가 약관에 동의하고 회사가 정한 가입 양식에 따라 회원정보를 기입하여 신청한 후, 회사가 이를 승낙함으로써 체결됩니다.</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대해서는 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>타인의 정보를 도용하여 가입한 경우</li>
                  <li>허위 정보를 기재하거나 회사가 요구하는 사항을 기재하지 않은 경우</li>
                  <li>만 14세 미만 아동이 법정대리인 동의 없이 가입한 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (서비스의 제공 및 변경)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회사는 회원에게 다음과 같은 서비스를 제공합니다.
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>키워드 분석 및 황금키워드 추천</li>
                  <li>트렌드/뉴스 기반 글감 추천</li>
                  <li>AI 글쓰기 프롬프트 자동 생성</li>
                  <li>틈새 분야 키워드 발굴</li>
                  <li>기타 회사가 추가 개발하거나 제휴 등을 통해 제공하는 일체의 서비스</li>
                </ul>
              </li>
              <li>회사는 서비스의 내용을 변경할 경우 변경 사유 및 적용 일자를 명시하여 사전에 공지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (서비스 이용 시간)</h2>
            <p>
              서비스는 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.
              단, 시스템 정기점검, 증설 및 교체 등 기술적 사유로 일정 시간 중지될 수 있으며, 이 경우 사전 또는 사후 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (유료서비스 결제 및 환불)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>유료서비스 이용을 위해서는 정해진 요금을 결제해야 합니다.</li>
              <li>회원은 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 결제일로부터 7일 이내에 청약철회를 할 수 있습니다.
                다만, 다음의 경우 청약철회가 제한됩니다.
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>이미 서비스가 일부 사용된 경우(분할 가능한 서비스의 사용된 부분)</li>
                  <li>디지털 콘텐츠의 제공이 시작된 경우</li>
                </ul>
              </li>
              <li>환불 신청은 마이페이지 또는 이메일(lavidacarinosa@naver.com)로 가능합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (회원의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원은 다음 행위를 하여서는 안 됩니다.
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>타인의 정보 도용 또는 부정 사용</li>
                  <li>회사 및 제3자의 지적재산권 침해</li>
                  <li>서비스를 자동화된 수단으로 무단 수집·복제·역설계하는 행위</li>
                  <li>법령 또는 본 약관에 위반되는 행위</li>
                  <li>음란물, 차별·혐오 표현 등 공서양속에 반하는 내용 게시</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (서비스 이용 제한 및 회원 탈퇴)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회사는 회원이 약관을 위반한 경우 사전 통지 없이 이용을 제한하거나 이용계약을 해지할 수 있습니다.</li>
              <li>회원은 언제든지 마이페이지에서 회원 탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (저작권의 귀속)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>서비스 내 회사가 제공하는 콘텐츠에 대한 저작권 등 지적재산권은 회사에 귀속됩니다.</li>
              <li>회원이 서비스 내에서 작성한 콘텐츠의 저작권은 회원에게 귀속됩니다. 다만, 회사는 서비스 운영 및 홍보 목적으로 무상으로 사용할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (면책조항)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.</li>
              <li>회사가 제공하는 AI 기반 추천·분석 결과는 참고용이며, 회사는 그 결과의 정확성을 보장하지 않습니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제12조 (분쟁 해결 및 관할 법원)</h2>
            <p>
              본 약관에 관한 분쟁은 대한민국 법령에 따라 처리하며,
              회사와 회원 간 발생한 소송의 관할법원은 민사소송법에 따라 정합니다.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-10">공고일자: 2026년 5월 30일 / 시행일자: 2026년 5월 30일</p>
        </div>
      </main>
    </div>
  )
}
