import React, { useState } from 'react';
import { getAirportColor } from '../utils/airportUtils';

export default function CalendarView({ tickets, onTicketClick, onMoreClick }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
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
        <div className="calendar-view">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} onClick={prevMonth}>‹ 이전</button>
                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Gowun Batang', serif" }}>{year}년 {month + 1}월</span>
                <button className="btn btn-ghost" style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white' }} onClick={nextMonth}>다음 ›</button>
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
                                    const colors = getAirportColor(t.arrival_airport);
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
    );
}
