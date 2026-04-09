import { useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';

const CheckItem = ({ label, passed }) => (
    <div style={{ fontSize: '11px', color: passed ? 'var(--green)' : 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {passed ? '✅' : '○'} {label}
    </div>
);

export default function RegisterUserModal({ isOpen, onClose, onUserRegistered }) {
    const { apiClient } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Derived state: 렌더링 시점에 직접 계산
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

        try {
            await apiClient.post('/users', { name, email, password });
            setName('');
            setEmail('');
            setPassword('');
            onUserRegistered();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '등록에 실패했습니다.');
        }
    };
    
    const footer = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-mute)' }} className="hide-mobile">📩 이메일로 계정 정보 발송</span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={onClose}>취소</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={!isAllPassed || !name || !email}>등록하기</button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="👤 회원 등록" footer={footer}>
            <div className="info-box blue">🔒 등록 후 해당 이메일로 <strong>아이디와 임시 비밀번호</strong>가 발송됩니다.</div>
            <div className="form-grid">
                <div className="form-group full"><label className="form-label">이름</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" /></div>
                <div className="form-group full"><label className="form-label">아이디 (이메일)</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@org.kr" /></div>
                
                <div className="form-group full" style={{ marginBottom: '4px' }}>
                    <label className="form-label">임시 비밀번호</label>
                    <input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="초기 비밀번호를 입력하세요" />
                </div>

                <div className="form-group full" style={{ padding: '8px 12px', background: 'var(--paper-warm)', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '4px' }}>보안 정책 (관리자 권장)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <CheckItem label="8자 이상" passed={checks.length} />
                        <CheckItem label="영문 포함" passed={checks.letter} />
                        <CheckItem label="숫자 포함" passed={checks.number} />
                        <CheckItem label="특수문자 포함" passed={checks.special} />
                    </div>
                </div>

                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
