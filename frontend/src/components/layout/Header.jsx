import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useModal } from '../../hooks/useModal';
import ChangePasswordModal from '../modals/ChangePasswordModal';

export default function Header() {
    const { user, logout } = useAuth();
    const { isOpen: isPwModalOpen, openModal: openPwModal, closeModal: closePwModal } = useModal();

    return (
        <>
            <header>
                <Link to="/" className="logo">
                    <div className="logo-icon">✈️</div>
                    <div>
                        <div className="logo-text">해봉티켓</div>
                        <div className="logo-sub">해외이동봉사 일정 관리</div>
                    </div>
                </Link>
                <div className="header-nav">
                    {user && (
                        <>
                            {user.admin_info?.approved && <span className="badge-admin">관리자</span>}
                            <div className="avatar">{user.name ? user.name[0].toUpperCase() : ''}</div>
                            <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 500 }}>{user.name}</span>
                            <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={openPwModal}>🔑 비밀번호 변경</button>
                            <button className="btn btn-ghost" onClick={logout}>로그아웃</button>
                        </>
                    )}
                </div>
            </header>
            <ChangePasswordModal isOpen={isPwModalOpen} onClose={closePwModal} />
        </>
    );
}
