import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

const inputClass = "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none";
const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1";

export default function OrgSignup() {
    const { registerOrg } = useAuth();
    const [organizationName, setOrganizationName] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const checks = {
        length: password.length >= 8,
        letter: /[A-Za-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const isAllPassed = Object.values(checks).every(Boolean);
    const canSubmit = organizationName.trim() && name.trim() && email.trim() && password && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!canSubmit) {
            setError('모든 항목을 입력해주세요.');
            return;
        }
        if (!isAllPassed) {
            setError('비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 합니다.');
            return;
        }
        setSubmitting(true);
        try {
            await registerOrg({
                organization_name: organizationName.trim(),
                name: name.trim(),
                email: email.trim(),
                password
            });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.detail || '가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[440px] p-8 space-y-6 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <Link to="/" className="flex items-center justify-center w-14 h-14 rounded-2xl mb-2">
                            <img src={logo} alt="" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">단체 회원가입</h1>
                        <p className="text-sm text-muted-foreground">구조 단체 담당자 계정을 신청합니다</p>
                    </div>

                    {done ? (
                        <div className="space-y-6 text-center animate-in fade-in duration-300">
                            <div className="text-5xl">📨</div>
                            <div className="space-y-2">
                                <h2 className="text-lg font-bold text-foreground">가입 신청이 접수되었습니다</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    <strong>{organizationName.trim()}</strong> 단체로 가입 신청이 완료되었습니다.<br />
                                    관리자 승인 후 로그인할 수 있습니다.
                                </p>
                            </div>
                            <div className="px-4 py-3 text-xs font-medium text-sky bg-sky-light border border-sky/20 rounded-xl">
                                승인이 완료되면 등록하신 이메일로 안내될 예정입니다.
                            </div>
                            <Link to="/login" className="inline-block text-xs font-bold text-primary hover:underline">
                                로그인 화면으로 →
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className={labelClass}>단체명</label>
                                <input className={inputClass} value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="예) 사단법인 어독스" />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClass}>담당자 이름</label>
                                <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClass}>아이디 (이메일)</label>
                                <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@org.kr" />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClass}>비밀번호</label>
                                <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상, 영문·숫자·특수문자 포함" />
                            </div>

                            <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg leading-relaxed">
                                🔒 단체 계정은 봉사 신청자의 개인정보(전화번호 등)에 접근하므로,
                                가입 후 <strong>관리자 승인</strong>을 거쳐야 이용할 수 있습니다.
                            </div>

                            {error && (
                                <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                            >
                                {submitting ? '신청 중…' : '가입 신청하기'}
                            </button>

                            <div className="text-center space-y-2 pt-1">
                                <Link to="/signup" className="block text-xs font-bold text-primary hover:underline">
                                    ← 가입 유형 다시 선택
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
