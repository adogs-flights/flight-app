import React from 'react';

export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-sm border border-border rounded-xl p-8 md:p-12">
                <h1 className="text-3xl font-bold text-foreground mb-8">서비스 이용약관</h1>
                
                <div className="space-y-8 text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제1조 (목적)</h2>
                        <p>본 약관은 '해봉티켓'이 제공하는 항공 티켓/혜택 공유 및 매칭 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제2조 (이용자의 의무)</h2>
                        <ul className="list-decimal pl-5 space-y-2">
                            <li>이용자는 자신의 티켓 나눔 정보를 정확하게 입력해야 합니다.</li>
                            <li>티켓 신청 시 제공하는 연락처 등의 정보는 매칭 상대방과의 원활한 소통을 위해 사용됨에 동의합니다.</li>
                            <li>타인의 정보를 도용하거나 서비스를 부당한 목적으로 이용해서는 안 됩니다.</li>
                        </ul>
                    </section>

                    <section className="bg-muted/30 p-6 rounded-lg">
                        <h2 className="text-xl font-bold text-foreground mb-4">제3조 (Google Drive 연동 서비스)</h2>
                        <ul className="list-decimal pl-5 space-y-2">
                            <li>본 서비스는 이용자의 편의를 위해 구글 드라이브와 티켓 정보를 동기화하는 기능을 제공합니다.</li>
                            <li>서비스는 이용자가 허용한 <code>drive.file</code> 범위 내에서만 작동하며, 이용자의 드라이브 내 다른 개인적인 파일에는 접근하지 않습니다.</li>
                            <li>연동 과정에서 발생하는 구글 계정 보안 책임은 이용자 본인에게 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제4조 (책임의 한계)</h2>
                        <ul className="list-decimal pl-5 space-y-2">
                            <li>'해봉티켓'은 티켓 공유를 위한 플랫폼만을 제공하며, 이용자 간에 발생하는 티켓 양도, 실제 탑승 여부, 항공사 정책 위반 등의 문제에 대해서는 책임을 지지 않습니다.</li>
                            <li>실제 티켓의 유효성 및 매칭 결과는 이용자 간의 직접 확인을 통해 결정됩니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제5조 (준거법 및 재판관할)</h2>
                        <p>본 약관은 대한민국 법령을 준거법으로 하며, 서비스 이용과 관련하여 발생한 분쟁은 관할 법원에 제기합니다.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
