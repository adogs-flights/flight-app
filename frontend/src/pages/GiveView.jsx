import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import ApplyModal from '../components/modals/ApplyModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import { useModal } from '../hooks/useModal';

export default function GiveView() {
    const { apiClient } = useAuth();
    
    // 상태 통합 관리
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [currentTicket, setCurrentTicket] = useState(null);
    const { isOpen: isApplyOpen, openModal: openApplyModal, closeModal: closeApplyModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

    const fetchTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets');
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

    const handleTicketClick = (ticket) => {
        setCurrentTicket(ticket);
        openDetailModal();
    };

    const handleApplicationSaved = () => { fetchTickets(); };

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (ticketsState.data.length === 0) return <div className="empty"><div className="empty-icon">🎁</div><div className="empty-text">나눔중인 티켓이 없습니다</div></div>;
        
        return ticketsState.data.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onApplyClick={handleApplyClick}
                onClick={() => handleTicketClick(ticket)}
            />
        ));
    };

    return (
        <>
            <div id="sectionGive">
                <div className="toolbar" style={{ marginBottom: '16px' }}>
                    <div className="toolbar-left"><span className="page-title">🎁 나눔해요</span></div>
                </div>
                <div className="list-view" style={{ display: 'flex', flexDirection: 'column' }}>
                    {renderListContent()}
                </div>
            </div>
            <ApplyModal 
                isOpen={isApplyOpen}
                onClose={closeApplyModal}
                ticket={currentTicket}
                onApplicationSaved={handleApplicationSaved}
            />
            <TicketDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                ticket={currentTicket}
                onApplyClick={handleApplyClick}
            />
        </>
    );
}
