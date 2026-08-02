import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

const formatDate = (s) => {
    if (!s) return '-';
    const d = new Date(s);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
};

const inputClass = "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none";
const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1";
const fileClass = "flex w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground";

// 승인(자리 완료) 후 제출자가 채우는 출국 준비 폼.
// 성함·출국일·목적지는 승인 시 단체가 티켓에 이미 입력하므로 중복해서 받지 않는다.
function DepartureForm({ id, token, onDone }) {
    const [address, setAddress] = useState('');
    const [passport, setPassport] = useState(null);
    const [seatConfirm, setSeatConfirm] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!address.trim()) {
            setError('주소를 입력해주세요.');
            return;
        }
        if (!passport || !seatConfirm) {
            setError('여권 사본과 자리 확약 캡쳐를 모두 첨부해주세요.');
            return;
        }
        const fd = new FormData();
        fd.append('lookup_token', token);
        fd.append('dep_address', address);
        fd.append('passport', passport);
        fd.append('seat_confirm', seatConfirm);
        setSubmitting(true);
        try {
            await apiClient.post(`/guest-submissions/${id}/departure-info`, fd);
            onDone();
        } catch (err) {
            setError(err.response?.data?.detail || '제출에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="space-y-4 text-left" onSubmit={submit}>
            <div className="space-y-2">
                <label className={labelClass}>주소</label>
                <input className={inputClass} value={address} onChange={e => setAddress(e.target.value)} placeholder="출국 준비 서류에 기재될 주소" />
            </div>
            <div className="space-y-2">
                <label className={labelClass}>여권 사본</label>
                <input className={fileClass} type="file" accept="image/*,application/pdf" onChange={e => setPassport(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
                <label className={labelClass}>반려동물 자리 확약 캡쳐</label>
                <input className={fileClass} type="file" accept="image/*,application/pdf" onChange={e => setSeatConfirm(e.target.files?.[0] || null)} />
            </div>

            <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg leading-relaxed">
                🔒 제공하신 정보는 출국 준비 서류에만 사용되며, 다른 용도로 쓰지 않습니다. 해외이동봉사 종료 시 삭제됩니다.
            </div>

            {error && (
                <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">{error}</div>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center h-11 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
                {submitting ? '제출 중…' : '출국 준비 서류 제출하기'}
            </button>
        </form>
    );
}

export default function SubmissionStatusView() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStatus = useCallback(() => {
        if (!id || !token) {
            setError('잘못된 조회 링크입니다.');
            setLoading(false);
            return;
        }
        setLoading(true);
        apiClient.get(`/guest-submissions/${id}/status`, { params: { token } })
            .then(res => { setData(res.data); setError(''); })
            .catch(() => setError('제출 내역을 찾을 수 없습니다. 링크를 다시 확인해주세요.'))
            .finally(() => setLoading(false));
    }, [id, token]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const renderBody = () => {
        if (loading) return <p className="text-center text-sm text-muted-foreground py-8">불러오는 중...</p>;
        if (error) return <div className="px-4 py-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl text-center">{error}</div>;

        if (data.status === 'pending') {
            return (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <span className="text-5xl">⏳</span>
                    <span className="text-lg font-black text-amber-600">검토 대기 중</span>
                    <p className="text-sm text-muted-foreground leading-relaxed px-2">담당 단체가 항공사 자리 예약을 확인하고 있습니다. 조금만 기다려 주세요.</p>
                </div>
            );
        }

        if (data.status === 'rejected') {
            return (
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                        <span className="text-5xl">😢</span>
                        <span className="text-lg font-black text-destructive">자리를 예약하지 못했습니다</span>
                        <p className="text-sm text-muted-foreground leading-relaxed px-2">아쉽게도 해당 항공편에는 반려동물 자리가 없었습니다. 함께해 주셔서 감사합니다.</p>
                    </div>
                    {data.admin_note && (
                        <div className="px-4 py-3 rounded-xl border-2 border-destructive/20 bg-destructive/5 text-left">
                            <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-1">안내</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{data.admin_note}</p>
                        </div>
                    )}
                </div>
            );
        }

        // approved (= 자리 완료)
        return (
            <div className="space-y-5">
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <span className="text-5xl">🎉</span>
                    <span className="text-lg font-black text-green">반려동물 예약 자리 완료!</span>
                </div>
                <div className="px-4 py-3 rounded-xl border-2 border-green/20 bg-green/5 text-sm text-foreground leading-relaxed">
                    다시 한 번 아이들을 위해 도움 주셔서 감사드립니다 🙂<br />
                    출국일로부터 <b>1~2주 전</b>, 출국 준비를 위한 카톡방에 초대해 드리겠습니다!
                </div>

                {data.departure_submitted ? (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                        <span className="text-3xl">✅</span>
                        <span className="text-sm font-bold text-green">출국 준비 서류가 제출되었습니다</span>
                        <p className="text-xs text-muted-foreground">담당자가 확인 후 진행합니다. 감사합니다!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-foreground">💙 출국 준비를 위해 아래 정보를 제출해 주세요.</p>
                        <DepartureForm id={id} token={token} onDone={fetchStatus} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[460px] p-8 space-y-6 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <Link to="/" className="flex items-center justify-center w-14 h-14 rounded-2xl mb-2">
                            <img src={logo} alt="" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">제출 진행 상태</h1>
                        {!loading && !error && data?.need_post && (
                            <p className="text-xs text-muted-foreground">🐶 {data.need_post.title}</p>
                        )}
                    </div>

                    {renderBody()}

                    <div className="text-center pt-2">
                        <Link to="/board" className="text-xs font-bold text-primary hover:underline">← 구해요 게시판으로</Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
