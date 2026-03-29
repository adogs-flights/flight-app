import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TicketCard from '../components/TicketCard';
// We'll reuse all the modals from ScheduleView
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import { useModal } from '../hooks/useModal';

export default function MyTicketsView() {
    const { apiClient, user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentTicket, setCurrentTicket] = useState(null);

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();

    const fetchMyTickets = () => {
        setLoading(true);
        apiClient.get('/tickets') // We fetch all and filter client-side for simplicity
            .then(response => {
                const myTickets = response.data.filter(t => t.owner_id === user.id);
                setTickets(myTickets);
            })
            .catch(err => {
                console.error(err);
                setError('내 티켓을 불러오는 데 실패했습니다.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMyTickets(); }, [apiClient, user.id]);

    const handleEditClick = (ticket) => {
        setCurrentTicket(ticket);
        openFormModal();
    };

    const handleViewApplicantsClick = (ticket) => {
        setCurrentTicket(ticket);
        openApplicantsModal();
    };

    const handleDeleteClick = async (ticketId) => {
        if (window.confirm('정말로 이 티켓을 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/tickets/${ticketId}`);
                fetchMyTickets();
            } catch (err) {
                console.error(err);
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleTicketSaved = () => { fetchMyTickets(); };
    const handleStatusChanged = () => { fetchMyTickets(); };


    const renderListContent = () => {
        if (loading) return <div className="empty"><div>Loading...</div></div>;
        if (error) return <div className="empty"><div className="text-red-500">{error}</div></div>;
        if (tickets.length === 0) return <div className="empty"><div className="empty-icon">🎫</div><div className="empty-text">보유한 티켓이 없습니다</div></div>;
        
        return tickets.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onViewApplicantsClick={handleViewApplicantsClick}
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
        </>
    );
}
