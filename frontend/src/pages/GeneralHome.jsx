import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

// 카카오로 가입한 일반 사용자의 임시 홈.
// 단체 업무 화면(MainLayout)은 게스트 전화번호·담당자·메모를 담고 있어
// general 계정에 열어줄 수 없다. 자기 신청 모음 화면이 나오기 전까지의 자리표시자다.
export default function GeneralHome() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[400px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl text-primary-foreground text-2xl font-bold mb-2">
                            <img src={logo} alt="" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">해봉티켓</h1>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">{user?.name}</span>님, 로그인되었습니다.
                        </p>
                    </div>

                    <div className="text-center space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            신청 내역 페이지는 준비 중입니다.<br />
                            준비되는 대로 이곳에서 진행 상황을 확인하실 수 있습니다.
                        </p>
                        <Link to="/apply" className="inline-block text-xs font-bold text-primary hover:underline">
                            🎁 봉사 티켓을 제출하러 가기 →
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={logout}
                        className="w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg border-2 border-border bg-background text-foreground hover:bg-muted hover:scale-[0.99] active:scale-[0.97]"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
