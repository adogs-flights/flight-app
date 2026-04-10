import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import SelectField from '../ui/SelectField';

export default function TicketFormModal({ isOpen, onClose, ticket, onTicketSaved }) {
    const { apiClient, user, airlines, airports, fetchStaticData } = useAuth();
    
    const [form, setForm] = useState({
        title: '',
        arrivalAirport: '',
        departureDate: '',
        returnDate: '',
        departureTime: '',
        arrivalTime: '',
        flightInfo: '',
        airline: '',
        capacity: 1,
        cabinCapacity: 0,
        cargoCapacity: 0,
        status: 'owned',
        memo: ''
    });
    const [error, setError] = useState('');

    const isEditing = ticket != null;

    useEffect(() => {
        if (isEditing) {
            setForm({
                title: ticket.title || '',
                arrivalAirport: ticket.arrival_airport || '',
                departureDate: ticket.departure_date?.split('T')[0] || '',
                returnDate: ticket.return_date?.split('T')[0] || '',
                departureTime: ticket.departure_time || '',
                arrivalTime: ticket.arrival_time || '',
                flightInfo: ticket.flight_info || '',
                airline: ticket.airline || '',
                capacity: ticket.capacity || 1,
                cabinCapacity: ticket.cabin_capacity || 0,
                cargoCapacity: ticket.cargo_capacity || 0,
                status: ticket.status || 'owned',
                memo: ticket.memo || ''
            });
        } else {
            setForm({
                title: '',
                arrivalAirport: '',
                departureDate: '',
                returnDate: '',
                departureTime: '',
                arrivalTime: '',
                flightInfo: '',
                airline: '',
                capacity: 1,
                cabinCapacity: 0,
                cargoCapacity: 0,
                status: 'owned',
                memo: ''
            });
        }
    }, [ticket, isEditing, isOpen]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.departureDate || !form.returnDate || !form.arrivalAirport) {
            setError('도착 공항, 출발일, 귀국일은 필수입니다.');
            return;
        }

        let finalTitle = form.title.trim();
        if (!finalTitle) {
            if (form.cabinCapacity > 0 && form.cargoCapacity > 0) {
                finalTitle = `기내 ${form.cabinCapacity}석 / 수화물 ${form.cargoCapacity}석`;
            } else if (form.cargoCapacity > 0) {
                finalTitle = `수화물 ${form.cargoCapacity}석`;
            } else if (form.cabinCapacity > 0) {
                finalTitle = `기내 ${form.cabinCapacity}석`;
            } else {
                finalTitle = "티켓 나눔 (상세 확인)";
            }
        }

        const ticketData = {
            title: finalTitle, 
            arrival_airport: form.arrivalAirport, 
            departure_date: form.departureDate, 
            return_date: form.returnDate,
            departure_time: form.departureTime,
            arrival_time: form.arrivalTime,
            flight_info: form.flightInfo, 
            airline: form.airline,
            capacity: form.capacity,
            cabin_capacity: form.cabinCapacity,
            cargo_capacity: form.cargoCapacity,
            status: form.status, 
            memo: form.memo,
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
            <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? '수정하기' : '등록하기'}</button>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 티켓 수정' : '✈️ 티켓 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group full">
                    <label className="form-label">티켓 제목 (미입력 시 자동 생성)</label>
                    <input className="form-input" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="예: 4월 뉴욕행 티켓 나눔합니다" />
                </div>
                
                <div className="form-group">
                    <label className="form-label">출발일</label>
                    <input className="form-input" type="date" value={form.departureDate} onChange={e => {
                        const newDate = e.target.value;
                        handleChange('departureDate', newDate);
                        if (!form.returnDate || form.returnDate < newDate) {
                            handleChange('returnDate', newDate);
                        }
                    }} />
                </div>
                <div className="form-group">
                    <label className="form-label">출발 시간</label>
                    <input className="form-input" type="time" value={form.departureTime} onChange={e => handleChange('departureTime', e.target.value)} />
                </div>

                <div className="form-group">
                    <label className="form-label">귀국일</label>
                    <input className="form-input" type="date" value={form.returnDate} onChange={e => handleChange('returnDate', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">도착 시간</label>
                    <input className="form-input" type="time" value={form.arrivalTime} onChange={e => handleChange('arrivalTime', e.target.value)} />
                </div>

                <SelectField 
                    label="도착 공항"
                    options={airports}
                    value={form.arrivalAirport}
                    onChange={val => handleChange('arrivalAirport', val)}
                    placeholder="공항 선택 또는 직접 입력"
                />

                <SelectField 
                    label="항공사"
                    options={airlines}
                    value={form.airline}
                    onChange={val => handleChange('airline', val)}
                    placeholder="항공사 선택 또는 직접 입력"
                />

                <div className="form-group full">
                    <label className="form-label">항공편 정보</label>
                    <input className="form-input" value={form.flightInfo} onChange={e => handleChange('flightInfo', e.target.value)} placeholder="예: ICN → JFK KE081" />
                </div>

                <div className="form-group">
                    <label className="form-label">기내 여유 (마리)</label>
                    <input className="form-input" type="number" min="0" value={form.cabinCapacity} onChange={e => handleChange('cabinCapacity', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                    <label className="form-label">수하물 여유 (마리)</label>
                    <input className="form-input" type="number" min="0" value={form.cargoCapacity} onChange={e => handleChange('cargoCapacity', parseInt(e.target.value) || 0)} />
                </div>

                <div className="form-group full">
                    <label className="form-label">티켓 상태</label>
                    <div className="radio-group">
                        <label className={`radio-label ${form.status === 'owned' ? 'checked' : ''}`} onClick={() => handleChange('status', 'owned')}>
                            <input type="radio" name="t-status" value="owned" readOnly checked={form.status === 'owned'} />🔒 소유중
                        </label>
                        <label className={`radio-label ${form.status === 'sharing' ? 'checked' : ''}`} onClick={() => handleChange('status', 'sharing')}>
                            <input type="radio" name="t-status" value="sharing" readOnly checked={form.status === 'sharing'} />🎁 나눔중
                        </label>
                    </div>
                </div>

                <div className="form-group full">
                    <label className="form-label">메모</label>
                    <textarea className="form-input" value={form.memo} onChange={e => handleChange('memo', e.target.value)} placeholder="추가 정보(좌석 등급, 경유 여부 등)..."></textarea>
                </div>

                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
