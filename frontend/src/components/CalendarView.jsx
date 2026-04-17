import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAirportColor } from '../utils/airportUtils';

export default function CalendarView({ 
    tickets, 
    onTicketClick, 
    onMoreClick, 
    currentDate, 
    setCurrentDate, 
    calendarRef, 
    isSaving 
}) {
    const { rawAirports } = useAuth();

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

    return (
        <div className="flex flex-col relative shadow-sm rounded-xl">
            {isSaving && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">이미지 생성 중</div>
                </div>
            )}
            
            <div 
                className="calendar-view bg-card rounded-xl border-2 border-border overflow-hidden flex flex-col" 
                ref={calendarRef}
            >
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
                
                <div className="grid grid-cols-7 divide-x divide-y">
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
        </div>
    );
}
