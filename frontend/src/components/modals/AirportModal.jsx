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
                저장하기
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🏢 공항 수정' : '🏢 공항 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">공항 코드 (IATA)</label>
                        <input 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none disabled:bg-muted disabled:text-muted-foreground" 
                            value={form.code} 
                            onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
                            placeholder="JFK" 
                            disabled={isEditing} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">국가/지역</label>
                        <select 
                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none appearance-none" 
                            value={form.country} 
                            onChange={e => setForm({...form, country: e.target.value})}
                        >
                            <option value="미국">미국</option>
                            <option value="캐나다">캐나다</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">공항명</label>
                    <input 
                        className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none" 
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})} 
                        placeholder="뉴욕 존 F. 케네디 국제공항" 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">배경색</label>
                        <div className="flex items-center gap-3 h-11 px-3 border-2 border-border rounded-lg bg-background">
                            <input 
                                type="color" 
                                className="w-8 h-8 rounded border-none cursor-pointer overflow-hidden bg-transparent p-0" 
                                value={form.bg_color} 
                                onChange={e => setForm({...form, bg_color: e.target.value})} 
                            />
                            <span className="text-xs font-mono text-muted-foreground uppercase">{form.bg_color}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">글자색</label>
                        <div className="flex items-center gap-2 h-11 p-1 border-2 border-border rounded-lg bg-background">
                            <input 
                                type="color" 
                                className="w-8 h-8 rounded border-none cursor-pointer overflow-hidden bg-transparent p-0 ml-2" 
                                value={form.text_color} 
                                onChange={e => setForm({...form, text_color: e.target.value})} 
                            />
                            <button 
                                type="button" 
                                onClick={applyRecommendedColor}
                                className="ml-auto px-3 py-1 text-[10px] font-bold rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors border"
                            >
                                대비 최적화
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 rounded-xl border-2 border-border bg-muted/30 space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block text-center">✨ 미리보기 가이드</label>
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-[11px] text-muted-foreground">앱 내 실제 노출 모습 (가독성을 확인하세요)</div>
                        <span 
                            className="px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all" 
                            style={{ backgroundColor: form.bg_color, color: form.text_color, borderColor: form.bg_color }}
                        >
                            {form.code || 'CODE'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={form.is_active} 
                            onChange={e => setForm({...form, is_active: e.target.checked})} 
                        />
                        <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ml-3 text-sm font-bold text-foreground">공항 활성화</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground ml-auto">(해제 시 목록에서 숨김)</span>
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
