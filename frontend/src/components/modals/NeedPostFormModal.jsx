import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const airportOptions = [
    { value: "JFK", label: "🗽 뉴욕 JFK" },
    { value: "EWR", label: "✈️ 뉴왁 EWR" },
    { value: "LAX", label: "🌴 엘에이 LAX" },
    { value: "YVR", label: "🍁 밴쿠버 YVR" },
    { value: "YYZ", label: "🏙️ 토론토 YYZ" },
];

export default function NeedPostFormModal({ isOpen, onClose, post, onPostSaved }) {
    const { apiClient } = useAuth();
    const [title, setTitle] = useState('');
    const [airportCode, setAirportCode] = useState('JFK');
    const [seatsNeeded, setSeatsNeeded] = useState(1);
    const [desiredDate, setDesiredDate] = useState('');
    const [contact, setContact] = useState('');
    const [detail, setDetail] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [error, setError] = useState('');

    const isEditing = post != null;

    useEffect(() => {
        if (isEditing) {
            setTitle(post.title);
            setAirportCode(post.airport_code);
            setSeatsNeeded(post.seats_needed);
            setDesiredDate(post.desired_date?.split('T')[0] || '');
            setContact(post.contact);
            setDetail(post.detail || '');
            setIsUrgent(post.is_urgent);
        } else {
            // Reset form for new post
            setTitle('');
            setAirportCode('JFK');
            setSeatsNeeded(1);
            setDesiredDate('');
            setContact('');
            setDetail('');
            setIsUrgent(false);
        }
    }, [post, isEditing, isOpen]);


    const handleSubmit = async () => {
        setError('');
        if (!title.trim() || !contact.trim()) {
            setError('제목과 연락처는 필수입니다.');
            return;
        }

        const postData = {
            title, airport_code: airportCode, seats_needed: seatsNeeded,
            desired_date: desiredDate || null, contact, detail, is_urgent: isUrgent,
        };

        try {
            if (isEditing) {
                await apiClient.put(`/need-posts/${post.id}`, postData);
            } else {
                await apiClient.post('/need-posts', postData);
            }
            onPostSaved(); // Callback to refresh the list
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        }
    };
    
    const footer = (
        <>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? '수정하기' : '등록하기'}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '🙏 구해요 수정' : '🙏 구해요 등록'} footer={footer}>
            <div className="form-grid">
                <div className="form-group full"><label className="form-label">제목</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: JFK 4월 출발편 1매 구합니다" /></div>
                <div className="form-group"><label className="form-label">도착 공항</label>
                    <select className="form-input" value={airportCode} onChange={e => setAirportCode(e.target.value)}>
                        {airportOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="form-group"><label className="form-label">필요 매수</label><input className="form-input" type="number" min="1" value={seatsNeeded} onChange={e => setSeatsNeeded(parseInt(e.target.value))} /></div>
                <div className="form-group"><label className="form-label">희망 출발일</label><input className="form-input" type="date" value={desiredDate} onChange={e => setDesiredDate(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">연락처</label><input className="form-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="010-xxxx-xxxx 또는 이메일" /></div>
                <div className="form-group full"><label className="form-label">상세 내용</label><textarea className="form-input" value={detail} onChange={e => setDetail(e.target.value)} placeholder="비용 부담 여부, 단체 정보 등..."></textarea></div>
                <div className="form-group full"><label style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',cursor:'pointer'}}><input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} style={{width:'15px',height:'15px'}} /> 급구 표시</label></div>
                {error && <div className="form-group full"><div className="login-error" style={{display: 'block'}}>{error}</div></div>}
            </div>
        </Modal>
    );
}
