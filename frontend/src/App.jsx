import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './pages/LoginScreen';
import MainLayout from './components/layout/MainLayout';
import ScheduleView from './pages/ScheduleView';
import NeedPostView from './pages/NeedPostView';
import GiveView from './pages/GiveView';
import MyTicketsView from './pages/MyTicketsView';
import MyApplicationsView from './pages/MyApplicationsView';
import AdminView from './pages/AdminView';
import GuestTicketSubmitView from './pages/GuestTicketSubmitView';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <Routes>
      {/* 로그인 여부와 무관하게 항상 접근 가능한 공개 라우트 */}
      <Route path="/apply" element={<GuestTicketSubmitView />} />

      {!user ? (
        <Route path="*" element={<LoginScreen />} />
      ) : (
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/schedules" />} />
          <Route path="schedules" element={<ScheduleView />} />
          <Route path="needs" element={<NeedPostView />} />
          <Route path="give" element={<GiveView />} />
          <Route path="mytickets" element={<MyTicketsView />} />
          <Route path="myapplications" element={<MyApplicationsView />} />
          {user.admin_info?.approved && <Route path="admin" element={<AdminView />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
