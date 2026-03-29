import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
        } catch (err) {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-logo-icon">✈️</div>
                <div className="login-logo-text">해봉티켓</div>
                <div className="login-logo-sub">해외이동봉사 일정 관리 플랫폼</div>
                <form className="login-form" onSubmit={handleLogin}>
                    <div>
                        <label className="login-label">아이디 (이메일)</label>
                        <input 
                            className="login-input" 
                            type="email" 
                            placeholder="아이디를 입력하세요" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="login-label">비밀번호</label>
                        <input 
                            className="login-input" 
                            type="password" 
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}
                    <button type="submit" className="login-btn">로그인</button>
                </form>
                <p className="login-notice">계정이 없으신가요? 관리자에게 문의하세요.<br />계정은 관리자만 발급할 수 있습니다.</p>
            </div>
        </div>
    );
}
