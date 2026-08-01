import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';

const CheckItem = ({ label, passed }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-[11px] font-bold ${passed ? 'bg-green/5 border-green text-green' : 'bg-background border-border text-muted-foreground/50'}`}>
        <span>{passed ? '✅' : '○'}</span>
        <span>{label}</span>
    </div>
);

export default function RegisterUserModal({ isOpen, onClose, onUserRegistered }) {
    const { apiClient } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('org');
    const [organizationId, setOrganizationId] = useState('');
    const [organizations, setOrganizations] = useState([]);
    const [error, setError] = useState('');

    // 단체 목록은 모달이 열릴 때 직접 읽는다. AdminView의 '단체' 탭 상태에
    // 의존하면 '회원' 탭에서 열었을 때 목록이 비어 있다.
    useEffect(() => {
        if (!isOpen) return;
        apiClient.get('/organizations')
            .then(res => setOrganizations(res.data))
            .catch(() => setError('단체 목록을 불러오지 못했습니다.'));
    }, [isOpen, apiClient]);

    const checks = {
        length: password.length >= 8,
        letter: /[A-Za-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const isAllPassed = Object.values(checks).every(Boolean);

    const handleSubmit = async () => {
        setError('');
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('이름, 아이디, 비밀번호는 필수입니다.');
            return;
        }
        if (!isAllPassed) {
            setError('보안 정책에 맞는 비밀번호를 입력해주세요.');
            return;
        }
        if (role === 'org' && !organizationId) {
            setError('단체 계정은 소속 단체를 선택해야 합니다.');
            return;
        }

        try {
            await apiClient.post('/users', {
                name,
                email,
                password,
                role,
                // 백엔드는 role='admin'이면 이 값을 무시하고 organization_id를 NULL로 저장한다.
                // 다만 UserCreate에서 필수 필드라 값은 보내야 한다.
                organization_id: role === 'org' ? Number(organizationId) : 0
            });
            setName('');
            setEmail('');
            setPassword('');
            setRole('org');
            setOrganizationId('');
            onUserRegistered();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '등록에 실패했습니다.');
        }
    };
    
    const footer = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground hidden sm:flex">
                <span className="text-lg">📩</span> 이메일로 계정 정보 발송
            </div>
            <div className="flex items-center gap-2">
                <button 
                    className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
                    onClick={onClose}
                >
                    취소
                </button>
                <button 
                    className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:grayscale" 
                    onClick={handleSubmit}
                    disabled={!isAllPassed || !name || !email || (role === 'org' && !organizationId)}
                >
                    등록하기
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="👤 회원 등록" footer={footer}>
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-sky bg-sky-light border border-sky/20 rounded-xl">
                    <span className="text-lg">🔒</span>
                    등록 후 해당 이메일로 <strong>아이디와 임시 비밀번호</strong>가 발송됩니다.
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">이름</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="홍길동" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">아이디 (이메일)</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="member@org.kr" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">권한</label>
                        <select
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                            value={role}
                            onChange={e => setRole(e.target.value)}
                        >
                            <option value="org">단체 담당자</option>
                            <option value="admin">관리자</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground ml-1">
                            일반 봉사자 계정은 카카오 로그인으로만 만들어집니다.
                        </p>
                    </div>

                    {role === 'org' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">소속 단체</label>
                            <select
                                className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                value={organizationId}
                                onChange={e => setOrganizationId(e.target.value)}
                            >
                                <option value="">단체를 선택하세요</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">임시 비밀번호</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="text" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="초기 비밀번호를 입력하세요" 
                        />
                    </div>

                    <div className="p-4 rounded-xl border-2 border-border bg-muted/30 space-y-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">보안 정책 (관리자 권장)</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <CheckItem label="8자 이상" passed={checks.length} />
                            <CheckItem label="영문 포함" passed={checks.letter} />
                            <CheckItem label="숫자 포함" passed={checks.number} />
                            <CheckItem label="특수문자 포함" passed={checks.special} />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
