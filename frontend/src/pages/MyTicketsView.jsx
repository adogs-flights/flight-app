import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import DateFilterModal from '../components/modals/DateFilterModal';
import { useModal } from '../hooks/useModal';
import { getAirportColor } from '../utils/airportUtils';

export default function MyTicketsView() {
    const { apiClient, user, airports, rawAirports } = useAuth();
    
    // 상태 통합 관리
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
    const [selectedAirport, setSelectedAirport] = useState('전체');
    const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM or YYYY-MM-DD
    const [searchText, setSearchText] = useState('');
    const [currentTicket, setCurrentTicket] = useState(null);

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();
    const { isOpen: isDateOpen, openModal: openDateModal, closeModal: closeDateModal } = useModal();

    const fetchMyTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets');
            const myTickets = response.data.filter(t => t.owner_id === user.id);
            setTicketsState({ data: myTickets, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setTicketsState({ data: [], loading: false, error: '내 티켓을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient, user.id]);

    useEffect(() => {
        fetchMyTickets();
    }, [fetchMyTickets]);

    const handleEditClick = (ticket) => {
        setCurrentTicket(ticket);
        openFormModal();
    };

    const handleViewApplicantsClick = (ticket) => {
        setCurrentTicket(ticket);
        openApplicantsModal();
    };

    const handleTicketClick = (ticket) => {
        setCurrentTicket(ticket);
        openDetailModal();
    };

    const handleDeleteClick = async (ticketId) => {
        if (window.confirm('정말로 이 티켓을 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/tickets/${ticketId}`);
                fetchMyTickets();
            } catch {
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleTicketSaved = (updatedTicket) => { 
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchMyTickets(); 
    };
    const handleStatusChanged = (updatedTicket) => { 
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchMyTickets(); 
    };

    // 필터링 및 정렬 로직
    const filteredTickets = ticketsState.data
        .filter(t => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ticketDate = new Date(t.departure_date);
            ticketDate.setHours(0, 0, 0, 0);

            // 1. 탭 필터링 (예정 vs 지난)
            if (activeTab === 'upcoming') {
                if (ticketDate < today) return false;
            } else {
                if (ticketDate >= today) return false;
            }

            // 2. 공항 필터
            if (selectedAirport !== '전체') {
                if (selectedAirport === '기타') {
                    const masterCodes = airports.map(a => a.value);
                    if (masterCodes.includes(t.arrival_airport)) return false;
                } else {
                    if (t.arrival_airport !== selectedAirport) return false;
                }
            }

            // 3. 날짜 필터
            if (selectedDate) {
                if (!t.departure_date.startsWith(selectedDate)) return false;
            }

            // 4. 검색 필터
            if (searchText.trim()) {
                if (!t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
            }

            return true;
        })
        .sort((a, b) => {
            // 정렬 로직: 예정된 일정은 가까운 순(ASC), 지난 일정은 최신 순(DESC)
            if (activeTab === 'upcoming') {
                return new Date(a.departure_date) - new Date(b.departure_date);
            } else {
                return new Date(b.departure_date) - new Date(a.departure_date);
            }
        });

    const getDateButtonLabel = () => {
        if (!selectedDate) return '기간 선택';
        if (selectedDate.length === 7) {
            const [y, m] = selectedDate.split('-');
            return `${y}년 ${parseInt(m)}월 전체`;
        }
        const [y, m, d] = selectedDate.split('-');
        return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
    };

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (filteredTickets.length === 0) {
            return (
                <div className="empty">
                    <div className="empty-icon">{activeTab === 'upcoming' ? '🎫' : '📁'}</div>
                    <div className="empty-text">
                        {activeTab === 'upcoming' ? '예정된 티켓이 없습니다' : '지난 티켓 내역이 없습니다'}
                    </div>
                </div>
            );
        }
        
        return filteredTickets.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onClick={() => handleTicketClick(ticket)}
            />
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">내 티켓</h1>
                    <p className="text-sm text-muted-foreground">내가 등록하고 관리하는 티켓 목록입니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 rounded-lg bg-secondary/50 border border-border">
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            예정된 일정
                        </button>
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'past' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('past')}
                        >
                            지난 일정
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <input 
                            placeholder="티켓 제목 검색..." 
                            className="flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none transition-all focus:border-primary/50 sm:w-[240px]"
                            value={searchText} 
                            onChange={e => setSearchText(e.target.value)} 
                        />
                    </div>
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

            <TicketFormModal 
                isOpen={isFormOpen}
                onClose={closeFormModal}
                ticket={currentTicket}
                onTicketSaved={handleTicketSaved}
            />
            <ApplicantListModal
                isOpen={isApplicantsOpen}
                onClose={closeApplicantsModal}
                ticket={currentTicket}
                onStatusChanged={handleStatusChanged}
            />
            <TicketDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                ticket={currentTicket}
                onEditClick={handleEditClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onDeleteClick={handleDeleteClick}
                onUpdate={handleTicketSaved}
            />
        </div>
    );
}
