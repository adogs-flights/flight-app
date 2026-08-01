import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import NeedPostCard from '../components/NeedPostCard';
import PublicNeedPostDetailModal from '../components/modals/PublicNeedPostDetailModal';
import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';

// 비로그인·일반 사용자가 보는 읽기 전용 "구해요" 게시판.
// 공개 엔드포인트(/need-posts/public)를 쓰며 연락처는 노출하지 않는다.
export default function PublicNeedBoard() {
    const { user, logout, apiClient } = useAuth();

    const [postsState, setPostsState] = useState({ data: [], loading: true, error: '' });
    const [currentPost, setCurrentPost] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

    const fetchPosts = useCallback(async () => {
        setPostsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/need-posts/public');
            setPostsState({ data: response.data, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setPostsState({ data: [], loading: false, error: '게시글을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleDetailClick = (post) => {
        setCurrentPost(post);
        openDetailModal();
    };

    const filteredPosts = postsState.data.filter(post => {
        const matchesSearch =
            post.title.toLowerCase().includes(searchText.toLowerCase()) ||
            post.airport_code.toLowerCase().includes(searchText.toLowerCase());
        if (!matchesSearch) return false;
        if (activeFilter === 'ALL') return true;

        const desiredDate = new Date(post.desired_date);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        if (activeFilter === 'THIS_MONTH') {
            return desiredDate.getFullYear() === currentYear && desiredDate.getMonth() === currentMonth;
        }
        if (activeFilter === 'AFTER_MONTH') {
            return desiredDate >= new Date(currentYear, currentMonth + 1, 1);
        }
        return true;
    });

    const renderContent = () => {
        if (postsState.loading) {
            return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">불러오는 중...</div>;
        }
        if (postsState.error) {
            return <div className="flex items-center justify-center py-20 text-sm text-destructive">{postsState.error}</div>;
        }
        if (filteredPosts.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                    <span className="text-3xl">🔍</span>
                    <span className="text-sm">조건에 맞는 게시글이 없습니다</span>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPosts.map(post => (
                    <NeedPostCard key={post.id} post={post} onClick={() => handleDetailClick(post)} />
                ))}
            </div>
        );
    };

    const filterBtn = (key, label) => (
        <button
            className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${activeFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
            onClick={() => setActiveFilter(key)}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            {/* Nav */}
            <header className="w-full border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="해봉티켓" className="w-8 h-8" />
                        <span className="font-bold text-foreground">해봉티켓</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        <Link to="/guide" className="inline-flex items-center justify-center h-9 px-3 text-sm font-bold rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            이동봉사 안내
                        </Link>
                        {user ? (
                            <>
                                <span className="hidden sm:inline text-sm font-bold text-foreground px-2">{user.name}님</span>
                                <button onClick={logout} className="inline-flex items-center justify-center h-9 px-3 text-sm font-bold rounded-lg text-foreground hover:bg-secondary transition-colors">
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="inline-flex items-center justify-center h-9 px-4 text-sm font-bold rounded-lg text-foreground hover:bg-secondary transition-colors">
                                로그인
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">이동봉사 구해요</h1>
                        <p className="text-sm text-muted-foreground">도움이 필요한 이동봉사 일정을 확인하고, 함께해 주세요.</p>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <input
                            placeholder="공항 코드 또는 제목 검색..."
                            className="flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all focus:border-primary/50 sm:w-[260px]"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filterBtn('ALL', '전체')}
                    {filterBtn('THIS_MONTH', '이번 달')}
                    {filterBtn('AFTER_MONTH', '이번 달 이후')}
                </div>

                <div className="min-h-[400px]">
                    {renderContent()}
                </div>

                <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center">
                    <div className="text-sm text-muted-foreground">
                        도움을 주실 수 있나요?{' '}
                        <Link to="/apply" className="font-bold text-primary hover:underline">🎁 봉사 티켓 제출하기 →</Link>
                    </div>
                </div>
            </main>

            <Footer />

            <PublicNeedPostDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                post={currentPost}
            />
        </div>
    );
}
