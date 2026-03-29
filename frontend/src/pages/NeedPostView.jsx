import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NeedPostItem from '../components/NeedPostItem';
import NeedPostFormModal from '../components/modals/NeedPostFormModal';
import { useModal } from '../hooks/useModal';

export default function NeedPostView() {
    const { apiClient, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPost, setCurrentPost] = useState(null);
    const { isOpen, openModal, closeModal } = useModal();

    const fetchPosts = () => {
        setLoading(true);
        apiClient.get('/need-posts')
            .then(response => {
                setPosts(response.data);
            })
            .catch(err => {
                console.error(err);
                setError('게시글을 불러오는 데 실패했습니다.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPosts();
    }, [apiClient]);

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

    const renderContent = () => {
        if (loading) {
            return <div className="empty"><div>Loading...</div></div>;
        }
        if (error) {
            return <div className="empty"><div className="text-red-500">{error}</div></div>;
        }
        if (posts.length === 0) {
            return <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">등록된 구해요가 없습니다</div></div>;
        }
        return posts.map(post => (
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
                        <div className="search-box">🔍<input placeholder="검색..." /></div>
                        <button className="btn btn-primary" onClick={handleCreateClick}>+ 구해요 등록</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
                    <button className="need-tab active">전체</button>
                    <button className="need-tab">🗽 JFK</button>
                    <button className="need-tab">✈️ EWR</button>
                    {/* ... other tabs */}
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
