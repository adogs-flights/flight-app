import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const StatusBadge = ({ status }) => {
    switch (status) {
        case 'confirmed':
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green text-green-foreground border border-green/20">✅ 확정</span>;
        case 'rejected':
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">❌ 미선정</span>;
        default:
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-earth-foreground text-earth border border-earth/20">⏳ 대기중</span>;
    }
};

export default function MyApplicationsView() {
    const { apiClient } = useAuth();
    
    // 상태 통합 관리
    const [appsState, setAppsState] = useState({
        data: [],
        loading: true,
        error: ''
    });

    useEffect(() => {
        const fetchApplications = async () => {
            setAppsState(prev => ({ ...prev, loading: true }));
            try {
                const response = await apiClient.get('/me/applications');
                setAppsState({ data: response.data, loading: false, error: '' });
            } catch (err) {
                console.error(err);
                setAppsState({ data: [], loading: false, error: '내 신청 현황을 불러오는 데 실패했습니다.' });
            }
        };

        fetchApplications();
    }, [apiClient]);

    const renderContent = () => {
        if (appsState.loading) return <div className="empty"><div>Loading...</div></div>;
        if (appsState.error) return <div className="empty"><div className="text-red-500">{appsState.error}</div></div>;
        if (appsState.data.length === 0) return <div className="empty"><div className="empty-icon">📬</div><div className="empty-text">신청 내역이 없습니다</div></div>;

        return appsState.data.map(app => (
            <div key={app.id} className="group flex items-center justify-between p-5 bg-card rounded-xl border-2 border-border shadow-sm transition-all hover:border-primary/30 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground truncate">{app.ticket?.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">📍 {app.ticket?.arrival_airport}</span>
                            <span className="flex items-center gap-1">🗓️ {app.ticket?.departure_date?.split('T')[0]}</span>
                        </div>
                    </div>
                    <div className="p-3 text-[12.5px] leading-relaxed text-muted-foreground bg-muted/30 rounded-lg border border-border/50">
                        <span className="font-bold text-foreground mr-1">💬</span> {app.message}
                    </div>
                </div>
                <div className="ml-6 shrink-0">
                    <StatusBadge status={app.status} />
                </div>
            </div>
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">📬 내 신청 현황</h1>
                <p className="text-sm text-muted-foreground">내가 신청한 이동봉사 티켓들의 처리 상태를 확인하세요.</p>
            </div>
            
            <div className="grid gap-4">
                {renderContent()}
            </div>
        </div>
    );
}
