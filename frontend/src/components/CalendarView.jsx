import React, { useState, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

export default function CalendarView({ tickets, onTicketClick, onMoreClick }) {
    const { rawAirports } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);
    const calendarRef = useRef(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const lastDate = new Date(year, month + 1, 0).getDate();

    const prevLastDate = new Date(year, month, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDay();

    const days = [];

    // Previous month days
    for (let i = prevLastDay === 6 ? 0 : prevLastDay + 1; i > 0; i--) {
        days.push({ day: prevLastDate - i + 1, otherMonth: true });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTickets = tickets.filter(t => t.departure_date === dateStr);

        const dateObj = new Date(year, month, i);
        days.push({
            day: i,
            date: dateObj,
            dateStr: dateStr,
            isSunday: dateObj.getDay() === 0,
            isSaturday: dateObj.getDay() === 6,
            tickets: dayTickets
        });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, otherMonth: true });
    }

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleShare = async () => {
        if (!calendarRef.current || isSaving) return;
        
        if (!navigator.share) {
            alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
            return;
        }

        setIsSaving(true);
        try {
            const blob = await toBlob(calendarRef.current, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: false,
                fontEmbedCSS: `
                    @font-face {
                        font-family: 'Gowun Batang';
                        src: url('/fonts/GowunBatang-Regular.woff2') format('woff2');
                        font-weight: 400;
                    }
                    @font-face {
                        font-family: 'Gowun Batang';
                        src: url('/fonts/GowunBatang-Bold.woff2') format('woff2');
                        font-weight: 700;
                    }
                    @font-face {
                        font-family: 'Noto Sans KR';
                        src: url('/fonts/NotoSansKR-Regular.woff2') format('woff2');
                        font-weight: 400;
                    }
                    @font-face {
                        font-family: 'Noto Sans KR';
                        src: url('/fonts/NotoSansKR-Bold.woff2') format('woff2');
                        font-weight: 700;
                    }
                `,
            });

            if (!blob) throw new Error('이미지 생성 실패');

            const file = new File([blob], `calendar-${year}-${month + 1}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '달력 공유',
                    text: `${year}년 ${month + 1}월 일정표입니다.`
                });
            } else {
                await navigator.share({
                    title: '달력 공유',
                    text: `${year}년 ${month + 1}월 일정표입니다.`,
                    url: window.location.href
                });
            }
        } catch (err) {
            console.error('Share failed:', err);
            if (err.name !== 'AbortError') {
                alert('공유에 실패했습니다. 이미지가 너무 크거나 생성 시간이 초과되었습니다.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="calendar-container">
            {isSaving && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">이미지 저장 중</div>
                </div>
            )}
            <div className="calendar-view" ref={calendarRef}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', gap: '20px' }}>
                    <button className="btn btn-ghost" style={{ padding: '4px', background: 'white', display: 'flex', alignItems: 'center' }} onClick={prevMonth}>
                        <img src="/icon/back.png" alt="이전 달" style={{ width: '20px', height: '20px' }} />
                    </button>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Gowun Batang', serif"}}>{year}년 {month + 1}월</span>
                    <button className="btn btn-ghost" style={{ padding: '4px', background: 'white', display: 'flex', alignItems: 'center' }} onClick={nextMonth}>
                        <img src="/icon/next.png" alt="다음 달" style={{ width: '20px', height: '20px' }} />
                    </button>
                </div>
                <div className="cal-header">
                    <div className="cal-day-name">일</div>
                    <div className="cal-day-name">월</div>
                    <div className="cal-day-name">화</div>
                    <div className="cal-day-name">수</div>
                    <div className="cal-day-name">목</div>
                    <div className="cal-day-name">금</div>
                    <div className="cal-day-name">토</div>
                </div>
                <div className="cal-grid">
                    {days.map((d, idx) => (
                        <div key={idx} className={`cal-cell ${d.otherMonth ? 'other-month' : ''}`}>
                            <div className={`cal-date ${d.isSunday ? 'sunday' : ''} ${d.isSaturday ? 'saturday' : ''}`}>
                                {d.day}
                            </div>
                            {d.tickets && (
                                <>
                                    {d.tickets.slice(0, d.tickets.length > 3 ? 2 : 3).map(t => {
                                        const colors = getAirportColor(t.arrival_airport, rawAirports);
                                        return (
                                            <div
                                                key={t.id}
                                                className={`cal-event ${t.status === 'sharing' ? 'type-share-give' : 'type-regular'}`}
                                                onClick={() => onTicketClick(t)}
                                                style={{ backgroundColor: colors.bg, color: colors.text, border: 'none' }}
                                                title={t.title}
                                            >
                                                <span className="cal-event-name">{t.title}</span>
                                            </div>
                                        );
                                    })}
                                    {d.tickets.length > 3 && (
                                        <div className="cal-more" onClick={() => onMoreClick(d.tickets, d.dateStr)}>
                                            + {d.tickets.length - 2}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mobile-only" style={{ display: 'flex', marginTop: '12px' }}>
                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', height: '44px', fontWeight: 600 }} 
                    onClick={handleShare}
                >
                    📲 일정 공유하기
                </button>
            </div>
        </div>
    );
}
