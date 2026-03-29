import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const statusBadge = (s) => {
    if (s === 'confirmed') return <span className="a-status a-confirmed">✅ 확정</span>;
    if (s === 'rejected') return <span className="a-status a-rejected">❌ 미선정</span>;
    return <span className="a-status a-pending">검토중</span>;
};

export default function MyApplicationsView() {
    const { apiClient } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        apiClient.get('/me/applications')
            .then(response => {
                setApplications(response.data);
            })
            .catch(err => {
                console.error(err);
                setError('내 신청 현황을 불러오는 데 실패했습니다.');
            })
            .finally(() => setLoading(false));
    }, [apiClient]);

    const renderContent = () => {
        if (loading) return <div className="empty"><div>Loading...</div></div>;
        if (error) return <div className="empty"><div className="text-red-500">{error}</div></div>;
        if (applications.length === 0) return <div className="empty"><div className="empty-icon">📬</div><div className="empty-text">신청한 나눔이 없습니다</div></div>;

        return applications.map(({ ticket, ...app }) => (
            <div className="ticket-card give" key={app.id}>
                <div className="ticket-top">
                    <div className="ticket-title">{ticket?.title || '삭제된 티켓'}</div>
                    <div className="ticket-badges">{statusBadge(app.status)}</div>
                </div>
                <div className="ticket-meta">
                    <span>📅 {ticket?.departure_date.split('T')[0]} ~ {ticket?.return_date.split('T')[0]}</span>
                    <span>✈️ {ticket?.flight_info}</span>
                    <span>📅 신청: {new Date(app.applied_at).toLocaleDateString()}</span>
                </div>
                <div className="ticket-footer">
                    <span className="ticket-contact">💬 "{app.message}"</span>
                </div>
            </div>
        ));
    };

    return (
        <div id="sectionMyapplied">
            <div className="toolbar" style={{ marginBottom: '16px' }}>
                <div className="toolbar-left"><span className="page-title">📬 내 신청 현황</span></div>
            </div>
            <div className="list-view" style={{ display: 'flex', flexDirection: 'column' }}>
                {renderContent()}
            </div>
        </div>
    );
}
