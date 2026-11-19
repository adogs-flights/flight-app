import { Badge, Button, Heading } from './ui/primitives.js';
import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

// 이미지가 강조된 카드. 공개 "구해요" 게시판에서 쓴다.
const NeedPostCard = ({ post, onClick }) => {
    const { rawAirports } = useAuth();
    const colors = getAirportColor(post.airport_code, rawAirports);

    const formatDate = (dateString) => {
        if (!dateString) return '미정';
        const d = new Date(dateString);
        return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <Button
            type="button"
            onClick={onClick}
            variant="needPostCard" active={post.is_resolved}
        >
            {/* 이미지 영역 */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {post.has_image ? (
                    <img
                        src={`/api/need-posts/${post.id}/image`}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/10 via-sky/10 to-earth/10 text-primary/40">
                        <span className="text-5xl">🐶</span>
                        <span className="text-[11px] font-bold">사진 준비 중</span>
                    </div>
                )}

                {/* 뱃지 오버레이 */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {post.is_urgent && (
                        <Badge variant="needPostCard">🚨 급구</Badge>
                    )}
                    {post.is_resolved && (
                        <Badge variant="needPostCard2">완료</Badge>
                    )}
                </div>
                <div className="absolute top-3 right-3">
                    <Badge
                        variant="needPostCard3"
                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                    >
                        {post.airport_code}
                    </Badge>
                </div>
            </div>

            {/* 본문 */}
            <div className="flex flex-col flex-1 p-4 gap-3">
                <Heading as="h3" variant="needPostCard" active={post.is_resolved}>
                    {post.title}
                </Heading>

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="opacity-70">📅</span> {formatDate(post.desired_date)}</span>
                    <span className="flex items-center gap-1 text-primary"><span className="opacity-70">🎫</span> {post.seats_needed}마리</span>
                    <span className="flex items-center gap-1"><span className="opacity-70">👤</span> {post.author?.name || '익명'}</span>
                </div>
            </div>
        </Button>
    );
};

export default NeedPostCard;
