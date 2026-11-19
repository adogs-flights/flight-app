import Modal from '../ui/Modal';
import RescueDogRecordPanel from '../RescueDogRecordPanel';
import RescueDogExpensePanel from '../RescueDogExpensePanel';
import {
    formatDogAge,
    formatDogDate,
    getSexLabel,
    getStatusLabel,
    getStatusStyle,
} from '../../utils/rescueDogUtils';

function Row({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-border/60 last:border-b-0">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="text-sm font-bold text-right text-foreground break-all whitespace-pre-wrap">
                {value || <span className="text-muted-foreground/60">-</span>}
            </span>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="space-y-1">
            <h4 className="text-sm font-black text-foreground mb-2">{title}</h4>
            <div className="px-4 py-2 rounded-xl border-2 border-border bg-muted/20">{children}</div>
        </div>
    );
}

export default function RescueDogDetailModal({ isOpen, onClose, dog, onEditClick, onDeleteClick, onRecordsChanged }) {
    if (!dog) return null;

    const age = formatDogAge(dog.birth_on);

    const handleDelete = () => {
        if (!window.confirm(`'${dog.name}' 정보를 삭제할까요? 되돌릴 수 없습니다.`)) return;
        onDeleteClick(dog.id);
        onClose();
    };

    const footer = dog.can_edit ? (
        <div className="flex items-center justify-between w-full gap-2">
            <button
                className="px-4 py-2 text-sm font-bold rounded-md text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                onClick={handleDelete}
            >
                삭제
            </button>
            <button
                className="px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={() => { onEditClick(dog); onClose(); }}
            >
                수정하기
            </button>
        </div>
    ) : (
        <span className="text-xs font-bold text-muted-foreground">담당 단체만 수정할 수 있습니다.</span>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`🐕 ${dog.name}`} footer={footer}>
            <div className="space-y-5">
                {/* 사진 + 상태 */}
                <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted">
                    {dog.has_photo ? (
                        <img src={`/api/rescue-dogs/${dog.id}/photo`} alt={dog.name} className="w-full h-56 object-cover" />
                    ) : (
                        <div className="w-full h-40 flex flex-col items-center justify-center gap-1 text-primary/40">
                            <span className="text-5xl">🐕</span>
                            <span className="text-[11px] font-bold">사진 준비 중</span>
                        </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm ${getStatusStyle(dog.status)}`}>
                            {getStatusLabel(dog.status)}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm ${dog.is_neutered ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-900/75 text-white border-transparent'}`}>
                            {dog.is_neutered ? '중성화 완료' : '중성화 미완'}
                        </span>
                    </div>
                </div>

                <Section title="구조견 정보">
                    <Row label="이름" value={dog.name} />
                    <Row label="공고번호" value={dog.notice_number} />
                    <Row label="구조일" value={formatDogDate(dog.rescued_on)} />
                    <Row label="생년월일" value={dog.birth_on ? `${formatDogDate(dog.birth_on)}${age ? ` (${age})` : ''}` : null} />
                    <Row label="성별" value={getSexLabel(dog.sex)} />
                    <Row label="구조 장소" value={dog.rescue_place} />
                    <Row label="내장칩 번호" value={dog.microchip_number} />
                    <Row label="담당 단체" value={dog.organization?.name} />
                    <Row label="비고" value={dog.note} />
                </Section>

                <div className="space-y-2">
                    <h4 className="text-sm font-black text-foreground">접종 · 검진 · 모니터링</h4>
                    <RescueDogRecordPanel dog={dog} onRecordsChanged={onRecordsChanged} />
                </div>

                {!dog.can_edit ? (
                    /* 다른 단체의 개체. 임보·입양 개인정보는 응답에서 비워져 온다.
                       권한이 없으면 값이 비어 있든 가려졌든 섹션 자체를 띄우지 않고,
                       private_hidden으로 "가려진 내용이 실제로 있는지"만 덧붙인다. */
                    <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-border bg-muted/20">
                        <span className="text-lg">🔒</span>
                        <p className="text-xs font-bold leading-relaxed text-muted-foreground">
                            임보·입양 담당자 정보는 개인정보라 담당 단체
                            {dog.organization?.name ? ` (${dog.organization.name})` : ''}만 볼 수 있습니다.
                            {!dog.private_hidden && ' (현재 등록된 내용은 없습니다.)'}
                        </p>
                    </div>
                ) : (
                    <>
                        <Section title="임보">
                            <Row label="임보자명" value={dog.foster_name} />
                            <Row label="연락처" value={dog.foster_contact} />
                            <Row label="주소" value={dog.foster_address} />
                            <Row label="비고" value={dog.foster_note} />
                        </Section>

                        <Section title="입양">
                            <Row label="입양일" value={formatDogDate(dog.adopted_on)} />
                            <Row label="입양자명" value={dog.adopter_name} />
                            <Row label="연락처" value={dog.adopter_contact} />
                            <Row label="주소" value={dog.adopter_address} />
                            <Row label="이메일" value={dog.adopter_email} />
                            <Row label="비고" value={dog.adoption_note} />
                        </Section>

                        {/* 금액·부담자는 단체 내부 정산 정보라 담당 단체 영역 안에 둔다. */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-black text-foreground">비용 · 정산</h4>
                            <RescueDogExpensePanel dog={dog} onExpensesChanged={onRecordsChanged} />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
