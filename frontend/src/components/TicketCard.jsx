import { Badge, Button, Card, Heading } from './ui/primitives.js';
import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

export const TicketStatusBadge = ({ status }) => {
    switch (status) {
        case 'sharing':
            return <Badge variant="ticketCard">🟢 나눔중</Badge>;
        case 'shared':
            return <Badge variant="ticketCard2">✅ 나눔완료</Badge>;
        case 'owned':
            return <Badge variant="ticketCard3">🔒 소유중</Badge>;
        default:
            return null;
    }
};

const TicketCard = ({ ticket, onEditClick, onDeleteClick, onApplyClick, onViewApplicantsClick, onClick }) => {
    const { user, rawAirports } = useAuth();
    
    if (!ticket) return null;
    
    const isOwner = user && ticket.owner_id === user.id;
    const colors = getAirportColor(ticket.arrival_airport, rawAirports);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } catch {
            return '-';
        }
    };

    const handleEdit = (e) => { e.stopPropagation(); onEditClick && onEditClick(ticket); };
    const handleDelete = (e) => { e.stopPropagation(); onDeleteClick && onDeleteClick(ticket.id); };
    const handleApply = (e) => { e.stopPropagation(); onApplyClick && onApplyClick(ticket); };
    const handleViewApplicants = (e) => { e.stopPropagation(); onViewApplicantsClick && onViewApplicantsClick(ticket); };

    return (
        <Card
            variant="ticketCard"
            style={{ borderColor: colors.bg }}
            onClick={onClick}
        >
            <div 
                className="absolute left-0 top-0 bottom-0 w-1.5" 
                style={{ backgroundColor: colors.text + '77' }}
            />

            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <Heading as="h3" variant="ticketCard">
                        {ticket.title || '제목 없음'}
                    </Heading>
                    <div className="flex flex-wrap items-center justify-end flex-shrink-0 gap-1.5">
                        <Badge
                            variant="ticketCard4"
                            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                        >
                            {ticket.arrival_airport || '미지정'}
                        </Badge>
                        <TicketStatusBadge status={ticket.status} />
                        {isOwner && (
                            <Badge variant="ticketCard5">👤 내 등록</Badge>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">📅</span>
                        <span>{formatDate(ticket.departure_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">✈️</span>
                        <span>{ticket.flight_info || '-'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] text-muted-foreground truncate">
                        👤 소유자: <span className="font-medium text-foreground">{ticket.owner?.name || ticket.manager_name || '알 수 없음'}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isOwner && (
                        <>
                            <Button
                                variant="ticketEdit"
                                onClick={handleEdit}
                            >
                                수정
                            </Button>
                            <Button
                                variant="ticketDelete"
                                onClick={handleDelete}
                            >
                                삭제
                            </Button>
                        </>
                    )}
                    {isOwner && ticket.status === 'sharing' && (
                        <Button
                            variant="ticketApplicants"
                            onClick={handleViewApplicants}
                        >
                            📋 신청자
                        </Button>
                    )}
                    {!isOwner && ticket.status === 'sharing' && (
                        <Button
                            variant="ticketApply"
                            onClick={handleApply}
                        >
                            🎁 신청
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default TicketCard;
