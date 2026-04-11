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

    const handleShare = async (e) => {
        if (e) e.stopPropagation();
        if (!calendarRef.current || isSaving) return;
        
        if (!navigator.share) {
            alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
            return;
        }

        setIsSaving(true);
        const el = calendarRef.current;
        
        // 캡처를 위한 임시 스타일 저장
        const originalStyle = {
            border: el.style.border,
            borderRadius: el.style.borderRadius,
            boxShadow: el.style.boxShadow,
            backgroundColor: el.style.backgroundColor,
            overflow: el.style.overflow
        };

        try {
            // 공유 이미지에만 나타날 테두리 및 카드 스타일 적용
            el.style.border = '2px solid #e4e4e7'; // border-border (Zinc-200)
            el.style.borderRadius = '16px';
            el.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
            el.style.backgroundColor = '#ffffff';
            el.style.overflow = 'hidden';

            const blob = await toBlob(el, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: false,
                // 상단/좌측 패딩 버그 방지를 위한 옵션
                style: {
                    margin: '0',
                    padding: '0',
                    transform: 'none'
                },
                fontEmbedCSS: `
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-Regular.woff2') format('woff2');
                        font-weight: 400;
                    }
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-Bold.woff2') format('woff2');
                        font-weight: 700;
                    }
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
                `,
            });

            // 스타일 즉시 원복
            Object.assign(el.style, originalStyle);

            if (!blob) throw new Error('이미지 생성 실패');

            const file = new File([blob], `calendar-${year}-${month + 1}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '달력 공유'
                });
            } else {
                await navigator.share({
                    title: '달력 공유',
                    url: window.location.href
                });
            }
        } catch (err) {
            console.error('Share failed:', err);
            // 에러 시에도 스타일 원복 보장
            Object.assign(el.style, originalStyle);
            if (err.name !== 'AbortError') {
                alert('공유에 실패했습니다.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col relative">
            {isSaving && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">이미지 생성 중</div>
                </div>
            )}
            
            {/* 평소에는 테두리 없는 일반 div, 공유 시에만 테두리 주입됨 */}
            <div className="calendar-view" ref={calendarRef}>
                <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50">
                    <h3 className="text-xl font-bold text-foreground">{year}년 {month + 1}월</h3>
                    <div className="flex items-center gap-1">
                        <button 
                            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" 
                            onClick={prevMonth}
                        >
                            <img src="/icon/back.png" alt="이전 달" className="w-4 h-4 opacity-70" />
                        </button>
                        <button 
                            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" 
                            onClick={nextMonth}
                        >
                            <img src="/icon/next.png" alt="다음 달" className="w-4 h-4 opacity-70" />
                        </button>
                    </div>
                </div>
                    
                <div className="grid grid-cols-7 border-b bg-muted/30">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={i} className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-wider ${i === 0 ? 'text-destructive' : i === 6 ? 'text-sky' : 'text-muted-foreground'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 divide-x divide-y border">
                    {days.map((d, idx) => (
                        <div key={idx} className={`min-h-[85px] p-0.5 space-y-1 transition-colors ${d.otherMonth ? 'bg-muted/10' : 'bg-background hover:bg-accent/5'}`}>
                            <div className={`text-xs font-bold ${d.otherMonth ? 'text-muted-foreground/30' : d.isSunday ? 'text-destructive' : d.isSaturday ? 'text-sky' : 'text-muted-foreground'}`}>
                                {d.day}
                            </div>
                            <div className="space-y-1">
                                {d.tickets && (
                                    <>
                                        {d.tickets.slice(0, 2).map(t => {
                                            const colors = getAirportColor(t.arrival_airport, rawAirports);
                                            return (
                                                <div
                                                    key={t.id}
                                                    className="px-1 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition-opacity hover:opacity-80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                                    onClick={() => onTicketClick(t)}
                                                    style={{ backgroundColor: colors.bg, color: colors.text }}
                                                    title={t.title}
                                                >
                                                    {t.title}
                                                </div>
                                            );
                                        })}
                                        {d.tickets.length > 2 && (
                                            <div 
                                                className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 rounded-md hover:bg-accent transition-colors cursor-pointer w-fit" 
                                                onClick={() => onMoreClick(d.tickets, d.dateStr)}
                                            >
                                                + {d.tickets.length - 2}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 sm:hidden">
                <button 
                    className="w-full flex items-center justify-center gap-2 h-11 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm" 
                    onClick={handleShare}
                >
                    일정 공유하기
                </button>
            </div>
        </div>
    );
}
