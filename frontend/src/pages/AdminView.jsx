import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import RegisterUserModal from '../components/modals/RegisterUserModal';
import AirportModal from '../components/modals/AirportModal';
import AirlineModal from '../components/modals/AirlineModal';

export default function AdminView() {
    const { apiClient, fetchStaticData } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    
    // 데이터 상태
    const [users, setUsers] = useState([]);
    const [airports, setAirports] = useState([]);
    const [airlines, setAirlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedItem, setSelectedItem] = useState(null);

    // 모달 관리
    const userModal = useModal();
    const airportModal = useModal();
    const airlineModal = useModal();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            if (activeTab === 'users') {
                const res = await apiClient.get('/users');
                setUsers(res.data);
            } else if (activeTab === 'airports') {
                const res = await apiClient.get('/master/airports');
                setAirports(res.data);
            } else if (activeTab === 'airlines') {
                const res = await apiClient.get('/master/airlines');
                setAirlines(res.data);
            }
        } catch {
            setError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaved = () => {
        fetchData();
        fetchStaticData(); // 전역 정적 데이터 갱신
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        if (activeTab === 'airports') airportModal.openModal();
        else if (activeTab === 'airlines') airlineModal.openModal();
    };

    const handleCreate = () => {
        setSelectedItem(null);
        if (activeTab === 'users') userModal.openModal();
        else if (activeTab === 'airports') airportModal.openModal();
        else if (activeTab === 'airlines') airlineModal.openModal();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말로 삭제하시겠습니까?')) return;
        try {
            if (activeTab === 'airports') await apiClient.delete(`/master/airports/${id}`);
            else if (activeTab === 'airlines') await apiClient.delete(`/master/airlines/${id}`);
            handleSaved();
        } catch {
            alert('삭제에 실패했습니다.');
        }
    };

    const renderUsers = () => (
        <table className="member-table">
            <thead>
                <tr><th>이름</th><th>이메일</th><th>관리자</th><th>가입일</th></tr>
            </thead>
            <tbody>
                {users.map(u => (
                    <tr key={u.id}>
                        <td>{u.name}</td>
                        <td style={{color:'var(--ink-soft)'}}>{u.email}</td>
                        <td>{u.admin_info?.approved && <span className="badge badge-mine">관리자</span>}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderAirports = () => (
        <table className="member-table">
            <thead>
                <tr><th>코드</th><th>공항명</th><th>국가</th><th>색상</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
                {airports.map(a => (
                    <tr key={a.id}>
                        <td style={{fontWeight:600}}>{a.code}</td>
                        <td>{a.name}</td>
                        <td>{a.country}</td>
                        <td>
                            <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                backgroundColor: a.bg_color, 
                                color: a.text_color,
                                fontSize: '11px',
                                border: `1px solid ${a.bg_color}`
                            }}>Chip</span>
                        </td>
                        <td>{a.is_active ? '✅' : '❌'}</td>
                        <td>
                            <button className="btn-xs btn-edit" onClick={() => handleEdit(a)}>수정</button>
                            <button className="btn-xs btn-del" onClick={() => handleDelete(a.id)}>삭제</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderAirlines = () => (
        <table className="member-table">
            <thead>
                <tr><th>코드</th><th>항공사명</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
                {airlines.map(a => (
                    <tr key={a.id}>
                        <td style={{fontWeight:600}}>{a.code}</td>
                        <td>{a.name}</td>
                        <td>{a.is_active ? '✅' : '❌'}</td>
                        <td>
                            <button className="btn-xs btn-edit" onClick={() => handleEdit(a)}>수정</button>
                            <button className="btn-xs btn-del" onClick={() => handleDelete(a.id)}>삭제</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div id="sectionAdmin">
            <div className="toolbar" style={{ marginBottom: '16px' }}>
                <div className="toolbar-left"><span className="page-title">⚙️ 시스템 관리</span></div>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={handleCreate}>+ {activeTab === 'users' ? '회원 등록' : activeTab === 'airports' ? '공항 등록' : '항공사 등록'}</button>
                </div>
            </div>

            <div className="view-tabs" style={{ marginBottom: '16px' }}>
                <button className={`view-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 회원</button>
                <button className={`view-tab ${activeTab === 'airports' ? 'active' : ''}`} onClick={() => setActiveTab('airports')}>🏢 공항</button>
                <button className={`view-tab ${activeTab === 'airlines' ? 'active' : ''}`} onClick={() => setActiveTab('airlines')}>✈️ 항공사</button>
            </div>

            {error && <div className="info-box red">{error}</div>}
            
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {loading ? <p style={{padding:'20px'}}>Loading...</p> : (
                    activeTab === 'users' ? renderUsers() :
                    activeTab === 'airports' ? renderAirports() : renderAirlines()
                )}
            </div>

            <RegisterUserModal isOpen={userModal.isOpen} onClose={userModal.closeModal} onUserRegistered={handleSaved} />
            <AirportModal isOpen={airportModal.isOpen} onClose={airportModal.closeModal} airport={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <AirlineModal isOpen={airlineModal.isOpen} onClose={airlineModal.closeModal} airline={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
        </div>
    );
}
