import { ActionLink, Button, Heading, Input } from '../components/ui/primitives.js';
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
    const { user, logout, deleteAccount, apiClient } = useAuth();

    const handleWithdraw = async () => {
        if (!window.confirm('정말 회원 탈퇴하시겠습니까?\n계정 정보가 삭제되며 되돌릴 수 없습니다.')) return;
        try {
            await deleteAccount();
        } catch {
            alert('탈퇴 처리에 실패했습니다.');
        }
    };

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
        <Button
            variant="filter" active={activeFilter === key}
            onClick={() => setActiveFilter(key)}
        >
            {label}
        </Button>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            {/* Nav */}
            <header className="w-full border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <ActionLink as={Link} to="/" variant="orgIntro">
                        <img src={logo} alt="해봉티켓" className="w-8 h-8" />
                        <span className="font-bold text-foreground">해봉티켓</span>
                    </ActionLink>
                    <div className="flex items-center gap-1">
                        <ActionLink as={Link} to="/guide" variant="orgIntro2">
                            이동봉사 안내
                        </ActionLink>
                        {user ? (
                            <>
                                <span className="hidden sm:inline text-sm font-bold text-foreground px-2">{user.name}님</span>
                                <ActionLink as={Link} to="/notifications" variant="publicNeedBoard">알림 설정</ActionLink>
                                <Button onClick={logout} variant="account">
                                    로그아웃
                                </Button>
                                <Button onClick={handleWithdraw} variant="withdraw">
                                    탈퇴
                                </Button>
                            </>
                        ) : (
                            <ActionLink as={Link} to="/login" variant="landing">
                                로그인
                            </ActionLink>
                        )}
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <Heading as="h1" variant="page">이동봉사 구해요</Heading>
                        <p className="text-sm text-muted-foreground">도움이 필요한 이동봉사 일정을 확인하고, 함께해 주세요.</p>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <Input
                            placeholder="공항 코드 또는 제목 검색..."
                            variant="publicSearch"
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
                        <ActionLink as={Link} to="/apply" variant="loginScreen2">🎁 봉사 티켓 제출하기 →</ActionLink>
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
