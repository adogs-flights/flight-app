import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

export default function AirlineModal({ isOpen, onClose, airline, onSaved, apiClient }) {
    const [form, setForm] = useState({
        code: '',
        name: '',
        is_active: true
    });
    const [error, setError] = useState('');

    const isEditing = !!airline;

    useEffect(() => {
        if (isEditing) {
            setForm({
                code: airline.code || '',
                name: airline.name || '',
                is_active: airline.is_active ?? true
            });
        } else {
            setForm({
                code: '',
                name: '',
                is_active: true
            });
        }
    }, [airline, isEditing, isOpen]);

    const handleSubmit = async () => {
        try {
            if (isEditing) {
                await apiClient.put(`/master/airlines/${airline.id}`, form);
            } else {
                await apiClient.post('/master/airlines', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        }
    };

    const footer = (
        <>
            <button className="btn btn-primary" onClick={handleSubmit}>저장</button>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 항공사 수정' : '✈️ 항공사 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">항공사 코드</label>
                    <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="KE" disabled={isEditing} />
                </div>
                <div className="form-group full">
                    <label className="form-label">항공사명</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="대한항공" />
                </div>
                <div className="form-group full">
                    <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> 사용 여부
                    </label>
                </div>
                {error && <div className="form-group full"><div className="login-error" style={{display:'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
