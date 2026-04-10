import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useModal } from '../../hooks/useModal';
import ChangePasswordModal from '../modals/ChangePasswordModal';

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isOpen: isPwModalOpen, openModal: openPwModal, closeModal: closePwModal } = useModal();
    const location = useLocation();

    // 페이지 이동 시 사이드바 닫기 (모바일 대응)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]); // 경로가 바뀔 때만 실행

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header onMenuClick={toggleSidebar} onPwChangeClick={openPwModal} />
            
            {/* Mobile Sidebar Backdrop */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 animate-in fade-in duration-200" onClick={closeSidebar}></div>
            )}

            <div className="flex flex-1 w-full max-w-7xl px-4 py-6 mx-auto gap-6 sm:px-6 lg:px-8">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={closeSidebar} 
                    onPwChangeClick={openPwModal} 
                />
                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>

            <ChangePasswordModal isOpen={isPwModalOpen} onClose={closePwModal} />
        </div>
    );
}
