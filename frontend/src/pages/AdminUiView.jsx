import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TicketCard, { TicketStatusBadge } from '../components/TicketCard';
import NeedPostCard from '../components/NeedPostCard';
import CalendarView from '../components/CalendarView';
import SelectField from '../components/ui/SelectField';
import Modal from '../components/ui/Modal';
import DateFilterModal from '../components/modals/DateFilterModal';
import DayTicketsModal from '../components/modals/DayTicketsModal';

const SECTIONS = [
    ['tokens', '색상·글꼴'],
    ['actions', '버튼·배지'],
    ['forms', '입력·선택'],
    ['cards', '티켓·구해요 카드'],
    ['calendar', '달력'],
    ['overlays', '모달'],
    ['feedback', '표·상태 안내'],
];

const COLORS = [
    ['primary', '주요 동작'], ['sky', '일정·안내'], ['green', '나눔·승인'],
    ['destructive', '삭제·오류'], ['background', '페이지 배경'], ['foreground', '본문'],
    ['muted', '보조 배경'], ['muted-foreground', '보조 설명'], ['border', '테두리'],
];

const AIRPORT_OPTIONS = [
    { value: 'JFK', label: '뉴욕 (JFK)' },
    { value: 'LAX', label: '로스앤젤레스 (LAX)' },
    { value: 'YVR', label: '밴쿠버 (YVR)' },
];

// 기본 HTML 컨트롤은 기존 AdminView / TicketFormModal의 스타일을 그대로 보여준다.
const PRIMARY_BUTTON = 'inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm';
const SECONDARY_BUTTON = 'px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors';
const INPUT = 'h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none';

function Section({ id, title, description, children }) {
    return (
        <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 space-y-4 border-t border-border pt-6">
            <div className="space-y-1">
                <h2 id={`${id}-heading`} className="text-lg font-bold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
        </section>
    );
}

function Preview({ title, children }) {
    return (
        <div className="min-w-0 space-y-3 rounded-xl border-2 border-border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            {children}
        </div>
    );
}

export default function AdminUiView() {
    const { user } = useAuth();
    const [calendarDate, setCalendarDate] = useState(() => new Date());
    const [airport, setAirport] = useState('JFK');
    const [airline, setAirline] = useState('');
    const [showFieldError, setShowFieldError] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [modal, setModal] = useState(null);
    const [notice, setNotice] = useState('버튼이나 카드를 누르면 이곳에 체험 결과가 표시됩니다.');
    const [feedback, setFeedback] = useState('empty');

    const sampleDate = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-15`;
    // 실제 티켓이나 개인정보를 읽지 않는다. 이벤트는 이 페이지의 상태만 바꾼다.
    const tickets = [
        { id: 'ui-sharing', title: '뉴욕행 이동봉사 티켓', arrival_airport: 'JFK', status: 'sharing', owner_id: 'ui-other' },
        { id: 'ui-owned', title: '밴쿠버행 기내 1석', arrival_airport: 'YVR', status: 'owned', owner_id: user.id },
        { id: 'ui-shared', title: '로스앤젤레스행 나눔 완료', arrival_airport: 'LAX', status: 'shared', owner_id: 'ui-other' },
    ].map(ticket => ({
        ...ticket, departure_date: sampleDate, flight_info: `ICN → ${ticket.arrival_airport}`,
        airline: '예시 항공사', owner: { name: '예시 담당자' },
    }));
    const posts = [
        { id: 'ui-need-open', title: '뉴욕으로 함께 갈 이동봉사자를 찾아요', airport_code: 'JFK', is_urgent: false, is_resolved: false },
        { id: 'ui-need-urgent', title: '밴쿠버행 이동봉사가 급히 필요해요', airport_code: 'YVR', is_urgent: true, is_resolved: false },
        { id: 'ui-need-resolved', title: '로스앤젤레스 이동봉사 연결 완료', airport_code: 'LAX', is_urgent: false, is_resolved: true },
    ].map(post => ({ ...post, desired_date: sampleDate, seats_needed: 2, has_image: false, author: { name: '예시 단체' } }));

    const previewAction = (label) => setNotice(`${label} 동작을 확인했습니다. 예시 데이터는 저장하거나 삭제하지 않습니다.`);
    const closeModal = () => setModal(null);
    const showTicket = (ticket) => setModal({ type: 'ticket', ticket });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">UI 컴포넌트</h1>
                    <p className="text-sm text-muted-foreground">해봉티켓 화면에서 사용하는 디자인과 컴포넌트를 확인합니다.</p>
                </div>
                <Link to="/admin" className={`${SECONDARY_BUTTON} shrink-0 text-center`}>관리자 페이지로</Link>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                관리자 전용 미리보기입니다. 모든 예시는 샘플이며, 입력과 클릭은 실제 데이터에 반영되지 않습니다.
            </div>

            <nav aria-label="UI 컴포넌트 목차" className="flex flex-wrap gap-2">
                {SECTIONS.map(([id, title]) => (
                    <a key={id} href={`#${id}`} className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">{title}</a>
                ))}
            </nav>

            <Section id="tokens" title="색상·글꼴" description="현재 공통 스타일의 색상 토큰과 Pretendard 글꼴입니다.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {COLORS.map(([token, label]) => (
                        <div key={token} className="overflow-hidden rounded-lg border border-border">
                            <div className="h-14 border-b border-border" style={{ backgroundColor: `var(--color-${token})` }} />
                            <div className="space-y-1 p-3">
                                <p className="text-xs font-bold">{label}</p>
                                <code className="break-all text-[11px] text-muted-foreground">--color-{token}</code>
                            </div>
                        </div>
                    ))}
                </div>
                <Preview title="화면의 글자 계층">
                    <p className="text-2xl font-bold tracking-tight">페이지 제목 · 24px</p>
                    <p className="text-lg font-bold">영역 제목 · 18px</p>
                    <p className="text-base font-bold">카드 제목 · 16px</p>
                    <p className="text-sm">본문 · 14px · 이동봉사로 새로운 가족을 만나는 여정에 함께해요.</p>
                    <p className="text-xs text-muted-foreground">보조 설명 · 12px · 항공편과 출발 일정을 확인해주세요.</p>
                </Preview>
            </Section>

            <Section id="actions" title="버튼·배지" description="관리자 화면의 동작 버튼과 TicketCard의 실제 상태 배지입니다.">
                <Preview title="동작과 비활성 상태">
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className={PRIMARY_BUTTON} onClick={() => previewAction('등록')}>+ 등록</button>
                        <button type="button" className={SECONDARY_BUTTON} onClick={() => previewAction('취소')}>취소</button>
                        <button type="button" className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all active:scale-95" onClick={() => previewAction('승인')}>승인</button>
                        <button type="button" className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95" onClick={() => previewAction('삭제')}>삭제</button>
                        <button type="button" className={`${PRIMARY_BUTTON} disabled:opacity-50 disabled:cursor-not-allowed`} disabled>저장 중...</button>
                    </div>
                    <p role="status" className="text-xs text-muted-foreground">{notice}</p>
                </Preview>
                <Preview title="티켓 상태">
                    <div className="flex flex-wrap gap-3">
                        {['sharing', 'shared', 'owned'].map(status => <TicketStatusBadge key={status} status={status} />)}
                    </div>
                </Preview>
            </Section>

            <Section id="forms" title="입력·선택" description="티켓 등록 폼의 입력 스타일과 검색·직접 입력을 지원하는 SelectField입니다.">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Preview title="기본 입력">
                        <label className="flex flex-col gap-2 text-xs font-bold text-muted-foreground">
                            티켓 제목
                            <input className={INPUT} placeholder="예: 뉴욕행 티켓 나눔합니다" />
                        </label>
                        <label className="flex flex-col gap-2 text-xs font-bold text-muted-foreground">
                            출발일
                            <input className={INPUT} type="date" />
                        </label>
                        <label className="flex flex-col gap-2 text-xs font-bold text-muted-foreground">
                            비활성 입력
                            <input className={`${INPUT} disabled:opacity-50 disabled:cursor-not-allowed`} value="수정할 수 없는 예시" disabled />
                        </label>
                    </Preview>
                    <Preview title="검색과 직접 입력">
                        <SelectField label="도착 공항" options={AIRPORT_OPTIONS} value={airport} onChange={setAirport} placeholder="공항 검색 또는 직접 입력" error={showFieldError ? '도착 공항을 선택해주세요. (오류 표시 예시)' : ''} />
                        <SelectField label="항공사 (목록에서 선택)" options={[{ value: 'KE', label: '대한항공' }, { value: 'AC', label: '에어캐나다' }]} value={airline} onChange={setAirline} isCreatable={false} />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={showFieldError} onChange={event => setShowFieldError(event.target.checked)} />
                            오류 메시지 보기
                        </label>
                        <p className="text-xs text-muted-foreground">선택값: {airport || '없음'} / {airline || '없음'}</p>
                    </Preview>
                </div>
            </Section>

            <Section id="cards" title="티켓·구해요 카드" description="일정·나눔해요의 TicketCard와 구해요 게시판의 NeedPostCard를 그대로 렌더링합니다.">
                <div className="grid gap-4 lg:grid-cols-2">
                    {tickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={() => showTicket(ticket)}
                            onEditClick={() => previewAction('티켓 수정')} onDeleteClick={() => previewAction('티켓 삭제')}
                            onApplyClick={() => previewAction('나눔 신청')} onViewApplicantsClick={() => previewAction('신청자 조회')} />
                    ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {posts.map(post => <NeedPostCard key={post.id} post={post} onClick={() => setModal({ type: 'post', post })} />)}
                </div>
            </Section>

            <Section id="calendar" title="달력" description="일정 화면의 CalendarView입니다. 달을 이동하거나 매월 15일의 일정·더보기를 눌러보세요.">
                <CalendarView tickets={tickets} currentDate={calendarDate} setCurrentDate={setCalendarDate}
                    onTicketClick={showTicket} onMoreClick={(dayTickets, date) => setModal({ type: 'day', tickets: dayTickets, date })} />
            </Section>

            <Section id="overlays" title="모달" description="공통 Modal, 일정 필터 DateFilterModal, 날짜별 일정 DayTicketsModal을 열어 확인합니다.">
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={SECONDARY_BUTTON} onClick={() => setModal({ type: 'basic' })}>기본 모달</button>
                    <button type="button" className={SECONDARY_BUTTON} onClick={() => setModal({ type: 'error' })}>오류 모달</button>
                    <button type="button" className={SECONDARY_BUTTON} onClick={() => setModal({ type: 'date' })}>일정 필터</button>
                    <button type="button" className={SECONDARY_BUTTON} onClick={() => setModal({ type: 'day', tickets, date: sampleDate })}>날짜별 일정</button>
                </div>
                <p className="text-xs text-muted-foreground">선택한 일정: {selectedDate || '전체 일정'}</p>
            </Section>

            <Section id="feedback" title="표·상태 안내" description="관리자 목록의 표 스타일과 로딩·오류·빈 목록 상태입니다.">
                <div className="overflow-x-auto rounded-xl border-2 border-border bg-card">
                    <table className="w-full text-sm text-left border-collapse">
                        <caption className="sr-only">예시 티켓 목록</caption>
                        <thead>
                            <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <th scope="col" className="px-4 py-4">티켓</th>
                                <th scope="col" className="px-4 py-4">공항</th>
                                <th scope="col" className="px-4 py-4">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 font-semibold">{ticket.title}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{ticket.arrival_airport}</td>
                                    <td className="px-4 py-4 whitespace-nowrap"><TicketStatusBadge status={ticket.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Preview title="목록의 상태">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="목록 상태 선택">
                        {[['empty', '빈 목록'], ['loading', '불러오는 중'], ['error', '오류']].map(([value, label]) => (
                            <button key={value} type="button" aria-pressed={feedback === value} onClick={() => setFeedback(value)} className={feedback === value ? PRIMARY_BUTTON : SECONDARY_BUTTON}>{label}</button>
                        ))}
                    </div>
                    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground" role="status">
                        {feedback === 'empty' && <><span className="text-3xl" aria-hidden="true">📭</span><p>표시할 예정된 일정이 없습니다</p></>}
                        {feedback === 'loading' && <p>데이터를 불러오는 중...</p>}
                        {feedback === 'error' && <p className="text-destructive">데이터를 불러오는데 실패했습니다.</p>}
                    </div>
                </Preview>
            </Section>

            {/* 서버 작업을 수행하는 업무 모달 대신, 표시 전용 모달과 로컬 콜백만 사용한다. */}
            {modal?.type === 'date' && <DateFilterModal isOpen onClose={closeModal} selectedDate={selectedDate} onSelect={setSelectedDate} />}
            {modal?.type === 'day' && <DayTicketsModal isOpen onClose={closeModal} tickets={modal.tickets} date={modal.date} onTicketClick={showTicket} />}
            {modal && ['basic', 'error', 'ticket', 'post'].includes(modal.type) && (
                <Modal isOpen onClose={closeModal}
                    title={modal.ticket?.title || modal.post?.title || '공통 모달 미리보기'}
                    error={modal.type === 'error' ? '입력 내용을 확인해주세요. (오류 표시 예시)' : ''}
                    footer={<button type="button" className={SECONDARY_BUTTON} onClick={closeModal}>닫기</button>}>
                    <div className="space-y-4 text-sm">
                        <p>샘플 데이터를 확인하는 미리보기입니다.</p>
                        {modal.ticket && <><p>{modal.ticket.departure_date} · {modal.ticket.flight_info}</p><TicketStatusBadge status={modal.ticket.status} /></>}
                        {modal.post && <p>{modal.post.airport_code} · {modal.post.desired_date} · {modal.post.seats_needed}마리</p>}
                        <p className="text-muted-foreground">닫기 버튼, 바깥 영역 또는 Esc 키로 닫을 수 있습니다.</p>
                    </div>
                </Modal>
            )}
        </div>
    );
}
