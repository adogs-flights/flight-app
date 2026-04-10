import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function NavItem({ to, icon, children, count }) {
    return (
        <NavLink to={to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon">{icon}</span>
            {children}
            {count > 0 && <span className="nav-count">{count}</span>}
        </NavLink>
    );
}

export default function Sidebar({ isOpen, onClose, onPwChangeClick }) {
    const { user } = useAuth();
    const isAdmin = user?.admin_info?.approved;

    // These counts would come from API calls
    const scheduleCount = 0;
    const needCount = 0;
    const giveCount = 0;
    const stats = { regular: 0, sharing: 0, shared: 0, owned: 0 };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header mobile-only">
                <div className="sidebar-logo">
                    <div className="logo-icon">✈️</div>
                    <div className="logo-text">해봉티켓</div>
                </div>
                <button className="sidebar-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-title">메뉴</div>
                <nav className="sidebar-nav">
                    <NavItem to="/schedules" icon="📅" count={scheduleCount}>일정 관리</NavItem>
                    <NavItem to="/needs" icon="🙏" count={needCount}>구해요 게시판</NavItem>
                    <NavItem to="/give" icon="🎁" count={giveCount}>나눔해요</NavItem>
                    <NavItem to="/mytickets" icon="🎫">내 티켓</NavItem>
                    <NavItem to="/myapplications" icon="📬">내 신청 현황</NavItem>
                    {isAdmin && <NavItem to="/admin" icon="⚙️">관리자 페이지</NavItem>}
                    
                    {/* 모바일에서만 보이는 비밀번호 변경 (메뉴 하단에 자연스럽게 배치) */}
                    <button className="nav-item mobile-only" onClick={onPwChangeClick}>
                        <span className="nav-icon">🔑</span> 비밀번호 변경
                    </button>
                </nav>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-title">이달 현황</div>
                <div className="stat-row">
                    <div className="stat-item">
                        <span className="stat-label"><span className="stat-dot" style={{ background: 'var(--sky)' }}></span>일반 일정</span>
                        <span className="stat-num">{stats.regular}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label"><span className="stat-dot" style={{ background: 'var(--green)' }}></span>나눔중</span>
                        <span className="stat-num">{stats.sharing}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label"><span className="stat-dot" style={{ background: 'var(--ink-mute)' }}></span>나눔완료</span>
                        <span className="stat-num">{stats.shared}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label"><span className="stat-dot" style={{ background: 'var(--purple)' }}></span>소유중</span>
                        <span className="stat-num">{stats.owned}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
