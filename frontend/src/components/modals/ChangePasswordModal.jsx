import { useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose }) {
    const { apiClient } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        if (newPassword.length < 4) {
            setError('새 비밀번호는 4자 이상이어야 합니다.');
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
            <button className="btn btn-primary" onClick={handleSubmit}>변경하기</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🔑 비밀번호 변경" footer={footer}>
            <div className="form-grid">
                <div className="form-group full">
                    <label className="form-label">현재 비밀번호</label>
                    <input className="form-input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div className="form-group full">
                    <label className="form-label">새 비밀번호</label>
                    <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group full">
                    <label className="form-label">새 비밀번호 확인</label>
                    <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
                {success && <div className="form-group full"><div className="info-box green" style={{display: 'block'}}>{success}</div></div>}
            </div>
        </Modal>
    );
}
