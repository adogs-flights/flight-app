import { ActionLink, Badge, Button } from '../ui/primitives.js';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import logo from '../../assets/flight-app.PNG'

export default function Header({ onMenuClick, onPwChangeClick }) {
    const { user, logout, deleteAccount } = useAuth();

    const handleWithdraw = async () => {
        if (!window.confirm('정말 회원 탈퇴하시겠습니까?\n계정과 내 신청·게시글이 삭제되며 되돌릴 수 없습니다.')) return;
        try {
            await deleteAccount();
        } catch {
            alert('탈퇴 처리에 실패했습니다.');
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex items-center justify-between h-16 max-w-7xl px-4 mx-auto sm:px-6 lg:px-8">
                <div className="flex items-center">
                    <Button
                        variant="menu"
                        onClick={onMenuClick}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </Button>
                    <ActionLink as={Link} to="/" variant="header">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background text-primary-foreground font-bold">
                            <img src={logo} alt=''></img>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-bold tracking-tight text-foreground">해봉티켓</span>
                            <span className="hidden text-[12px] font-medium text-muted-foreground sm:block">해외이동봉사 일정 관리</span>
                        </div>
                    </ActionLink>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 pr-2 border-r">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-xs ring-1 ring-border shadow-sm">
                                        {user.name ? user.name[0].toUpperCase() : 'U'}
                                    </div>
                                    <span className="hidden text-sm font-medium text-foreground lg:block">{user.name}</span>
                                    {user.role === 'admin' && (
                                        <Badge variant="header">관리자</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                    variant="headerPassword"
                                    onClick={onPwChangeClick}
                                >
                                    <span>🔑</span> 비밀번호 변경
                                </Button>
                                <Button
                                    variant="logout"
                                    onClick={logout}
                                >
                                    로그아웃
                                </Button>
                                <Button
                                    variant="headerWithdraw"
                                    onClick={handleWithdraw}
                                >
                                    회원 탈퇴
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
