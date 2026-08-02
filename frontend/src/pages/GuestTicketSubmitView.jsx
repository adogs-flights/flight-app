import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SelectField from '../components/ui/SelectField';
import logo from '../assets/flight-app.PNG';

// 리버스 프록시의 요청 크기 제한(흔히 1MB)에 걸리지 않도록,
// 업로드 전 브라우저에서 미리 이미지를 축소/재압축한다. PDF 등 이미지가 아닌 파일은 그대로 둔다.
async function compressImageFile(file, maxDimension = 1920, quality = 0.8) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }
    try {
        const bitmap = await createImageBitmap(file);
        let { width, height } = bitmap;
        if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

        if (!blob || blob.size >= file.size) return file; // 압축 결과가 더 크면 원본 유지

        const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], newName, { type: 'image/jpeg' });
    } catch (err) {
        console.error('이미지 압축 실패, 원본으로 제출합니다.', err);
        return file;
    }
}

export default function GuestTicketSubmitView() {
    const { apiClient, airlines } = useAuth();
    const [searchParams] = useSearchParams();
    const orgSlug = searchParams.get('org');
    // 게시글에서 바로 제출하는 경우: 단체 id/이름과 게시글 id/제목이 넘어온다.
    const orgIdParam = searchParams.get('orgId');
    const orgNameParam = searchParams.get('orgName');
    const postId = searchParams.get('postId');
    const postTitle = searchParams.get('postTitle');

    const [organizations, setOrganizations] = useState([]);
    const [lockedOrganization, setLockedOrganization] = useState(null); // slug로 고정된 단체
    const [orgLookupFailed, setOrgLookupFailed] = useState(false);
    const [form, setForm] = useState({
        phone: '',
        kakaoId: '',
        airline: '',
        organizationId: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null); // 제출 응답(id, lookup_token)
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (orgSlug) {
            apiClient.get(`/organizations/by-slug/${orgSlug}`)
                .then(res => {
                    setLockedOrganization(res.data);
                    setForm(prev => ({ ...prev, organizationId: String(res.data.id) }));
                })
                .catch(() => setOrgLookupFailed(true));
        } else if (orgIdParam) {
            // 게시글에서 넘어온 단체는 id/이름을 그대로 고정한다(추가 조회 불필요).
            setLockedOrganization({ id: Number(orgIdParam), name: orgNameParam || '지정 단체' });
            setForm(prev => ({ ...prev, organizationId: orgIdParam }));
        } else {
            apiClient.get('/organizations/with-accounts')
                .then(res => setOrganizations(res.data))
                .catch(() => setOrganizations([]));
        }
    }, [apiClient, orgSlug, orgIdParam, orgNameParam]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.phone.trim()) {
            setError('전화번호를 입력해주세요.');
            return;
        }
        if (!form.airline.trim()) {
            setError('항공사를 선택해주세요.');
            return;
        }
        if (!form.kakaoId.trim()) {
            setError('카카오톡 아이디를 입력해주세요.');
            return;
        }
        if (!imageFile) {
            setError('e티켓 이미지를 첨부해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('phone', form.phone);
        formData.append('kakao_id', form.kakaoId);
        formData.append('airline', form.airline);
        const uploadFile = await compressImageFile(imageFile);
        formData.append('eticket_image', uploadFile);
        if (form.organizationId) {
            formData.append('organization_id', form.organizationId);
        }
        if (postId) {
            formData.append('need_post_id', postId);
        }

        setSubmitting(true);
        try {
            const res = await apiClient.post('/guest-submissions', formData);
            setResult(res.data);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.detail || '제출에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // 제출자에게 안내할 상태 조회 링크 (lookup_token 포함)
    const statusUrl = result
        ? `${window.location.origin}/submission-status?id=${result.id}&token=${result.lookup_token}`
        : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(statusUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('링크 복사에 실패했습니다. 링크를 직접 선택해 복사해주세요.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
                <div className="w-full max-w-[480px] p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-primary-foreground text-2xl font-bold mb-2">
                            <img src={logo} alt="" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">이동봉사 티켓 제공하기</h1>
                        <p className="text-sm text-muted-foreground">강아지 자리 예약을 위한 정보를 남겨주세요.<br />아래 정보들은 항공사 예약 조회를 위해서만 사용됩니다.</p>
                    </div>

                    {postTitle && !submitted && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border-2 border-primary/20 bg-primary/5 text-left">
                            <span className="text-lg">🐶</span>
                            <p className="text-xs font-bold text-foreground leading-relaxed">
                                <span className="text-primary">‘{postTitle}’</span> 게시글에 티켓을 제출합니다.
                            </p>
                        </div>
                    )}

                    {submitted ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="p-6 rounded-xl border-2 border-green/20 bg-green/5 text-center space-y-2">
                                <div className="text-2xl">✅</div>
                                <div className="text-sm font-bold text-green">제출이 완료되었습니다!</div>
                                <div className="text-xs text-muted-foreground">담당자 검토 후 진행됩니다.</div>
                            </div>

                            {statusUrl && (
                                <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
                                    <p className="text-xs font-bold text-foreground">🔖 아래 링크로 진행 상태를 확인하세요.</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        이 링크는 <strong>제출자 본인만</strong> 상태를 볼 수 있는 열쇠입니다. 꼭 저장해 두세요.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            readOnly
                                            value={statusUrl}
                                            onFocus={e => e.target.select()}
                                            className="flex-1 h-10 rounded-lg border-2 border-border bg-background px-3 text-[11px] text-muted-foreground focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="shrink-0 h-10 px-3 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            {copied ? '복사됨!' : '복사'}
                                        </button>
                                    </div>
                                    <a
                                        href={statusUrl}
                                        className="inline-block text-xs font-bold text-primary hover:underline"
                                    >
                                        지금 상태 확인하기 →
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5 sm:space-y-6">
                            <SelectField
                                label={<>항공사<span className="text-destructive ml-0.5">*</span></>}
                                options={airlines}
                                value={form.airline}
                                onChange={val => handleChange('airline', val)}
                                placeholder="항공사 선택 또는 직접 입력"
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    e티켓 이미지<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="flex w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                                />
                                <p className="text-[11px] text-muted-foreground ml-1">항공사 예약 조회를 위해 e티켓 이미지(또는 PDF)를 첨부해주세요.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    전화번호<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    value={form.phone}
                                    onChange={e => handleChange('phone', e.target.value)}
                                    placeholder="예약 시 남기신 전화번호"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    카카오톡 아이디<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    value={form.kakaoId}
                                    onChange={e => handleChange('kakaoId', e.target.value)}
                                    placeholder="담당자가 연락드릴 카카오톡 아이디"
                                />
                            </div>

                            {lockedOrganization ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">신청 단체</label>
                                    <div className="flex items-center gap-2 h-11 px-4 rounded-lg border-2 border-primary/30 bg-primary/5 text-sm font-bold text-primary">
                                        🏢 {lockedOrganization.name}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <SelectField
                                        label="신청 단체 (선택)"
                                        options={organizations.map(o => ({ value: String(o.id), label: o.name }))}
                                        value={form.organizationId}
                                        onChange={val => handleChange('organizationId', val)}
                                        placeholder="소속된 단체가 있다면 선택해주세요"
                                        isCreatable={false}
                                    />
                                    {orgLookupFailed && (
                                        <div className="px-3 py-2 text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                                            링크에 지정된 단체를 찾을 수 없어요. 직접 선택해주세요.
                                        </div>
                                    )}
                                </>
                            )}

                            {error && (
                                <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in shake duration-300">
                                    {error}
                                </div>
                            )}

                            <button
                                className="w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97] disabled:opacity-50"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? '제출 중...' : '제출하기'}
                            </button>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← 로그인 화면으로 돌아가기</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
