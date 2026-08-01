import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginScreen from './pages/LoginScreen';
import MainLayout from './components/layout/MainLayout';
import ScheduleView from './pages/ScheduleView';
import NeedPostView from './pages/NeedPostView';
import GiveView from './pages/GiveView';
import MyTicketsView from './pages/MyTicketsView';
import MyApplicationsView from './pages/MyApplicationsView';
import AdminView from './pages/AdminView';
import GuestTicketSubmitView from './pages/GuestTicketSubmitView';
import VolunteerGuideView from './pages/VolunteerGuideView';
import KakaoCallback from './pages/KakaoCallback';
import GeneralHome from './pages/GeneralHome';
import SignupChoice from './pages/SignupChoice';
import GeneralSignup from './pages/GeneralSignup';
import OrgSignup from './pages/OrgSignup';

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
      <Route path="/guide" element={<VolunteerGuideView />} />
      {/* 카카오 콜백은 로그인 전 상태에서 도착하므로 !user 분기 바깥에 있어야 한다 */}
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />

      {!user ? (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupChoice />} />
          <Route path="/signup/general" element={<GeneralSignup />} />
          <Route path="/signup/org" element={<OrgSignup />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      ) : user.role === 'general' ? (
        // 카카오로 셀프 가입한 일반 사용자는 단체 업무 화면에 들어오면 안 된다.
        // ScheduleView/NeedPostView 등이 게스트 전화번호와 담당자 정보를 노출한다.
        <Route path="*" element={<GeneralHome />} />
      ) : (
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/schedules" />} />
          <Route path="schedules" element={<ScheduleView />} />
          <Route path="needs" element={<NeedPostView />} />
          <Route path="give" element={<GiveView />} />
          <Route path="mytickets" element={<MyTicketsView />} />
          <Route path="myapplications" element={<MyApplicationsView />} />
          {user.role === 'admin' && <Route path="admin" element={<AdminView />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
