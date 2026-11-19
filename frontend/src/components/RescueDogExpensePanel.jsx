import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { EXPENSE_CATEGORIES, formatDogDate, formatWon } from '../utils/rescueDogUtils';

const inputClass =
    'h-10 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none';
const miniLabelClass = 'text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-0.5';

const EMPTY_DRAFT = {
    spent_on: '',
    payer_name: '',
    category: '',
    amount: '',
    is_settled: false,
    note: '',
};

const EMPTY_SUMMARY = { total: 0, settled: 0, unsettled: 0 };

function ExpenseForm({ draft, onChange, onSubmit, onCancel, saving }) {
    return (
        <div className="space-y-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className={miniLabelClass}>날짜</label>
                    <input
                        className={inputClass}
                        type="date"
                        value={draft.spent_on}
                        onChange={e => onChange('spent_on', e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className={miniLabelClass}>비용 (원)</label>
                    <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="10"
                        value={draft.amount}
                        onChange={e => onChange('amount', e.target.value)}
                        placeholder="76170"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className={miniLabelClass}>구분</label>
                    <input
                        className={inputClass}
                        list="rescue-expense-categories"
                        value={draft.category}
                        onChange={e => onChange('category', e.target.value)}
                        placeholder="예: 병원진료"
                    />
                    <datalist id="rescue-expense-categories">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
                <div className="space-y-1">
                    <label className={miniLabelClass}>부담자 (임보자 등)</label>
                    <input
                        className={inputClass}
                        value={draft.payer_name}
                        onChange={e => onChange('payer_name', e.target.value)}
                        placeholder="예: 신수정"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className={miniLabelClass}>내용</label>
                <textarea
                    className="flex min-h-[60px] w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none"
                    value={draft.note}
                    onChange={e => onChange('note', e.target.value)}
                    placeholder="진료 내용, 영수증 메모 등..."
                />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border accent-primary"
                    checked={draft.is_settled}
                    onChange={e => onChange('is_settled', e.target.checked)}
                />
                정산완료
            </label>

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

export default function RescueDogExpensePanel({ dog, onExpensesChanged }) {
    const { apiClient } = useAuth();
    const dogId = dog?.id;

    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null); // null | 'new' | expense id
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    const fetchExpenses = useCallback(async () => {
        if (!dogId) return;
        setLoading(true);
        try {
            const response = await apiClient.get(`/rescue-dogs/${dogId}/expenses`);
            setItems(response.data.items);
            setSummary(response.data.summary);
            setError('');
        } catch {
            setError('비용 내역을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, dogId]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    useEffect(() => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    }, [dogId]);

    const handleDraftChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const openCreate = () => {
        setDraft(EMPTY_DRAFT);
        setEditing('new');
    };

    const openEdit = (expense) => {
        setDraft({
            spent_on: expense.spent_on || '',
            payer_name: expense.payer_name || '',
            category: expense.category || '',
            amount: String(expense.amount ?? ''),
            is_settled: expense.is_settled,
            note: expense.note || '',
        });
        setEditing(expense.id);
    };

    const closeForm = () => {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
    };

    const toPayload = () => ({
        spent_on: draft.spent_on || null,
        payer_name: draft.payer_name.trim() || null,
        category: draft.category.trim() || null,
        // 빈 칸은 0원으로 본다. 백엔드가 음수를 거른다.
        amount: draft.amount === '' ? 0 : Number(draft.amount),
        is_settled: draft.is_settled,
        note: draft.note.trim() || null,
    });

    const afterChange = async () => {
        await fetchExpenses();
        // 목록 화면 상단의 단체 전체 합계도 바뀐다.
        onExpensesChanged?.();
    };

    const handleSubmit = async () => {
        const payload = toPayload();
        if (!Number.isFinite(payload.amount) || payload.amount < 0) {
            setError('비용은 0원 이상의 숫자로 입력해주세요.');
            return;
        }
        setSaving(true);
        try {
            if (editing === 'new') {
                await apiClient.post(`/rescue-dogs/${dogId}/expenses`, payload);
            } else {
                await apiClient.put(`/rescue-dogs/${dogId}/expenses/${editing}`, payload);
            }
            closeForm();
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSettled = async (expense) => {
        try {
            await apiClient.put(`/rescue-dogs/${dogId}/expenses/${expense.id}`, {
                spent_on: expense.spent_on,
                payer_name: expense.payer_name,
                category: expense.category,
                amount: expense.amount,
                is_settled: !expense.is_settled,
                note: expense.note,
            });
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '정산 처리에 실패했습니다.');
        }
    };

    const handleDelete = async (expense) => {
        try {
            await apiClient.delete(`/rescue-dogs/${dogId}/expenses/${expense.id}`);
            await afterChange();
        } catch (err) {
            setError(err.response?.data?.detail || '삭제에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-3">
            {/* 시트 하단의 총 금액 / 정산 금액 / 미정산 금액 */}
            <div className="grid grid-cols-3 gap-2">
                <div className="px-3 py-2 rounded-xl border-2 border-border bg-card">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">총 금액</div>
                    <div className="text-sm font-black text-foreground">{formatWon(summary.total)}</div>
                </div>
                <div className="px-3 py-2 rounded-xl border-2 border-border bg-card">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">정산</div>
                    <div className="text-sm font-black text-emerald-600">{formatWon(summary.settled)}</div>
                </div>
                <div className={`px-3 py-2 rounded-xl border-2 ${summary.unsettled > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">미정산</div>
                    <div className={`text-sm font-black ${summary.unsettled > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {formatWon(summary.unsettled)}
                    </div>
                </div>
            </div>

            {error && <p className="text-xs font-bold text-destructive">{error}</p>}

            {loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중...</p>
            ) : items.length === 0 && editing !== 'new' ? (
                <p className="py-6 text-center text-xs text-muted-foreground">등록된 비용 내역이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {items.map(expense => {
                        if (editing === expense.id) {
                            return (
                                <ExpenseForm
                                    key={expense.id}
                                    draft={draft}
                                    onChange={handleDraftChange}
                                    onSubmit={handleSubmit}
                                    onCancel={closeForm}
                                    saving={saving}
                                />
                            );
                        }
                        return (
                            <div
                                key={expense.id}
                                className={`p-3 rounded-xl border-2 ${expense.is_settled ? 'border-border bg-muted/20' : 'border-destructive/40 bg-destructive/5'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${expense.is_settled ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive text-destructive-foreground'}`}>
                                                {expense.is_settled ? '정산완료' : '미정산'}
                                            </span>
                                            <span className="text-sm font-black text-foreground">
                                                {formatWon(expense.amount)}
                                            </span>
                                            {expense.category && (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                                                    {expense.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-muted-foreground">
                                            {formatDogDate(expense.spent_on, '날짜 미기재')}
                                            {expense.payer_name && ` · 부담 ${expense.payer_name}`}
                                        </div>
                                        {expense.note && (
                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                                {expense.note}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1">
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-[11px] font-bold rounded-md text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors"
                                            onClick={() => handleToggleSettled(expense)}
                                        >
                                            {expense.is_settled ? '정산 취소' : '정산'}
                                        </button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-[11px] font-bold rounded-md text-muted-foreground border border-border hover:bg-muted transition-colors"
                                            onClick={() => openEdit(expense)}
                                        >
                                            수정
                                        </button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-[11px] font-bold rounded-md text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                                            onClick={() => handleDelete(expense)}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing === 'new' ? (
                <ExpenseForm
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
                    + 비용 내역 추가
                </button>
            )}
        </div>
    );
}
