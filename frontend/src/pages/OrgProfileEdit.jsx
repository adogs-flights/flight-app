import { ActionLink, Alert, Button, Card, FieldLabel, Heading, Input, Textarea } from '../components/ui/primitives.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';



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
                <Heading as="h1" variant="page">단체 소개 관리</Heading>
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
                    <Heading as="h1" variant="page">단체 소개 관리</Heading>
                    <p className="text-sm text-muted-foreground">공개 소개 페이지에 노출될 {org.name}의 정보를 편집합니다.</p>
                </div>
                {org.slug ? (
                    <ActionLink as={Link} to={`/org/${org.slug}`} target="_blank" rel="noreferrer"
                        variant="orgProfileEdit">
                        공개 페이지 미리보기 ↗
                    </ActionLink>
                ) : (
                    <span className="shrink-0 text-[11px] text-muted-foreground">공개 링크(슬러그)는 관리자가 설정합니다.</span>
                )}
            </div>

            {/* 로고 */}
            <Card variant="orgProfileEdit">
                <FieldLabel variant="orgProfileEdit">로고</FieldLabel>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted/30 flex items-center justify-center shrink-0">
                        {hasLogo ? (
                            <img src={`/api/organizations/${org.id}/logo?v=${logoVersion}`} alt="로고" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl">🐶</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={logoBusy}
                            onChange={e => uploadLogo(e.target.files?.[0])}
                            variant="logo"
                        />
                        {hasLogo && (
                            <Button onClick={removeLogo} disabled={logoBusy} variant="removeFile">
                                로고 삭제
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* 소개글·링크 */}
            <Card variant="orgProfileEdit2">
                <div className="space-y-1.5">
                    <FieldLabel variant="orgProfileEdit">단체 소개글</FieldLabel>
                    <Textarea
                        rows={6}
                        variant="profile"
                        placeholder="단체의 미션과 활동을 소개해주세요."
                        value={form.description}
                        onChange={e => change('description', e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <FieldLabel variant="orgProfileEdit">홈페이지</FieldLabel>
                    <Input variant="compact" placeholder="https://example.org" value={form.homepage_url} onChange={e => change('homepage_url', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <FieldLabel variant="orgProfileEdit">인스타그램</FieldLabel>
                    <Input variant="compact" placeholder="https://instagram.com/..." value={form.instagram_url} onChange={e => change('instagram_url', e.target.value)} />
                </div>

                {error && <Alert variant="generalSignup">{error}</Alert>}
                {message && <div className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">{message}</div>}

                <Button onClick={saveProfile} disabled={saving} variant="saveProfile">
                    {saving ? '저장 중…' : '소개 정보 저장'}
                </Button>
            </Card>
        </div>
    );
}
