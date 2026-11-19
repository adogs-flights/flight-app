import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { ActionLink, Alert, Button, Card, FieldLabel, Heading, Input } from '../components/ui/primitives.js';
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';





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
                <FieldLabel variant="default">주소</FieldLabel>
                <Input variant="flex" value={address} onChange={e => setAddress(e.target.value)} placeholder="출국 준비 서류에 기재될 주소" />
            </div>
            <div className="space-y-2">
                <FieldLabel variant="default">여권 사본</FieldLabel>
                <Input variant="document" type="file" accept="image/*,application/pdf" onChange={e => setPassport(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
                <FieldLabel variant="default">반려동물 자리 확약 캡쳐</FieldLabel>
                <Input variant="document" type="file" accept="image/*,application/pdf" onChange={e => setSeatConfirm(e.target.files?.[0] || null)} />
            </div>

            <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg leading-relaxed">
                🔒 제공하신 정보는 출국 준비 서류에만 사용되며, 다른 용도로 쓰지 않습니다. 해외이동봉사 종료 시 삭제됩니다.
            </div>

            {error && (
                <Alert variant="generalSignup">{error}</Alert>
            )}

            <Button
                type="submit"
                disabled={submitting}
                variant="submitDocuments"
            >
                {submitting ? '제출 중…' : '출국 준비 서류 제출하기'}
            </Button>
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
        if (loading) return <LoadingSkeleton variant="status" />;
        if (error) return <Alert variant="submissionStatus">{error}</Alert>;

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
                        <Alert variant="submissionStatus2">
                            <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-1">안내</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{data.admin_note}</p>
                        </Alert>
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
                <Alert variant="submissionStatus3">
                    다시 한 번 아이들을 위해 도움 주셔서 감사드립니다 🙂<br />
                    출국일로부터 <b>1~2주 전</b>, 출국 준비를 위한 카톡방에 초대해 드리겠습니다!
                </Alert>

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
                <Card variant="submissionStatus">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <ActionLink as={Link} to="/" variant="generalSignup">
                            <img src={logo} alt="" />
                        </ActionLink>
                        <Heading as="h1" variant="page">제출 진행 상태</Heading>
                        {!loading && !error && data?.need_post && (
                            <p className="text-xs text-muted-foreground">🐶 {data.need_post.title}</p>
                        )}
                    </div>

                    {renderBody()}

                    <div className="text-center pt-2">
                        <ActionLink as={Link} to="/board" variant="signupChoice2">← 구해요 게시판으로</ActionLink>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
