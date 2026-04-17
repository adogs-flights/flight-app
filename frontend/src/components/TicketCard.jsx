import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

const TicketStatusBadge = ({ status }) => {
    switch (status) {
        case 'sharing':
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green/10 text-green border border-green/20">🟢 나눔중</span>;
        case 'shared':
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">✅ 나눔완료</span>;
        case 'owned':
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">🔒 소유중</span>;
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
        } catch (e) {
            return '-';
        }
    };

    const handleEdit = (e) => { e.stopPropagation(); onEditClick && onEditClick(ticket); };
    const handleDelete = (e) => { e.stopPropagation(); onDeleteClick && onDeleteClick(ticket.id); };
    const handleApply = (e) => { e.stopPropagation(); onApplyClick && onApplyClick(ticket); };
    const handleViewApplicants = (e) => { e.stopPropagation(); onViewApplicantsClick && onViewApplicantsClick(ticket); };

    return (
        <div 
            className="group relative flex flex-col justify-between p-5 border-2 rounded-xl transition-all cursor-pointer hover:shadow-md overflow-hidden bg-card" 
            style={{ borderColor: colors.bg }}
            onClick={onClick}
        >
            <div 
                className="absolute left-0 top-0 bottom-0 w-1.5" 
                style={{ backgroundColor: colors.text + '77' }}
            />

            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold leading-snug text-foreground line-clamp-2">
                        {ticket.title || '제목 없음'}
                    </h3>
                    <div className="flex flex-wrap items-center justify-end flex-shrink-0 gap-1.5">
                        <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold border" 
                            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                        >
                            {ticket.arrival_airport || '미지정'}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                        {isOwner && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground border border-border">👤 내 등록</span>
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
                            <button 
                                className="px-3 py-1 text-[11px] font-semibold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
                                onClick={handleEdit}
                            >
                                수정
                            </button>
                            <button 
                                className="px-3 py-1 text-[11px] font-semibold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors" 
                                onClick={handleDelete}
                            >
                                삭제
                            </button>
                        </>
                    )}
                    {isOwner && ticket.status === 'sharing' && (
                        <button 
                            className="px-3 py-1 text-[11px] font-semibold rounded-md bg-sky text-sky-foreground hover:bg-sky/90 transition-colors" 
                            onClick={handleViewApplicants}
                        >
                            📋 신청자
                        </button>
                    )}
                    {!isOwner && ticket.status === 'sharing' && (
                        <button 
                            className="px-3 py-1 text-[11px] font-semibold rounded-md bg-green text-green-foreground hover:bg-green/90 transition-colors" 
                            onClick={handleApply}
                        >
                            🎁 신청
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketCard;
