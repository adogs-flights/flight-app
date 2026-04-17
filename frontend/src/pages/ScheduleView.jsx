import { useState, useEffect, useCallback, useRef } from 'react';
import { toBlob } from 'html-to-image';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplyModal from '../components/modals/ApplyModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import DayTicketsModal from '../components/modals/DayTicketsModal';
import { useModal } from '../hooks/useModal';
import { getAirportColor } from '../utils/airportUtils';

export default function ScheduleView() {
    const { apiClient, airports, rawAirports } = useAuth();
    
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [view, setView] = useState('cal');
    const [currentTicket, setCurrentTicket] = useState(null);
    const [selectedAirport, setSelectedAirport] = useState('전체');
    const [selectedDateTickets, setSelectedDateTickets] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);
    const calendarRef = useRef(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplyOpen, openModal: openApplyModal, closeModal: closeApplyModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();
    const { isOpen: isDayMoreOpen, openModal: openDayMoreModal, closeModal: closeDayMoreModal } = useModal();

    const fetchTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets?schedule=true');
            setTicketsState({ data: Array.isArray(response.data) ? response.data : [], loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setTicketsState({ data: [], loading: false, error: '티켓을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleCreateClick = () => {
        setCurrentTicket(null);
        openFormModal();
    };

    const handleEditClick = (ticket) => {
        setCurrentTicket(ticket);
        openFormModal();
    };
    
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

    const handleDayMoreClick = (dayTickets, date) => {
        setSelectedDateTickets(dayTickets || []);
        setSelectedDate(date);
        openDayMoreModal();
    };

    const handleTicketSelectFromList = (ticket) => {
        closeDayMoreModal();
        setCurrentTicket(ticket);
        openDetailModal();
    };

    const handleDeleteClick = async (ticketId) => {
        if (window.confirm('정말로 이 티켓을 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/tickets/${ticketId}`);
                fetchTickets();
            } catch {
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleTicketSaved = () => { fetchTickets(); };
    const handleApplicationSaved = () => { fetchTickets(); };
    const handleStatusChanged = () => { fetchTickets(); };

    const filteredTickets = (ticketsState.data || []).filter(t => {
        if (selectedAirport === '전체') return true;
        if (selectedAirport === '기타') {
            const masterCodes = (airports || []).map(a => a.value);
            return !masterCodes.includes(t.arrival_airport);
        }
        return t.arrival_airport === selectedAirport;
    });

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const listTickets = filteredTickets
            .filter(ticket => {
                if (!ticket.departure_date) return false;
                const ticketDate = new Date(ticket.departure_date);
                ticketDate.setHours(0, 0, 0, 0);
                return ticketDate >= today;
            })
            .sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date));

        if (listTickets.length === 0) return (
            <div className="empty col-span-full py-20 flex flex-col items-center opacity-40">
                <div className="text-4xl mb-2">📭</div>
                <div className="text-sm font-bold">표시할 예정된 일정이 없습니다</div>
            </div>
        );
        
        return listTickets.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onApplyClick={handleApplyClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onClick={() => handleTicketClick(ticket)}
            />
        ));
    };

    const handleShare = async (e) => {
        if (e) e.stopPropagation();
        if (!calendarRef.current || isSaving) return;
        
        if (!navigator.share) {
            alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
            return;
        }

        setIsSaving(true);
        const el = calendarRef.current;
        
        try {
            const blob = await toBlob(el, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: false,
                width: el.offsetWidth,
                height: el.offsetHeight,
                style: { margin: '0', padding: '0', transform: 'none' },
                fontEmbedCSS: `
                    @font-face { font-family: 'Pretendard'; src: url('/fonts/Pretendard-Regular.woff2') format('woff2'); font-weight: 400; }
                    @font-face { font-family: 'Pretendard'; src: url('/fonts/Pretendard-Bold.woff2') format('woff2'); font-weight: 700; }
                `,
            });

            if (!blob) throw new Error('이미지 생성 실패');

            const file = new File([blob], `calendar-${year}-${month + 1}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file] });
            } else {
                await navigator.share({ url: window.location.href });
            }
        } catch (err) {
            console.error('Share failed:', err);
            if (err.name !== 'AbortError') alert('공유에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">일정 관리</h1>
                    <p className="text-sm text-muted-foreground">봉사 일정 확인 및 새로운 티켓을 등록하세요.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 rounded-lg bg-secondary/50 border border-border">
                        <button className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'cal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('cal')}>달력</button>
                        <button className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('list')}>리스트</button>
                    </div>
                    <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={handleCreateClick}>+ 티켓 등록</button>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${selectedAirport === '전체' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`} onClick={() => setSelectedAirport('전체')}>전체</button>
                {(airports || []).map(airport => {
                    const colors = getAirportColor(airport.value, rawAirports);
                    const isActive = selectedAirport === airport.value;
                    return (
                        <button key={airport.value} className="shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all" style={{ backgroundColor: colors.bg, color: colors.text, borderColor: isActive ? colors.text + '55' : colors.bg, opacity: isActive ? 1 : 0.7 }} onClick={() => setSelectedAirport(airport.value)}>{airport.value}</button>
                    );
                })}
            </div>
            
            <div className="min-h-[400px]">
                {view === 'cal' ? (
                    <div className="flex flex-col">
                        <CalendarView tickets={filteredTickets} onTicketClick={handleTicketClick} onMoreClick={handleDayMoreClick} currentDate={currentDate} setCurrentDate={setCurrentDate} calendarRef={calendarRef} isSaving={isSaving} />
                        <div className="py-4 sm:hidden">
                            <button className="w-full flex items-center justify-center gap-2 h-11 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm" onClick={handleShare}>일정 공유하기</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {renderListContent()}
                    </div>
                )}
            </div>
            
            <TicketFormModal isOpen={isFormOpen} onClose={closeFormModal} ticket={currentTicket} onTicketSaved={handleTicketSaved} />
            <ApplyModal isOpen={isApplyOpen} onClose={closeApplyModal} ticket={currentTicket} onApplicationSaved={handleApplicationSaved} />
            <ApplicantListModal isOpen={isApplicantsOpen} onClose={closeApplicantsModal} ticket={currentTicket} onStatusChanged={handleStatusChanged} />
            <TicketDetailModal isOpen={isDetailOpen} onClose={closeDetailModal} ticket={currentTicket} onEditClick={handleEditClick} onViewApplicantsClick={handleViewApplicantsClick} onDeleteClick={handleDeleteClick} onUpdate={handleTicketSaved} />
            <DayTicketsModal isOpen={isDayMoreOpen} onClose={closeDayMoreModal} tickets={selectedDateTickets} onTicketClick={handleTicketSelectFromList} date={selectedDate} />
        </div>
    );
}
