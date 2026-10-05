import { ActionLink, Alert, Badge, Button, Card, Heading, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/primitives.js';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import RegisterUserModal from '../components/modals/RegisterUserModal';
import AirportModal from '../components/modals/AirportModal';
import AirlineModal from '../components/modals/AirlineModal';
import OrganizationModal from '../components/modals/OrganizationModal';
import GuestSubmissionReviewModal from '../components/modals/GuestSubmissionReviewModal';

import UserRoleBadge from '../components/ui/UserRoleBadge';

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
                    <Table variant="default">
                        <TableHead variant="plain">
                            <TableRow variant="adminUi">
                                <TableHeaderCell variant="admin">단체명</TableHeaderCell>
                                <TableHeaderCell variant="admin">담당자</TableHeaderCell>
                                <TableHeaderCell variant="admin">이메일</TableHeaderCell>
                                <TableHeaderCell variant="admin">신청일</TableHeaderCell>
                                <TableHeaderCell variant="admin2">처리</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody variant="adminUi">
                            {pendingUsers.map(u => (
                                <TableRow key={u.id} variant="adminUi2">
                                    <TableCell variant="admin">{u.organization?.name || '-'}</TableCell>
                                    <TableCell variant="admin2">{u.name}</TableCell>
                                    <TableCell variant="admin3">{u.email}</TableCell>
                                    <TableCell variant="admin4">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell variant="admin5">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="approveSmall" onClick={() => handleApprove(u)}>승인</Button>
                                            <Button variant="dangerSmall" onClick={() => handleReject(u)}>거부</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-border">
                    {pendingUsers.map(u => (
                        <div key={u.id} className="p-4 space-y-2">
                            <div className="font-bold text-foreground">{u.organization?.name || '-'}</div>
                            <div className="text-xs text-muted-foreground">{u.name} · {u.email}</div>
                            <div className="text-[10px] text-muted-foreground/60 italic">{new Date(u.created_at).toLocaleDateString()} 신청</div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Button variant="approveMobile" onClick={() => handleApprove(u)}>승인</Button>
                                <Button variant="dangerMobile" onClick={() => handleReject(u)}>거부</Button>
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
                <Table variant="default">
                    <TableHead variant="plain">
                        <TableRow variant="adminUi">
                            <TableHeaderCell variant="admin">이름</TableHeaderCell>
                            <TableHeaderCell variant="admin">이메일</TableHeaderCell>
                            <TableHeaderCell variant="admin">권한</TableHeaderCell>
                            <TableHeaderCell variant="admin">단체</TableHeaderCell>
                            <TableHeaderCell variant="admin">가입일</TableHeaderCell>
                            <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody variant="adminUi">
                        {users.map(u => (
                            <TableRow key={u.id} variant="adminUi2">
                                <TableCell variant="admin6">{u.name}</TableCell>
                                <TableCell variant="admin3">{u.email}</TableCell>
                                <TableCell variant="admin2">
                                    <UserRoleBadge role={u.role} />
                                </TableCell>
                                <TableCell variant="admin3">{u.organization?.name || '-'}</TableCell>
                                <TableCell variant="admin4">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                <TableCell variant="admin5">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondarySmall" onClick={() => handleEditEmail(u)}>이메일 수정</Button>
                                        <Button variant="dangerSmall" onClick={() => handleDeleteUser(u)}>탈퇴</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
                {users.map(u => (
                    <div key={u.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{u.name}</span>
                            <UserRoleBadge role={u.role} compact />
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        {u.organization?.name && (
                            <div className="text-xs text-muted-foreground">{u.organization.name}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 italic">{new Date(u.created_at).toLocaleDateString()} 가입</div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <Button variant="secondaryMobile" onClick={() => handleEditEmail(u)}>이메일 수정</Button>
                            <Button variant="dangerMobile" onClick={() => handleDeleteUser(u)}>탈퇴</Button>
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
                <Table variant="default">
                    <TableHead variant="plain">
                        <TableRow variant="adminUi">
                            <TableHeaderCell variant="admin">코드</TableHeaderCell>
                            <TableHeaderCell variant="admin">공항명</TableHeaderCell>
                            <TableHeaderCell variant="admin">국가</TableHeaderCell>
                            <TableHeaderCell variant="admin">색상</TableHeaderCell>
                            <TableHeaderCell variant="admin">상태</TableHeaderCell>
                            <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody variant="adminUi">
                        {airports.map(a => (
                            <TableRow key={a.id} variant="adminUi2">
                                <TableCell variant="admin7">{a.code}</TableCell>
                                <TableCell variant="admin8">{a.name}</TableCell>
                                <TableCell variant="admin3">{a.country}</TableCell>
                                <TableCell variant="admin2">
                                    <Badge
                                        variant="admin"
                                        style={{ backgroundColor: a.bg_color, color: a.text_color, borderColor: a.bg_color }}
                                    >
                                        Chip
                                    </Badge>
                                </TableCell>
                                <TableCell variant="admin9">{a.is_active ? '✅ 활성' : '❌ 중지'}</TableCell>
                                <TableCell variant="admin5">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondarySmall" onClick={() => handleEdit(a)}>수정</Button>
                                        <Button variant="dangerSmall" onClick={() => handleDelete(a.id)}>삭제</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
                            <Badge
                                variant="admin2"
                                style={{ backgroundColor: a.bg_color, color: a.text_color, borderColor: a.bg_color }}
                            >
                                {a.country}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">{a.is_active ? '✅ 활성 상태' : '❌ 사용 중지'}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="secondaryMobile" onClick={() => handleEdit(a)}>수정</Button>
                                <Button variant="dangerMobile" onClick={() => handleDelete(a.id)}>삭제</Button>
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
                <Table variant="default">
                    <TableHead variant="plain">
                        <TableRow variant="adminUi">
                            <TableHeaderCell variant="admin">코드</TableHeaderCell>
                            <TableHeaderCell variant="admin">항공사명</TableHeaderCell>
                            <TableHeaderCell variant="admin">상태</TableHeaderCell>
                            <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody variant="adminUi">
                        {airlines.map(a => (
                            <TableRow key={a.id} variant="adminUi2">
                                <TableCell variant="admin7">{a.code}</TableCell>
                                <TableCell variant="admin8">{a.name}</TableCell>
                                <TableCell variant="admin9">{a.is_active ? '✅ 활성' : '❌ 중지'}</TableCell>
                                <TableCell variant="admin5">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondarySmall" onClick={() => handleEdit(a)}>수정</Button>
                                        <Button variant="dangerSmall" onClick={() => handleDelete(a.id)}>삭제</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
                            <Button variant="secondaryMobile" onClick={() => handleEdit(a)}>수정</Button>
                            <Button variant="dangerMobile" onClick={() => handleDelete(a.id)}>삭제</Button>
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
                <Table variant="default">
                    <TableHead variant="plain">
                        <TableRow variant="adminUi">
                            <TableHeaderCell variant="admin">단체명</TableHeaderCell>
                            <TableHeaderCell variant="admin">상태</TableHeaderCell>
                            <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody variant="adminUi">
                        {organizations.map(o => (
                            <TableRow key={o.id} variant="adminUi2">
                                <TableCell variant="admin8">{o.name}</TableCell>
                                <TableCell variant="admin9">{o.is_active ? '✅ 활성' : '❌ 중지'}</TableCell>
                                <TableCell variant="admin5">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondarySmall" onClick={() => handleEdit(o)}>수정</Button>
                                        <Button variant="dangerSmall" onClick={() => handleDelete(o.id)}>삭제</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
                            <Button variant="secondaryMobile" onClick={() => handleEdit(o)}>수정</Button>
                            <Button variant="dangerMobile" onClick={() => handleDelete(o.id)}>삭제</Button>
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
                <Table variant="default">
                    <TableHead variant="plain">
                        <TableRow variant="adminUi">
                            <TableHeaderCell variant="admin">전화번호</TableHeaderCell>
                            <TableHeaderCell variant="admin">증빙 방법</TableHeaderCell>
                            <TableHeaderCell variant="admin">지정 단체</TableHeaderCell>
                            <TableHeaderCell variant="admin">상태</TableHeaderCell>
                            <TableHeaderCell variant="admin">제출일</TableHeaderCell>
                            <TableHeaderCell variant="admin2">관리</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody variant="adminUi">
                        {submissions.map(s => (
                            <TableRow key={s.id} variant="adminUi2">
                                <TableCell variant="admin6">{s.phone}</TableCell>
                                <TableCell variant="admin9">{verificationMethodLabel(s.verification_method)}</TableCell>
                                <TableCell variant="admin3">{s.organization?.name || '미지정'}</TableCell>
                                <TableCell variant="admin9">{submissionStatusLabel(s.status)}</TableCell>
                                <TableCell variant="admin4">{new Date(s.submitted_at).toLocaleDateString()}</TableCell>
                                <TableCell variant="admin5">
                                    <Button variant="secondarySmall" onClick={() => handleReviewSubmission(s)}>
                                        {s.status === 'pending' ? '검토' : '상세'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
                            <Button variant="secondaryMobile" onClick={() => handleReviewSubmission(s)}>
                                {s.status === 'pending' ? '검토' : '상세'}
                            </Button>
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
                    <Heading as="h1" variant="page">시스템 관리</Heading>
                    <p className="text-sm text-muted-foreground">회원 및 마스터 데이터를 관리합니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ActionLink as={Link}
                        to="/admin/ui"
                        variant="admin"
                    >
                        UI 컴포넌트
                    </ActionLink>
                    {['users', 'airports', 'airlines', 'organizations'].includes(activeTab) && (
                        <Button
                            variant="primary"
                            onClick={handleCreate}
                        >
                            + {activeTab === 'users' ? '회원 등록' : activeTab === 'airports' ? '공항 등록' : activeTab === 'airlines' ? '항공사 등록' : '단체 등록'}
                        </Button>
                    )}
                </div>
            </div>

            <Card variant="admin">
                <div className="flex items-center gap-1 border-b px-2 bg-muted/30 overflow-x-auto scrollbar-hide">
                    <Button
                        variant="tab" active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 회원
                    </Button>
                    <Button
                        variant="tab" active={activeTab === 'pending'}
                        onClick={() => setActiveTab('pending')}
                    >
                        ✅ 가입 승인{pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}
                    </Button>
                    <Button
                        variant="tab" active={activeTab === 'airports'}
                        onClick={() => setActiveTab('airports')}
                    >
                        🏢 공항
                    </Button>
                    <Button
                        variant="tab" active={activeTab === 'airlines'}
                        onClick={() => setActiveTab('airlines')}
                    >
                        ✈️ 항공사
                    </Button>
                    <Button
                        variant="tab" active={activeTab === 'organizations'}
                        onClick={() => setActiveTab('organizations')}
                    >
                        🏢 단체
                    </Button>
                    <Button
                        variant="tab" active={activeTab === 'submissions'}
                        onClick={() => setActiveTab('submissions')}
                    >
                        📋 제출 검토
                    </Button>
                </div>

                <div className="flex-1 animate-in fade-in duration-300">
                    {error && (
                        <Alert variant="admin">
                            {error}
                        </Alert>
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
            </Card>

            <RegisterUserModal isOpen={userModal.isOpen} onClose={userModal.closeModal} onUserRegistered={handleSaved} />
            <AirportModal isOpen={airportModal.isOpen} onClose={airportModal.closeModal} airport={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <AirlineModal isOpen={airlineModal.isOpen} onClose={airlineModal.closeModal} airline={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <OrganizationModal isOpen={organizationModal.isOpen} onClose={organizationModal.closeModal} organization={selectedItem} onSaved={handleSaved} apiClient={apiClient} />
            <GuestSubmissionReviewModal isOpen={submissionModal.isOpen} onClose={submissionModal.closeModal} submission={selectedItem} onReviewed={handleSaved} />
        </div>
    );
}
