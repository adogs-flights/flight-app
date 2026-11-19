import { Button, FieldLabel, Heading, Input } from '../components/ui/primitives.js';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import RescueDogCard from '../components/RescueDogCard';
import RescueDogFormModal from '../components/modals/RescueDogFormModal';
import RescueDogDetailModal from '../components/modals/RescueDogDetailModal';
import { useModal } from '../hooks/useModal';
import { DOG_STATUSES, formatWon } from '../utils/rescueDogUtils';

const FILTERS = [{ value: 'ALL', label: '전체' }, ...DOG_STATUSES];

export default function RescueDogView() {
    const { apiClient, user } = useAuth();

    const [dogsState, setDogsState] = useState({ data: [], loading: true, error: '' });
    const [currentDog, setCurrentDog] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const [onlyMine, setOnlyMine] = useState(false);
    // 시트 하단의 총/정산/미정산에 해당하는 우리 단체 전체 합계.
    const [expenseSummary, setExpenseSummary] = useState(null);

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

    const fetchDogs = useCallback(async () => {
        setDogsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/rescue-dogs');
            setDogsState({ data: response.data, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setDogsState({ data: [], loading: false, error: '구조견 목록을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    const fetchExpenseSummary = useCallback(async () => {
        try {
            const response = await apiClient.get('/rescue-dogs/expenses/summary');
            setExpenseSummary(response.data);
        } catch {
            // 합계는 보조 정보다. 실패해도 목록은 그대로 보여준다.
            setExpenseSummary(null);
        }
    }, [apiClient]);

    useEffect(() => {
        fetchDogs();
        fetchExpenseSummary();
    }, [fetchDogs, fetchExpenseSummary]);

    // 비용이 바뀌면 목록(지연 건수)과 합계를 함께 새로 고친다.
    const refreshAll = useCallback(() => {
        fetchDogs();
        fetchExpenseSummary();
    }, [fetchDogs, fetchExpenseSummary]);

    const handleCreateClick = () => {
        setCurrentDog(null);
        openFormModal();
    };

    const handleEditClick = (dog) => {
        setCurrentDog(dog);
        openFormModal();
    };

    const handleDetailClick = (dog) => {
        setCurrentDog(dog);
        openDetailModal();
    };

    const handleDeleteClick = async (dogId) => {
        try {
            await apiClient.delete(`/rescue-dogs/${dogId}`);
            fetchDogs();
        } catch (err) {
            alert(err.response?.data?.detail || '삭제에 실패했습니다.');
        }
    };

    const term = searchText.trim().toLowerCase();
    const filteredDogs = dogsState.data.filter(dog => {
        if (activeFilter !== 'ALL' && dog.status !== activeFilter) return false;
        if (onlyMine && !dog.can_edit) return false;
        if (!term) return true;
        return [dog.name, dog.notice_number, dog.rescue_place, dog.microchip_number]
            .some(field => field?.toLowerCase().includes(term));
    });

    // 상태별 집계는 필터와 무관하게 전체 기준으로 보여준다.
    const counts = DOG_STATUSES.reduce((acc, s) => {
        acc[s.value] = dogsState.data.filter(d => d.status === s.value).length;
        return acc;
    }, {});

    const renderContent = () => {
        if (dogsState.loading) {
            return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">불러오는 중...</div>;
        }
        if (dogsState.error) {
            return <div className="flex items-center justify-center py-20 text-sm text-destructive">{dogsState.error}</div>;
        }
        if (filteredDogs.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                    <span className="text-3xl">🔍</span>
                    <span className="text-sm">조건에 맞는 구조견이 없습니다</span>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDogs.map(dog => (
                    <RescueDogCard key={dog.id} dog={dog} onClick={() => handleDetailClick(dog)} />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <Heading as="h1" variant="page">구조견 관리</Heading>
                    <p className="text-sm text-muted-foreground">구조·임보·입양 이력을 한 곳에서 관리합니다.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <Input
                            placeholder="이름·공고번호·구조 장소 검색..."
                            variant="search"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleCreateClick}
                    >
                        + 구조견 등록
                    </Button>
                </div>
            </div>

            {/* 상태별 집계 + 단체 전체 미정산 금액 */}
            {!dogsState.loading && !dogsState.error && (
                <div className={`grid gap-3 ${expenseSummary ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                    {DOG_STATUSES.map(s => (
                        <div key={s.value} className="px-4 py-3 rounded-xl border-2 border-border bg-card">
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">{s.label}</div>
                            <div className="text-xl font-black text-foreground">{counts[s.value] ?? 0}</div>
                        </div>
                    ))}
                    {expenseSummary && (
                        <div className={`px-4 py-3 rounded-xl border-2 ${expenseSummary.unsettled > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">미정산</div>
                            <div className={`text-xl font-black ${expenseSummary.unsettled > 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {formatWon(expenseSummary.unsettled)}
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground/70">
                                총 {formatWon(expenseSummary.total)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {FILTERS.map(f => (
                        <Button
                            key={f.value}
                            variant="filter" active={activeFilter === f.value}
                            onClick={() => setActiveFilter(f.value)}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {user?.organization_id && (
                        <FieldLabel variant="rescueDogCheckbox">
                            <Input
                                type="checkbox"
                                variant="rescueDogCheckbox"
                                checked={onlyMine}
                                onChange={e => setOnlyMine(e.target.checked)}
                            />
                            우리 단체만
                        </FieldLabel>
                    )}
                    {!dogsState.loading && !dogsState.error && (
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">총 {filteredDogs.length}마리</span>
                    )}
                </div>
            </div>

            <div className="min-h-[400px] animate-in fade-in duration-300">
                {renderContent()}
            </div>

            <RescueDogFormModal
                isOpen={isFormOpen}
                onClose={closeFormModal}
                dog={currentDog}
                onDogSaved={fetchDogs}
            />
            <RescueDogDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                dog={currentDog}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onRecordsChanged={refreshAll}
            />
        </div>
    );
}
