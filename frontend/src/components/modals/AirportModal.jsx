import { Alert, Badge, Button, FieldLabel, Input, NativeSelect } from '../ui/primitives.js';
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
            <Button
                variant="secondary"
                onClick={onClose}
            >
                취소
            </Button>
            <Button
                variant="save"
                onClick={handleSubmit}
            >
                저장하기
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🏢 공항 수정' : '🏢 공항 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">공항 코드 (IATA)</FieldLabel>
                        <Input
                            variant="locked"
                            value={form.code} 
                            onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
                            placeholder="JFK" 
                            disabled={isEditing} 
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">국가/지역</FieldLabel>
                        <NativeSelect
                            variant="country"
                            value={form.country} 
                            onChange={e => setForm({...form, country: e.target.value})}
                        >
                            <option value="미국">미국</option>
                            <option value="캐나다">캐나다</option>
                            <option value="기타">기타</option>
                        </NativeSelect>
                    </div>
                </div>

                <div className="space-y-2">
                    <FieldLabel variant="default">공항명</FieldLabel>
                    <Input
                        variant="flex"
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})} 
                        placeholder="뉴욕 존 F. 케네디 국제공항" 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel variant="default">배경색</FieldLabel>
                        <div className="flex items-center gap-3 h-11 px-3 border-2 border-border rounded-lg bg-background">
                            <Input
                                type="color" 
                                variant="color"
                                value={form.bg_color} 
                                onChange={e => setForm({...form, bg_color: e.target.value})} 
                            />
                            <span className="text-xs font-mono text-muted-foreground uppercase">{form.bg_color}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel variant="default">글자색</FieldLabel>
                        <div className="flex items-center gap-2 h-11 p-1 border-2 border-border rounded-lg bg-background">
                            <Input
                                type="color" 
                                variant="colorOffset"
                                value={form.text_color} 
                                onChange={e => setForm({...form, text_color: e.target.value})} 
                            />
                            <Button
                                type="button" 
                                onClick={applyRecommendedColor}
                                variant="resetColor"
                            >
                                대비 최적화
                            </Button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 rounded-xl border-2 border-border bg-muted/30 space-y-4">
                    <FieldLabel variant="airport">✨ 미리보기 가이드</FieldLabel>
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-[11px] text-muted-foreground">앱 내 실제 노출 모습 (가독성을 확인하세요)</div>
                        <Badge
                            variant="airport"
                            style={{ backgroundColor: form.bg_color, color: form.text_color, borderColor: form.bg_color }}
                        >
                            {form.code || 'CODE'}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                    <FieldLabel variant="airline">
                        <Input
                            type="checkbox" 
                            variant="toggle"
                            checked={form.is_active} 
                            onChange={e => setForm({...form, is_active: e.target.checked})} 
                        />
                        <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ml-3 text-sm font-bold text-foreground">공항 활성화</span>
                    </FieldLabel>
                    <span className="text-[11px] text-muted-foreground ml-auto">(해제 시 목록에서 숨김)</span>
                </div>

                {error && (
                    <Alert variant="generalSignup">
                        {error}
                    </Alert>
                )}
            </div>
        </Modal>
    );
}
