import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

const statusBadge = (s) => {
    if (s === 'confirmed') return <span className="a-status a-confirmed">✅ 확정</span>;
    if (s === 'rejected') return <span className="a-status a-rejected">❌ 미선정</span>;
    return <span className="a-status a-pending">⏳ 대기중</span>;
};

export default function MyApplicationsView() {
    const { apiClient } = useAuth();
    
    // 상태 통합 관리
    const [appsState, setAppsState] = useState({
        data: [],
        loading: true,
        error: ''
    });

    const fetchApplications = useCallback(async () => {
        setAppsState(prev => ({ ...prev, loading: true }));
        try {
            const response = await apiClient.get('/me/applications');
            setAppsState({ data: response.data, loading: false, error: '' });
        } catch (err) {
            console.error(err);
            setAppsState({ data: [], loading: false, error: '내 신청 현황을 불러오는 데 실패했습니다.' });
        }
    }, [apiClient]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const renderContent = () => {
        if (appsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (appsState.error) return <div className="empty"><div className="text-red-500">{appsState.error}</div></div>;
        if (appsState.data.length === 0) return <div className="empty"><div className="empty-icon">📬</div><div className="empty-text">신청 내역이 없습니다</div></div>;

        return appsState.data.map(app => (
            <div key={app.id} className="applicant-item" style={{ marginBottom: '12px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{app.ticket?.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '8px' }}>
                        📍 {app.ticket?.arrival_airport} · 🗓️ {app.ticket?.departure_date?.split('T')[0]}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink-mute)', background: 'var(--paper-warm)', padding: '8px', borderRadius: '6px' }}>
                        💬 {app.message}
                    </div>
                </div>
                <div style={{ marginLeft: '16px' }}>
                    {statusBadge(app.status)}
                </div>
            </div>
        ));
    };

    return (
        <div id="sectionMyapps">
            <div className="toolbar" style={{ marginBottom: '16px' }}>
                <div className="toolbar-left"><span className="page-title">📬 내 신청 현황</span></div>
            </div>
            <div className="list-view" style={{ display: 'flex', flexDirection: 'column' }}>
                {renderContent()}
            </div>
        </div>
    );
}
