import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import SelectField from '../ui/SelectField';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = {
    title: '',
    arrivalAirport: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    flightInfo: '',
    airline: '',
    capacity: 1,
    cabinCapacity: 0,
    cargoCapacity: 0,
    managerName: '',
    contact: '',
    memo: '',
    ownerUserId: ''
};

export default function GuestSubmissionReviewModal({ isOpen, onClose, submission, onReviewed }) {
    const { apiClient, airports, airlines } = useAuth();

    const [form, setForm] = useState(emptyForm);
    const [users, setUsers] = useState([]);
    const [imageUrl, setImageUrl] = useState('');
    const [showReject, setShowReject] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [passportUrl, setPassportUrl] = useState('');
    const [seatConfirmUrl, setSeatConfirmUrl] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !submission) {
            setForm(emptyForm);
            setShowReject(false);
            setAdminNote('');
            setPassportUrl('');
            setSeatConfirmUrl('');
            setError('');
            return;
        }

        setForm({
            ...emptyForm,
            contact: submission.phone || '',
            airline: submission.airline || ''
        });

        apiClient.get('/users')
            .then(res => setUsers(res.data))
            .catch(() => setUsers([]));

        if (submission.verification_method === 'eticket_image') {
            apiClient.get(`/guest-submissions/${submission.id}/image`, { responseType: 'blob' })
                .then(res => setImageUrl(URL.createObjectURL(res.data)))
                .catch(() => setImageUrl(''));
        } else {
            setImageUrl('');
        }

        // 출국 준비 파일(민감)은 제출된 경우에만 격리 서빙에서 blob으로 가져온다.
        if (submission.has_passport) {
            apiClient.get(`/guest-submissions/${submission.id}/passport`, { responseType: 'blob' })
                .then(res => setPassportUrl(URL.createObjectURL(res.data)))
                .catch(() => setPassportUrl(''));
        } else {
            setPassportUrl('');
        }
        if (submission.has_seat_confirm) {
            apiClient.get(`/guest-submissions/${submission.id}/seat-confirm`, { responseType: 'blob' })
                .then(res => setSeatConfirmUrl(URL.createObjectURL(res.data)))
                .catch(() => setSeatConfirmUrl(''));
        } else {
            setSeatConfirmUrl('');
        }
    }, [isOpen, submission, apiClient]);

    useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
    useEffect(() => () => { if (passportUrl) URL.revokeObjectURL(passportUrl); }, [passportUrl]);
    useEffect(() => () => { if (seatConfirmUrl) URL.revokeObjectURL(seatConfirmUrl); }, [seatConfirmUrl]);

    if (!submission) return null;

    const handleChange = (field, value) => {
        setForm(prev => {
            const newForm = { ...prev, [field]: value };
            if (field === 'departureDate' && (!prev.arrivalDate || prev.arrivalDate < value)) {
                newForm.arrivalDate = value;
            }
            return newForm;
        });
    };

    const handleApprove = async () => {
        setError('');
        if (!form.departureDate) {
            setError('출발일을 선택해주세요.');
            return;
        }
        if (!form.arrivalAirport) {
            setError('도착 공항을 선택하거나 입력해주세요.');
            return;
        }
        if (!form.airline) {
            setError('항공사를 선택하거나 입력해주세요.');
            return;
        }
        if (!form.managerName.trim()) {
            setError('담당자명을 입력해주세요.');
            return;
        }

        const payload = {
            title: form.title.trim() || '티켓 나눔 (상세 확인)',
            arrival_airport: form.arrivalAirport,
            departure_date: form.departureDate,
            departure_time: form.departureTime,
            arrival_date: form.arrivalDate || form.departureDate,
            arrival_time: form.arrivalTime,
            flight_info: form.flightInfo,
            airline: form.airline,
            capacity: form.capacity,
            cabin_capacity: form.cabinCapacity,
            cargo_capacity: form.cargoCapacity,
            manager_name: form.managerName,
            contact: form.contact,
            memo: form.memo,
            owner_user_id: form.ownerUserId || null
        };

        try {
            await apiClient.post(`/guest-submissions/${submission.id}/approve`, payload);
            onReviewed();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '승인에 실패했습니다.');
        }
    };

    const handleReject = async () => {
        try {
            await apiClient.post(`/guest-submissions/${submission.id}/reject`, { admin_note: adminNote });
            onReviewed();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '반려에 실패했습니다.');
        }
    };


    const footer = (
        <div className="flex items-center justify-end w-full gap-2 flex-wrap">
            <button
                className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors"
                onClick={onClose}
            >
                취소
            </button>
            <button
                className="px-4 py-2 text-sm font-bold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
                onClick={() => setShowReject(v => !v)}
            >
                반려 (자리 없음)
            </button>
            <button
                className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={handleApprove}
            >
                승인 (예약 완료)
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📋 티켓 제출 검토" footer={footer} error={error}>
            <div className="space-y-6">
                <div className="p-4 rounded-xl border-2 border-border bg-muted/30 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">제출 정보</div>
                    <div className="text-sm"><span className="font-bold">전화번호:</span> {submission.phone}</div>
                    {submission.kakao_id && (
                        <div className="text-sm"><span className="font-bold">카카오톡 아이디:</span> {submission.kakao_id}</div>
                    )}
                    <div className="text-sm"><span className="font-bold">항공사(제출자 입력):</span> {submission.airline || '-'}</div>
                    {submission.organization && (
                        <div className="text-sm"><span className="font-bold">지정 단체:</span> {submission.organization.name}</div>
                    )}
                    {submission.need_post && (
                        <div className="text-sm"><span className="font-bold">응답한 게시글:</span> 🐶 {submission.need_post.title}</div>
                    )}
                    {submission.status === 'approved' && (
                        submission.departure_submitted ? (
                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                <div className="text-xs font-bold text-green">🛫 출국 준비 서류 제출됨</div>
                                {submission.dep_name && <div className="text-sm"><span className="font-bold">성함:</span> {submission.dep_name}</div>}
                                {submission.dep_departure_date && <div className="text-sm"><span className="font-bold">출국일:</span> {submission.dep_departure_date}</div>}
                                {submission.dep_destination && <div className="text-sm"><span className="font-bold">목적지:</span> {submission.dep_destination}</div>}
                                {submission.dep_address && <div className="text-sm"><span className="font-bold">주소:</span> {submission.dep_address}</div>}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {passportUrl && <a href={passportUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">📄 여권 사본 보기</a>}
                                    {seatConfirmUrl && <a href={seatConfirmUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">🎫 자리 확약 캡쳐 보기</a>}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs font-bold text-amber-600">⏳ 출국 준비 서류 제출 대기 중</div>
                        )
                    )}
                    {submission.verification_method === 'eticket_image' ? (
                        <>
                            {imageUrl ? (
                                <a href={imageUrl} target="_blank" rel="noreferrer">
                                    <img src={imageUrl} alt="e티켓" className="max-h-64 rounded-lg border-2 border-border mt-2" />
                                </a>
                            ) : (
                                <div className="text-xs text-muted-foreground">이미지를 불러오는 중...</div>
                            )}
                            {submission.eticket_drive_url && (
                                <a
                                    href={submission.eticket_drive_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block text-xs font-bold text-primary hover:underline"
                                >
                                    📁 구글 드라이브 백업본 보기
                                </a>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-sm"><span className="font-bold">예약번호:</span> {submission.reservation_number}</div>
                            <div className="text-sm"><span className="font-bold">탑승객 영문명:</span> {submission.passenger_last_name_en} {submission.passenger_first_name_en}</div>
                        </>
                    )}
                </div>

                {showReject ? (
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">반려 사유</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="예: 해당 항공편에 반려동물 자리가 없습니다."
                        />
                        <button
                            className="w-full h-11 text-sm font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
                            onClick={handleReject}
                        >
                            반려 확정
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">실제 항공편 정보 입력</div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">티켓 제목 (미입력 시 자동 생성)</label>
                            <input
                                className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                value={form.title}
                                onChange={e => handleChange('title', e.target.value)}
                                placeholder="예: 4월 뉴욕행 티켓 나눔합니다"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    출발일<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="date"
                                    value={form.departureDate}
                                    onChange={e => handleChange('departureDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">출발 시간</label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="time"
                                    value={form.departureTime}
                                    onChange={e => handleChange('departureTime', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    도착일<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="date"
                                    value={form.arrivalDate}
                                    onChange={e => handleChange('arrivalDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">도착 시간</label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="time"
                                    value={form.arrivalTime}
                                    onChange={e => handleChange('arrivalTime', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SelectField
                                label={<>도착 공항<span className="text-destructive ml-0.5">*</span></>}
                                options={airports}
                                value={form.arrivalAirport}
                                onChange={val => handleChange('arrivalAirport', val)}
                                placeholder="공항 선택 또는 직접 입력"
                            />
                            <SelectField
                                label={<>항공사<span className="text-destructive ml-0.5">*</span></>}
                                options={airlines}
                                value={form.airline}
                                onChange={val => handleChange('airline', val)}
                                placeholder="항공사 선택 또는 직접 입력"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">항공편 정보</label>
                            <input
                                className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                value={form.flightInfo}
                                onChange={e => handleChange('flightInfo', e.target.value)}
                                placeholder="예: ICN → JFK KE081"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">기내(마리)</label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="number"
                                    min="0"
                                    value={form.cabinCapacity === 0 ? '' : form.cabinCapacity}
                                    onChange={e => handleChange('cabinCapacity', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">수하물(마리)</label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    type="number"
                                    min="0"
                                    value={form.cargoCapacity === 0 ? '' : form.cargoCapacity}
                                    onChange={e => handleChange('cargoCapacity', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                                    담당자명<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    value={form.managerName}
                                    onChange={e => handleChange('managerName', e.target.value)}
                                    placeholder="제출자 이름"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">연락처</label>
                                <input
                                    className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                    value={form.contact}
                                    onChange={e => handleChange('contact', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">소유 회원 지정 (선택)</label>
                            <select
                                className="h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                value={form.ownerUserId}
                                onChange={e => handleChange('ownerUserId', e.target.value)}
                            >
                                <option value="">지정 안 함 (관리자 관리)</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email}){u.organization?.name ? ` - ${u.organization.name}` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">메모</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                                value={form.memo}
                                onChange={e => handleChange('memo', e.target.value)}
                                placeholder="추가 정보..."
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
