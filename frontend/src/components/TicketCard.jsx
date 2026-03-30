import { useAuth } from '../contexts/AuthContext';

const TicketStatusBadge = ({ status }) => {
    switch (status) {
        case 'sharing':
            return <span className="badge badge-sharing">🟢 나눔중</span>;
        case 'shared':
            return <span className="badge badge-shared">✅ 나눔완료</span>;
        case 'owned':
            return <span className="badge badge-owned">🔒 소유중</span>;
        default:
            return null;
    }
};

const TicketCard = ({ ticket, onEditClick, onDeleteClick, onApplyClick, onViewApplicantsClick, onClick }) => {
    const { user } = useAuth();
    const isOwner = ticket.owner_id === user.id;

    // A simple date formatter
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const cardCls = (ticket.status === 'sharing' || ticket.status === 'shared' || ticket.status === 'owned') ? 'give' : 'regular';

    const handleEdit = (e) => { e.stopPropagation(); onEditClick(ticket); };
    const handleDelete = (e) => { e.stopPropagation(); onDeleteClick(ticket.id); };
    const handleApply = (e) => { e.stopPropagation(); onApplyClick(ticket); };
    const handleViewApplicants = (e) => { e.stopPropagation(); onViewApplicantsClick(ticket); };

    return (
        <div className={`ticket-card ${cardCls}`} onClick={onClick}>
            <div className="ticket-top">
                <div className="ticket-title">{ticket.title}</div>
                <div className="ticket-badges">
                    <span className="badge badge-airport">{ticket.country}</span>
                    <TicketStatusBadge status={ticket.status} />
                    {isOwner && ticket.status !== 'regular' && <span className="badge badge-mine">👤 내 등록</span>}
                </div>
            </div>
            <div className="ticket-meta">
                <span>📅 {formatDate(ticket.departure_date)} ~ {formatDate(ticket.return_date)}</span>
                <span>✈️ {ticket.flight_info}</span>
            </div>
            <div className="ticket-footer">
                <span className="ticket-contact">👤 현 소유자: {ticket.owner?.name || '알 수 없음'}</span>
                <div className="ticket-actions">
                    {isOwner && (
                        <>
                            <button className="btn-xs btn-edit" onClick={handleEdit}>수정</button>
                            <button className="btn-xs btn-del" onClick={handleDelete}>삭제</button>
                        </>
                    )}
                    {isOwner && ticket.status === 'sharing' && (
                        <button className="btn-xs btn-applicants" onClick={handleViewApplicants}>📋 신청자</button>
                    )}
                    {!isOwner && ticket.status === 'sharing' && (
                        <button className="btn-xs btn-share" onClick={handleApply}>🎁 신청</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketCard;
