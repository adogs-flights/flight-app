import { Card, Heading } from '../components/ui/primitives.js';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

import ApplicationStatusBadge from '../components/ui/ApplicationStatusBadge';

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
        if (appsState.data.length === 0) return <div className="empty"><div className="empty-text">신청 내역이 없습니다</div></div>;

        return appsState.data.map(app => (
            <Card key={app.id} variant="myApplications">
                <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-1">
                        <Heading as="h4" variant="myApplications">{app.ticket?.title}</Heading>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">{app.ticket?.arrival_airport}</span>
                            <span className="flex items-center gap-1">{app.ticket?.departure_date?.split('T')[0]}</span>
                        </div>
                    </div>
                    <div className="p-3 text-[12.5px] leading-relaxed text-muted-foreground bg-muted/30 rounded-lg border border-border/50">
                        {app.message}
                    </div>
                </div>
                <div className="ml-6 shrink-0">
                    <ApplicationStatusBadge status={app.status} />
                </div>
            </Card>
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <Heading as="h1" variant="page">내 신청 현황</Heading>
                <p className="text-sm text-muted-foreground">내가 신청한 이동봉사 티켓들의 처리 상태를 확인하세요.</p>
            </div>
            
            <div className="grid gap-4">
                {renderContent()}
            </div>
        </div>
    );
}
