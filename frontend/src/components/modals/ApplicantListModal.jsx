import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const ApplicantItem = ({ application, onConfirm, onReject }) => {
    const { applicant } = application;
    return (
        <div className="applicant-item">
            <div className="applicant-avatar">{applicant.name ? applicant.name[0] : '?'}</div>
            <div className="applicant-info">
                <div className="applicant-name">{applicant.name}</div>
                <div className="applicant-sub">{applicant.email}</div>
                <p className="text-xs mt-2 text-gray-600">"{application.message}"</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {application.status === 'pending' ? (
                    <>
                        <button className="btn-confirm" onClick={() => onConfirm(application.id)}>확정</button>
                        <button className="btn-xs btn-del" onClick={() => onReject(application.id)}>거절</button>
                    </>
                ) : (
                    <span className={`a-status ${application.status === 'confirmed' ? 'a-confirmed' : 'a-rejected'}`}>
                        {application.status === 'confirmed' ? '✅ 확정' : '❌ 미선정'}
                    </span>
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
                .catch(err => setError('신청자 목록을 불러오는데 실패했습니다.'))
                .finally(() => setLoading(false));
        }
    }, [isOpen, ticket, apiClient]);

    const handleUpdateStatus = async (applicationId, status) => {
        try {
            await apiClient.put(`/applications/${applicationId}`, { status });
            onStatusChanged(); // This should refetch tickets and applications
            onClose(); // Close modal after action
        } catch (err) {
            alert(`상태 변경에 실패했습니다: ${err.response?.data?.detail}`);
        }
    };

    const renderContent = () => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p className="text-red-500">{error}</p>;
        if (applications.length === 0) return <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">아직 신청자가 없습니다</div></div>;

        return (
            <div className="applicant-list">
                {applications.map(app => (
                    <ApplicantItem 
                        key={app.id} 
                        application={app} 
                        onConfirm={handleUpdateStatus} 
                        onReject={(id) => handleUpdateStatus(id, 'rejected')}
                    />
                ))}
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📋 나눔 신청자 목록" footer={<button className="btn btn-ghost" onClick={onClose}>닫기</button>}>
            {ticket && <div className="info-box blue" style={{ marginBottom: '14px' }}>📋 <strong>{ticket.title}</strong>의 나눔 신청 목록</div>}
            {renderContent()}
        </Modal>
    );
}
