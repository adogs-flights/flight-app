import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import SelectField from '../ui/SelectField';

export default function TicketFormModal({ isOpen, onClose, ticket, onTicketSaved }) {
    const { apiClient, user, airlines, airports, fetchStaticData } = useAuth();
    
    const [title, setTitle] = useState('');
    const [arrivalAirport, setArrivalAirport] = useState('JFK');
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [arrivalTime, setArrivalTime] = useState('');
    const [flightInfo, setFlightInfo] = useState('');
    const [airline, setAirline] = useState('');
    const [capacity, setCapacity] = useState(1);
    const [cabinCapacity, setCabinCapacity] = useState(0);
    const [cargoCapacity, setCargoCapacity] = useState(0);
    const [status, setStatus] = useState('owned');
    const [memo, setMemo] = useState('');
    const [error, setError] = useState('');

    const isEditing = ticket != null;

    useEffect(() => {
        if (isOpen) {
            fetchStaticData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isEditing) {
            setTitle(ticket.title || '');
            setArrivalAirport(ticket.arrival_airport || 'JFK');
            setDepartureDate(ticket.departure_date?.split('T')[0] || '');
            setReturnDate(ticket.return_date?.split('T')[0] || '');
            setDepartureTime(ticket.departure_time || '');
            setArrivalTime(ticket.arrival_time || '');
            setFlightInfo(ticket.flight_info || '');
            setAirline(ticket.airline || '');
            setCapacity(ticket.capacity || 1);
            setCabinCapacity(ticket.cabin_capacity || 0);
            setCargoCapacity(ticket.cargo_capacity || 0);
            setStatus(ticket.status || 'owned');
            setMemo(ticket.memo || '');
        } else {
            setTitle('');
            setArrivalAirport('JFK');
            setDepartureDate('');
            setReturnDate('');
            setDepartureTime('');
            setArrivalTime('');
            setFlightInfo('');
            setAirline('');
            setCapacity(1);
            setCabinCapacity(0);
            setCargoCapacity(0);
            setStatus('owned');
            setMemo('');
        }
    }, [ticket, isEditing, isOpen]);

    const handleSubmit = async () => {
        setError('');
        if (!title.trim() || !departureDate || !returnDate || !arrivalAirport) {
            setError('제목, 도착 공항, 출발일, 귀국일은 필수입니다.');
            return;
        }

        const ticketData = {
            title, 
            arrival_airport: arrivalAirport, 
            departure_date: departureDate, 
            return_date: returnDate,
            departure_time: departureTime,
            arrival_time: arrivalTime,
            flight_info: flightInfo, 
            airline,
            capacity,
            cabin_capacity: cabinCapacity,
            cargo_capacity: cargoCapacity,
            status, 
            memo,
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
                <div className="form-group full">
                    <label className="form-label">티켓 제목</label>
                    <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 4월 뉴욕행 티켓 나눔합니다" />
                </div>
                
                <div className="form-group">
                    <label className="form-label">출발일</label>
                    <input className="form-input" type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">출발 시간</label>
                    <input className="form-input" type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
                </div>

                <div className="form-group">
                    <label className="form-label">귀국일</label>
                    <input className="form-input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">도착 시간</label>
                    <input className="form-input" type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
                </div>

                <SelectField 
                    label="도착 공항"
                    options={airports}
                    value={arrivalAirport}
                    onChange={setArrivalAirport}
                    placeholder="공항 선택 또는 직접 입력"
                />

                <SelectField 
                    label="항공사"
                    options={airlines}
                    value={airline}
                    onChange={setAirline}
                    placeholder="항공사 선택 또는 직접 입력"
                />

                <div className="form-group full">
                    <label className="form-label">항공편 정보</label>
                    <input className="form-input" value={flightInfo} onChange={e => setFlightInfo(e.target.value)} placeholder="예: ICN → JFK KE081" />
                </div>

                <div className="form-group">
                    <label className="form-label">기내 여유 (마리)</label>
                    <input className="form-input" type="number" min="0" value={cabinCapacity} onChange={e => setCabinCapacity(parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                    <label className="form-label">수하물 여유 (마리)</label>
                    <input className="form-input" type="number" min="0" value={cargoCapacity} onChange={e => setCargoCapacity(parseInt(e.target.value) || 0)} />
                </div>

                <div className="form-group full">
                    <label className="form-label">티켓 상태</label>
                    <div className="radio-group">
                        <label className={`radio-label ${status === 'owned' ? 'checked' : ''}`} onClick={() => setStatus('owned')}>
                            <input type="radio" name="t-status" value="owned" />🔒 소유중
                        </label>
                        <label className={`radio-label ${status === 'sharing' ? 'checked' : ''}`} onClick={() => setStatus('sharing')}>
                            <input type="radio" name="t-status" value="sharing" />🎁 나눔중
                        </label>
                    </div>
                </div>

                <div className="form-group full">
                    <label className="form-label">메모</label>
                    <textarea className="form-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="추가 정보(좌석 등급, 경유 여부 등)..."></textarea>
                </div>

                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
