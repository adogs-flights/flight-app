import { ActionLink, Alert, Button, Card, Heading } from '../components/ui/primitives.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

export default function GeneralSignup() {
    const { startKakaoLogin } = useAuth();
    const [error, setError] = useState('');

    const handleKakao = async () => {
        setError('');
        try {
            await startKakaoLogin();
        } catch {
            setError('카카오 가입을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <Card variant="generalHome">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <ActionLink as={Link} to="/" variant="generalSignup">
                            <img src={logo} alt="" />
                        </ActionLink>
                        <Heading as="h1" variant="page">일반 회원가입</Heading>
                        <p className="text-sm text-muted-foreground">봉사자님, 카카오로 간편하게 시작하세요</p>
                    </div>

                    <div className="px-4 py-3 text-xs font-medium text-sky bg-sky-light border border-sky/20 rounded-xl leading-relaxed">
                        일반 회원은 <strong>카카오 로그인</strong>으로 가입과 로그인이 함께 진행됩니다.
                        별도의 아이디·비밀번호는 필요하지 않습니다.
                    </div>

                    {error && (
                        <Alert variant="generalSignup">
                            {error}
                        </Alert>
                    )}

                    <Button
                        type="button"
                        onClick={handleKakao}
                        variant="kakaoSignup"

                    >
                        카카오로 가입하기
                    </Button>

                    <div className="text-center space-y-2 pt-2">
                        <ActionLink as={Link} to="/signup" variant="generalSignup2">
                            ← 가입 유형 다시 선택
                        </ActionLink>
                        <ActionLink as={Link} to="/login" variant="generalSignup3">
                            이미 계정이 있으신가요? 로그인
                        </ActionLink>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
