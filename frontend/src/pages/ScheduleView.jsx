import { useState, useEffect } from 'react';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../contexts/AuthContext';
import TicketCard from '../components/TicketCard';
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplyModal from '../components/modals/ApplyModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import { useModal } from '../hooks/useModal';

export default function ScheduleView() {
    const { apiClient } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('list');
    const [currentTicket, setCurrentTicket] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplyOpen, openModal: openApplyModal, closeModal: closeApplyModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

    const fetchTickets = () => {
        setLoading(true);
        apiClient.get('/tickets')
            .then(response => setTickets(response.data))
            .catch(err => {
                console.error(err);
                setError('티켓을 불러오는 데 실패했습니다.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTickets(); }, [apiClient]);

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

    const handleDeleteClick = async (ticketId) => {
        if (window.confirm('정말로 이 티켓을 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/tickets/${ticketId}`);
                fetchTickets();
            } catch (err) {
                console.error(err);
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleTicketSaved = () => { fetchTickets(); };
    const handleApplicationSaved = () => { fetchTickets(); };
    const handleStatusChanged = () => { fetchTickets(); };

    const filteredTickets = tickets.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.flight_info.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderListContent = () => {
        if (loading) return <div className="empty"><div>Loading...</div></div>;
        if (error) return <div className="empty"><div className="text-red-500">{error}</div></div>;
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
                        <span className="page-title">일정 관리</span>
                        <div className="view-tabs">
                            <button className={`view-tab ${view === 'cal' ? 'active' : ''}`} onClick={() => setView('cal')}>📅 달력</button>
                            <button className={`view-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📋 리스트</button>
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <div className="search-box">🔍<input placeholder="검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                        <button className="btn btn-primary" onClick={handleCreateClick}>+ 티켓 등록</button>
                    </div>
                </div>
                
                {view === 'cal' && (
                    <CalendarView tickets={tickets} onTicketClick={handleTicketClick} />
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
                onApplyClick={handleApplyClick} 
                onViewApplicantsClick={handleViewApplicantsClick} 
            />
        </>
    );
}
