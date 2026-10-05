import { ActionLink, Button, Card, Heading } from '../components/ui/primitives.js';
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
                <Card variant="generalHome">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl text-primary-foreground text-2xl font-bold mb-2">
                            <img src={logo} alt="" />
                        </div>
                        <Heading as="h1" variant="page">해봉티켓</Heading>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">{user?.name}</span>님, 로그인되었습니다.
                        </p>
                    </div>

                    <div className="text-center space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            신청 내역 페이지는 준비 중입니다.<br />
                            준비되는 대로 이곳에서 진행 상황을 확인하실 수 있습니다.
                        </p>
                        <ActionLink as={Link} to="/apply" variant="generalHome">
                            🎁 봉사 티켓을 제출하러 가기 →
                        </ActionLink>
                    </div>

                    <Button
                        type="button"
                        onClick={logout}
                        variant="outlineFull"
                    >
                        로그아웃
                    </Button>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
