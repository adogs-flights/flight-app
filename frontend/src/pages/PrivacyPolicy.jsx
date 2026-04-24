import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-sm border border-border rounded-xl p-8 md:p-12">
                <h1 className="text-3xl font-bold text-foreground mb-8">개인정보 처리방침</h1>
                
                <div className="space-y-8 text-muted-foreground leading-relaxed">
                    <section>
                        <p className="mb-4">
                            <strong>해봉티켓</strong>(이하 '서비스')은 이용자의 개인정보를 중요시하며, '정보통신망 이용촉진 및 정보보호 등에 관한 법률' 및 '개인정보 보호법'을 준수하고 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. 수집하는 개인정보 항목</h2>
                        <p className="mb-2 font-medium">서비스는 회원가입 및 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>필수 항목</strong>: 이름, 이메일 주소, 비밀번호</li>
                            <li><strong>선택 항목</strong>: 단체명(Organization), 연락처, 서비스 이용 기록</li>
                            <li><strong>Google OAuth 연동 시</strong>: 구글 계정 이메일, Google Drive API 접근 토큰(Access/Refresh Token)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. 개인정보의 수집 및 이용목적</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>회원 관리</strong>: 이용자 식별, 계정 생성 및 관리, 고지사항 전달</li>
                            <li><strong>서비스 제공</strong>: 항공 티켓 나눔 정보 게시, 신청서 작성 및 매칭</li>
                            <li><strong>Google Drive 동기화</strong>: 이용자의 구글 드라이브 내 특정 폴더 생성 및 티켓 정보와 연동된 폴더명 관리</li>
                        </ul>
                    </section>

                    <section className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
                        <h2 className="text-xl font-bold text-primary mb-4 text-blue-800">3. Google 사용자 데이터의 활용 (Limited Use Policy)</h2>
                        <p className="mb-4">
                            해봉티켓은 구글 API에서 받은 정보를 구글 API 서비스 사용자 데이터 정책(특히 <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">제한적 사용 요구사항</a>)에 따라 사용합니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>사용 범위</strong>: <code>drive.file</code> 및 <code>drive.metadata.readonly</code> 권한을 통해, 서비스가 직접 생성한 폴더를 관리하거나 이용자가 지정한 동기화 폴더 내의 티켓 정보를 업데이트하는 목적으로만 데이터를 사용합니다.</li>
                            <li><strong>공유 금지</strong>: 수집된 구글 사용자 데이터는 서비스 제공 이외의 목적으로 제3자에게 판매하거나 공유하지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. 개인정보의 보유 및 이용기간</h2>
                        <p>이용자의 개인정보는 원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 기간까지 보관합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. 이용자의 권리</h2>
                        <p>이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, Google Drive 연동 해제 기능을 통해 언제든지 API 접근 권한을 철회할 수 있습니다.</p>
                    </section>

                    <section className="pt-8 border-t border-border">
                        <h2 className="text-xl font-bold text-foreground mb-4">6. 개인정보 보호 책임자</h2>
                        <ul className="space-y-1">
                            <li>성명/담당: [사용자 이름]</li>
                            <li>문의: [이메일 주소]</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
