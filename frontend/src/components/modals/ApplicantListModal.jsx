import { Alert, Badge, Button } from '../ui/primitives.js';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';

const ApplicantItem = ({ application, onConfirm, onReject }) => {
    const { applicant } = application;
    return (
        <div className="flex items-start gap-4 p-4 bg-background rounded-xl border-2 border-border transition-all hover:border-primary/30">
            <div className="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold text-sm shadow-sm">
                {applicant.name ? applicant.name[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                <div className="space-y-0.5">
                    <div className="text-sm font-bold text-foreground">{applicant.name}</div>
                    <div className="text-[11px] font-medium text-muted-foreground truncate">{applicant.email}</div>
                </div>
                <div className="p-3 text-xs leading-relaxed text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                    <span className="font-bold text-foreground mr-1">💬</span> {application.message}
                </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
                {application.status === 'pending' ? (
                    <>
                        <Button
                            variant="confirmApplicant"
                            onClick={() => onConfirm(application.id)}
                        >
                            확정
                        </Button>
                        <Button
                            variant="rejectApplicant"
                            onClick={() => onReject(application.id)}
                        >
                            거절
                        </Button>
                    </>
                ) : (
                    <Badge variant="applicantList" active={application.status === 'confirmed'}>
                        {application.status === 'confirmed' ? '✅ 확정' : '❌ 미선정'}
                    </Badge>
                )}
            </div>
        </div>
    );
};

export default function ApplicantListModal({ isOpen, onClose, ticket, onStatusChanged }) {
    const { apiClient } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && ticket) {
            setLoading(true);
            apiClient.get(`/tickets/${ticket.id}/applications`)
                .then(res => setApplications(res.data))
                .catch(() => setError('신청자 목록을 불러오는 데 실패했습니다.'))
                .finally(() => setLoading(false));
        }
    }, [isOpen, ticket, apiClient]);

    const handleUpdateStatus = async (applicationId, status) => {
        try {
            await apiClient.put(`/applications/${applicationId}`, { status });
            onStatusChanged();
            onClose();
        } catch {
            alert('상태 변경에 실패했습니다.');
        }
    };

    const renderContent = () => {
        if (loading) return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
        if (error) return <Alert variant="applicantList">{error}</Alert>;
        if (applications.length === 0) return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <span className="text-3xl opacity-20">📭</span>
                <p className="text-sm font-medium text-muted-foreground">아직 신청자가 없습니다</p>
            </div>
        );

        return (
            <div className="grid gap-3">
                {applications.map(app => (
                    <ApplicantItem 
                        key={app.id} 
                        application={app} 
                        onConfirm={(id) => handleUpdateStatus(id, 'confirmed')} 
                        onReject={(id) => handleUpdateStatus(id, 'rejected')}
                    />
                ))}
            </div>
        );
    }

    const footer = (
        <Button
            variant="secondary"
            onClick={onClose}
        >
            닫기
        </Button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📋 나눔 신청자 목록" footer={footer}>
            <div className="space-y-6">
                {ticket && (
                    <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-1 animate-in fade-in duration-500">
                        <div className="text-sm font-bold text-primary">📋 {ticket.title}</div>
                        <div className="text-[11px] font-medium text-primary/70">나눔 신청 목록을 관리합니다.</div>
                    </div>
                )}
                <div className="animate-in fade-in duration-300">
                    {renderContent()}
                </div>
            </div>
        </Modal>
    );
}
