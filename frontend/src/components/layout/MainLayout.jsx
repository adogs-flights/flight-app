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
    }, [location]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="layout-root">
            <Header onMenuClick={toggleSidebar} onPwChangeClick={openPwModal} />
            
            {/* 모바일용 사이드바 배경 (Backdrop) */}
            {isSidebarOpen && (
                <div className="sidebar-backdrop" onClick={closeSidebar}></div>
            )}

            <div className="layout">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={closeSidebar} 
                    onPwChangeClick={openPwModal} 
                />
                <main className="main">
                    <Outlet />
                </main>
            </div>

            <ChangePasswordModal isOpen={isPwModalOpen} onClose={closePwModal} />
        </div>
    );
}
