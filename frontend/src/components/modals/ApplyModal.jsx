import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function ApplyModal({ isOpen, onClose, ticket, onApplicationSaved }) {
    const { apiClient, user } = useAuth();
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setContact(user.email);
        }
    }, [user, isOpen]);

    const handleSubmit = async () => {
        setError('');
        if (!message.trim()) {
            setError('신청 메시지를 입력해주세요.');
            return;
        }

        try {
            await apiClient.post(`/tickets/${ticket.id}/applications`, {
                message,
                contact,
                ticket_id: ticket.id // schema requires this
            });
            onApplicationSaved();
            onClose();
            alert('나눔 신청이 완료되었습니다!'); // Simple feedback
        } catch (err) {
            setError(err.response?.data?.detail || '신청에 실패했습니다.');
        }
    };

    const footer = (
        <>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-green" onClick={handleSubmit}>🎁 신청하기</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🎁 나눔 신청하기" footer={footer}>
            {ticket && (
                <div className="info-box green">
                    🎁 <strong>{ticket.title}</strong>
                    <br />
                    {ticket.country} · {ticket.departure_date?.split('T')[0]} ~ {ticket.return_date?.split('T')[0]}
                </div>
            )}
            <div className="form-grid">
                <div className="form-group full">
                    <label className="form-label">신청 메시지</label>
                    <textarea className="form-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="소속 단체, 봉사 목적 등을 간단히 적어주세요..."></textarea>
                </div>
                <div className="form-group full">
                    <label className="form-label">연락처</label>
                    <input className="form-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="연락받을 이메일 또는 전화번호" />
                </div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
