import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

export default function AirportModal({ isOpen, onClose, airport, onSaved, apiClient }) {
    const [form, setForm] = useState({
        code: '',
        name: '',
        country: '미국',
        bg_color: '#f1f5f9',
        text_color: '#475569',
        is_active: true
    });
    const [error, setError] = useState('');

    const isEditing = !!airport;

    useEffect(() => {
        if (isEditing) {
            setForm({
                code: airport.code || '',
                name: airport.name || '',
                country: airport.country || '미국',
                bg_color: airport.bg_color || '#f1f5f9',
                text_color: airport.text_color || '#475569',
                is_active: airport.is_active ?? true
            });
        } else {
            setForm({
                code: '',
                name: '',
                country: '미국',
                bg_color: '#f1f5f9',
                text_color: '#475569',
                is_active: true
            });
        }
    }, [airport, isEditing, isOpen]);

    // 배경색에 따른 최적 텍스트 색상 계산 (밝기 기반)
    const getRecommendedTextColor = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // 밝기 계산 공식 (YIQ)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    };

    const applyRecommendedColor = () => {
        const recommended = getRecommendedTextColor(form.bg_color);
        setForm({ ...form, text_color: recommended });
    };

    const handleSubmit = async () => {
        try {
            if (isEditing) {
                await apiClient.put(`/master/airports/${airport.id}`, form);
            } else {
                await apiClient.post('/master/airports', form);
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
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🏢 공항 수정' : '🏢 공항 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">공항 코드 (IATA)</label>
                    <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="JFK" disabled={isEditing} />
                </div>
                <div className="form-group">
                    <label className="form-label">국가/지역</label>
                    <select className="form-input" value={form.country} onChange={e => setForm({...form, country: e.target.value})}>
                        <option value="미국">미국</option>
                        <option value="캐나다">캐나다</option>
                        <option value="기타">기타</option>
                    </select>
                </div>
                <div className="form-group full">
                    <label className="form-label">공항명</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="뉴욕 존 F. 케네디 국제공항" />
                </div>
                <div className="form-group">
                    <label className="form-label">배경색</label>
                    <input type="color" className="form-input" style={{height:'40px', padding:'2px'}} value={form.bg_color} onChange={e => setForm({...form, bg_color: e.target.value})} />
                </div>
                <div className="form-group">
                    <label className="form-label">글자색</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="color" className="form-input" style={{height:'40px', padding:'2px', flex: 1}} value={form.text_color} onChange={e => setForm({...form, text_color: e.target.value})} />
                        <button 
                            type="button" 
                            onClick={applyRecommendedColor}
                            style={{ 
                                padding: '0 10px', 
                                fontSize: '11px', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px',
                                backgroundColor: '#f8fafc',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            대비 최적화
                        </button>
                    </div>
                </div>
                
                <div className="form-group full">
                    <label className="form-label">✨ 미리보기 가이드</label>
                    <div style={{ 
                        padding: '20px', 
                        background: '#f8fafc', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '12px',
                        border: '1px dashed #cbd5e1'
                    }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>앱 내 실제 노출 모습 (가독성을 확인하세요)</div>
                        <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            backgroundColor: form.bg_color,
                            color: form.text_color,
                            border: `1px solid ${form.bg_color}`
                        }}>
                            {form.code || 'CODE'}
                        </span>
                    </div>
                </div>

                <div className="form-group full">
                    <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> 공항 활성화 (체크 해제 시 목록에서 숨김)
                    </label>
                </div>

                {error && <div className="form-group full"><div className="login-error" style={{display:'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
