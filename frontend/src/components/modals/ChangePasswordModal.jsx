import { useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';

const CheckItem = ({ label, passed }) => (
    <div style={{ fontSize: '12px', color: passed ? 'var(--green)' : 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {passed ? '✅' : '○'} {label}
    </div>
);

export default function ChangePasswordModal({ isOpen, onClose }) {
    const { apiClient } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Derived state: 렌더링 시점에 직접 계산 (useEffect 필요 없음)
    const checks = {
        length: newPassword.length >= 8,
        letter: /[A-Za-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    };

    const isAllPassed = Object.values(checks).every(Boolean);

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        
        if (!isAllPassed) {
            setError('비밀번호 정책을 모두 만족해야 합니다.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            await apiClient.put('/users/me/password', {
                old_password: oldPassword,
                new_password: newPassword
            });
            setSuccess('비밀번호가 성공적으로 변경되었습니다.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
                setSuccess('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || '비밀번호 변경에 실패했습니다.');
        }
    };

    const footer = (
        <div className="flex items-center justify-end w-full gap-2">
            <button 
                className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
                onClick={onClose}
            >
                취소
            </button>
            <button 
                className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:grayscale" 
                onClick={handleSubmit} 
                disabled={!isAllPassed || !oldPassword || !confirmPassword}
            >
                변경하기
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🔑 비밀번호 변경" footer={footer}>
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">현재 비밀번호</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="password" 
                            value={oldPassword} 
                            onChange={(e) => setOldPassword(e.target.value)} 
                            placeholder="현재 비밀번호를 입력하세요" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">새 비밀번호</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder="새 비밀번호를 입력하세요" 
                        />
                    </div>
                    
                    <div className="p-4 rounded-xl border-2 border-border bg-muted/30 space-y-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">보안 정책 (필수 요구사항)</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <CheckItem label="8자 이상" passed={checks.length} />
                            <CheckItem label="영문 포함" passed={checks.letter} />
                            <CheckItem label="숫자 포함" passed={checks.number} />
                            <CheckItem label="특수문자 포함" passed={checks.special} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">새 비밀번호 확인</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            placeholder="새 비밀번호를 한 번 더 입력하세요" 
                        />
                    </div>
                </div>
                
                {error && (
                    <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in shake duration-300">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="px-3 py-2 text-xs font-bold text-green bg-green-foreground border border-green/20 rounded-lg animate-in fade-in duration-500">
                        {success}
                    </div>
                )}
            </div>
        </Modal>
    );
}
