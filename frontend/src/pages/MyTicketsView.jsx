import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
// We'll reuse all the modals from ScheduleView
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import { useModal } from '../hooks/useModal';

export default function MyTicketsView() {
    const { apiClient, user } = useAuth();
    
    // 상태 통합 관리
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [currentTicket, setCurrentTicket] = useState(null);

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

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

    const handleTicketSaved = () => { fetchMyTickets(); };
    const handleStatusChanged = () => { fetchMyTickets(); };


    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (ticketsState.data.length === 0) return <div className="empty"><div className="empty-icon">🎫</div><div className="empty-text">보유한 티켓이 없습니다</div></div>;
        
        return ticketsState.data.map(ticket => (
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
        <>
            <div id="sectionMytickets">
                <div className="toolbar" style={{ marginBottom: '16px' }}>
                    <div className="toolbar-left"><span className="page-title">🎫 내 티켓</span></div>
                </div>
                <div className="info-box purple" style={{ marginBottom: '16px' }}>🔒 <strong>소유중</strong> 상태의 티켓은 본인만 볼 수 있습니다.</div>
                <div className="list-view" style={{ display: 'flex', flexDirection: 'column' }}>
                    {renderListContent()}
                </div>
            </div>

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
            />
        </>
    );
}
