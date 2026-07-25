import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

export default function OrganizationModal({ isOpen, onClose, organization, onSaved, apiClient }) {
    const [form, setForm] = useState({
        name: '',
        slug: '',
        is_active: true
    });
    const [error, setError] = useState('');

    const isEditing = !!organization;

    useEffect(() => {
        if (isEditing) {
            setForm({
                name: organization.name || '',
                slug: organization.slug || '',
                is_active: organization.is_active ?? true
            });
        } else {
            setForm({
                name: '',
                slug: '',
                is_active: true
            });
        }
    }, [organization, isEditing, isOpen]);

    const handleSubmit = async () => {
        try {
            if (isEditing) {
                await apiClient.put(`/organizations/${organization.id}`, form);
            } else {
                await apiClient.post('/organizations', form);
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
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🏢 단체 수정' : '🏢 단체 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">단체명</label>
                    <input
                        className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        placeholder="예: 해봉이네"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">전용 제출 링크 슬러그 (선택)</label>
                    <input
                        className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                        value={form.slug}
                        onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                        placeholder="예: adogs"
                    />
                    {form.slug && (
                        <div className="px-3 py-2 text-[11px] font-mono text-muted-foreground bg-muted/30 rounded-lg border border-border/50 break-all">
                            {`${window.location.origin}/apply?org=${form.slug}`}
                        </div>
                    )}
                    <p className="text-[11px] text-muted-foreground ml-1">이 슬러그를 넣은 링크로 들어오면 소속 단체가 자동으로 고정됩니다.</p>
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
                        <span className="ml-3 text-sm font-bold text-foreground">사용 여부</span>
                    </label>
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
