import { Alert, Button, FieldLabel, Input } from '../ui/primitives.js';
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
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '✈️ 항공사 수정' : '✈️ 항공사 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <FieldLabel variant="default">항공사 코드</FieldLabel>
                    <Input
                        variant="locked"
                        value={form.code} 
                        onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
                        placeholder="KE" 
                        disabled={isEditing} 
                    />
                </div>
                <div className="space-y-2">
                    <FieldLabel variant="default">항공사명</FieldLabel>
                    <Input
                        variant="flex"
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})} 
                        placeholder="대한항공" 
                    />
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
                        <span className="ml-3 text-sm font-bold text-foreground">사용 여부</span>
                    </FieldLabel>
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
