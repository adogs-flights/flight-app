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
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`${formatDate(date)} 일정`} 
            footer={footer}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tickets.map(t => {
                    const colors = getAirportColor(t.arrival_airport, rawAirports);
                    return (
                        <div 
                            key={t.id} 
                            className="day-ticket-item"
                            onClick={() => onTicketClick(t)}
                            style={{ 
                                padding: '12px', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>{t.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-mute)' }}>
                                    {t.flight_info} · {t.airline}
                                </div>
                            </div>
                            <span 
                                className="badge" 
                                style={{ 
                                    backgroundColor: colors.bg, 
                                    color: colors.text, 
                                    borderColor: colors.bg,
                                    fontSize: '11px',
                                    padding: '2px 8px'
                                }}
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
