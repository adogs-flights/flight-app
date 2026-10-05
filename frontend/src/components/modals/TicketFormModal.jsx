import { Button, FieldLabel, Input, Textarea } from '../ui/primitives.js';
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
        departureTime: '',
        arrivalDate: '',
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
        if (error) {
            const timer = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (isEditing) {
            setForm({
                title: ticket.title || '',
                arrivalAirport: ticket.arrival_airport || '',
                departureDate: ticket.departure_date?.split('T')[0] || '',
                departureTime: ticket.departure_time || '',
                arrivalDate: ticket.arrival_date?.split('T')[0] || '',
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
                departureTime: '',
                arrivalDate: '',
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
        setForm(prev => {
            const newForm = { ...prev, [field]: value };
            // 출발일이 변경될 때 도착일이 비어있거나 출발일보다 이전이면 도착일을 출발일과 동일하게 설정
            if (field === 'departureDate' && (!prev.arrivalDate || prev.arrivalDate < value)) {
                newForm.arrivalDate = value;
            }
            return newForm;
        });
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.departureDate) {
            setError('출발일을 선택해주세요.');
            return;
        }
        if (!form.arrivalAirport) {
            setError('도착 공항을 선택하거나 입력해주세요.');
            return;
        }
        if (!form.airline) {
            setError('항공사를 선택하거나 입력해주세요.');
            return;
        }

        let finalTitle = form.title.trim();
        if (!finalTitle) {
            if (form.cabinCapacity > 0 && form.cargoCapacity > 0) {
                finalTitle = `기내 ${form.cabinCapacity}석 / 수하물 ${form.cargoCapacity}석`;
            } else if (form.cargoCapacity > 0) {
                finalTitle = `수하물 ${form.cargoCapacity}석`;
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
            departure_time: form.departureTime,
            arrival_date: form.arrivalDate || form.departureDate, 
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
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end w-full gap-2">
            <Button
                variant="formCancel"
                onClick={onClose}
            >
                취소
            </Button>
            <Button
                variant="formSave"
                onClick={handleSubmit}
            >
                {isEditing ? '수정하기' : '등록하기'}
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 티켓 수정' : '✈️ 티켓 등록'} footer={footer} error={error}>
            <div className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                    <FieldLabel variant="default">티켓 제목 (미입력 시 자동 생성)</FieldLabel>
                    <Input
                        variant="default"
                        value={form.title} 
                        onChange={e => handleChange('title', e.target.value)} 
                        placeholder="예: 4월 뉴욕행 티켓 나눔합니다" 
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">
                            출발일<span className="text-destructive ml-0.5">*</span>
                        </FieldLabel>
                        <Input
                            variant="default"
                            type="date" 
                            value={form.departureDate} 
                            onChange={e => handleChange('departureDate', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">출발 시간</FieldLabel>
                        <Input
                            variant="default"
                            type="time" 
                            value={form.departureTime} 
                            onChange={e => handleChange('departureTime', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">
                            도착일<span className="text-destructive ml-0.5">*</span>
                        </FieldLabel>
                        <Input
                            variant="default"
                            type="date" 
                            value={form.arrivalDate} 
                            onChange={e => handleChange('arrivalDate', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">도착 시간</FieldLabel>
                        <Input
                            variant="default"
                            type="time" 
                            value={form.arrivalTime} 
                            onChange={e => handleChange('arrivalTime', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField 
                        label={<>도착 공항<span className="text-destructive ml-0.5">*</span></>}
                        options={airports}
                        value={form.arrivalAirport}
                        onChange={val => handleChange('arrivalAirport', val)}
                        placeholder="공항 선택 또는 직접 입력"
                    />

                    <SelectField 
                        label={<>항공사<span className="text-destructive ml-0.5">*</span></>}
                        options={airlines}
                        value={form.airline}
                        onChange={val => handleChange('airline', val)}
                        placeholder="항공사 선택 또는 직접 입력"
                    />
                </div>

                <div className="space-y-2">
                    <FieldLabel variant="default">항공편 정보</FieldLabel>
                    <Input
                        variant="default"
                        value={form.flightInfo} 
                        onChange={e => handleChange('flightInfo', e.target.value)} 
                        placeholder="예: ICN → JFK KE081" 
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">기내(마리)</FieldLabel>
                        <Input
                            variant="default"
                            type="number" 
                            min="0" 
                            value={form.cabinCapacity === 0 ? '' : form.cabinCapacity} 
                            onChange={e => handleChange('cabinCapacity', e.target.value)} 
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">수하물(마리)</FieldLabel>
                        <Input
                            variant="default"
                            type="number" 
                            min="0" 
                            value={form.cargoCapacity === 0 ? '' : form.cargoCapacity} 
                            onChange={e => handleChange('cargoCapacity', e.target.value)} 
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <FieldLabel variant="default">티켓 상태</FieldLabel>
                    <div className="flex gap-3">
                        <Button
                            variant="ticketForm" active={form.status === 'owned'}
                            onClick={() => handleChange('status', 'owned')}
                        >
                            <span>🔒</span> 소유중
                        </Button>
                        <Button
                            variant="ticketForm2" active={form.status === 'sharing'}
                            onClick={() => handleChange('status', 'sharing')}
                        >
                            <span>🎁</span> 나눔중
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <FieldLabel variant="default">메모</FieldLabel>
                    <Textarea
                        variant="default"
                        value={form.memo} 
                        onChange={e => handleChange('memo', e.target.value)} 
                        placeholder="추가 정보(좌석 등급, 경유 여부 등)..."
                    />
                </div>
            </div>
        </Modal>
    );
}
