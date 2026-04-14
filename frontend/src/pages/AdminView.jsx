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
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">이름</th>
                            <th className="px-6 py-4">이메일</th>
                            <th className="px-6 py-4">권한</th>
                            <th className="px-6 py-4 text-right">가입일</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground">{u.name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                                <td className="px-6 py-4">
                                    {u.admin_info?.approved && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky/10 text-sky border border-sky/20 whitespace-nowrap">관리자</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground text-xs text-right">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {users.map(u => (
                    <div key={u.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{u.name}</span>
                            {u.admin_info?.approved && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky/10 text-sky border border-sky/20">관리자</span>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        <div className="text-[10px] text-muted-foreground/60 italic">{new Date(u.created_at).toLocaleDateString()} 가입</div>
                    </div>
                ))}
            </div>
        </>
    );

    const renderAirports = () => (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">코드</th>
                            <th className="px-6 py-4">공항명</th>
                            <th className="px-6 py-4">국가</th>
                            <th className="px-6 py-4">색상</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {airports.map(a => (
                            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-black text-foreground">{a.code}</td>
                                <td className="px-6 py-4 font-bold">{a.name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{a.country}</td>
                                <td className="px-6 py-4">
                                    <span 
                                        className="px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm" 
                                        style={{ backgroundColor: a.bg_color, color: a.text_color, borderColor: a.bg_color }}
                                    >
                                        Chip
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">{a.is_active ? '✅ 활성' : '❌ 중지'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleEdit(a)}>수정</button>
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => handleDelete(a.id)}>삭제</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {airports.map(a => (
                    <div key={a.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-foreground">{a.code}</span>
                                <span className="text-xs font-bold text-muted-foreground">{a.name}</span>
                            </div>
                            <span 
                                className="px-2 py-0.5 rounded-md text-[10px] font-black border" 
                                style={{ backgroundColor: a.bg_color, color: a.text_color, borderColor: a.bg_color }}
                            >
                                {a.country}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">{a.is_active ? '✅ 활성 상태' : '❌ 사용 중지'}</span>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleEdit(a)}>수정</button>
                                <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20" onClick={() => handleDelete(a.id)}>삭제</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    const renderAirlines = () => (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">코드</th>
                            <th className="px-6 py-4">항공사명</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {airlines.map(a => (
                            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-black text-foreground">{a.code}</td>
                                <td className="px-6 py-4 font-bold">{a.name}</td>
                                <td className="px-6 py-4 text-xs">{a.is_active ? '✅ 활성' : '❌ 중지'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleEdit(a)}>수정</button>
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => handleDelete(a.id)}>삭제</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {airlines.map(a => (
                    <div key={a.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-foreground">{a.code}</span>
                                <span className="text-xs font-bold text-muted-foreground">{a.name}</span>
                            </div>
                            <span className="text-[10px] font-bold">{a.is_active ? '✅ 사용 중' : '❌ 중지됨'}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleEdit(a)}>수정</button>
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20" onClick={() => handleDelete(a.id)}>삭제</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">시스템 관리</h1>
                    <p className="text-sm text-muted-foreground">회원 및 마스터 데이터를 관리합니다.</p>
                </div>
                <button 
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                    onClick={handleCreate}
                >
                    + {activeTab === 'users' ? '회원 등록' : activeTab === 'airports' ? '공항 등록' : '항공사 등록'}
                </button>
            </div>

            <div className="flex flex-col bg-card rounded-xl border-2 border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="flex items-center gap-1 border-b px-2 bg-muted/30 overflow-x-auto scrollbar-hide">
                    <button 
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'users' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 회원
                    </button>
                    <button 
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'airports' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('airports')}
                    >
                        🏢 공항
                    </button>
                    <button 
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'airlines' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('airlines')}
                    >
                        ✈️ 항공사
                    </button>
                </div>

                <div className="flex-1 animate-in fade-in duration-300">
                    {error && (
                        <div className="m-4 px-4 py-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    {loading ? (
                        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                            데이터를 불러오는 중...
                        </div>
                    ) : (
                        activeTab === 'users' ? renderUsers() :
                        activeTab === 'airports' ? renderAirports() : renderAirlines()
                    )}
                </div>
            </div>

            <RegisterUserModal isOpen={userModal.isOpen} onClose={userModal.closeModal} onUserRegistered={handleSaved} />
            <AirportModal isOpen={airportModal.isOpen} onClose={airportModal.closeModal} airport={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <AirlineModal isOpen={airlineModal.isOpen} onClose={airlineModal.closeModal} airline={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
        </div>
    );
}
