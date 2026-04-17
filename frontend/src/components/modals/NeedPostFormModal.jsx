import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import SelectField from '../ui/SelectField';

export default function NeedPostFormModal({ isOpen, onClose, post, onPostSaved }) {
    const { apiClient, airports } = useAuth();
    const [form, setForm] = useState({
        title: '',
        airportCode: 'JFK',
        seatsNeeded: 1,
        desiredDate: '',
        contact: '',
        detail: '',
        isUrgent: false
    });
    const [error, setError] = useState('');

    const isEditing = post != null;

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (isEditing) {
            setForm({
                title: post.title || '',
                airportCode: post.airport_code || 'JFK',
                seatsNeeded: post.seats_needed || 1,
                desiredDate: post.desired_date?.split('T')[0] || '',
                contact: post.contact || '',
                detail: post.detail || '',
                isUrgent: post.is_urgent || false
            });
        } else {
            setForm({
                title: '',
                airportCode: 'JFK',
                seatsNeeded: 1,
                desiredDate: '',
                contact: '',
                detail: '',
                isUrgent: false
            });
        }
    }, [post, isEditing, isOpen]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }
        if (!form.airportCode) {
            setError('도착 공항을 선택하거나 입력해주세요.');
            return;
        }
        if (!form.desiredDate) {
            setError('희망 출발일을 선택해주세요.');
            return;
        }
        if (!form.contact.trim()) {
            setError('연락처를 입력해주세요.');
            return;
        }

        const seatsNeededNum = form.seatsNeeded === '' ? 1 : parseInt(form.seatsNeeded);

        const postData = {
            title: form.title, 
            airport_code: form.airportCode, 
            seats_needed: seatsNeededNum,
            desired_date: form.desiredDate || null, 
            contact: form.contact, 
            detail: form.detail, 
            is_urgent: form.isUrgent,
        };

        try {
            if (isEditing) {
                await apiClient.put(`/need-posts/${post.id}`, postData);
            } else {
                await apiClient.post('/need-posts', postData);
            }
            onPostSaved();
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
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🙏 구해요 수정' : '🙏 구해요 등록'} footer={footer} error={error}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        제목<span className="text-destructive ml-0.5">*</span>
                    </label>
                    <input 
                        className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.title} 
                        onChange={e => handleChange('title', e.target.value)} 
                        placeholder="예: JFK 4월 출발편 1매 구합니다" 
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField 
                        label={<>도착 공항<span className="text-destructive ml-0.5">*</span></>}
                        options={airports}
                        value={form.airportCode}
                        onChange={val => handleChange('airportCode', val)}
                        placeholder="공항 선택 또는 직접 입력"
                    />

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">필요 마리수</label>
                        <input 
                            className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="number" 
                            min="1" 
                            value={form.seatsNeeded === 1 && !isEditing ? '' : form.seatsNeeded} 
                            onChange={e => handleChange('seatsNeeded', e.target.value)} 
                            placeholder="1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                            희망 출발일<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <input 
                            className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            type="date" 
                            value={form.desiredDate} 
                            onChange={e => handleChange('desiredDate', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                            연락처<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <input 
                            className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                            value={form.contact} 
                            onChange={e => handleChange('contact', e.target.value)} 
                            placeholder="010-xxxx-xxxx 또는 이메일" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">상세 내용</label>
                    <textarea 
                        className="flex min-h-[100px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.detail} 
                        onChange={e => handleChange('detail', e.target.value)} 
                        placeholder="비용 부담 여부, 단체 정보 등..."
                    />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={form.isUrgent} 
                            onChange={e => handleChange('isUrgent', e.target.checked)} 
                        />
                        <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destructive"></div>
                        <span className="ml-3 text-sm font-bold text-foreground">🚨 급구 표시</span>
                    </label>
                </div>
            </div>
        </Modal>
    );
}
