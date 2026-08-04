import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const inputClass = "flex h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none";

export default function OrgProfileEdit() {
    const { user, apiClient, refreshUser } = useAuth();
    const org = user?.organization;

    const [form, setForm] = useState({
        description: org?.description || '',
        homepage_url: org?.homepage_url || '',
        instagram_url: org?.instagram_url || '',
    });
    const [hasLogo, setHasLogo] = useState(org?.has_logo || false);
    const [logoVersion, setLogoVersion] = useState(0); // 업로드 후 미리보기 캐시 무효화
    const [saving, setSaving] = useState(false);
    const [logoBusy, setLogoBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!org) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">단체 소개 관리</h1>
                <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed border-border text-center text-sm text-muted-foreground">
                    소속된 단체가 없어 소개를 편집할 수 없습니다.
                </div>
            </div>
        );
    }

    const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const saveProfile = async () => {
        setSaving(true); setError(''); setMessage('');
        try {
            await apiClient.put(`/organizations/${org.id}/profile`, form);
            await refreshUser();
            setMessage('소개 정보가 저장되었습니다.');
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (file) => {
        if (!file) return;
        setLogoBusy(true); setError(''); setMessage('');
        const fd = new FormData();
        fd.append('logo', file);
        try {
            await apiClient.post(`/organizations/${org.id}/logo`, fd);
            await refreshUser();
            setHasLogo(true);
            setLogoVersion(v => v + 1);
            setMessage('로고가 변경되었습니다.');
        } catch (err) {
            setError(err.response?.data?.detail || '로고 업로드에 실패했습니다.');
        } finally {
            setLogoBusy(false);
        }
    };

    const removeLogo = async () => {
        if (!window.confirm('로고를 삭제할까요?')) return;
        setLogoBusy(true); setError(''); setMessage('');
        try {
            await apiClient.delete(`/organizations/${org.id}/logo`);
            await refreshUser();
            setHasLogo(false);
            setLogoVersion(v => v + 1);
        } catch {
            setError('로고 삭제에 실패했습니다.');
        } finally {
            setLogoBusy(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">단체 소개 관리</h1>
                    <p className="text-sm text-muted-foreground">공개 소개 페이지에 노출될 {org.name}의 정보를 편집합니다.</p>
                </div>
                {org.slug ? (
                    <Link to={`/org/${org.slug}`} target="_blank" rel="noreferrer"
                        className="shrink-0 inline-flex items-center justify-center h-9 px-4 text-xs font-bold rounded-lg border-2 border-border bg-card hover:border-primary/30 transition-all">
                        공개 페이지 미리보기 ↗
                    </Link>
                ) : (
                    <span className="shrink-0 text-[11px] text-muted-foreground">공개 링크(슬러그)는 관리자가 설정합니다.</span>
                )}
            </div>

            {/* 로고 */}
            <div className="p-5 rounded-2xl bg-card border-2 border-border shadow-sm space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">로고</label>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted/30 flex items-center justify-center shrink-0">
                        {hasLogo ? (
                            <img src={`/api/organizations/${org.id}/logo?v=${logoVersion}`} alt="로고" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl">🐶</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
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

            {/* 소개글·링크 */}
            <div className="p-5 rounded-2xl bg-card border-2 border-border shadow-sm space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">단체 소개글</label>
                    <textarea
                        rows={6}
                        className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm leading-relaxed transition-all focus:border-primary/50 focus-visible:outline-none resize-y"
                        placeholder="단체의 미션과 활동을 소개해주세요."
                        value={form.description}
                        onChange={e => change('description', e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">홈페이지</label>
                    <input className={inputClass} placeholder="https://example.org" value={form.homepage_url} onChange={e => change('homepage_url', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">인스타그램</label>
                    <input className={inputClass} placeholder="https://instagram.com/..." value={form.instagram_url} onChange={e => change('instagram_url', e.target.value)} />
                </div>

                {error && <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">{error}</div>}
                {message && <div className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">{message}</div>}

                <button onClick={saveProfile} disabled={saving} className="w-full h-10 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.99]">
                    {saving ? '저장 중…' : '소개 정보 저장'}
                </button>
            </div>
        </div>
    );
}
