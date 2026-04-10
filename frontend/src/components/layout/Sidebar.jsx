import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/flight-app.PNG';

function NavItem({ to, icon, children, count }) {
    return (
        <NavLink 
            to={to} 
            className={({ isActive }) => 
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <span className={`text-base transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>{icon}</span>
                    <span className="flex-1">{children}</span>
                    {count > 0 && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black border ${isActive ? 'bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                            {count}
                        </span>
                    )}
                </>
            )}
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
        <>
            <aside className={`
                fixed inset-y-0 left-0 z-[60] w-72 bg-background border-r transform transition-transform duration-300 ease-in-out sm:sticky sm:top-24 sm:z-0 sm:translate-x-0 sm:border-none sm:bg-transparent sm:h-fit sm:w-64
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full sm:translate-x-0'}
            `}>
                <div className="flex flex-col h-full sm:h-auto gap-8 sm:gap-6 p-6 sm:p-0">
                    <div className="flex items-center justify-between sm:hidden pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black">
                                <img src={logo} alt="" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-foreground">해봉티켓</span>
                        </div>
                        <button 
                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors border border-border" 
                            onClick={onClose}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-8 sm:space-y-6">
                        <div className="space-y-2">
                            <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-3 ml-1">Main Menu</h4>
                            <nav className="flex flex-col gap-1.5">
                                <NavItem to="/schedules" icon="📅" count={scheduleCount}>일정 관리</NavItem>
                                <NavItem to="/needs" icon="🙏" count={needCount}>구해요 게시판</NavItem>
                                <NavItem to="/give" icon="🎁" count={giveCount}>나눔해요</NavItem>
                                <NavItem to="/mytickets" icon="🎫">내 티켓</NavItem>
                                <NavItem to="/myapplications" icon="📬">내 신청 현황</NavItem>
                                {isAdmin && <NavItem to="/admin" icon="⚙️">관리자 페이지</NavItem>}
                                
                                <button 
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden transition-all text-left w-full mt-2 border border-dashed border-border" 
                                    onClick={onPwChangeClick}
                                >
                                    <span className="text-base opacity-70">🔑</span> 비밀번호 변경
                                </button>
                            </nav>
                        </div>

                        {/* <div className="p-5 rounded-2xl border-2 border-border bg-card shadow-sm space-y-5 sm:space-y-4 transition-all hover:border-primary/10 hover:shadow-md">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">Statistics</h4>
                            <div className="grid gap-3.5">
                                <div className="flex items-center justify-between text-xs font-bold px-1">
                                    <span className="flex items-center gap-2.5 text-muted-foreground/80">
                                        <span className="w-2 h-2 rounded-full bg-sky shadow-[0_0_8px_rgba(56,189,248,0.5)] animate-pulse"></span>일반 일정
                                    </span>
                                    <span className="text-foreground">{stats.regular}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold px-1">
                                    <span className="flex items-center gap-2.5 text-muted-foreground/80">
                                        <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></span>나눔중
                                    </span>
                                    <span className="text-foreground">{stats.sharing}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold px-1">
                                    <span className="flex items-center gap-2.5 text-muted-foreground/80">
                                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40"></span>나눔완료
                                    </span>
                                    <span className="text-foreground">{stats.shared}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold px-1">
                                    <span className="flex items-center gap-2.5 text-muted-foreground/80">
                                        <span className="w-2 h-2 rounded-full bg-earth"></span>소유중
                                    </span>
                                    <span className="text-foreground">{stats.owned}</span>
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </aside>
        </>
    );
}
