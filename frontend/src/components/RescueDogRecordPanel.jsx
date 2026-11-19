import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    MANAGER_ONLY_KINDS,
    RECORD_KINDS,
    formatDogDate,
    getRecordKind,
    getRecordState,
    todayValue,
} from '../utils/rescueDogUtils';

const inputClass =
    'h-10 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none';
const miniLabelClass = 'text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-0.5';

const EMPTY_DRAFT = { title: '', scheduled_on: '', completed_on: '', note: '' };

/** 기록 추가·수정에 함께 쓰는 폼. */
function RecordForm({ kindMeta, draft, onChange, onSubmit, onCancel, saving }) {
    return (
        <div className="space-y-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
            <div className="space-y-1">
                <label className={miniLabelClass}>{kindMeta.titleLabel}</label>
                <input
                    className={inputClass}
                    value={draft.title}
                    onChange={e => onChange('title', e.target.value)}
                    placeholder={kindMeta.titlePlaceholder}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className={miniLabelClass}>예정일</label>
                    <input
                        className={inputClass}
                        type="date"
                        value={draft.scheduled_on}
                        onChange={e => onChange('scheduled_on', e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className={miniLabelClass}>완료일</label>
                    <input
                        className={inputClass}
                        type="date"
                        value={draft.completed_on}
                        onChange={e => onChange('completed_on', e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className={miniLabelClass}>내용</label>
                <textarea
                    className="flex min-h-[70px] w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                    value={draft.note}
                    onChange={e => onChange('note', e.target.value)}
                    placeholder={kindMeta.notePlaceholder}
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors"
                    onClick={onCancel}
                >
                    취소
                </button>
                <button
                    type="button"
                    className="px-4 py-1.5 text-xs font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                    onClick={onSubmit}
                    disabled={saving}
                >
                    {saving ? '저장 중...' : '저장'}
                </button>
            </div>
        </div>
    );
}

export default function RescueDogRecordPanel({ dog, onRecordsChanged }) {
    const { apiClient } = useAuth();
    const canEdit = Boolean(dog?.can_edit);

    // 모니터링은 담당 단체만 볼 수 있어 탭 자체를 감춘다.
    const visibleKinds = RECORD_KINDS.filter(
        k => canEdit || !MANAGER_ONLY_KINDS.includes(k.value)
    );

    const [activeKind, setActiveKind] = useState(visibleKinds[0].value);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    // null = 폼 닫힘, 'new' = 추가, 그 외 = 해당 기록 id 수정 중
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    const dogId = dog?.id;

    const fetchRecords = useCallback(async () => {
        if (!dogId) return;
        setLoading(true);
        try {
            const response = await apiClient.get(`/rescue-dogs/${dogId}/records`);
            setRecords(response.data);
            setError('');
        } catch {
            setError('기록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, dogId]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // 다른 구조견으로 바뀌면 열려 있던 폼을 닫는다.
    useEffect(() => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    }, [dogId]);

    const kindMeta = getRecordKind(activeKind);
    const shown = records.filter(r => r.kind === activeKind);

    const handleDraftChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const openCreate = () => {
        setDraft(EMPTY_DRAFT);
        setEditing('new');
    };

    const openEdit = (record) => {
        setDraft({
            title: record.title || '',
            scheduled_on: record.scheduled_on || '',
            completed_on: record.completed_on || '',
            note: record.note || '',
        });
        setEditing(record.id);
    };

    const closeForm = () => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    };

    // 빈 문자열은 "값 없음"이라 null로 보낸다. 백엔드의 date | None과 맞춘다.
    const toPayload = () => ({
        title: draft.title.trim() || null,
        scheduled_on: draft.scheduled_on || null,
        completed_on: draft.completed_on || null,
        note: draft.note.trim() || null,
    });

    const afterChange = async () => {
        await fetchRecords();
        // 지연 건수가 달라지므로 목록 쪽도 새로 고친다.
        onRecordsChanged?.();
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            if (editing === 'new') {
                await apiClient.post(`/rescue-dogs/${dogId}/records`, {
                    kind: activeKind,
                    ...toPayload(),
                });
            } else {
                await apiClient.put(`/rescue-dogs/${dogId}/records/${editing}`, toPayload());
            }
            closeForm();
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async (record) => {
        try {
            await apiClient.put(`/rescue-dogs/${dogId}/records/${record.id}`, {
                title: record.title,
                scheduled_on: record.scheduled_on,
                completed_on: todayValue(),
                note: record.note,
            });
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '완료 처리에 실패했습니다.');
        }
    };

    const handleDelete = async (record) => {
        try {
            await apiClient.delete(`/rescue-dogs/${dogId}/records/${record.id}`);
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '삭제에 실패했습니다.');
        }
    };

    const overdueInTab = shown.filter(r => r.is_overdue).length;

    return (
        <div className="space-y-3">
            {/* 종류 탭 */}
            <div className="flex items-center gap-2">
                {visibleKinds.map(k => {
                    const overdue = records.filter(r => r.kind === k.value && r.is_overdue).length;
                    const isActive = activeKind === k.value;
                    return (
                        <button
                            key={k.value}
                            type="button"
                            onClick={() => { setActiveKind(k.value); closeForm(); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-full border-2 transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        >
                            <span>{k.icon}</span>
                            {k.label}
                            {overdue > 0 && (
                                <span className={`px-1.5 rounded-full text-[10px] ${isActive ? 'bg-primary-foreground/20' : 'bg-destructive text-destructive-foreground'}`}>
                                    {overdue}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {error && <p className="text-xs font-bold text-destructive">{error}</p>}

            {overdueInTab > 0 && (
                <p className="text-xs font-bold text-destructive">
                    ⚠️ 예정일이 지난 {kindMeta.label} {overdueInTab}건이 있습니다.
                </p>
            )}

            {/* 목록 */}
            {loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중...</p>
            ) : shown.length === 0 && editing !== 'new' ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                    등록된 {kindMeta.label} 기록이 없습니다.
                </p>
            ) : (
                <div className="space-y-2">
                    {shown.map(record => {
                        const state = getRecordState(record);
                        if (editing === record.id) {
                            return (
                                <RecordForm
                                    key={record.id}
                                    kindMeta={kindMeta}
                                    draft={draft}
                                    onChange={handleDraftChange}
                                    onSubmit={handleSubmit}
                                    onCancel={closeForm}
                                    saving={saving}
                                />
                            );
                        }
                        return (
                            <div key={record.id} className={`p-3 rounded-xl border-2 ${state.rowClass}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${state.badgeClass}`}>
                                                {state.label}
                                            </span>
                                            <span className="text-sm font-bold text-foreground">
                                                {record.title || kindMeta.label}
                                            </span>
                                        </div>
                                        <div className={`text-xs font-bold ${state.dateClass}`}>
                                            예정 {formatDogDate(record.scheduled_on, '미정')}
                                            {record.completed_on && ` · 완료 ${formatDogDate(record.completed_on)}`}
                                        </div>
                                        {record.note && (
                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                                {record.note}
                                            </p>
                                        )}
                                    </div>

                                    {canEdit && (
                                        <div className="shrink-0 flex items-center gap-1">
                                            {!record.is_completed && (
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 text-[11px] font-bold rounded-md text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors"
                                                    onClick={() => handleComplete(record)}
                                                >
                                                    완료
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="px-2 py-1 text-[11px] font-bold rounded-md text-muted-foreground border border-border hover:bg-muted transition-colors"
                                                onClick={() => openEdit(record)}
                                            >
                                                수정
                                            </button>
                                            <button
                                                type="button"
                                                className="px-2 py-1 text-[11px] font-bold rounded-md text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                                                onClick={() => handleDelete(record)}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 추가 */}
            {canEdit && (editing === 'new' ? (
                <RecordForm
                    kindMeta={kindMeta}
                    draft={draft}
                    onChange={handleDraftChange}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                    saving={saving}
                />
            ) : (
                <button
                    type="button"
                    className="w-full py-2 text-xs font-bold rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                    onClick={openCreate}
                >
                    + {kindMeta.label} 기록 추가
                </button>
            ))}
        </div>
    );
}
