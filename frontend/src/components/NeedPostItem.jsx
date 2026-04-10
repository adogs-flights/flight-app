import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

const NeedPostItem = ({ post }) => {
    const { rawAirports } = useAuth();
    
    // A simple date formatter
    const formatDate = (dateString) => {
        if (!dateString) return '미정';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div 
            className={`group flex items-center gap-5 p-5 border-b border-border transition-all hover:bg-muted/30 cursor-pointer ${post.is_resolved ? 'opacity-50' : ''}`}
        >
            <div className={`flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl text-xl shadow-inner border-2 ${post.is_urgent ? 'bg-destructive/10 border-destructive/20 text-destructive animate-pulse' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                {post.is_urgent ? '🚨' : '🙏'}
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2.5">
                    <h4 className={`text-base font-black tracking-tight truncate ${post.is_resolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {post.title}
                    </h4>
                    {(() => {
                        const colors = getAirportColor(post.airport_code, rawAirports);
                        return (
                            <span 
                                className="px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm shrink-0" 
                                style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                            >
                                {post.airport_code}
                            </span>
                        );
                    })()}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                        <span className="opacity-70">📅</span> {formatDate(post.desired_date)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                        <span className="opacity-70">👤</span> {post.author?.name || '익명'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                        <span className="opacity-70">🎫</span> {post.seats_needed}매 필요
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest italic">{formatDate(post.created_at)}</span>
                <div className="flex items-center gap-1.5">
                    {post.is_urgent && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20">URGENT</span>
                    )}
                    {post.is_resolved && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-secondary text-secondary-foreground border border-border">RESOLVED</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NeedPostItem;
