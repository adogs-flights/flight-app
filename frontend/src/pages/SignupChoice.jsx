import { ActionLink, Card, Heading } from '../components/ui/primitives.js';
import { Link } from 'react-router-dom';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

export default function SignupChoice() {
    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <Card variant="signupChoice">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <ActionLink as={Link} to="/" variant="generalSignup">
                            <img src={logo} alt="" />
                        </ActionLink>
                        <Heading as="h1" variant="page">회원가입</Heading>
                        <p className="text-sm text-muted-foreground">어떤 유형으로 가입하시나요?</p>
                    </div>

                    <div className="space-y-4">
                        <ActionLink as={Link}
                            to="/signup/general"
                            variant="signupChoice"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">🐶</span>
                                <div className="space-y-1">
                                    <Heading as="h2" variant="signupChoice">일반 회원 (봉사자)</Heading>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        이동봉사 티켓을 제출하고 진행 상황을 확인하는 분.
                                        카카오 계정으로 바로 시작합니다.
                                    </p>
                                </div>
                            </div>
                        </ActionLink>

                        <ActionLink as={Link}
                            to="/signup/org"
                            variant="signupChoice"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">🏢</span>
                                <div className="space-y-1">
                                    <Heading as="h2" variant="signupChoice">단체 회원</Heading>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        구조 단체 담당자. 이메일로 가입 후 <strong>관리자 승인</strong>을 거쳐
                                        단체 업무 화면을 이용합니다.
                                    </p>
                                </div>
                            </div>
                        </ActionLink>
                    </div>

                    <div className="text-center pt-2">
                        <ActionLink as={Link} to="/login" variant="signupChoice2">
                            이미 계정이 있으신가요? 로그인 →
                        </ActionLink>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
