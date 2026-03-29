import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks/useModal';
import RegisterUserModal from '../components/modals/RegisterUserModal';

export default function AdminView() {
    const { apiClient } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isOpen, openModal, closeModal } = useModal();

    const fetchUsers = () => {
        setLoading(true);
        apiClient.get('/users')
            .then(res => setUsers(res.data))
            .catch(err => setError('사용자 목록을 불러오는데 실패했습니다.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [apiClient]);

    const handleUserRegistered = () => {
        fetchUsers();
    };

    const renderContent = () => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p className="text-red-500">{error}</p>;

        return (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table className="member-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>이메일 (아이디)</th>
                            <th>관리자 여부</th>
                            <th>가입일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td style={{ fontWeight: 600 }}>{user.name}</td>
                                <td style={{ color: 'var(--ink-soft)' }}>{user.email}</td>
                                <td>
                                    {user.admin_info?.approved && (
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: 'var(--earth-light)', color: 'var(--earth)', border: '1px solid #fde68a' }}>
                                            관리자
                                        </span>
                                    )}
                                </td>
                                <td style={{ color: 'var(--ink-soft)' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <>
            <div id="sectionAdmin">
                <div className="toolbar" style={{ marginBottom: '16px' }}>
                    <div className="toolbar-left"><span className="page-title">⚙️ 회원 관리</span></div>
                    <div className="toolbar-right"><button className="btn btn-primary" onClick={openModal}>+ 회원 등록</button></div>
                </div>
                <div className="info-box blue">🔒 계정은 관리자만 발급할 수 있습니다. 등록 후 해당 이메일로 <strong>아이디와 임시 비밀번호</strong>가 발송됩니다.</div>
                {renderContent()}
            </div>
            <RegisterUserModal 
                isOpen={isOpen}
                onClose={closeModal}
                onUserRegistered={handleUserRegistered}
            />
        </>
    );
}
