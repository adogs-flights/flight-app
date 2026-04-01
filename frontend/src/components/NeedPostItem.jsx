import { getAirportColor } from '../utils/airportUtils';

const NeedPostItem = ({ post }) => {
    // A simple date formatter
    const formatDate = (dateString) => {
        if (!dateString) return '미정';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className={`board-post ${post.is_resolved ? 'opacity-60' : ''}`} >
            <div className={`board-post-icon ${post.is_urgent ? 'bg-red-100' : 'bg-sky-100'}`}>
                {post.is_urgent ? '🚨' : '✈️'}
            </div>
            <div className="board-post-body">
                <div className={`board-post-title ${post.is_resolved ? 'line-through text-stone-500' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {post.title}
                    {(() => {
                        const colors = getAirportColor(post.airport_code);
                        return (
                            <span 
                                className="badge badge-airport" 
                                style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg, padding: '1px 6px', fontSize: '10px' }}
                            >
                                {post.airport_code}
                            </span>
                        );
                    })()}
                </div>
                <div className="board-post-meta">
                    <span>📅 {formatDate(post.desired_date)}</span>
                    <span>{post.flight_route}</span>
                    <span>🎫 {post.seats_needed}매</span>
                    <span>👤 {post.author?.name || '알 수 없음'}</span>
                </div>
            </div>
            <div className="board-post-right">
                <span className="board-post-date">{formatDate(post.created_at)}</span>
                {post.is_urgent && <span className="badge-urgent">급구</span>}
                {post.is_resolved && <span className="badge-resolved">해결됨</span>}
            </div>
        </div>
    );
};

export default NeedPostItem;
