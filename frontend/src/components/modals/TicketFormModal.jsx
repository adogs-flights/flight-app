import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import SelectField from '../ui/SelectField';

export default function TicketFormModal({ isOpen, onClose, ticket, onTicketSaved }) {
    const { apiClient, user, airlines, airports } = useAuth();
    
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
        <div className="flex items-center justify-end w-full gap-2">
            <button 
                className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
                onClick={onClose}
            >
                취소
            </button>
            <button 
                className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                onClick={handleSubmit}
            >
                {isEditing ? '수정하기' : '등록하기'}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 티켓 수정' : '✈️ 티켓 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">티켓 제목 (미입력 시 자동 생성)</label>
                    <input 
                        className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.title} 
                        onChange={e => handleChange('title', e.target.value)} 
                        placeholder="예: 4월 뉴욕행 티켓 나눔합니다" 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">출발일</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="date" 
                            value={form.departureDate} 
                            onChange={e => {
                                const newDate = e.target.value;
                                handleChange('departureDate', newDate);
                                if (!form.returnDate || form.returnDate < newDate) {
                                    handleChange('returnDate', newDate);
                                }
                            }} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">출발 시간</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="time" 
                            value={form.departureTime} 
                            onChange={e => handleChange('departureTime', e.target.value)} 
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">귀국일</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="date" 
                            value={form.returnDate} 
                            onChange={e => handleChange('returnDate', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">도착 시간</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="time" 
                            value={form.arrivalTime} 
                            onChange={e => handleChange('arrivalTime', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">항공편 정보</label>
                    <input 
                        className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.flightInfo} 
                        onChange={e => handleChange('flightInfo', e.target.value)} 
                        placeholder="예: ICN → JFK KE081" 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">기내 여유 (마리)</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="number" 
                            min="0" 
                            value={form.cabinCapacity} 
                            onChange={e => handleChange('cabinCapacity', parseInt(e.target.value) || 0)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">수하물 여유 (마리)</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="number" 
                            min="0" 
                            value={form.cargoCapacity} 
                            onChange={e => handleChange('cargoCapacity', parseInt(e.target.value) || 0)} 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">티켓 상태</label>
                    <div className="flex gap-3">
                        <button 
                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${form.status === 'owned' ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                            onClick={() => handleChange('status', 'owned')}
                        >
                            <span>🔒</span> 소유중
                        </button>
                        <button 
                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${form.status === 'sharing' ? 'bg-green/5 border-green text-green' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                            onClick={() => handleChange('status', 'sharing')}
                        >
                            <span>🎁</span> 나눔중
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">메모</label>
                    <textarea 
                        className="flex min-h-[100px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.memo} 
                        onChange={e => handleChange('memo', e.target.value)} 
                        placeholder="추가 정보(좌석 등급, 경유 여부 등)..."
                    />
                </div>

                {error && (
                    <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
