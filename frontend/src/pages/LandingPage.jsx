import { ActionLink, Badge, Heading } from '../components/ui/primitives.js';
import { Link } from 'react-router-dom';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';
import Reveal from '../components/ui/Reveal';
import UsageGuideSection from '../components/UsageGuideSection';

const STEPS = [
    {
        step: '01',
        title: '일정 등록',
        desc: '출국을 앞둔 티켓 정보를 등록하거나, 이동봉사가 필요한 일정을 게시글로 올려요.',
    },
    {
        step: '02',
        title: '매칭 신청',
        desc: '등록된 티켓에 봉사를 신청하고, 서로의 일정을 확인하며 매칭을 진행해요.',
    },
    {
        step: '03',
        title: '안전한 이동',
        desc: '매칭이 확정되면 함께 강아지의 해외 이동을 준비하고 진행해요.',
    },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            {/* Nav */}
            <header className="w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="해봉티켓" className="w-8 h-8" />
                        <span className="font-bold text-foreground">해봉티켓</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ActionLink as={Link}
                            to="/login"
                            variant="landing"
                        >
                            로그인
                        </ActionLink>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative flex-1 flex items-center overflow-hidden">
                <div className="absolute top-10 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
                <div className="absolute bottom-0 -right-16 w-72 h-72 rounded-full bg-sky/20 blur-3xl animate-float-delayed pointer-events-none" />

                <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center gap-8">
                    <img src={logo} alt="" className="w-20 h-20 sm:w-24 sm:h-24 animate-in fade-in zoom-in-95 duration-500" />
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '100ms' }}>
                        <p className="text-sm sm:text-base font-black tracking-[0.2em] text-primary uppercase">해외이동봉사 매칭 서비스</p>
                        <Heading as="h1" variant="landing">해봉티켓</Heading>
                        <Heading as="h2" variant="landing2">
                            강아지의 해외 이동,<br />
                            <span className="text-primary">함께 봉사해요</span>
                        </Heading>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            <span className="font-bold text-foreground">해봉티켓</span>은 출국을 앞둔 항공권 소유자와
                            이동봉사가 필요한 유기견 구조 단체를 연결해, 구조된 강아지의 해외 입양·이동을 돕는
                            <span className="font-semibold text-foreground"> 해외이동봉사 매칭 서비스</span>입니다.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '200ms' }}>
                        <ActionLink as={Link}
                            to="/board"
                            variant="landing2"
                        >
                            🐶 이동 기다리는 아이들 보기
                            <span className="transition-transform group-hover:translate-x-1">→</span>
                        </ActionLink>
                        <ActionLink as={Link}
                            to="/apply"
                            variant="landing3"
                        >
                            🎁 봉사 티켓 제출하기
                        </ActionLink>
                    </div>
                    <ActionLink as={Link}
                        to="/login"
                        variant="landing4"

                    >
                        단체·관리자 로그인 →
                    </ActionLink>
                </div>
            </section>

            {/* How it works */}
            <section className="w-full bg-card border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Reveal className="text-center mb-12 space-y-2">
                        <Heading as="h2" variant="landing3">이렇게 진행돼요</Heading>
                        <p className="text-sm sm:text-base text-muted-foreground">세 단계로 간단하게 매칭을 완료할 수 있어요</p>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {STEPS.map(({ step, title, desc }, i) => (
                            <Reveal
                                key={step}
                                delay={i * 100}
                                className="p-6 space-y-3 bg-background rounded-2xl border-2 border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/30"
                            >
                                <Badge variant="landing">
                                    {step}
                                </Badge>
                                <Heading as="h3" variant="adminUi">{title}</Heading>
                                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal className="mt-10 text-center">
                        <ActionLink as={Link} to="/guide" variant="landing5">
                            해외이동봉사 안내문 보러가기 →
                        </ActionLink>
                    </Reveal>
                </div>
            </section>

            {/* 역할별 서비스 사용 가이드 (별도 페이지에서 랜딩으로 이동) */}
            <UsageGuideSection />

            <Footer />
        </div>
    );
}
