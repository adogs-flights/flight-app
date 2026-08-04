import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import NeedPostCard from '../components/NeedPostCard';
import NeedPostFormModal from '../components/modals/NeedPostFormModal';
import NeedPostDetailModal from '../components/modals/NeedPostDetailModal';
import { useModal } from '../hooks/useModal';

export default function NeedPostView() {
    const { apiClient } = useAuth();
    
    // 상태 통합 관리
    const [postsState, setPostsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [currentPost, setCurrentPost] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, THIS_MONTH, AFTER_MONTH
    const [searchText, setSearchText] = useState('');
    
    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();

    const fetchPosts = useCallback(async () => {
        setPostsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/need-posts');
            setPostsState({ data: response.data, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setPostsState({ data: [], loading: false, error: '게시글을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleCreateClick = () => {
        setCurrentPost(null);
        openFormModal();
    };

    const handleEditClick = (post) => {
        setCurrentPost(post);
        openFormModal();
    };

    const handleDetailClick = (post) => {
        setCurrentPost(post);
        openDetailModal();
    };

    const handleDeleteClick = async (postId) => {
        try {
            await apiClient.delete(`/need-posts/${postId}`);
            fetchPosts();
        } catch {
            alert('삭제에 실패했습니다.');
        }
    };

    const handlePostSaved = () => {
        fetchPosts();
    };

    const filteredPosts = postsState.data.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchText.toLowerCase()) || 
                             post.airport_code.toLowerCase().includes(searchText.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (activeFilter === 'ALL') return true;

        const desiredDate = new Date(post.desired_date);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const postYear = desiredDate.getFullYear();
        const postMonth = desiredDate.getMonth();

        if (activeFilter === 'THIS_MONTH') {
            return postYear === currentYear && postMonth === currentMonth;
        }

        if (activeFilter === 'AFTER_MONTH') {
            const currentMonthDate = new Date(currentYear, currentMonth + 1, 1);
            return desiredDate >= currentMonthDate;
        }

        return true;
    });

    // 급구·미해결을 위로, 해결된 글은 아래로. 같은 그룹은 희망일이 빠른 순.
    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1;
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        const da = a.desired_date ? new Date(a.desired_date).getTime() : Infinity;
        const db = b.desired_date ? new Date(b.desired_date).getTime() : Infinity;
        return da - db;
    });

    const renderContent = () => {
        if (postsState.loading) {
            return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">불러오는 중...</div>;
        }
        if (postsState.error) {
            return <div className="flex items-center justify-center py-20 text-sm text-destructive">{postsState.error}</div>;
        }
        if (sortedPosts.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                    <span className="text-3xl">🔍</span>
                    <span className="text-sm">조건에 맞는 게시글이 없습니다</span>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sortedPosts.map(post => (
                    <NeedPostCard key={post.id} post={post} onClick={() => handleDetailClick(post)} />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">구해요 게시판</h1>
                    <p className="text-sm text-muted-foreground">도움이 필요한 일정을 확인하고 제안하세요.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <input 
                            placeholder="공항 코드 또는 제목 검색..." 
                            className="flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 sm:w-[240px]"
                            value={searchText} 
                            onChange={e => setSearchText(e.target.value)} 
                        />
                    </div>
                    <button 
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                        onClick={handleCreateClick}
                    >
                        + 구해요 등록
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${activeFilter === 'ALL' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setActiveFilter('ALL')}
                    >
                        전체
                    </button>
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${activeFilter === 'THIS_MONTH' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setActiveFilter('THIS_MONTH')}
                    >
                        이번 달
                    </button>
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${activeFilter === 'AFTER_MONTH' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setActiveFilter('AFTER_MONTH')}
                    >
                        이번 달 이후
                    </button>
                </div>
                {!postsState.loading && !postsState.error && (
                    <span className="shrink-0 text-xs font-bold text-muted-foreground whitespace-nowrap">총 {sortedPosts.length}건</span>
                )}
            </div>

            <div className="min-h-[400px] animate-in fade-in duration-300">
                {renderContent()}
            </div>

            <NeedPostFormModal 
                isOpen={isFormOpen} 
                onClose={closeFormModal} 
                post={currentPost}
                onPostSaved={handlePostSaved}
            />
            <NeedPostDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                post={currentPost}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
            />
        </div>
    );
}
