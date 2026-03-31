import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Header({ onMenuClick, onPwChangeClick }) {
    const { user, logout } = useAuth();

    return (
        <header>
            <div className="header-left">
                <button className="menu-btn mobile-only" onClick={onMenuClick}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <Link to="/" className="logo">
                    <div className="logo-icon">✈️</div>
                    <div className="logo-info">
                        <div className="logo-text">해봉티켓</div>
                        <div className="logo-sub hide-mobile">해외이동봉사 일정 관리</div>
                    </div>
                </Link>
            </div>
            
            <div className="header-nav">
                {user && (
                    <>
                        <div className="user-profile">
                            <div className="avatar">{user.name ? user.name[0].toUpperCase() : ''}</div>
                            <span className="user-name hide-mobile">{user.name}</span>
                            {user.admin_info?.approved && <span className="badge-admin hide-mobile">관리자</span>}
                        </div>
                        {/* PC 환경에서만 비밀번호 변경 노출 */}
                        <button className="btn btn-ghost hide-mobile" style={{ fontSize: '12px' }} onClick={onPwChangeClick}>🔑 비밀번호 변경</button>
                        {/* 로그아웃은 모바일/PC 공통 노출 */}
                        <button className="btn btn-ghost" onClick={logout}>로그아웃</button>
                    </>
                )}
            </div>
        </header>
    );
}
