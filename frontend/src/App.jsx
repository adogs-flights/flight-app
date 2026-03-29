import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './pages/LoginScreen';
import MainLayout from './components/layout/MainLayout';
import ScheduleView from './pages/ScheduleView';
import NeedPostView from './pages/NeedPostView';
import GiveView from './pages/GiveView';
import MyTicketsView from './pages/MyTicketsView';
import MyApplicationsView from './pages/MyApplicationsView';
import AdminView from './pages/AdminView';

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
