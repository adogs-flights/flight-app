import { useState, useEffect, useCallback } from 'react';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplyModal from '../components/modals/ApplyModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import DayTicketsModal from '../components/modals/DayTicketsModal';
import { useModal } from '../hooks/useModal';

export default function ScheduleView() {
    const { apiClient, airports, rawAirports } = useAuth();
    
    // 상태 통합 관리
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
    
    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplyOpen, openModal: openApplyModal, closeModal: closeApplyModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();
    const { isOpen: isDayMoreOpen, openModal: openDayMoreModal, closeModal: closeDayMoreModal } = useModal();

    const fetchTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets');
            setTicketsState({ data: response.data, loading: false, error: '' });
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
        setSelectedDateTickets(dayTickets);
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

    // ticketsState.data를 기반으로 필터링
    const filteredTickets = ticketsState.data.filter(t => {
        if (selectedAirport === '전체') return true;
        if (selectedAirport === '기타') {
            const masterCodes = airports.map(a => a.value);
            return !masterCodes.includes(t.arrival_airport);
        }
        return t.arrival_airport === selectedAirport;
    });

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (filteredTickets.length === 0) return <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">표시할 일정이 없습니다</div></div>;
        
        return filteredTickets.map(ticket => (
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

    return (
        <>
            <div id="sectionSchedule">
                <div className="toolbar">
                    <div className="toolbar-left">
                        <div className="title-row">
                            <span className="page-title">일정 관리</span>
                            <button className="btn btn-primary mobile-only" onClick={handleCreateClick}>+ 티켓 등록</button>
                        </div>
                        <div className="view-tabs">
                            <button className={`view-tab ${view === 'cal' ? 'active' : ''}`} onClick={() => setView('cal')}>📅 달력</button>
                            <button className={`view-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📋 리스트</button>
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn btn-primary desktop-only" onClick={handleCreateClick}>+ 티켓 등록</button>
                    </div>
                </div>

                <div className="filter-bar" style={{ marginBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px', display: 'flex', gap: '8px' }}>
                    <button
                        className={`chip ${selectedAirport === '전체' ? 'active' : ''}`}
                        onClick={() => setSelectedAirport('전체')}
                        style={{ flexShrink: 0 }}
                    >
                        전체
                    </button>
                    {airports.map(airport => (
                        <button
                            key={airport.value}
                            className={`chip ${selectedAirport === airport.value ? 'active' : ''}`}
                            onClick={() => setSelectedAirport(airport.value)}
                            style={{ flexShrink: 0 }}
                        >
                            {airport.value}
                        </button>
                    ))}
                    <button
                        className={`chip ${selectedAirport === '기타' ? 'active' : ''}`}
                        onClick={() => setSelectedAirport('기타')}
                        style={{ flexShrink: 0 }}
                    >
                        기타
                    </button>
                </div>
                
                {view === 'cal' && (
                    <CalendarView 
                        tickets={filteredTickets} 
                        onTicketClick={handleTicketClick} 
                        onMoreClick={handleDayMoreClick}
                    />
                )}

                {view === 'list' && (
                    <div className="list-view" style={{ display: 'flex', flexDirection: 'column' }}>{renderListContent()}</div>
                )}
            </div>
            
            <TicketFormModal isOpen={isFormOpen} onClose={closeFormModal} ticket={currentTicket} onTicketSaved={handleTicketSaved} />
            <ApplyModal isOpen={isApplyOpen} onClose={closeApplyModal} ticket={currentTicket} onApplicationSaved={handleApplicationSaved} />
            <ApplicantListModal isOpen={isApplicantsOpen} onClose={closeApplicantsModal} ticket={currentTicket} onStatusChanged={handleStatusChanged} />
            <TicketDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                ticket={currentTicket}
                onEditClick={handleEditClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onDeleteClick={handleDeleteClick}
            />
            <DayTicketsModal 
                isOpen={isDayMoreOpen} 
                onClose={closeDayMoreModal} 
                tickets={selectedDateTickets} 
                onTicketClick={handleTicketSelectFromList}
                date={selectedDate}
            />
        </>
    );
}
