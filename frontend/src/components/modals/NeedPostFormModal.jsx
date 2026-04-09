import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import SelectField from '../ui/SelectField';

export default function NeedPostFormModal({ isOpen, onClose, post, onPostSaved }) {
    const { apiClient, airports, fetchStaticData } = useAuth();
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
        if (isOpen) {
            fetchStaticData();
        }
    }, [isOpen, fetchStaticData]);

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
        if (!form.title.trim() || !form.contact.trim() || !form.airportCode) {
            setError('제목, 도착 공항, 연락처는 필수입니다.');
            return;
        }

        const postData = {
            title: form.title, 
            airport_code: form.airportCode, 
            seats_needed: form.seatsNeeded,
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
        <>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? '수정하기' : '등록하기'}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🙏 구해요 수정' : '🙏 구해요 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group full">
                    <label className="form-label">제목</label>
                    <input className="form-input" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="예: JFK 4월 출발편 1매 구합니다" />
                </div>
                
                <SelectField 
                    label="도착 공항"
                    options={airports}
                    value={form.airportCode}
                    onChange={val => handleChange('airportCode', val)}
                    placeholder="공항 선택 또는 직접 입력"
                />

                <div className="form-group">
                    <label className="form-label">필요 매수</label>
                    <input className="form-input" type="number" min="1" value={form.seatsNeeded} onChange={e => handleChange('seatsNeeded', parseInt(e.target.value) || 1)} />
                </div>
                <div className="form-group">
                    <label className="form-label">희망 출발일</label>
                    <input className="form-input" type="date" value={form.desiredDate} onChange={e => handleChange('desiredDate', e.target.value)} />
                </div>
                <div className="form-group full">
                    <label className="form-label">연락처</label>
                    <input className="form-input" value={form.contact} onChange={e => handleChange('contact', e.target.value)} placeholder="010-xxxx-xxxx 또는 이메일" />
                </div>
                <div className="form-group full">
                    <label className="form-label">상세 내용</label>
                    <textarea className="form-input" value={form.detail} onChange={e => handleChange('detail', e.target.value)} placeholder="비용 부담 여부, 단체 정보 등..."></textarea>
                </div>
                <div className="form-group full">
                    <label style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',cursor:'pointer'}}>
                        <input type="checkbox" checked={form.isUrgent} onChange={e => handleChange('isUrgent', e.target.checked)} style={{width:'15px',height:'15px'}} /> 급구 표시
                    </label>
                </div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
