import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import NeedPostItem from '../components/NeedPostItem';
import NeedPostFormModal from '../components/modals/NeedPostFormModal';
import { useModal } from '../hooks/useModal';

export default function NeedPostView() {
    const { apiClient, user, airports } = useAuth();
    
    // 상태 통합 관리
    const [postsState, setPostsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [currentPost, setCurrentPost] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const { isOpen, openModal, closeModal } = useModal();

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
        openModal();
    };

    const handleEditClick = (post) => {
        setCurrentPost(post);
        openModal();
    };

    const handlePostSaved = () => {
        fetchPosts();
    };

    const filteredPosts = postsState.data.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchText.toLowerCase()) || 
                             post.airport_code.toLowerCase().includes(searchText.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'OTHERS') {
            const masterCodes = airports.map(a => a.value);
            return !masterCodes.includes(post.airport_code.toUpperCase());
        }
        return post.airport_code.toUpperCase() === activeFilter;
    });

    const renderContent = () => {
        if (postsState.loading) {
            return <div className="empty"><div>Loading...</div></div>;
        }
        if (postsState.error) {
            return <div className="empty"><div className="text-red-500">{postsState.error}</div></div>;
        }
        if (filteredPosts.length === 0) {
            return <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">조건에 맞는 게시글이 없습니다</div></div>;
        }
        return filteredPosts.map(post => (
            <div key={post.id} onClick={() => (post.author_id === user.id) && handleEditClick(post)} style={{ cursor: (post.author_id === user.id) ? 'pointer' : 'default' }}>
                <NeedPostItem post={post} />
            </div>
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">🙏 구해요 게시판</h1>
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

            <div className="flex flex-col bg-card rounded-xl border-2 border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="flex items-center gap-1 border-b px-2 bg-muted/30 overflow-x-auto scrollbar-hide">
                    <button 
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeFilter === 'ALL' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveFilter('ALL')}
                    >
                        전체
                    </button>
                    {airports.map(airport => (
                        <button 
                            key={airport.value}
                            className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeFilter === airport.value ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            onClick={() => setActiveFilter(airport.value)}
                        >
                            ✈️ {airport.value}
                        </button>
                    ))}
                    <button 
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeFilter === 'OTHERS' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveFilter('OTHERS')}
                    >
                        🌐 기타
                    </button>
                </div>
                
                <div className="flex-1 divide-y divide-border/50 animate-in fade-in duration-300">
                    {renderContent()}
                </div>
            </div>

            <NeedPostFormModal 
                isOpen={isOpen} 
                onClose={closeModal} 
                post={currentPost}
                onPostSaved={handlePostSaved}
            />
        </div>
    );
}
