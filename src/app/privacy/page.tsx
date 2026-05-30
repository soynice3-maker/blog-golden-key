import Link from 'next/link'
import { Key, ChevronLeft } from 'lucide-react'

export const metadata = {
  title: '개인정보처리방침 | 블로그황금키',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg flex items-center gap-1.5">
            블로그황금키 <Key className="w-4 h-4 text-yellow-400" />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-10">시행일: 2026년 5월 30일</p>

        <div className="space-y-10 text-[15px] text-gray-700 leading-relaxed">
          <p>
            소이크리에이티브(이하 &quot;회사&quot;)는 &quot;블로그황금키&quot; 서비스(이하 &quot;서비스&quot;) 이용자의 개인정보를 중요시하며,
            「개인정보 보호법」 등 관련 법령을 준수하기 위하여 노력하고 있습니다.
            회사는 본 개인정보처리방침을 통해 회사가 이용자로부터 수집하는 개인정보의 항목, 수집·이용 목적, 보유 기간 등을 안내합니다.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 수집하는 개인정보 항목 및 수집 방법</h2>
            <p className="mb-3">회사는 다음의 개인정보 항목을 수집합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원가입 시: 이메일, 비밀번호, 이름, 닉네임, 휴대전화번호, 생년월일, 성별</li>
              <li>유료 결제 시: 결제 정보(카드사명, 카드번호 일부, 결제 승인번호)</li>
              <li>서비스 이용 과정에서 자동 수집: IP 주소, 쿠키, 접속 일시, 서비스 이용 기록, 브라우저 정보, 기기 정보</li>
            </ul>
            <p className="mt-3">수집 방법: 홈페이지 회원가입, 서비스 이용, 고객 문의를 통한 수집</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원 식별 및 본인 확인, 회원제 서비스 제공</li>
              <li>유료 서비스 결제 및 정산</li>
              <li>고객 문의 응대 및 분쟁 해결</li>
              <li>서비스 이용 통계 분석 및 서비스 개선</li>
              <li>법령상 의무 이행</li>
              <li>마케팅·광고 활용(별도 동의 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 개인정보의 보유 및 이용 기간</h2>
            <p className="mb-3">
              회사는 이용자의 개인정보를 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 파기합니다.
              단, 다음의 정보는 관련 법령에 따라 일정 기간 보관합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>로그인 기록(접속 로그): 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 개인정보의 제3자 제공</h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 제1조에서 명시한 목적 범위 외 용도로 이용하거나 제3자에게 제공하지 않습니다.
              다만, 이용자가 사전에 동의하였거나 법령에 의해 요구되는 경우에는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 개인정보처리 위탁</h2>
            <p className="mb-3">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Supabase Inc. — 회원 인증 및 데이터베이스</li>
              <li>Vercel Inc. — 웹 서비스 호스팅</li>
              <li>Anthropic PBC — AI 기능 제공(개인 식별 정보는 전송하지 않음)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 이용자의 권리·의무 및 행사방법</h2>
            <p>
              이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제, 처리정지를 요구할 수 있습니다.
              마이페이지에서 직접 처리하거나, 아래 개인정보 보호책임자에게 이메일로 요청하실 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육</li>
              <li>기술적 조치: 개인정보처리시스템 접근 권한 관리, 암호화, 보안프로그램 설치</li>
              <li>물리적 조치: 전산실, 자료 보관실 등의 접근 통제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 쿠키(Cookie)의 운용</h2>
            <p>
              회사는 이용자 편의를 위해 쿠키를 사용할 수 있습니다.
              이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 개인정보 보호책임자</h2>
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="mb-1">개인정보 보호책임자: 강소이</p>
              <p className="mb-1">이메일: lavidacarinosa@naver.com</p>
              <p>소속: 소이크리에이티브</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 권익 침해 구제방법</h2>
            <p className="mb-3">개인정보 침해로 인한 신고 및 상담은 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 / kopico.go.kr</li>
              <li>개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr</li>
              <li>대검찰청 사이버수사과: (국번없이) 1301 / spo.go.kr</li>
              <li>경찰청 사이버수사국: (국번없이) 182 / ecrm.cyber.go.kr</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 개인정보처리방침의 변경</h2>
            <p>
              본 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는
              시행일 7일 전부터 홈페이지 공지사항을 통해 고지합니다.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-10">공고일자: 2026년 5월 30일 / 시행일자: 2026년 5월 30일</p>
        </div>
      </main>
    </div>
  )
}
