import { ActionLink, Badge, Button, FieldLabel, Input, NativeSelect, Textarea } from '../ui/primitives.js';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import SelectField from '../ui/SelectField';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor, getAirportLabel } from '../../utils/airportUtils';

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
    const { apiClient, airports, airlines, rawAirports } = useAuth();

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
            title: form.title.trim() || `${form.arrivalAirport} ${form.departureDate} 이동봉사`.trim(),
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

    const handleDeleteDeparture = async () => {
        if (!window.confirm('제출자의 출국 준비 개인정보(여권 사본·자리확약 캡쳐 등)를 영구 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
        setError('');
        try {
            await apiClient.delete(`/guest-submissions/${submission.id}/departure-info`);
            onReviewed();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '삭제에 실패했습니다.');
        }
    };


    const footer = (
        <div className="flex items-center justify-end w-full gap-2 flex-wrap">
            <Button
                variant="secondary"
                onClick={onClose}
            >
                취소
            </Button>
            <Button
                variant="rejectSubmission"
                onClick={() => setShowReject(v => !v)}
            >
                반려 (자리 없음)
            </Button>
            <Button
                variant="save"
                onClick={handleApprove}
            >
                승인 (예약 완료)
            </Button>
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
                        <div className="text-sm">
                            <span className="font-bold">응답한 게시글:</span> 🐶 {submission.need_post.title}
                            {submission.need_post.airport_code && (
                                <>
                                    <Badge variant="guestSubmissionReview"
                                        style={(() => { const c = getAirportColor(submission.need_post.airport_code, rawAirports); return { backgroundColor: c.bg, color: c.text, borderColor: c.bg }; })()}
                                    >
                                        ✈ {submission.need_post.airport_code}
                                    </Badge>
                                    <span className="ml-1.5 text-xs text-muted-foreground">{getAirportLabel(submission.need_post.airport_code, airports)}</span>
                                </>
                            )}
                        </div>
                    )}
                    {submission.status === 'approved' && (
                        !submission.departure_submitted ? (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs font-bold text-amber-600">⏳ 출국 준비 서류 제출 대기 중</div>
                        ) : (!submission.has_passport && !submission.has_seat_confirm && !submission.dep_address) ? (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs font-bold text-muted-foreground">🗑️ 출국 준비 개인정보가 삭제되었습니다</div>
                        ) : (
                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                <div className="text-xs font-bold text-green">🛫 출국 준비 서류 제출됨</div>
                                {submission.dep_address && <div className="text-sm"><span className="font-bold">주소:</span> {submission.dep_address}</div>}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {passportUrl && <ActionLink href={passportUrl} target="_blank" rel="noreferrer" variant="signupChoice2">📄 여권 사본 보기</ActionLink>}
                                    {seatConfirmUrl && <ActionLink href={seatConfirmUrl} target="_blank" rel="noreferrer" variant="signupChoice2">🎫 자리 확약 캡쳐 보기</ActionLink>}
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleDeleteDeparture}
                                    variant="requestDetails"
                                >
                                    출국 준비 개인정보 삭제
                                </Button>
                            </div>
                        )
                    )}
                    {submission.verification_method === 'eticket_image' ? (
                        <>
                            {imageUrl ? (
                                <ActionLink variant="plain" href={imageUrl} target="_blank" rel="noreferrer">
                                    <img src={imageUrl} alt="e티켓" className="max-h-64 rounded-lg border-2 border-border mt-2" />
                                </ActionLink>
                            ) : (
                                <div className="text-xs text-muted-foreground">이미지를 불러오는 중...</div>
                            )}
                            {submission.eticket_drive_url && (
                                <ActionLink
                                    href={submission.eticket_drive_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="generalHome"
                                >
                                    📁 구글 드라이브 백업본 보기
                                </ActionLink>
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
                        <FieldLabel variant="default">반려 사유</FieldLabel>
                        <Textarea
                            variant="short"
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="예: 해당 항공편에 반려동물 자리가 없습니다."
                        />
                        <Button
                            variant="confirmReject"
                            onClick={handleReject}
                        >
                            반려 확정
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">실제 항공편 정보 입력</div>

                        <div className="space-y-2">
                            <FieldLabel variant="default">티켓 제목 (미입력 시 자동 생성)</FieldLabel>
                            <Input
                                variant="default"
                                value={form.title}
                                onChange={e => handleChange('title', e.target.value)}
                                placeholder="예: JFK 4월 뉴욕행 이동봉사 (미입력 시 자동 생성)"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FieldLabel variant="default">
                                    출발일<span className="text-destructive ml-0.5">*</span>
                                </FieldLabel>
                                <Input
                                    variant="default"
                                    type="date"
                                    value={form.departureDate}
                                    onChange={e => handleChange('departureDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">출발 시간</FieldLabel>
                                <Input
                                    variant="default"
                                    type="time"
                                    value={form.departureTime}
                                    onChange={e => handleChange('departureTime', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FieldLabel variant="default">
                                    도착일<span className="text-destructive ml-0.5">*</span>
                                </FieldLabel>
                                <Input
                                    variant="default"
                                    type="date"
                                    value={form.arrivalDate}
                                    onChange={e => handleChange('arrivalDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">도착 시간</FieldLabel>
                                <Input
                                    variant="default"
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
                            <FieldLabel variant="default">항공편 정보</FieldLabel>
                            <Input
                                variant="default"
                                value={form.flightInfo}
                                onChange={e => handleChange('flightInfo', e.target.value)}
                                placeholder="예: ICN → JFK KE081"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FieldLabel variant="default">기내(마리)</FieldLabel>
                                <Input
                                    variant="default"
                                    type="number"
                                    min="0"
                                    value={form.cabinCapacity === 0 ? '' : form.cabinCapacity}
                                    onChange={e => handleChange('cabinCapacity', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">수하물(마리)</FieldLabel>
                                <Input
                                    variant="default"
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
                                <FieldLabel variant="default">
                                    담당자명<span className="text-destructive ml-0.5">*</span>
                                </FieldLabel>
                                <Input
                                    variant="default"
                                    value={form.managerName}
                                    onChange={e => handleChange('managerName', e.target.value)}
                                    placeholder="제출자 이름"
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel variant="default">연락처</FieldLabel>
                                <Input
                                    variant="default"
                                    value={form.contact}
                                    onChange={e => handleChange('contact', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <FieldLabel variant="default">소유 회원 지정 (선택)</FieldLabel>
                            <NativeSelect
                                variant="default"
                                value={form.ownerUserId}
                                onChange={e => handleChange('ownerUserId', e.target.value)}
                            >
                                <option value="">지정 안 함 (관리자 관리)</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email}){u.organization?.name ? ` - ${u.organization.name}` : ''}</option>
                                ))}
                            </NativeSelect>
                        </div>

                        <div className="space-y-2">
                            <FieldLabel variant="default">메모</FieldLabel>
                            <Textarea
                                variant="short"
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
