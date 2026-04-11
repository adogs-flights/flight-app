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

    const handleTicketUpdated = (updatedTicket) => {
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchTickets();
    };

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
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">🎁 나눔해요</h1>
                <p className="text-sm text-muted-foreground">따뜻한 마음으로 나눔 중인 티켓들을 확인하세요.</p>
            </div>

            <div className="robust-grid animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderListContent()}
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
                onUpdate={handleTicketUpdated}
            />
        </div>
    );
}
