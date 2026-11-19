import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Alert, Badge, Button, Card, Heading, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/primitives.js';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import { getAirportColor, getAirportLabel } from '../utils/airportUtils';
import GuestSubmissionReviewModal from '../components/modals/GuestSubmissionReviewModal';

const STATUS_TABS = [
    { key: 'pending', label: '검토 대기' },
    { key: 'approved', label: '승인됨' },
    { key: 'rejected', label: '반려됨' },
    { key: 'all', label: '전체' },
];

const statusLabel = (s) => (s === 'approved' ? '✅ 승인됨' : s === 'rejected' ? '❌ 반려됨' : '⏳ 검토 대기');
const methodLabel = (m) => (m === 'eticket_image' ? '📷 이미지' : '🔢 예약번호');

// 제출이 응답한 '구해요' 게시글의 도착 공항을 색상 배지로 보여준다.
// 좁은 목록에서는 코드만 노출하고, 전체 공항명은 툴팁으로 보여준다.
function AirportBadge({ code, airports, rawAirports }) {
    if (!code) return null;
    const colors = getAirportColor(code, rawAirports);
    return (
        <Badge
            variant="submissionReview"
            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
            title={getAirportLabel(code, airports)}
        >
            ✈ {code}
        </Badge>
    );
}

export default function SubmissionReviewView() {
    const { apiClient, airports, rawAirports } = useAuth();
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

    const handleDelete = async (item) => {
        if (!window.confirm('이 제출 내역을 삭제할까요?\n승인되어 만들어진 일정은 그대로 유지됩니다.')) return;
        try {
            await apiClient.delete(`/guest-submissions/${item.id}`);
            fetchData();
        } catch {
            alert('삭제에 실패했습니다.');
        }
    };

    const renderRows = () => {
        if (loading) return <LoadingSkeleton variant="table" columns={7} label="제출 내역을 불러오는 중입니다." />;
        if (error) return <Alert variant="admin">{error}</Alert>;
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
                    <Table variant="default">
                        <TableHead variant="plain">
                            <TableRow variant="adminUi">
                                <TableHeaderCell variant="admin">전화번호</TableHeaderCell>
                                <TableHeaderCell variant="admin">증빙</TableHeaderCell>
                                <TableHeaderCell variant="admin">응답 게시글</TableHeaderCell>
                                <TableHeaderCell variant="admin">공항</TableHeaderCell>
                                <TableHeaderCell variant="admin">상태</TableHeaderCell>
                                <TableHeaderCell variant="admin">제출일</TableHeaderCell>
                                <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody variant="adminUi">
                            {submissions.map(s => (
                                <TableRow key={s.id} variant="adminUi2">
                                    <TableCell variant="admin6">{s.phone}</TableCell>
                                    <TableCell variant="admin9">{methodLabel(s.verification_method)}</TableCell>
                                    <TableCell variant="admin4">{s.need_post ? `🐶 ${s.need_post.title}` : '-'}</TableCell>
                                    <TableCell variant="admin9">{s.need_post ? <AirportBadge code={s.need_post.airport_code} airports={airports} rawAirports={rawAirports} /> : '-'}</TableCell>
                                    <TableCell variant="admin9">{statusLabel(s.status)}</TableCell>
                                    <TableCell variant="admin4">{new Date(s.submitted_at).toLocaleDateString()}</TableCell>
                                    <TableCell variant="admin5">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="secondarySmall" onClick={() => handleReview(s)}>
                                                {s.status === 'pending' ? '검토' : '상세'}
                                            </Button>
                                            <Button variant="dangerSmall" onClick={() => handleDelete(s)}>
                                                삭제
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {/* Mobile */}
                <div className="sm:hidden divide-y divide-border">
                    {submissions.map(s => (
                        <div key={s.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">{s.phone}</span>
                                <span className="text-[10px] font-bold">{statusLabel(s.status)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
                                <span>{methodLabel(s.verification_method)}{s.need_post ? ` · 🐶 ${s.need_post.title}` : ''}</span>
                                {s.need_post && <AirportBadge code={s.need_post.airport_code} airports={airports} rawAirports={rawAirports} />}
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="secondaryMobile" onClick={() => handleReview(s)}>
                                    {s.status === 'pending' ? '검토' : '상세'}
                                </Button>
                                <Button variant="dangerMobile" onClick={() => handleDelete(s)}>
                                    삭제
                                </Button>
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
                <Heading as="h1" variant="page">제출 검토</Heading>
                <p className="text-sm text-muted-foreground">우리 단체로 접수된 이동봉사 티켓 제출을 승인하거나 반려합니다.</p>
            </div>

            <Card variant="admin">
                <div className="flex items-center gap-1 border-b px-2 bg-muted/30 overflow-x-auto scrollbar-hide">
                    {STATUS_TABS.map(t => (
                        <Button
                            key={t.key}
                            variant="tab" active={statusFilter === t.key}
                            onClick={() => setStatusFilter(t.key)}
                        >
                            {t.label}
                        </Button>
                    ))}
                </div>
                <div className="flex-1 animate-in fade-in duration-300">
                    {renderRows()}
                </div>
            </Card>

            <GuestSubmissionReviewModal
                isOpen={reviewModal.isOpen}
                onClose={reviewModal.closeModal}
                submission={selected}
                onReviewed={fetchData}
            />
        </div>
    );
}
