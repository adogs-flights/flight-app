import { useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './ui/Reveal';

// 역할별 사용 가이드 데이터. 실제 앱 화면/흐름과 1:1로 맞춘다.
// - volunteer: 카카오로 가입하는 일반 사용자(봉사자=티켓 제공자)
// - org: 관리자 승인을 받는 구조 단체 담당자 계정
const ROLES = {
    volunteer: {
        key: 'volunteer',
        emoji: '🐶',
        label: '봉사자',
        sub: '티켓 제공자',
        headline: '내 항공권으로 강아지의 해외 이동을 도와요',
        intro: '출국을 앞둔 항공권이 있다면, 별도 비용 없이 강아지 이동봉사에 참여할 수 있어요. 로그인 없이도 신청할 수 있습니다.',
        steps: [
            {
                title: '이동 기다리는 아이들 확인하기',
                where: '홈 → “🐶 이동 기다리는 아이들 보기”',
                desc: (
                    <>
                        <p>로그인 없이 <strong className="text-foreground">공개 “구해요” 게시판</strong>에서 이동봉사가 필요한 일정을 볼 수 있어요.</p>
                        <p>담당자 연락처 등 개인정보는 가려져 있고, 어떤 노선·날짜에 도움이 필요한지 확인할 수 있습니다.</p>
                    </>
                ),
            },
            {
                title: '봉사 티켓 제출하기',
                where: '홈 → “🎁 봉사 티켓 제출하기”',
                desc: (
                    <>
                        <p>강아지 자리 예약을 위해 항공권 정보를 남겨요. 항공사, e티켓 이미지(또는 PDF), 예약 시 남긴 전화번호, 담당자가 연락할 <strong className="text-foreground">카카오톡 아이디</strong>를 입력합니다.</p>
                        <p>특정 단체의 게시글에서 넘어온 경우 신청 단체가 자동으로 지정돼요.</p>
                    </>
                ),
            },
            {
                title: '상태 조회 링크 꼭 저장하기',
                where: '제출 완료 화면',
                desc: (
                    <>
                        <p>제출이 끝나면 <strong className="text-foreground">진행 상태를 확인할 수 있는 링크</strong>가 나와요. 이 링크는 제출자 본인만 볼 수 있는 열쇠이니 꼭 복사해 보관하세요.</p>
                        <p>이 링크로 언제든 검토 대기 / 승인 / 반려 상태를 확인할 수 있습니다.</p>
                    </>
                ),
            },
            {
                title: '카카오로 로그인해 계속 이용하기',
                where: '로그인 → 카카오',
                desc: (
                    <p>카카오 계정으로 가입·로그인하면, 이동을 기다리는 아이들을 편하게 이어서 확인할 수 있어요. 별도의 비밀번호 없이 시작합니다.</p>
                ),
            },
            {
                title: '이동봉사 진행 절차 확인하기',
                where: '해외 이동 봉사 안내문',
                desc: (
                    <>
                        <p>매칭 이후의 실제 진행 과정(항공사 제한, 공항 도착 시간, 출국 서류 준비, D-7·D-5 안내, 당일 절차 등)은 <Link to="/guide" className="text-primary font-bold hover:underline">해외 이동 봉사 안내문</Link>에 자세히 정리돼 있어요.</p>
                    </>
                ),
            },
        ],
        notice: {
            tone: 'primary',
            text: (
                <>강아지 자리 예약과 서류 준비는 단체·스탭이 진행하며, 봉사자님께 <strong>별도의 비용은 발생하지 않습니다.</strong></>
            ),
        },
        privacy: '제출해주신 정보는 항공사 예약 조회와 출국 서류 준비에만 사용된 뒤 안전하게 파기됩니다.',
    },
    org: {
        key: 'org',
        emoji: '🏢',
        label: '단체',
        sub: '구조 단체 담당자',
        headline: '봉사자를 모으고, 제출·서류를 한곳에서 관리해요',
        intro: '구조 단체 담당자는 이동봉사가 필요한 일정을 올리고, 봉사자들이 제출한 티켓을 검토·관리합니다. 개인정보에 접근하므로 관리자 승인 후 이용할 수 있어요.',
        steps: [
            {
                title: '단체 회원가입 신청',
                where: '회원가입 → 단체 회원',
                desc: (
                    <>
                        <p>단체명, 담당자 이름, 아이디(이메일), 비밀번호(8자 이상·영문/숫자/특수문자)를 입력해 신청합니다.</p>
                        <p>단체 계정은 봉사자의 전화번호 등 개인정보에 접근하기 때문에, 가입 후 <strong className="text-foreground">관리자 승인</strong>을 거쳐야 로그인할 수 있어요.</p>
                    </>
                ),
            },
            {
                title: '승인 후 로그인',
                where: '로그인',
                desc: (
                    <p>승인이 완료되면 등록한 이메일로 안내가 갑니다. 이메일·비밀번호로 로그인하면 단체 업무 화면(사이드바 메뉴)이 열려요.</p>
                ),
            },
            {
                title: '구해요 게시판에 일정 올리기',
                where: '사이드바 → 구해요 게시판 → “+ 구해요 등록”',
                desc: (
                    <>
                        <p>이동봉사가 필요한 일정을 게시글로 등록합니다. 이 게시글은 공개 게시판에도 노출되어 봉사자가 게시글에서 바로 티켓을 제출할 수 있어요.</p>
                        <p>공항 코드·제목 검색과 이번 달/이후 필터로 일정을 관리합니다.</p>
                    </>
                ),
            },
            {
                title: '제출 검토 — 승인·반려',
                where: '사이드바 → 제출 검토',
                desc: (
                    <>
                        <p>우리 단체로 접수된 봉사자 티켓 제출을 확인하고 <strong className="text-foreground">승인 또는 반려</strong>합니다.</p>
                        <p>검토 대기 / 승인됨 / 반려됨 / 전체 탭으로 상태를 나눠 볼 수 있고, 각 건에서 증빙(e티켓 이미지)과 연결된 게시글을 확인할 수 있어요.</p>
                    </>
                ),
            },
            {
                title: '티켓·일정 관리',
                where: '사이드바 → 일정 관리 · 내 티켓 · 나눔해요 · 내 신청 현황',
                desc: (
                    <>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-foreground">일정 관리</strong>: 달력·리스트로 티켓 일정을 한눈에 관리</li>
                            <li><strong className="text-foreground">내 티켓</strong>: 티켓 등록·수정, 출국 준비 정보 통합 관리</li>
                            <li><strong className="text-foreground">나눔해요</strong>: 나눔 중·완료 티켓과 신청자 확인</li>
                            <li><strong className="text-foreground">내 신청 현황</strong>: 신청 진행 상태 추적</li>
                        </ul>
                    </>
                ),
            },
            {
                title: '구글 드라이브 연동으로 서류 보관',
                where: '내 티켓 → 구글 드라이브 동기화',
                desc: (
                    <>
                        <p>구글 계정을 연결하고 동기화 폴더를 지정하면, e티켓·제출 정보가 <strong className="text-foreground">‘해봉티켓_동기화’ 폴더</strong>에 자동으로 저장됩니다.</p>
                        <p>연동 상태(미연결 → 폴더 설정 필요 → 연동중)를 패널에서 단계별로 확인할 수 있어요.</p>
                    </>
                ),
            },
        ],
        notice: {
            tone: 'destructive',
            text: (
                <>단체 계정은 봉사자의 개인정보를 다룹니다. 이동 완료·취소 시 공유받은 개인정보는 <strong>반드시 안전하게 파기</strong>해주세요.</>
            ),
        },
        privacy: '관리자 계정은 회원 관리와 공항·항공사 마스터 데이터 관리를 별도의 관리자 페이지에서 수행합니다.',
    },
};

function StepIcon() {
    return (
        <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

// 역할(봉사자/단체)별 서비스 사용 가이드 섹션. 랜딩 페이지 안에 임베드해서 쓴다.
export default function UsageGuideSection() {
    const [activeRole, setActiveRole] = useState('volunteer');
    const role = ROLES[activeRole];

    return (
        <section id="usage-guide" className="w-full bg-background border-t border-border scroll-mt-20">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
                {/* Section header */}
                <Reveal className="text-center mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">서비스 사용 가이드</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        나에게 맞는 역할을 선택하면 그에 맞는 사용 방법을 순서대로 안내해드려요.
                    </p>
                    {/* Role toggle */}
                    <div className="inline-flex p-1 rounded-2xl border-2 border-border bg-card shadow-sm">
                        {Object.values(ROLES).map(r => {
                            const isActive = r.key === activeRole;
                            return (
                                <button
                                    key={r.key}
                                    type="button"
                                    onClick={() => setActiveRole(r.key)}
                                    className={`flex items-center gap-2 px-5 sm:px-7 h-12 rounded-xl text-sm font-bold transition-all ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="text-base">{r.emoji}</span>
                                    <span className="flex flex-col items-start leading-tight">
                                        <span>{r.label}</span>
                                        <span className={`text-[10px] font-medium ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>{r.sub}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Reveal>

                {/* Role content: key remounts so animations replay on switch */}
                <div key={role.key} className="space-y-14 animate-in fade-in duration-500">
                    {/* Intro card */}
                    <Reveal>
                        <div className="flex items-start gap-4 p-5 sm:p-6 bg-card rounded-2xl border-2 border-border">
                            <span className="text-3xl shrink-0">{role.emoji}</span>
                            <div className="space-y-1.5">
                                <h3 className="text-lg sm:text-xl font-bold text-foreground">{role.headline}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{role.intro}</p>
                            </div>
                        </div>
                    </Reveal>

                    {/* Steps timeline */}
                    <div className="space-y-6">
                        <Reveal>
                            <h3 className="text-xl sm:text-2xl font-bold text-foreground">이렇게 사용하세요</h3>
                        </Reveal>
                        <ol className="relative border-l-2 border-border ml-4">
                            {role.steps.map((s, i) => (
                                <Reveal as="li" key={s.title} delay={i * 70} className={`ml-6 relative ${i !== role.steps.length - 1 ? 'mb-6' : ''}`}>
                                    <span className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold -left-10 ring-4 ring-background">
                                        {i + 1}
                                    </span>
                                    <div className="p-4 sm:p-5 bg-muted/50 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:bg-muted/70">
                                        <div className="flex items-start gap-2 mb-1">
                                            <StepIcon />
                                            <h4 className="text-base sm:text-lg font-bold text-foreground">{s.title}</h4>
                                        </div>
                                        {s.where && (
                                            <p className="ml-7 mb-2 inline-block text-[11px] font-bold text-primary bg-primary/10 rounded-md px-2 py-0.5">
                                                {s.where}
                                            </p>
                                        )}
                                        <div className="ml-7 text-sm text-muted-foreground leading-relaxed space-y-1.5">
                                            {s.desc}
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </ol>
                    </div>

                    {/* Notice */}
                    <Reveal>
                        <div className={`p-5 sm:p-6 rounded-2xl border-2 ${
                            role.notice.tone === 'destructive'
                                ? 'bg-destructive/10 border-destructive/20'
                                : 'bg-primary/5 border-primary/20'
                        }`}>
                            <p className={`text-sm font-bold leading-relaxed ${role.notice.tone === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
                                {role.notice.text}
                            </p>
                        </div>
                    </Reveal>

                    {/* Privacy footnote */}
                    <Reveal>
                        <p className="text-center text-xs text-muted-foreground leading-relaxed">
                            🔒 {role.privacy}
                        </p>
                    </Reveal>

                    {/* CTA */}
                    <Reveal className="flex flex-col sm:flex-row gap-3 justify-center">
                        {activeRole === 'volunteer' ? (
                            <>
                                <Link to="/apply" className="inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.99] active:scale-[0.97]">
                                    🎁 봉사 티켓 제출하기
                                </Link>
                                <Link to="/board" className="inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-secondary transition-all">
                                    🐶 이동 기다리는 아이들 보기
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/signup/org" className="inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.99] active:scale-[0.97]">
                                    🏢 단체 회원가입 신청
                                </Link>
                                <Link to="/login" className="inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-secondary transition-all">
                                    단체 로그인 →
                                </Link>
                            </>
                        )}
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
