import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SelectField from '../components/ui/SelectField';
import logo from '../assets/flight-app.PNG';

export default function GuestTicketSubmitView() {
    const { apiClient } = useAuth();
    const [searchParams] = useSearchParams();
    const orgSlug = searchParams.get('org');

    const [organizations, setOrganizations] = useState([]);
    const [lockedOrganization, setLockedOrganization] = useState(null); // slug로 고정된 단체
    const [orgLookupFailed, setOrgLookupFailed] = useState(false);
    const [form, setForm] = useState({
        phone: '',
        verificationMethod: 'eticket_image',
        reservationNumber: '',
        passengerNameEn: '',
        organizationId: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (orgSlug) {
            apiClient.get(`/organizations/by-slug/${orgSlug}`)
                .then(res => {
                    setLockedOrganization(res.data);
                    setForm(prev => ({ ...prev, organizationId: String(res.data.id) }));
                })
                .catch(() => setOrgLookupFailed(true));
        } else {
            apiClient.get('/organizations')
                .then(res => setOrganizations(res.data.filter(o => o.is_active)))
                .catch(() => setOrganizations([]));
        }
    }, [apiClient, orgSlug]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.phone.trim()) {
            setError('전화번호를 입력해주세요.');
            return;
        }
        if (form.verificationMethod === 'eticket_image') {
            if (!imageFile) {
                setError('e티켓 이미지를 첨부해주세요.');
                return;
            }
        } else {
            if (!form.reservationNumber.trim() || !form.passengerNameEn.trim()) {
                setError('예약번호와 탑승객 영문명을 모두 입력해주세요.');
                return;
            }
        }

        const formData = new FormData();
        formData.append('phone', form.phone);
        formData.append('verification_method', form.verificationMethod);
        if (form.verificationMethod === 'eticket_image') {
            formData.append('eticket_image', imageFile);
        } else {
            formData.append('reservation_number', form.reservationNumber);
            formData.append('passenger_name_en', form.passengerNameEn);
        }
        if (form.organizationId) {
            formData.append('organization_id', form.organizationId);
        }

        setSubmitting(true);
        try {
            await apiClient.post('/guest-submissions', formData);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.detail || '제출에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[480px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl text-primary-foreground text-2xl font-bold mb-2">
                            <img src={logo} alt="" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">이동봉사 티켓 제공하기</h1>
                        <p className="text-sm text-muted-foreground">로그인 없이 이동봉사 가능한 항공권 정보를 제출할 수 있습니다.<br />관리자 검토 후 정식 티켓으로 등록됩니다.</p>
                    </div>

                    {submitted ? (
                        <div className="p-6 rounded-xl border-2 border-green/20 bg-green/5 text-center space-y-2 animate-in fade-in duration-500">
                            <div className="text-2xl">✅</div>
                            <div className="text-sm font-bold text-green">제출이 완료되었습니다!</div>
                            <div className="text-xs text-muted-foreground">관리자 검토 후 남겨주신 연락처로 안내드리겠습니다.</div>
                        </div>
                    ) : (
                        <div className="space-y-6">
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

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">증빙 방법</label>
                                <div className="flex gap-3">
                                    <button
                                        className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${form.verificationMethod === 'eticket_image' ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                                        onClick={() => handleChange('verificationMethod', 'eticket_image')}
                                    >
                                        e티켓 이미지
                                    </button>
                                    <button
                                        className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${form.verificationMethod === 'reservation_number' ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                                        onClick={() => handleChange('verificationMethod', 'reservation_number')}
                                    >
                                        예약번호
                                    </button>
                                </div>
                            </div>

                            {form.verificationMethod === 'eticket_image' ? (
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
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                            예약번호<span className="text-destructive ml-0.5">*</span>
                                        </label>
                                        <input
                                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                            value={form.reservationNumber}
                                            onChange={e => handleChange('reservationNumber', e.target.value)}
                                            placeholder="예: ABC123"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                            탑승객 영문명<span className="text-destructive ml-0.5">*</span>
                                        </label>
                                        <input
                                            className="flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                            value={form.passengerNameEn}
                                            onChange={e => handleChange('passengerNameEn', e.target.value)}
                                            placeholder="예: HONG GILDONG"
                                        />
                                    </div>
                                </div>
                            )}

                            {lockedOrganization ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">소속 단체</label>
                                    <div className="flex items-center gap-2 h-11 px-4 rounded-lg border-2 border-primary/30 bg-primary/5 text-sm font-bold text-primary">
                                        🏢 {lockedOrganization.name}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <SelectField
                                        label="소속 단체 (선택)"
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
