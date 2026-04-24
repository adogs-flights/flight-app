import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TicketCard from '../components/TicketCard';
import TicketFormModal from '../components/modals/TicketFormModal';
import ApplicantListModal from '../components/modals/ApplicantListModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import DateFilterModal from '../components/modals/DateFilterModal';
import FolderSelectModal from '../components/modals/FolderSelectModal';
import { useModal } from '../hooks/useModal';
import { getAirportColor } from '../utils/airportUtils';
import { gdriveApi } from '../utils/api';

function GoogleDriveSyncPanel({ onStatusUpdate }) {
    const [status, setStatus] = useState({ is_connected: false, root_folder_id: null, loading: true });
    const [actionLoading, setActionLoading] = useState(false);
    const { isOpen: isSelectOpen, openModal: openSelectModal, closeModal: closeSelectModal } = useModal();

    const fetchStatus = async () => {
        try {
            const res = await gdriveApi.getStatus();
            setStatus({ ...res.data, loading: false });
        } catch (error) {
            console.error('GDrive status error:', error);
            setStatus({ is_connected: false, root_folder_id: null, loading: false });
        }
    };

    useEffect(() => {
        fetchStatus();
        
        // OAuth 리다이렉트 성공 후 돌아왔을 때 처리
        const params = new URLSearchParams(window.location.search);
        if (params.get('gdrive') === 'success') {
            window.history.replaceState({}, document.title, window.location.pathname);
            alert('구글 계정 연동에 성공했습니다! 동기화 폴더 설정을 진행해주세요.');
        }
    }, []);

    const handleConnect = async () => {
        setActionLoading(true);
        try {
            const res = await gdriveApi.connect();
            window.location.href = res.data.authorization_url;
        } catch {
            alert('구글 연동을 시작하지 못했습니다.');
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('구글 드라이브 연동을 해제하시겠습니까?')) return;
        
        setActionLoading(true);
        try {
            await gdriveApi.disconnect();
            alert('구글 드라이브 연동이 해제되었습니다.');
            fetchStatus();
            onStatusUpdate && onStatusUpdate();
        } catch {
            alert('연동 해제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSetupFolder = async (folderName) => {
        setActionLoading(true);
        try {
            await gdriveApi.setupFolder(folderName, true);
            alert(`'${folderName}' 폴더가 생성되고 연동되었습니다.`);
            closeSelectModal();
            fetchStatus();
            onStatusUpdate && onStatusUpdate();
        } catch {
            alert('폴더 생성에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectFolder = async (folder) => {
        if (!window.confirm(`'${folder.name}' 폴더를 동기화 폴더로 설정하시겠습니까?`)) return;
        
        setActionLoading(true);
        try {
            await gdriveApi.setFolder(folder.id);
            alert('폴더 설정이 완료되었습니다.');
            closeSelectModal();
            fetchStatus();
            onStatusUpdate && onStatusUpdate();
        } catch {
            alert('폴더 설정에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (status.loading) return null;

    return (
        <>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-inner flex items-center justify-center text-2xl shrink-0">
                            📁
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                구글 드라이브 동기화
                                {status.is_connected && status.root_folder_id && (
                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-black">연동중</span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                {!status.is_connected 
                                    ? '구글 계정을 연결하여 티켓을 구글 드라이브와 자동으로 동기화해보세요.'
                                    : !status.root_folder_id 
                                        ? '연동이 완료되었습니다. 아래 버튼을 눌러 동기화 폴더를 설정해주세요.'
                                        : "구글 드라이브의 '해봉티켓_동기화' 폴더와 연결되어 있습니다."}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                        {!status.is_connected ? (
                            <button 
                                onClick={handleConnect}
                                disabled={actionLoading}
                                className="w-full sm:w-auto bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? '연결 중...' : '구글 계정 연결'}
                            </button>
                        ) : !status.root_folder_id ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={openSelectModal}
                                    disabled={actionLoading}
                                    className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                >
                                    동기화 폴더 설정
                                </button>
                                <button 
                                    onClick={handleDisconnect}
                                    disabled={actionLoading}
                                    className="shrink-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                    title="연동 해제"
                                >
                                    연동 해제
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none text-center text-xs font-bold text-slate-400 bg-white px-4 py-2.5 rounded-xl border-2 border-slate-100 whitespace-nowrap">
                                    설정 완료
                                </div>
                                <button 
                                    onClick={handleDisconnect}
                                    disabled={actionLoading}
                                    className="shrink-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    연동 해제
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FolderSelectModal 
                isOpen={isSelectOpen} 
                onClose={closeSelectModal} 
                onSelect={handleSelectFolder}
                onCreate={handleSetupFolder} 
            />
        </>
    );
}

export default function MyTicketsView() {
    const { apiClient, user, airports, rawAirports } = useAuth();
    
    // 상태 통합 관리
    const [ticketsState, setTicketsState] = useState({
        data: [],
        loading: true,
        error: ''
    });
    
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
    const [selectedAirport, setSelectedAirport] = useState('전체');
    const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM or YYYY-MM-DD
    const [searchText, setSearchText] = useState('');
    const [currentTicket, setCurrentTicket] = useState(null);

    const { isOpen: isFormOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
    const { isOpen: isApplicantsOpen, openModal: openApplicantsModal, closeModal: closeApplicantsModal } = useModal();
    const { isOpen: isDetailOpen, openModal: openDetailModal, closeModal: closeDetailModal } = useModal();
    const { isOpen: isDateOpen, openModal: openDateModal, closeModal: closeDateModal } = useModal();

    const fetchMyTickets = useCallback(async () => {
        setTicketsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/tickets');
            const myTickets = response.data.filter(t => t.owner_id === user.id);
            setTicketsState({ data: myTickets, loading: false, error: '' });
        } catch (error) {
            console.error('Fetch tickets error:', error);
            setTicketsState({ data: [], loading: false, error: '내 티켓을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient, user.id]);

    useEffect(() => {
        fetchMyTickets();
    }, [fetchMyTickets]);

    const handleCreateClick = () => {
        setCurrentTicket(null);
        openFormModal();
    };

    const handleEditClick = (ticket) => {
        setCurrentTicket(ticket);
        openFormModal();
    };

    const handleViewApplicantsClick = (ticket) => {
        setCurrentTicket(ticket);
        openApplicantsModal();
    };

    const handleTicketClick = (ticket) => {
        setCurrentTicket(ticket);
        openDetailModal();
    };

    const handleDeleteClick = async (ticketId) => {
        if (window.confirm('정말로 이 티켓을 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/tickets/${ticketId}`);
                fetchMyTickets();
            } catch {
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleTicketSaved = (updatedTicket) => { 
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchMyTickets(); 
    };
    const handleStatusChanged = (updatedTicket) => { 
        if (updatedTicket && updatedTicket.id) setCurrentTicket(updatedTicket);
        fetchMyTickets(); 
    };

    // 필터링 및 정렬 로직
    const filteredTickets = ticketsState.data
        .filter(t => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ticketDate = new Date(t.departure_date);
            ticketDate.setHours(0, 0, 0, 0);

            // 1. 탭 필터링 (예정 vs 지난)
            if (activeTab === 'upcoming') {
                if (ticketDate < today) return false;
            } else {
                if (ticketDate >= today) return false;
            }

            // 2. 공항 필터
            if (selectedAirport !== '전체') {
                if (selectedAirport === '기타') {
                    const masterCodes = airports.map(a => a.value);
                    if (masterCodes.includes(t.arrival_airport)) return false;
                } else {
                    if (t.arrival_airport !== selectedAirport) return false;
                }
            }

            // 3. 날짜 필터
            if (selectedDate) {
                if (!t.departure_date.startsWith(selectedDate)) return false;
            }

            // 4. 검색 필터
            if (searchText.trim()) {
                if (!t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
            }

            return true;
        })
        .sort((a, b) => {
            // 정렬 로직: 예정된 일정은 가까운 순(ASC), 지난 일정은 최신 순(DESC)
            if (activeTab === 'upcoming') {
                return new Date(a.departure_date) - new Date(b.departure_date);
            } else {
                return new Date(b.departure_date) - new Date(a.departure_date);
            }
        });

    const getDateButtonLabel = () => {
        if (!selectedDate) return '기간 선택';
        if (selectedDate.length === 7) {
            const [y, m] = selectedDate.split('-');
            return `${y}년 ${parseInt(m)}월 전체`;
        }
        const [y, m, d] = selectedDate.split('-');
        return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
    };

    const renderListContent = () => {
        if (ticketsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (ticketsState.error) return <div className="empty"><div className="text-red-500">{ticketsState.error}</div></div>;
        if (filteredTickets.length === 0) {
            return (
                <div className="empty">
                    <div className="empty-icon">{activeTab === 'upcoming' ? '🎫' : '📁'}</div>
                    <div className="empty-text">
                        {activeTab === 'upcoming' ? '예정된 티켓이 없습니다' : '지난 티켓 내역이 없습니다'}
                    </div>
                </div>
            );
        }
        
        return filteredTickets.map(ticket => (
            <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onClick={() => handleTicketClick(ticket)}
            />
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">내 티켓</h1>
                    <p className="text-sm text-muted-foreground">내가 등록하고 관리하는 티켓 목록입니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-1 rounded-lg bg-secondary/50 border border-border">
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            예정된 일정
                        </button>
                        <button 
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'past' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('past')}
                        >
                            지난 일정
                        </button>
                    </div>
                    <button 
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                        onClick={handleCreateClick}
                    >
                        + 티켓 등록
                    </button>
                </div>
            </div>

            <GoogleDriveSyncPanel onStatusUpdate={fetchMyTickets} />

            <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${selectedAirport === '전체' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setSelectedAirport('전체')}
                    >
                        전체
                    </button>
                    {airports.map(airport => {
                        const colors = getAirportColor(airport.value, rawAirports);
                        const isActive = selectedAirport === airport.value;
                        return (
                            <button
                                key={airport.value}
                                className="shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all"
                                style={{ 
                                    backgroundColor: colors.bg, 
                                    color: colors.text, 
                                    borderColor: isActive ? colors.text + '55' : colors.bg,
                                    opacity: isActive ? 1 : 0.7
                                }}
                                onClick={() => setSelectedAirport(airport.value)}
                            >
                                {airport.value}
                            </button>
                        );
                    })}
                    <button
                        className={`shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${selectedAirport === '기타' ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-background text-muted-foreground border-border hover:border-primary/30'}`}
                        onClick={() => setSelectedAirport('기타')}
                    >
                        기타
                    </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={openDateModal}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all shadow-sm active:scale-95 ${
                                selectedDate 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {getDateButtonLabel()}
                            <span className="text-[10px] opacity-50">▼</span>
                        </button>
                        
                        {selectedDate && (
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                title="날짜 필터 초기화"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
                        <input 
                            placeholder="티켓 제목 검색..." 
                            className="flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none transition-all focus:border-primary/50 sm:w-[240px]"
                            value={searchText} 
                            onChange={e => setSearchText(e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            <div className="robust-grid animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderListContent()}
            </div>

            <DateFilterModal 
                isOpen={isDateOpen}
                onClose={closeDateModal}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
            />

            <TicketFormModal 
                isOpen={isFormOpen}
                onClose={closeFormModal}
                ticket={currentTicket}
                onTicketSaved={handleTicketSaved}
            />
            <ApplicantListModal
                isOpen={isApplicantsOpen}
                onClose={closeApplicantsModal}
                ticket={currentTicket}
                onStatusChanged={handleStatusChanged}
            />
            <TicketDetailModal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                ticket={currentTicket}
                onEditClick={handleEditClick}
                onViewApplicantsClick={handleViewApplicantsClick}
                onDeleteClick={handleDeleteClick}
                onUpdate={handleTicketSaved}
            />
        </div>
    );
}
