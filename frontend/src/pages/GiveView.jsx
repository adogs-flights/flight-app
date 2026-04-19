import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import ApplyModal from '../components/modals/ApplyModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import DateFilterModal from '../components/modals/DateFilterModal';
import { useModal } from '../hooks/useModal';
import { getAirportColor } from '../utils/airportUtils';

export default function GiveView() {
    const { apiClient, airports, rawAirports } = useAuth();
    
    // 상태 통합 관리
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [currentTicket, setCurrentTicket] = useState(null);
    const [selectedAirport, setSelectedAirport] = useState('전체');
    const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM or YYYY-MM-DD
    const [searchText, setSearchText] = useState('');

    const { isOpen: isApplyOpen, openModal: openApplyModal, closeModal: closeApplyModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();
    const { isOpen: isDateOpen, openModal: openDateModal, closeModal: closeDateModal } = useModal();

    const fetchTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets');
            // 나눔 중이거나 나눔 완료된 티켓만 필터링
            const giveTickets = response.data.filter(t => t.status === 'sharing' || t.status === 'shared');
            setTicketsState({ data: giveTickets, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setTicketsState({ data: [], loading: false, error: '나눔 티켓을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleApplyClick = (ticket) => {
        setCurrentTicket(ticket);
        openApplyModal();
    };

    const handleViewApplicantsClick = (ticket) => {
        setCurrentTicket(ticket);
        openApplicantsModal();
    };

    const handleTicketClick = (ticket) => {
        setCurrentTicket(ticket);
        openDetailModal();
    };

    const handleApplicationSaved = () => { fetchTickets(); };

    const handleTicketUpdated = (updatedTicket) => {
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchTickets();
    };

    // 필터링 및 정렬 로직
    const filteredTickets = ticketsState.data
        .filter(t => {
            // 0. 오늘 이전 티켓 제외
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ticketDate = new Date(t.departure_date);
            ticketDate.setHours(0, 0, 0, 0);
            if (ticketDate < today) return false;

            // 1. 공항 필터
            if (selectedAirport !== '전체') {
                if (selectedAirport === '기타') {
                    const masterCodes = airports.map(a => a.value);
                    if (masterCodes.includes(t.arrival_airport)) return false;
                } else {
                    if (t.arrival_airport !== selectedAirport) return false;
                }
            }

            // 2. 날짜 필터 (Prefix match: YYYY-MM or YYYY-MM-DD)
            if (selectedDate) {
                if (!t.departure_date.startsWith(selectedDate)) return false;
            }

            // 3. 검색어 필터
            if (searchText.trim()) {
                if (!t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
            }

            return true;
        })
        .sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date));

    const getDateButtonLabel = () => {
        if (!selectedDate) return '기간 선택';
        if (selectedDate.length === 7) { // YYYY-MM
            const [y, m] = selectedDate.split('-');
            return `${y}년 ${parseInt(m)}월 전체`;
        }
        // YYYY-MM-DD
        const [y, m, d] = selectedDate.split('-');
        return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
    };

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (filteredTickets.length === 0) {
            return <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">조건에 맞는 티켓이 없습니다</div></div>;
        }
        
        return filteredTickets.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onApplyClick={handleApplyClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onClick={() => handleTicketClick(ticket)}
            />
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">나눔해요</h1>
                    <p className="text-sm text-muted-foreground">따뜻한 마음으로 나눔 중인 티켓들을 확인하세요.</p>
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                    <input 
                        placeholder="티켓 제목 검색..." 
                        className="flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 sm:w-[240px]"
                        value={searchText} 
                        onChange={e => setSearchText(e.target.value)} 
                    />
                </div>
            </div>

            <div className="space-y-3">
                {/* 공항 칩 필터 */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${selectedAirport === '전체' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setSelectedAirport('전체')}
                    >
                        전체
                    </button>
                    {airports.map(airport => {
                        const colors = getAirportColor(airport.value, rawAirports);
                        const isActive = selectedAirport === airport.value;
                        return (
                            <button
                                key={airport.value}
                                className="shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all"
                                style={{ 
                                    backgroundColor: colors.bg, 
                                    color: colors.text, 
                                    borderColor: isActive ? colors.text + '55' : colors.bg,
                                    opacity: isActive ? 1 : 0.7
                                }}
                                onClick={() => setSelectedAirport(airport.value)}
                            >
                                {airport.value}
                            </button>
                        );
                    })}
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${selectedAirport === '기타' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setSelectedAirport('기타')}
                    >
                        기타
                    </button>
                </div>

                {/* 날짜 필터 버튼 */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={openDateModal}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all shadow-sm active:scale-95 ${
                            selectedDate 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-background border-border text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        {getDateButtonLabel()}
                        <span className="text-[10px] opacity-50">▼</span>
                    </button>
                    
                    {selectedDate && (
                        <button 
                            onClick={() => setSelectedDate(null)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            title="날짜 필터 초기화"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="robust-grid animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderListContent()}
            </div>

            <DateFilterModal 
                isOpen={isDateOpen}
                onClose={closeDateModal}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
            />

            <ApplyModal 
                isOpen={isApplyOpen}
                onClose={closeApplyModal}
                ticket={currentTicket}
                onApplicationSaved={handleApplicationSaved}
            />
            <ApplicantListModal
                isOpen={isApplicantsOpen}
                onClose={closeApplicantsModal}
                ticket={currentTicket}
                onStatusChanged={handleTicketUpdated}
            />
            <TicketDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                ticket={currentTicket}
                onViewApplicantsClick={handleViewApplicantsClick}
                onUpdate={handleTicketUpdated}
            />
        </div>
    );
}
