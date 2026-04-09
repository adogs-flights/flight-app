import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import NeedPostItem from '../components/NeedPostItem';
import NeedPostFormModal from '../components/modals/NeedPostFormModal';
import { useModal } from '../hooks/useModal';
import { MAJOR_AIRPORTS } from '../utils/airportUtils';

export default function NeedPostView() {
    const { apiClient, user } = useAuth();
    
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
            return !MAJOR_AIRPORTS.includes(post.airport_code.toUpperCase());
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
        <>
            <div id="sectionNeed">
                <div className="toolbar" style={{ marginBottom: '16px' }}>
                    <div className="toolbar-left"><span className="page-title">🙏 구해요 게시판</span></div>
                    <div className="toolbar-right">
                        <div className="search-box">🔍<input placeholder="공항 코드 또는 제목 검색..." value={searchText} onChange={e => setSearchText(e.target.value)} /></div>
                        <button className="btn btn-primary" onClick={handleCreateClick}>+ 구해요 등록</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', overflowX: 'auto', paddingBottom: '2px' }}>
                    <button 
                        className={`need-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('ALL')}
                    >전체</button>
                    {MAJOR_AIRPORTS.map(code => (
                        <button 
                            key={code}
                            className={`need-tab ${activeFilter === code ? 'active' : ''}`}
                            onClick={() => setActiveFilter(code)}
                        >✈️ {code}</button>
                    ))}
                    <button 
                        className={`need-tab ${activeFilter === 'OTHERS' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('OTHERS')}
                    >🌐 기타</button>
                </div>
                <div id="needBoardList" style={{ background: 'white', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', minHeight: '160px' }}>
                    {renderContent()}
                </div>
            </div>
            <NeedPostFormModal 
                isOpen={isOpen} 
                onClose={closeModal} 
                post={currentPost}
                onPostSaved={handlePostSaved}
            />
        </>
    );
}
