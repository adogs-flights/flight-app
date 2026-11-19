import { Alert, Button, FieldLabel, Input, Textarea } from '../ui/primitives.js';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';

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
        <div className="flex items-center justify-end w-full gap-2">
            <Button
                variant="secondary"
                onClick={onClose}
            >
                취소
            </Button>
            <Button
                variant="apply"
                onClick={handleSubmit}
            >
                🎁 신청하기
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🎁 나눔 신청하기" footer={footer}>
            <div className="space-y-6">
                {ticket && (
                    <div className="p-4 rounded-xl border-2 border-green/20 bg-green/5 space-y-1 animate-in fade-in duration-500">
                        <div className="text-sm font-bold text-green">🎁 {ticket.title}</div>
                        <div className="text-[11px] font-medium text-green/70">
                            {ticket.arrival_airport} · {ticket.departure_date?.split('T')[0]}
                        </div>
                    </div>
                )}
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">신청 메시지</FieldLabel>
                        <Textarea
                            variant="application"
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            placeholder="소속 단체, 봉사 목적 등을 간단히 적어주세요..."
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">연락처</FieldLabel>
                        <Input
                            variant="success"
                            value={contact} 
                            onChange={e => setContact(e.target.value)} 
                            placeholder="연락받을 이메일 또는 전화번호" 
                        />
                    </div>
                </div>

                {error && (
                    <Alert variant="generalSignup">
                        {error}
                    </Alert>
                )}
            </div>
        </Modal>
    );
}
