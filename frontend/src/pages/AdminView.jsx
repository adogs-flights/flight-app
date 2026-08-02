import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import RegisterUserModal from '../components/modals/RegisterUserModal';
import AirportModal from '../components/modals/AirportModal';
import AirlineModal from '../components/modals/AirlineModal';
import OrganizationModal from '../components/modals/OrganizationModal';
import GuestSubmissionReviewModal from '../components/modals/GuestSubmissionReviewModal';

const ROLE_LABEL = {
    admin: '관리자',
    org: '단체',
    general: '일반'
};

const ROLE_BADGE = {
    admin: 'bg-sky/10 text-sky border-sky/20',
    org: 'bg-earth/10 text-earth-foreground border-earth/20',
    general: 'bg-muted text-muted-foreground border-border'
};

export default function AdminView() {
    const { apiClient, fetchStaticData } = useAuth();
    const [activeTab, setActiveTab] = useState('users');

    // 데이터 상태
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [airports, setAirports] = useState([]);
    const [airlines, setAirlines] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedItem, setSelectedItem] = useState(null);

    // 모달 관리
    const userModal = useModal();
    const airportModal = useModal();
    const airlineModal = useModal();
    const organizationModal = useModal();
    const submissionModal = useModal();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            if (activeTab === 'users') {
                const res = await apiClient.get('/users');
                setUsers(res.data);
            } else if (activeTab === 'pending') {
                const res = await apiClient.get('/users/pending');
                setPendingUsers(res.data);
            } else if (activeTab === 'airports') {
                const res = await apiClient.get('/master/airports');
                setAirports(res.data);
            } else if (activeTab === 'airlines') {
                const res = await apiClient.get('/master/airlines');
                setAirlines(res.data);
            } else if (activeTab === 'organizations') {
                const res = await apiClient.get('/organizations');
                setOrganizations(res.data);
            } else if (activeTab === 'submissions') {
                const res = await apiClient.get('/guest-submissions');
                setSubmissions(res.data);
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
        else if (activeTab === 'organizations') organizationModal.openModal();
    };

    const handleCreate = () => {
        setSelectedItem(null);
        if (activeTab === 'users') userModal.openModal();
        else if (activeTab === 'airports') airportModal.openModal();
        else if (activeTab === 'airlines') airlineModal.openModal();
        else if (activeTab === 'organizations') organizationModal.openModal();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말로 삭제하시겠습니까?')) return;
        try {
            if (activeTab === 'airports') await apiClient.delete(`/master/airports/${id}`);
            else if (activeTab === 'airlines') await apiClient.delete(`/master/airlines/${id}`);
            else if (activeTab === 'organizations') await apiClient.delete(`/organizations/${id}`);
            handleSaved();
        } catch {
            alert('삭제에 실패했습니다.');
        }
    };

    const handleReviewSubmission = (item) => {
        setSelectedItem(item);
        submissionModal.openModal();
    };

    const handleEditEmail = async (u) => {
        const newEmail = window.prompt('새 이메일을 입력하세요', u.email || '');
        if (newEmail === null) return;
        const trimmed = newEmail.trim();
        if (!trimmed || trimmed === u.email) return;
        try {
            await apiClient.patch(`/users/${u.id}`, { email: trimmed });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || '이메일 수정에 실패했습니다.');
        }
    };

    const handleDeleteUser = async (u) => {
        if (!window.confirm(`'${u.name}'(${u.email || '이메일 없음'}) 회원을 탈퇴 처리하시겠습니까?\n신청·게시글이 함께 삭제되며 되돌릴 수 없습니다.`)) return;
        try {
            await apiClient.delete(`/users/${u.id}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || '탈퇴 처리에 실패했습니다.');
        }
    };

    const handleApprove = async (u) => {
        if (!window.confirm(`'${u.organization?.name || u.name}' 단체 계정을 승인하시겠습니까?`)) return;
        try {
            await apiClient.post(`/users/${u.id}/approve`);
            handleSaved();
        } catch {
            alert('승인에 실패했습니다.');
        }
    };

    const handleReject = async (u) => {
        if (!window.confirm(`'${u.organization?.name || u.name}' 가입 신청을 거부(삭제)하시겠습니까?`)) return;
        try {
            await apiClient.post(`/users/${u.id}/reject`);
            handleSaved();
        } catch {
            alert('거부 처리에 실패했습니다.');
        }
    };

    const renderPending = () => (
        pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[240px] gap-2 text-muted-foreground">
                <span className="text-3xl">🎉</span>
                <p className="text-sm">승인 대기 중인 가입 신청이 없습니다.</p>
            </div>
        ) : (
            <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <th className="px-6 py-4">단체명</th>
                                <th className="px-6 py-4">담당자</th>
                                <th className="px-6 py-4">이메일</th>
                                <th className="px-6 py-4">신청일</th>
                                <th className="px-6 py-4 text-right">처리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {pendingUsers.map(u => (
                                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-foreground">{u.organization?.name || '-'}</td>
                                    <td className="px-6 py-4">{u.name}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all active:scale-95" onClick={() => handleApprove(u)}>승인</button>
                                            <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => handleReject(u)}>거부</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-border">
                    {pendingUsers.map(u => (
                        <div key={u.id} className="p-4 space-y-2">
                            <div className="font-bold text-foreground">{u.organization?.name || '-'}</div>
                            <div className="text-xs text-muted-foreground">{u.name} · {u.email}</div>
                            <div className="text-[10px] text-muted-foreground/60 italic">{new Date(u.created_at).toLocaleDateString()} 신청</div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-green/10 text-green border border-green/20" onClick={() => handleApprove(u)}>승인</button>
                                <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20" onClick={() => handleReject(u)}>거부</button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )
    );

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
                            <th className="px-6 py-4">단체</th>
                            <th className="px-6 py-4">가입일</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground">{u.name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${ROLE_BADGE[u.role] || ROLE_BADGE.general}`}>
                                        {ROLE_LABEL[u.role] || u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{u.organization?.name || '-'}</td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleEditEmail(u)}>이메일 수정</button>
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => handleDeleteUser(u)}>탈퇴</button>
                                    </div>
                                </td>
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
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ROLE_BADGE[u.role] || ROLE_BADGE.general}`}>
                                {ROLE_LABEL[u.role] || u.role}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        {u.organization?.name && (
                            <div className="text-xs text-muted-foreground">{u.organization.name}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 italic">{new Date(u.created_at).toLocaleDateString()} 가입</div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleEditEmail(u)}>이메일 수정</button>
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20" onClick={() => handleDeleteUser(u)}>탈퇴</button>
                        </div>
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

    const renderOrganizations = () => (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">단체명</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {organizations.map(o => (
                            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-bold">{o.name}</td>
                                <td className="px-6 py-4 text-xs">{o.is_active ? '✅ 활성' : '❌ 중지'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleEdit(o)}>수정</button>
                                        <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => handleDelete(o.id)}>삭제</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {organizations.map(o => (
                    <div key={o.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{o.name}</span>
                            <span className="text-[10px] font-bold">{o.is_active ? '✅ 사용 중' : '❌ 중지됨'}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleEdit(o)}>수정</button>
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20" onClick={() => handleDelete(o.id)}>삭제</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    const submissionStatusLabel = (status) => {
        if (status === 'approved') return '✅ 승인됨';
        if (status === 'rejected') return '❌ 반려됨';
        return '⏳ 검토 대기';
    };

    const verificationMethodLabel = (method) => method === 'eticket_image' ? '📷 이미지' : '🔢 예약번호';

    const renderSubmissions = () => (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-6 py-4">전화번호</th>
                            <th className="px-6 py-4">증빙 방법</th>
                            <th className="px-6 py-4">지정 단체</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4">제출일</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {submissions.map(s => (
                            <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground">{s.phone}</td>
                                <td className="px-6 py-4 text-xs">{verificationMethodLabel(s.verification_method)}</td>
                                <td className="px-6 py-4 text-muted-foreground">{s.organization?.name || '미지정'}</td>
                                <td className="px-6 py-4 text-xs">{submissionStatusLabel(s.status)}</td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95" onClick={() => handleReviewSubmission(s)}>
                                        {s.status === 'pending' ? '검토' : '상세'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {submissions.map(s => (
                    <div key={s.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{s.phone}</span>
                            <span className="text-[10px] font-bold">{submissionStatusLabel(s.status)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{verificationMethodLabel(s.verification_method)} · {s.organization?.name || '단체 미지정'}</div>
                        <div className="flex items-center justify-end">
                            <button className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border" onClick={() => handleReviewSubmission(s)}>
                                {s.status === 'pending' ? '검토' : '상세'}
                            </button>
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
                {['users', 'airports', 'airlines', 'organizations'].includes(activeTab) && (
                    <button
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        onClick={handleCreate}
                    >
                        + {activeTab === 'users' ? '회원 등록' : activeTab === 'airports' ? '공항 등록' : activeTab === 'airlines' ? '항공사 등록' : '단체 등록'}
                    </button>
                )}
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
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'pending' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        ✅ 가입 승인{pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}
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
                    <button
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'organizations' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('organizations')}
                    >
                        🏢 단체
                    </button>
                    <button
                        className={`shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${activeTab === 'submissions' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                        onClick={() => setActiveTab('submissions')}
                    >
                        📋 제출 검토
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
                        activeTab === 'pending' ? renderPending() :
                        activeTab === 'airports' ? renderAirports() :
                        activeTab === 'airlines' ? renderAirlines() :
                        activeTab === 'organizations' ? renderOrganizations() : renderSubmissions()
                    )}
                </div>
            </div>

            <RegisterUserModal isOpen={userModal.isOpen} onClose={userModal.closeModal} onUserRegistered={handleSaved} />
            <AirportModal isOpen={airportModal.isOpen} onClose={airportModal.closeModal} airport={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <AirlineModal isOpen={airlineModal.isOpen} onClose={airlineModal.closeModal} airline={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <OrganizationModal isOpen={organizationModal.isOpen} onClose={organizationModal.closeModal} organization={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <GuestSubmissionReviewModal isOpen={submissionModal.isOpen} onClose={submissionModal.closeModal} submission={selectedItem} onReviewed={handleSaved} />
        </div>
    );
}
