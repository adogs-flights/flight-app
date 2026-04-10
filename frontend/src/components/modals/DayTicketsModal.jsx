import React from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';

export default function DayTicketsModal({ isOpen, onClose, tickets, onTicketClick, date }) {
    const { rawAirports } = useAuth();
    if (!tickets || tickets.length === 0) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const footer = (
        <button 
            className="px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
            onClick={onClose}
        >
            닫기
        </button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`${formatDate(date)} 일정`} 
            footer={footer}
        >
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                {tickets.map(t => {
                    const colors = getAirportColor(t.arrival_airport, rawAirports);
                    return (
                        <div 
                            key={t.id} 
                            className="group flex items-center justify-between p-4 bg-background rounded-xl border-2 border-border transition-all cursor-pointer hover:border-primary/30 hover:shadow-sm"
                            onClick={() => onTicketClick(t)}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.title}</div>
                                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                                    <span>✈️ {t.flight_info}</span>
                                    <span className="w-1 h-1 rounded-full bg-border"></span>
                                    <span>{t.airline}</span>
                                </div>
                            </div>
                            <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm" 
                                style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                            >
                                {t.arrival_airport}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
