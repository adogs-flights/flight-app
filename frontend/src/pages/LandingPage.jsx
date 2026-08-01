import { Link } from 'react-router-dom';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';
import Reveal from '../components/ui/Reveal';

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
                        <Link
                            to="/board"
                            className="inline-flex items-center justify-center h-9 px-4 text-sm font-bold rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                            구해요 게시판
                        </Link>
                        <Link
                            to="/guide"
                            className="inline-flex items-center justify-center h-9 px-4 text-sm font-bold rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                            이동봉사 안내
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center h-9 px-4 text-sm font-bold rounded-lg text-foreground hover:bg-secondary transition-colors"
                        >
                            로그인
                        </Link>
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
                        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                            강아지의 해외 이동,<br />
                            <span className="text-primary">함께 봉사해요</span>
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            출국을 앞둔 티켓 소유자와 이동봉사가 필요한 보호자를 연결하는<br className="hidden sm:block" />
                            해외이동봉사 일정 관리 플랫폼입니다.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '200ms' }}>
                        <Link
                            to="/board"
                            className="group inline-flex items-center justify-center gap-2 h-14 px-10 text-base font-black rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98]"
                        >
                            🐶 이동 기다리는 아이들 보기
                            <span className="transition-transform group-hover:translate-x-1">→</span>
                        </Link>
                        <Link
                            to="/apply"
                            className="inline-flex items-center justify-center h-14 px-8 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-secondary transition-all hover:scale-[0.99] active:scale-[0.97]"
                        >
                            🎁 봉사 티켓 제출하기
                        </Link>
                    </div>
                    <Link
                        to="/login"
                        className="text-sm font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors animate-in fade-in duration-700 fill-mode-both"
                        style={{ animationDelay: '300ms' }}
                    >
                        단체·관리자 로그인 →
                    </Link>
                </div>
            </section>

            {/* How it works */}
            <section className="w-full bg-card border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Reveal className="text-center mb-12 space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">이렇게 진행돼요</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">세 단계로 간단하게 매칭을 완료할 수 있어요</p>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {STEPS.map(({ step, title, desc }, i) => (
                            <Reveal
                                key={step}
                                delay={i * 100}
                                className="p-6 space-y-3 bg-background rounded-2xl border-2 border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/30"
                            >
                                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                    {step}
                                </span>
                                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal className="mt-10 text-center">
                        <Link to="/guide" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                            해외이동봉사가 처음이신가요? 안내문 보러가기 →
                        </Link>
                    </Reveal>
                </div>
            </section>

            <Footer />
        </div>
    );
}
