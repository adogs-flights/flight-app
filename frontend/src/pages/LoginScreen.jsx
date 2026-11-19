import { ActionLink, Alert, Button, Card, FieldLabel, Heading, Input } from '../components/ui/primitives.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, startKakaoLogin } = useAuth();

    const handleKakaoLogin = async () => {
        setError('');
        try {
            await startKakaoLogin();
        } catch {
            setError('카카오 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            // 승인 대기(403) 등 서버가 준 안내 문구가 있으면 그대로 보여준다.
            const detail = err.response?.data?.detail;
            setError(
                err.response?.status === 403 && detail
                    ? detail
                    : '이메일 또는 비밀번호가 올바르지 않습니다.'
            );
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <Card variant="generalHome">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <ActionLink as={Link} to="/" variant="loginScreen">
                            <img src={logo} alt="" />
                        </ActionLink>
                        <Heading as="h1" variant="page">해봉티켓</Heading>
                        <p className="text-sm text-muted-foreground">해외이동봉사 일정 관리 플랫폼</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <FieldLabel variant="default">아이디 (이메일)</FieldLabel>
                            <Input
                                variant="login"
                                type="email" 
                                placeholder="name@example.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel variant="default">비밀번호</FieldLabel>
                            <Input
                                variant="login"
                                type="password" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <Alert variant="guestTicketSubmit3">
                                {error}
                            </Alert>
                        )}
                        <Button
                            type="submit" 
                            variant="submit"
                        >
                            로그인
                        </Button>
                    </form>

                    <div>
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">또는</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <Button
                            type="button"
                            onClick={handleKakaoLogin}
                            variant="kakaoLogin"

                        >
                            카카오로 시작하기
                        </Button>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            이동봉사를 신청하신 분은 카카오로 로그인해 진행 상황을 확인하세요
                        </p>
                    </div>

                    <div className="text-center space-y-3 pt-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            계정이 없으신가요?{' '}
                            <ActionLink as={Link} to="/signup" variant="loginScreen2">회원가입</ActionLink>
                        </p>
                        <ActionLink as={Link} to="/apply" variant="generalHome">
                            🎁 봉사 티켓을 제출하고 싶으신가요? →
                        </ActionLink>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
