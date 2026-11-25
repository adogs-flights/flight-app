import { Alert, Badge, Button, FieldLabel, Input, Textarea } from '../ui/primitives.js';
import { useCallback, useEffect, useState } from 'react';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import { useAuth } from '../../hooks/useAuth';
import {
    CHECKLIST_DOCUMENT_FIELDS,
    formatCompletedAt,
    getChecklistLabelClass,
    getChecklistPercent,
    getChecklistRowClass,
    getDocumentChipClass,
} from '../../utils/ticketChecklistUtils';


const EMPTY_DRAFT = { label: '', note: '' };

/** 항목 추가·수정에 함께 쓰는 폼. */
function ChecklistItemForm({ draft, onChange, onSubmit, onCancel, saving }) {
    return (
        <div className="space-y-2 p-3 rounded-xl border-2 border-primary/30 bg-primary/5">
            <Input
                variant="compact"
                value={draft.label}
                onChange={e => onChange('label', e.target.value)}
                placeholder="준비할 항목 (예: 켄넬 대여 확인)"
            />
            <Textarea
                variant="short"
                value={draft.note}
                onChange={e => onChange('note', e.target.value)}
                placeholder="메모 (담당자, 연락처, 특이사항 등)"
            />
            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="rescueRecordCancel" onClick={onCancel}>
                    취소
                </Button>
                <Button type="button" variant="rescueRecordSave" onClick={onSubmit} disabled={saving}>
                    {saving ? '저장 중…' : '저장'}
                </Button>
            </div>
        </div>
    );
}

// 티켓별 출국 준비 체크리스트. 기한 없이 완료 여부만 다루고, 기존 출국 준비
// 추가정보(주소·여권·자리확약·e티켓)는 읽기 전용 진행률로만 함께 보여준다.
// 소유자·관리자만 보는 영역이므로 티켓 상세의 공유 이미지 캡처 밖에 둔다.
export default function TicketChecklistSection({ ticket, canManage }) {
    const { apiClient } = useAuth();
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // null = 폼 닫힘, 'new' = 추가, 그 외 = 해당 항목 id 수정 중
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    const ticketId = ticket?.id;

    const fetchChecklist = useCallback(async () => {
        if (!ticketId) return;
        setLoading(true);
        try {
            const response = await apiClient.get(`/tickets/${ticketId}/checklist`);
            setChecklist(response.data);
            setError('');
        } catch {
            // 조회 실패 시에도 로딩을 끝내 스켈레톤이 남지 않게 한다.
            setError('체크리스트를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, ticketId]);

    useEffect(() => {
        fetchChecklist();
    }, [fetchChecklist]);

    // 다른 티켓으로 바뀌면 열려 있던 폼을 닫는다.
    useEffect(() => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    }, [ticketId]);

    const handleDraftChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const closeForm = () => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    };

    const openCreate = () => {
        setDraft(EMPTY_DRAFT);
        setEditing('new');
    };

    const openEdit = (item) => {
        setDraft({ label: item.label || '', note: item.note || '' });
        setEditing(item.id);
    };

    const handleSubmit = async () => {
        if (!draft.label.trim()) {
            setError('항목 이름을 입력해주세요.');
            return;
        }
        setSaving(true);
        try {
            const payload = { label: draft.label.trim(), note: draft.note.trim() || null };
            const response = editing === 'new'
                ? await apiClient.post(`/tickets/${ticketId}/checklist`, payload)
                : await apiClient.put(`/tickets/${ticketId}/checklist/${editing}`, payload);
            setChecklist(response.data);
            setError('');
            closeForm();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (item) => {
        try {
            const response = await apiClient.put(
                `/tickets/${ticketId}/checklist/${item.id}`,
                { is_done: !item.is_done },
            );
            setChecklist(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || '완료 상태를 바꾸지 못했습니다.');
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`'${item.label}' 항목을 삭제하시겠습니까?`)) return;
        try {
            const response = await apiClient.delete(`/tickets/${ticketId}/checklist/${item.id}`);
            setChecklist(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || '삭제에 실패했습니다.');
        }
    };

    const handleRestoreTemplate = async () => {
        try {
            const response = await apiClient.post(`/tickets/${ticketId}/checklist/restore-template`);
            setChecklist(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || '기본 항목을 복원하지 못했습니다.');
        }
    };

    const items = checklist?.items || [];
    const total = checklist?.total || 0;
    const done = checklist?.done || 0;
    const percent = getChecklistPercent(done, total);
    const documents = checklist?.documents;
    const missingCount = checklist?.missing_template_keys?.length || 0;

    return (
        <div className="mt-4 pt-4 border-t-2 border-border/50 px-1">
            <div className="flex items-center justify-between gap-3">
                <FieldLabel variant="ticketDeparture">출국 준비 체크리스트</FieldLabel>
                {!loading && !error && (
                    <Badge variant="ticketChecklistProgress">
                        {done}/{total} 완료
                    </Badge>
                )}
            </div>

            {loading ? (
                <LoadingSkeleton variant="checklist" label="출국 준비 체크리스트를 불러오는 중입니다." />
            ) : (
                <div className="mt-3 space-y-3">
                    {error && <Alert variant="generalSignup">{error}</Alert>}

                    {checklist && (
                        <>
                            {/* 진행률 */}
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {/* 기존 출국 준비 추가정보에서 파생한 읽기 전용 상태 */}
                            {documents && (
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-muted-foreground">
                                        제출 서류 {documents.done}/{documents.total}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {CHECKLIST_DOCUMENT_FIELDS.map(field => (
                                            <Badge
                                                key={field.key}
                                                variant="rescueDogRecord"
                                                className={getDocumentChipClass(documents[field.key])}
                                            >
                                                {documents[field.key] ? '✓' : '·'} {field.label}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        제출 서류는 아래 &apos;출국 준비 추가정보&apos;에서 올립니다.
                                    </p>
                                </div>
                            )}

                            {/* 항목 목록 */}
                            {items.length === 0 && editing !== 'new' ? (
                                <p className="py-4 text-center text-xs text-muted-foreground">
                                    등록된 체크리스트 항목이 없습니다.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {items.map(item => (
                                        editing === item.id ? (
                                            <ChecklistItemForm
                                                key={item.id}
                                                draft={draft}
                                                onChange={handleDraftChange}
                                                onSubmit={handleSubmit}
                                                onCancel={closeForm}
                                                saving={saving}
                                            />
                                        ) : (
                                            <div
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border-2 ${getChecklistRowClass(item.is_done)}`}
                                            >
                                                <Input
                                                    variant="ticketChecklist"
                                                    type="checkbox"
                                                    id={`checklist-${item.id}`}
                                                    checked={item.is_done}
                                                    disabled={!canManage}
                                                    onChange={() => handleToggle(item)}
                                                />
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <FieldLabel
                                                        variant="ticketChecklistItem"
                                                        htmlFor={`checklist-${item.id}`}
                                                        className={getChecklistLabelClass(item.is_done)}
                                                    >
                                                        {item.label}
                                                    </FieldLabel>
                                                    {item.note && (
                                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                                            {item.note}
                                                        </p>
                                                    )}
                                                    {item.is_done && item.completed_at && (
                                                        <span className="text-[11px] font-bold text-emerald-700">
                                                            완료 {formatCompletedAt(item.completed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                {canManage && (
                                                    <div className="shrink-0 flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="rescueRowAction"
                                                            onClick={() => openEdit(item)}
                                                        >
                                                            수정
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="rescueRowDanger"
                                                            onClick={() => handleDelete(item)}
                                                        >
                                                            삭제
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}

                            {/* 추가와 기본 항목 복원 */}
                            {canManage && (editing === 'new' ? (
                                <ChecklistItemForm
                                    draft={draft}
                                    onChange={handleDraftChange}
                                    onSubmit={handleSubmit}
                                    onCancel={closeForm}
                                    saving={saving}
                                />
                            ) : (
                                <div className="space-y-2">
                                    <Button type="button" variant="rescueRecordAdd" onClick={openCreate}>
                                        + 체크리스트 항목 추가
                                    </Button>
                                    {missingCount > 0 && (
                                        <Button
                                            type="button"
                                            variant="purgeDocuments"
                                            onClick={handleRestoreTemplate}
                                        >
                                            지워진 기본 항목 {missingCount}개 복원
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
