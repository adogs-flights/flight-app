import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const inputClass = "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none";
const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1";

export default function OrganizationModal({ isOpen, onClose, organization, onSaved, apiClient }) {
    const [form, setForm] = useState({
        name: '', slug: '', is_active: true,
        description: '', homepage_url: '', instagram_url: '',
    });
    const [error, setError] = useState('');
    const [hasLogo, setHasLogo] = useState(false);
    const [logoVersion, setLogoVersion] = useState(0);
    const [logoBusy, setLogoBusy] = useState(false);

    const isEditing = !!organization;

    useEffect(() => {
        setError('');
        if (isEditing) {
            setForm({
                name: organization.name || '',
                slug: organization.slug || '',
                is_active: organization.is_active ?? true,
                description: organization.description || '',
                homepage_url: organization.homepage_url || '',
                instagram_url: organization.instagram_url || '',
            });
            setHasLogo(organization.has_logo || false);
        } else {
            setForm({ name: '', slug: '', is_active: true, description: '', homepage_url: '', instagram_url: '' });
            setHasLogo(false);
        }
        setLogoVersion(0);
    }, [organization, isEditing, isOpen]);

    const handleSubmit = async () => {
        setError('');
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

    const uploadLogo = async (file) => {
        if (!file || !isEditing) return;
        setLogoBusy(true); setError('');
        const fd = new FormData();
        fd.append('logo', file);
        try {
            await apiClient.post(`/organizations/${organization.id}/logo`, fd);
            setHasLogo(true);
            setLogoVersion(v => v + 1);
            onSaved();
        } catch (err) {
            setError(err.response?.data?.detail || '로고 업로드에 실패했습니다.');
        } finally {
            setLogoBusy(false);
        }
    };

    const removeLogo = async () => {
        if (!isEditing || !window.confirm('로고를 삭제할까요?')) return;
        setLogoBusy(true); setError('');
        try {
            await apiClient.delete(`/organizations/${organization.id}/logo`);
            setHasLogo(false);
            setLogoVersion(v => v + 1);
            onSaved();
        } catch {
            setError('로고 삭제에 실패했습니다.');
        } finally {
            setLogoBusy(false);
        }
    };

    const footer = (
        <div className="flex items-center justify-end w-full gap-2">
            <button className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" onClick={onClose}>
                취소
            </button>
            <button className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={handleSubmit}>
                저장하기
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🏢 단체 수정' : '🏢 단체 등록'} footer={footer}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className={labelClass}>단체명</label>
                    <input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 해봉이네" />
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>공개 링크 슬러그 (선택)</label>
                    <input
                        className={inputClass}
                        value={form.slug}
                        onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                        placeholder="예: adogs"
                    />
                    {form.slug && (
                        <div className="px-3 py-2 text-[11px] font-mono text-muted-foreground bg-muted/30 rounded-lg border border-border/50 break-all">
                            소개: {`${window.location.origin}/org/${form.slug}`}<br />
                            제출: {`${window.location.origin}/apply?org=${form.slug}`}
                        </div>
                    )}
                    <p className="text-[11px] text-muted-foreground ml-1">소개 페이지·전용 제출 링크에 쓰입니다.</p>
                </div>

                {/* 로고 (편집 시에만) */}
                {isEditing && (
                    <div className="space-y-2">
                        <label className={labelClass}>로고</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-border bg-muted/30 flex items-center justify-center shrink-0">
                                {hasLogo ? (
                                    <img src={`/api/organizations/${organization.id}/logo?v=${logoVersion}`} alt="로고" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">🐶</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    disabled={logoBusy}
                                    onChange={e => uploadLogo(e.target.files?.[0])}
                                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-primary file:text-primary-foreground disabled:opacity-50"
                                />
                                {hasLogo && (
                                    <button onClick={removeLogo} disabled={logoBusy} className="text-left text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 disabled:opacity-50">
                                        로고 삭제
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className={labelClass}>단체 소개글</label>
                    <textarea
                        rows={4}
                        className="w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm leading-relaxed transition-all focus:border-primary/50 focus-visible:outline-none resize-y"
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        placeholder="단체의 미션과 활동을 소개해주세요."
                    />
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>홈페이지</label>
                    <input className={inputClass} value={form.homepage_url} onChange={e => setForm({...form, homepage_url: e.target.value})} placeholder="https://example.org" />
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>인스타그램</label>
                    <input className={inputClass} value={form.instagram_url} onChange={e => setForm({...form, instagram_url: e.target.value})} placeholder="https://instagram.com/..." />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
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
