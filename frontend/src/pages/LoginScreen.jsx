import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch {
            setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="w-full max-w-[400px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-background text-primary-foreground text-2xl font-bold mb-2">
                        <img src={logo} alt="" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">해봉티켓</h1>
                    <p className="text-sm text-muted-foreground">해외이동봉사 일정 관리 플랫폼</p>
                </div>

                <form className="space-y-4" onSubmit={handleLogin}>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">아이디 (이메일)</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50" 
                            type="email" 
                            placeholder="name@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">비밀번호</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50" 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && (
                        <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in shake duration-300">
                            {error}
                        </div>
                    )}
                    <button 
                        type="submit" 
                        className="w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97]"
                    >
                        로그인
                    </button>
                </form>

                <div className="text-center space-y-1 pt-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        계정이 없으신가요? 관리자에게 문의하세요.<br />
                        <span className="font-medium">계정은 관리자만 발급할 수 있습니다.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
