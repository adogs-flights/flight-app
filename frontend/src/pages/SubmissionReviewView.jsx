import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import GuestSubmissionReviewModal from '../components/modals/GuestSubmissionReviewModal';

const STATUS_TABS = [
    { key: 'pending', label: '검토 대기' },
    { key: 'approved', label: '승인됨' },
    { key: 'rejected', label: '반려됨' },
    { key: 'all', label: '전체' },
];

const statusLabel = (s) => (s === 'approved' ? '✅ 승인됨' : s === 'rejected' ? '❌ 반려됨' : '⏳ 검토 대기');
const methodLabel = (m) => (m === 'eticket_image' ? '📷 이미지' : '🔢 예약번호');

export default function SubmissionReviewView() {
    const { apiClient } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [selected, setSelected] = useState(null);
    const reviewModal = useModal();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = statusFilter === 'all' ? {} : { submission_status: statusFilter };
            const res = await apiClient.get('/guest-submissions', { params });
            setSubmissions(res.data);
        } catch {
            setError('제출 내역을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleReview = (item) => {
        setSelected(item);
        reviewModal.openModal();
    };

    const renderRows = () => {
        if (loading) return <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">불러오는 중...</div>;
        if (error) return <div className="m-4 px-4 py-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">{error}</div>;
        if (submissions.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[240px] gap-2 text-muted-foreground">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm">해당 상태의 제출 내역이 없습니다.</p>
                </div>
            );
        }
        return (
            <>
                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <th className="px-6 py-4">전화번호</th>
                                <th className="px-6 py-4">증빙</th>
                                <th className="px-6 py-4">응답 게시글</th>
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">제출일</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {submissions.map(s => (
                                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-foreground">{s.phone}</td>
                                    <td className="px-6 py-4 text-xs">{methodLabel(s.verification_method)}</td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">{s.need_post ? `🐶 ${s.need_post.title}` : '-'}</td>
                                    <td className="px-6 py-4 text-xs">{statusLabel(s.status)}</td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleReview(s)}>
                                            {s.status === 'pending' ? '검토' : '상세'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile */}
                <div className="sm:hidden divide-y divide-border">
                    {submissions.map(s => (
                        <div key={s.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">{s.phone}</span>
                                <span className="text-[10px] font-bold">{statusLabel(s.status)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{methodLabel(s.verification_method)}{s.need_post ? ` · 🐶 ${s.need_post.title}` : ''}</div>
                            <div className="flex items-center justify-end">
                                <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleReview(s)}>
                                    {s.status === 'pending' ? '검토' : '상세'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">제출 검토</h1>
                <p className="text-sm text-muted-foreground">우리 단체로 접수된 이동봉사 티켓 제출을 승인하거나 반려합니다.</p>
            </div>

            <div className="flex flex-col bg-card rounded-xl border-2 border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="flex items-center gap-1 border-b px-2 bg-muted/30 overflow-x-auto scrollbar-hide">
                    {STATUS_TABS.map(t => (
                        <button
                            key={t.key}
                            className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${statusFilter === t.key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            onClick={() => setStatusFilter(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 animate-in fade-in duration-300">
                    {renderRows()}
                </div>
            </div>

            <GuestSubmissionReviewModal
                isOpen={reviewModal.isOpen}
                onClose={reviewModal.closeModal}
                submission={selected}
                onReviewed={fetchData}
            />
        </div>
    );
}
