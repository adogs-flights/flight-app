import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const airportOptions = [
    { value: "JFK", label: "🗽 뉴욕 JFK" },
    { value: "EWR", label: "✈️ 뉴왁 EWR" },
    { value: "LAX", label: "🌴 엘에이 LAX" },
    { value: "YVR", label: "🍁 밴쿠버 YVR" },
    { value: "YYZ", label: "🏙️ 토론토 YYZ" },
];

export default function TicketFormModal({ isOpen, onClose, ticket, onTicketSaved }) {
    const { apiClient, user } = useAuth();
    const [title, setTitle] = useState('');
    const [country, setCountry] = useState('JFK'); // In schema, this is 'country', but form says 'airport'
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [flightInfo, setFlightInfo] = useState('');
    const [status, setStatus] = useState('owned');
    const [memo, setMemo] = useState('');
    const [error, setError] = useState('');

    const isEditing = ticket != null;

    useEffect(() => {
        if (isEditing) {
            setTitle(ticket.title);
            setCountry(ticket.country);
            setDepartureDate(ticket.departure_date?.split('T')[0] || '');
            setReturnDate(ticket.return_date?.split('T')[0] || '');
            setFlightInfo(ticket.flight_info || '');
            setStatus(ticket.status);
            setMemo(ticket.memo || '');
        } else {
            setTitle('');
            setCountry('JFK');
            setDepartureDate('');
            setReturnDate('');
            setFlightInfo('');
            setStatus('owned');
            setMemo('');
        }
    }, [ticket, isEditing, isOpen]);

    const handleSubmit = async () => {
        setError('');
        if (!title.trim() || !departureDate || !returnDate) {
            setError('제목, 출발일, 귀국일은 필수입니다.');
            return;
        }

        const ticketData = {
            title, country, departure_date: departureDate, return_date: returnDate,
            flight_info: flightInfo, status, memo,
            // These are required by schema but should be handled by user
            manager_name: user.name, 
            contact: user.email,
        };

        try {
            if (isEditing) {
                await apiClient.put(`/tickets/${ticket.id}`, ticketData);
            } else {
                await apiClient.post('/tickets', ticketData);
            }
            onTicketSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        }
    };

    const footer = (
        <>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? '수정하기' : '등록하기'}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 티켓 수정' : '✈️ 티켓 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group full"><label className="form-label">티켓 제목</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">출발일</label><input className="form-input" type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">귀국일</label><input className="form-input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">도착 공항</label>
                    <select className="form-input" value={country} onChange={e => setCountry(e.target.value)}>
                        {airportOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="form-group"><label className="form-label">항공편</label><input className="form-input" value={flightInfo} onChange={e => setFlightInfo(e.target.value)} placeholder="예: ICN → JFK KE081" /></div>
                <div className="form-group full"><label className="form-label">티켓 상태</label>
                    <div className="radio-group">
                        <label className={`radio-label ${status === 'owned' ? 'checked' : ''}`} onClick={() => setStatus('owned')}><input type="radio" name="t-status" value="owned" />🔒 소유중</label>
                        <label className={`radio-label ${status === 'sharing' ? 'checked' : ''}`} onClick={() => setStatus('sharing')}><input type="radio" name="t-status" value="sharing" />🎁 나눔중</label>
                    </div>
                </div>
                <div className="form-group full"><label className="form-label">메모</label><textarea className="form-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="추가 정보..."></textarea></div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
