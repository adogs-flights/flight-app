import { useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterUserModal({ isOpen, onClose, onUserRegistered }) {
    const { apiClient } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('이름, 아이디, 비밀번호는 필수입니다.');
            return;
        }

        try {
            await apiClient.post('/users', { name, email, password });
            onUserRegistered();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '등록에 실패했습니다.');
        }
    };
    
    const footer = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-mute)' }}>📩 등록 즉시 이메일로 계정 정보 발송</span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={onClose}>취소</button>
                <button className="btn btn-primary" onClick={handleSubmit}>등록하기</button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="👤 회원 등록" footer={footer}>
            <div className="info-box blue">🔒 계정은 관리자만 직접 생성할 수 있습니다. 등록 후 해당 이메일로 <strong>아이디와 임시 비밀번호</strong>가 발송됩니다.</div>
            <div className="form-grid">
                <div className="form-group full"><label className="form-label">이름</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" /></div>
                <div className="form-group full"><label className="form-label">아이디 (이메일)</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@org.kr" /></div>
                <div className="form-group full"><label className="form-label">임시 비밀번호</label><input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="초기 비밀번호" /></div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
