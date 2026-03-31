import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose }) {
    const { apiClient } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [checks, setChecks] = useState({
        length: false,
        letter: false,
        number: false,
        special: false
    });

    useEffect(() => {
        setChecks({
            length: newPassword.length >= 8,
            letter: /[A-Za-z]/.test(newPassword),
            number: /[0-9]/.test(newPassword),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
        });
    }, [newPassword]);

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
        <>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!isAllPassed || !oldPassword || !confirmPassword}>변경하기</button>
        </>
    );

    const CheckItem = ({ label, passed }) => (
        <div style={{ fontSize: '12px', color: passed ? 'var(--green)' : 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {passed ? '✅' : '○'} {label}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🔑 비밀번호 변경" footer={footer}>
            <div className="form-grid">
                <div className="form-group full">
                    <label className="form-label">현재 비밀번호</label>
                    <input className="form-input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="현재 비밀번호를 입력하세요" />
                </div>
                <div className="form-group full" style={{ marginBottom: '4px' }}>
                    <label className="form-label">새 비밀번호</label>
                    <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호를 입력하세요" />
                </div>
                
                {/* 비밀번호 정책 안내 가이드 */}
                <div className="form-group full" style={{ padding: '10px', background: 'var(--paper-warm)', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>보안 정책 (필수 요구사항)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <CheckItem label="8자 이상" passed={checks.length} />
                        <CheckItem label="영문 포함" passed={checks.letter} />
                        <CheckItem label="숫자 포함" passed={checks.number} />
                        <CheckItem label="특수문자 포함" passed={checks.special} />
                    </div>
                </div>

                <div className="form-group full">
                    <label className="form-label">새 비밀번호 확인</label>
                    <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="새 비밀번호를 한 번 더 입력하세요" />
                </div>
                
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
                {success && <div className="form-group full"><div className="info-box green" style={{display: 'block'}}>{success}</div></div>}
            </div>
        </Modal>
    );
}
