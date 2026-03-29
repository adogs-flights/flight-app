import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout() {
    return (
        <div>
            <Header />
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
