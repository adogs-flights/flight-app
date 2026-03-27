import { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO } from 'date-fns';

export default function App() {
  const [schedules, setSchedules] = useState([]);
  const [filterType, setFilterType] = useState('전체');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, type: 'login' }); 
  
  // 📞 currentUser를 객체로 관리하여 이름과 전화번호 모두 저장
  const [currentUser, setCurrentUser] = useState(null);

  // 📞 authForm에 phone_number 추가
  const [authForm, setAuthForm] = useState({ username: '', password: '', org_name: '', phone_number: '' });
  const [formData, setFormData] = useState({ post_type: '구해요', departure_date: format(new Date(), 'yyyy-MM-dd'), departure_loc: '', arrival_loc: '', content: '' });

  useEffect(() => {
    fetchSchedules();
    const savedName = localStorage.getItem('org_name');
    const savedPhone = localStorage.getItem('phone_number');
    if (savedName) setCurrentUser({ name: savedName, phone: savedPhone });
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('/api/schedules/');
      setSchedules(res.data);
    } catch (e) { console.error(e); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authModal.type === 'signup') {
        await axios.post('/api/auth/signup', authForm);
        alert('회원가입 완료! 로그인을 진행해주세요.');
        setAuthModal({ isOpen: true, type: 'login' });
      } else {
        const res = await axios.post('/api/auth/login', { username: authForm.username, password: authForm.password });
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('org_name', res.data.org_name);
        localStorage.setItem('phone_number', res.data.phone_number); // 📞 저장
        setCurrentUser({ name: res.data.org_name, phone: res.data.phone_number });
        setAuthModal({ isOpen: false, type: 'login' });
      }
      setAuthForm({ username: '', password: '', org_name: '', phone_number: '' });
    } catch (e) {
      alert(e.response?.data?.detail || "오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('org_name');
    localStorage.removeItem('phone_number');
    setCurrentUser(null);
  };

  const handleWriteClick = () => {
    if (!currentUser) return alert('로그인 후 이용할 수 있습니다.');
    setIsWriteModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 📞 게시글 올릴 때 작성자 이름과 전화번호 같이 전송
      await axios.post('/api/schedules/', { 
        ...formData, 
        author_name: currentUser.name,
        author_phone: currentUser.phone
      });
      setIsWriteModalOpen(false);
      fetchSchedules();
      setFormData({ ...formData, departure_loc: '', arrival_loc: '', content: '' });
    } catch (e) { alert("저장 실패!"); }
  };

  const handleDelete = async (id, authorName) => {
    if (currentUser?.name !== authorName) return alert('본인이 작성한 글만 삭제할 수 있습니다.');
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/schedules/${id}`);
      fetchSchedules();
    } catch (e) { console.error(e); }
  };

  const filteredSchedules = schedules.filter(s => {
    const isTypeMatch = filterType === '전체' || s.post_type === filterType;
    const isDateMatch = format(parseISO(s.departure_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    return isTypeMatch && isDateMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">✈️ 이동봉사 매칭</h1>
        <div className="flex gap-3 items-center">
          {currentUser ? (
            <>
              <span className="text-sm font-bold bg-blue-700 px-3 py-1 rounded">{currentUser.name} 님</span>
              <button onClick={handleLogout} className="text-sm hover:underline">로그아웃</button>
            </>
          ) : (
            <button onClick={() => setAuthModal({ isOpen: true, type: 'login' })} className="font-bold hover:underline">로그인</button>
          )}
          <button onClick={handleWriteClick} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-50">
            + 글쓰기
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:flex gap-6 mt-4">
        {/* 달력 */}
        <div className="md:w-1/2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 md:mb-0">
          <h2 className="text-lg font-bold mb-4">출국일 선택</h2>
          <Calendar 
            onChange={setSelectedDate} 
            value={selectedDate}
            tileContent={({ date }) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const hasPost = schedules.some(s => s.departure_date === dateStr);
              return hasPost ? <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mt-1"></div> : null;
            }}
          />
        </div>

        {/* 리스트 */}
        <div className="md:w-1/2 space-y-4">
          <div className="flex gap-2 mb-4 bg-gray-200 p-1 rounded-lg w-fit">
            {['전체', '구해요', '나눔해요'].map(tab => (
              <button key={tab} onClick={() => setFilterType(tab)} className={`px-4 py-2 rounded-md font-bold text-sm transition ${filterType === tab ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:bg-gray-300'}`}>
                {tab}
              </button>
            ))}
          </div>

          <h3 className="font-bold text-gray-700">{format(selectedDate, 'yyyy년 MM월 dd일')} 일정</h3>
          
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">등록된 일정이 없습니다.</div>
          ) : (
            filteredSchedules.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 relative">
                {currentUser?.name === s.author_name && (
                  <button onClick={() => handleDelete(s.id, s.author_name)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 font-bold">X</button>
                )}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${s.post_type==='구해요' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{s.post_type}</span>
                  {/* 📞 단체명과 전화번호 렌더링 */}
                  <span className="text-sm font-bold text-gray-700">{s.author_name}</span>
                  <span className="text-xs text-gray-500 ml-1">({s.author_phone})</span>
                </div>
                <div className="font-bold text-lg mt-1">{s.departure_loc} ➔ {s.arrival_loc}</div>
                <p className="text-gray-600 text-sm whitespace-pre-wrap mt-2 bg-gray-50 p-3 rounded">{s.content}</p>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 로그인/회원가입 모달 */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{authModal.type === 'login' ? '로그인' : '회원가입'}</h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-sm">
              <input type="text" required placeholder="아이디" className="w-full border p-3 rounded" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
              <input type="password" required placeholder="비밀번호" className="w-full border p-3 rounded" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              {authModal.type === 'signup' && (
                <>
                  <input type="text" required placeholder="단체이름 (또는 닉네임)" className="w-full border p-3 rounded" value={authForm.org_name} onChange={e => setAuthForm({...authForm, org_name: e.target.value})} />
                  {/* 📞 전화번호 입력란 추가 */}
                  <input type="tel" required placeholder="전화번호 (예: 010-1234-5678)" className="w-full border p-3 rounded" value={authForm.phone_number} onChange={e => setAuthForm({...authForm, phone_number: e.target.value})} />
                </>
              )}
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">
                {authModal.type === 'login' ? '로그인하기' : '가입하기'}
              </button>
            </form>
            <div className="mt-4 text-center text-gray-500">
              {authModal.type === 'login' ? (
                <span>계정이 없으신가요? <button onClick={() => setAuthModal({...authModal, type: 'signup'})} className="text-blue-600 font-bold hover:underline">회원가입</button></span>
              ) : (
                <span>이미 계정이 있으신가요? <button onClick={() => setAuthModal({...authModal, type: 'login'})} className="text-blue-600 font-bold hover:underline">로그인</button></span>
              )}
              <button onClick={() => setAuthModal({ isOpen: false })} className="block w-full mt-2 text-gray-400 hover:underline">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 글쓰기 모달 */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4">새 일정 등록</h2>
            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 font-bold mb-1">분류</label>
                <select className="w-full border p-2 rounded" value={formData.post_type} onChange={e => setFormData({...formData, post_type: e.target.value})}>
                  <option>구해요</option>
                  <option>나눔해요</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">날짜</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.departure_date} onChange={e => setFormData({...formData, departure_date: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="block text-gray-700 font-bold mb-1">출발지</label><input type="text" required placeholder="예: 인천 ICN" className="w-full border p-2 rounded" value={formData.departure_loc} onChange={e => setFormData({...formData, departure_loc: e.target.value})} /></div>
                <div className="flex-1"><label className="block text-gray-700 font-bold mb-1">도착지</label><input type="text" required placeholder="예: 뉴욕 JFK" className="w-full border p-2 rounded" value={formData.arrival_loc} onChange={e => setFormData({...formData, arrival_loc: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">상세 내용</label>
                <textarea required rows="4" placeholder="동물 종류, 무게, 요청사항 등..." className="w-full border p-2 rounded" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">등록하기</button>
                <button type="button" onClick={() => setIsWriteModalOpen(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-bold hover:bg-gray-300">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}