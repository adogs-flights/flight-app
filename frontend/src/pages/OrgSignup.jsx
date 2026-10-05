import { ActionLink, Alert, Button, Card, FieldLabel, Heading, Input } from '../components/ui/primitives.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';




export default function OrgSignup() {
    const { registerOrg } = useAuth();
    const [organizationName, setOrganizationName] = useState('');
    const [slug, setSlug] = useState('');
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
    const canSubmit = organizationName.trim() && slug.trim() && name.trim() && email.trim() && password && !submitting;

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
        if (!/^[a-z0-9-]+$/.test(slug)) {
            setError('링크 주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
            return;
        }
        setSubmitting(true);
        try {
            await registerOrg({
                organization_name: organizationName.trim(),
                slug,
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
                <Card variant="orgSignup">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <ActionLink as={Link} to="/" variant="generalSignup">
                            <img src={logo} alt="" />
                        </ActionLink>
                        <Heading as="h1" variant="page">단체 회원가입</Heading>
                        <p className="text-sm text-muted-foreground">구조 단체 담당자 계정을 신청합니다</p>
                    </div>

                    {done ? (
                        <div className="space-y-6 text-center animate-in fade-in duration-300">
                            <div className="text-5xl">📨</div>
                            <div className="space-y-2">
                                <Heading as="h2" variant="adminUi">가입 신청이 접수되었습니다</Heading>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    <strong>{organizationName.trim()}</strong> 단체로 가입 신청이 완료되었습니다.<br />
                                    관리자 승인 후 로그인할 수 있습니다.
                                </p>
                            </div>
                            <div className="px-4 py-3 text-xs font-medium text-sky bg-sky-light border border-sky/20 rounded-xl">
                                승인이 완료되면 등록하신 이메일로 안내될 예정입니다.
                            </div>
                            <ActionLink as={Link} to="/login" variant="generalHome">
                                로그인 화면으로 →
                            </ActionLink>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <FieldLabel variant="default">단체명</FieldLabel>
                                <Input variant="flex" value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="예) 사단법인 어독스" />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">공개 링크 주소</FieldLabel>
                                <Input
                                    variant="flex"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="예) adogs"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <p className="text-[11px] text-muted-foreground ml-1">
                                    소개 페이지·봉사 제출 링크에 쓰입니다: <span className="font-bold text-foreground">/org/{slug || '주소'}</span>
                                    <br />영문 소문자·숫자·하이픈(-)만 사용 가능합니다.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">담당자 이름</FieldLabel>
                                <Input variant="flex" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">아이디 (이메일)</FieldLabel>
                                <Input variant="flex" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@org.kr" />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">비밀번호</FieldLabel>
                                <Input variant="flex" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상, 영문·숫자·특수문자 포함" />
                            </div>

                            <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg leading-relaxed">
                                🔒 단체 계정은 봉사 신청자의 개인정보(전화번호 등)에 접근하므로,
                                가입 후 <strong>관리자 승인</strong>을 거쳐야 이용할 수 있습니다.
                            </div>

                            {error && (
                                <Alert variant="generalSignup">
                                    {error}
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                variant="signup"
                            >
                                {submitting ? '신청 중…' : '가입 신청하기'}
                            </Button>

                            <div className="text-center space-y-2 pt-1">
                                <ActionLink as={Link} to="/signup" variant="generalSignup2">
                                    ← 가입 유형 다시 선택
                                </ActionLink>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
            <Footer />
        </div>
    );
}
