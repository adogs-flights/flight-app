import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

const STATUS_META = {
    pending: { icon: '⏳', label: '검토 대기 중', color: 'text-amber-600', desc: '담당자가 제출하신 티켓을 확인하고 있습니다. 조금만 기다려 주세요.' },
    approved: { icon: '✅', label: '승인되었습니다', color: 'text-green', desc: '티켓이 승인되어 이동봉사 일정에 등록되었습니다. 담당자가 곧 연락드립니다.' },
    rejected: { icon: '❌', label: '반려되었습니다', color: 'text-destructive', desc: '아쉽게도 이번 제출은 반려되었습니다.' },
};

const formatDate = (s) => {
    if (!s) return '-';
    const d = new Date(s);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
};

export default function SubmissionStatusView() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id || !token) {
            setError('잘못된 조회 링크입니다.');
            setLoading(false);
            return;
        }
        apiClient.get(`/guest-submissions/${id}/status`, { params: { token } })
            .then(res => setData(res.data))
            .catch(() => setError('제출 내역을 찾을 수 없습니다. 링크를 다시 확인해주세요.'))
            .finally(() => setLoading(false));
    }, [id, token]);

    const meta = data ? (STATUS_META[data.status] || STATUS_META.pending) : null;

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[440px] p-8 space-y-6 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <Link to="/" className="flex items-center justify-center w-14 h-14 rounded-2xl mb-2">
                            <img src={logo} alt="" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">제출 진행 상태</h1>
                    </div>

                    {loading ? (
                        <p className="text-center text-sm text-muted-foreground py-8">불러오는 중...</p>
                    ) : error ? (
                        <div className="px-4 py-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl text-center">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-2 py-4">
                                <span className="text-5xl">{meta.icon}</span>
                                <span className={`text-lg font-black ${meta.color}`}>{meta.label}</span>
                                <p className="text-sm text-muted-foreground text-center leading-relaxed px-2">{meta.desc}</p>
                            </div>

                            {data.status === 'rejected' && data.admin_note && (
                                <div className="px-4 py-3 rounded-xl border-2 border-destructive/20 bg-destructive/5 text-left">
                                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-1">반려 사유</p>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{data.admin_note}</p>
                                </div>
                            )}

                            <div className="rounded-xl border-2 border-border bg-muted/20 divide-y divide-border/50 text-sm">
                                {data.need_post && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-muted-foreground">응답 게시글</span>
                                        <span className="font-bold text-foreground text-right">🐶 {data.need_post.title}</span>
                                    </div>
                                )}
                                {data.organization && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-muted-foreground">신청 단체</span>
                                        <span className="font-bold text-foreground">{data.organization.name}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-muted-foreground">제출일</span>
                                    <span className="font-bold text-foreground">{formatDate(data.submitted_at)}</span>
                                </div>
                                {data.reviewed_at && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-muted-foreground">처리일</span>
                                        <span className="font-bold text-foreground">{formatDate(data.reviewed_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <Link to="/board" className="text-xs font-bold text-primary hover:underline">← 구해요 게시판으로</Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
