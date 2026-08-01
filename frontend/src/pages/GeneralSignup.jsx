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
                <div className="w-full max-w-[400px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <Link to="/" className="flex items-center justify-center w-14 h-14 rounded-2xl mb-2">
                            <img src={logo} alt="" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">일반 회원가입</h1>
                        <p className="text-sm text-muted-foreground">봉사자님, 카카오로 간편하게 시작하세요</p>
                    </div>

                    <div className="px-4 py-3 text-xs font-medium text-sky bg-sky-light border border-sky/20 rounded-xl leading-relaxed">
                        일반 회원은 <strong>카카오 로그인</strong>으로 가입과 로그인이 함께 진행됩니다.
                        별도의 아이디·비밀번호는 필요하지 않습니다.
                    </div>

                    {error && (
                        <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleKakao}
                        className="w-full inline-flex items-center justify-center h-12 px-4 py-2 text-sm font-bold transition-all rounded-lg shadow-sm hover:scale-[0.99] active:scale-[0.97]"
                        style={{ backgroundColor: '#FEE500', color: '#191600' }}
                    >
                        카카오로 가입하기
                    </button>

                    <div className="text-center space-y-2 pt-2">
                        <Link to="/signup" className="block text-xs font-bold text-primary hover:underline">
                            ← 가입 유형 다시 선택
                        </Link>
                        <Link to="/login" className="block text-xs text-muted-foreground hover:underline">
                            이미 계정이 있으신가요? 로그인
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
