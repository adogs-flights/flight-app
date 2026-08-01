import { Link } from 'react-router-dom';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

export default function SignupChoice() {
    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[460px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <Link to="/" className="flex items-center justify-center w-14 h-14 rounded-2xl mb-2">
                            <img src={logo} alt="" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">회원가입</h1>
                        <p className="text-sm text-muted-foreground">어떤 유형으로 가입하시나요?</p>
                    </div>

                    <div className="space-y-4">
                        <Link
                            to="/signup/general"
                            className="block p-5 rounded-xl border-2 border-border bg-background hover:border-primary/50 hover:bg-muted/30 transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">🐶</span>
                                <div className="space-y-1">
                                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">일반 회원 (봉사자)</h2>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        이동봉사 티켓을 제출하고 진행 상황을 확인하는 분.
                                        카카오 계정으로 바로 시작합니다.
                                    </p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/signup/org"
                            className="block p-5 rounded-xl border-2 border-border bg-background hover:border-primary/50 hover:bg-muted/30 transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">🏢</span>
                                <div className="space-y-1">
                                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">단체 회원</h2>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        구조 단체 담당자. 이메일로 가입 후 <strong>관리자 승인</strong>을 거쳐
                                        단체 업무 화면을 이용합니다.
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>

                    <div className="text-center pt-2">
                        <Link to="/login" className="text-xs font-bold text-primary hover:underline">
                            이미 계정이 있으신가요? 로그인 →
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
