import React, { useState } from 'react';
import Modal from '../ui/Modal';

export default function DateFilterModal({ isOpen, onClose, selectedDate, onSelect }) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const [viewDate, setViewDate] = useState(new Date()); // 달력 이동용

    // 월 선택 그리드용 데이터 (이번 달부터 6개월치)
    const monthOptions = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(currentYear, currentMonth + i, 1);
        monthOptions.push({
            label: `${d.getMonth() + 1}월`,
            value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            fullLabel: `${d.getFullYear()}년 ${d.getMonth() + 1}월`
        });
    }

    // 미니 달력 로직
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);

    const handleMonthSelect = (val) => {
        onSelect(val);
        onClose();
    };

    const handleDaySelect = (day) => {
        if (!day) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onSelect(dateStr);
        onClose();
    };

    const handleReset = () => {
        onSelect(null);
        onClose();
    };

    const footer = (
        <button 
            className="w-full h-11 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors"
            onClick={handleReset}
        >
            전체 일정 보기 (필터 초기화)
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="일정 필터 선택" footer={footer}>
            <div className="space-y-8">
                {/* 월 선택 섹션 */}
                <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground pl-1">빠른 월 선택</label>
                    <div className="grid grid-cols-3 gap-2">
                        {monthOptions.map((m) => (
                            <button
                                key={m.value}
                                className={`h-12 rounded-xl text-sm font-bold transition-all border-2 ${
                                    selectedDate === m.value 
                                    ? 'bg-primary border-primary text-primary-foreground shadow-md scale-[0.98]' 
                                    : 'bg-background border-border text-foreground hover:border-primary/30 active:scale-95'
                                }`}
                                onClick={() => handleMonthSelect(m.value)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 미니 달력 섹션 */}
                <div className="space-y-3 pb-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">날짜 선택</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-muted-foreground hover:text-foreground">◀</button>
                            <span className="text-xs font-black">{year}.{String(month + 1).padStart(2, '0')}</span>
                            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-muted-foreground hover:text-foreground">▶</button>
                        </div>
                    </div>
                    
                    <div className="bg-muted/30 rounded-2xl p-3 border border-border/50">
                        <div className="grid grid-cols-7 mb-2">
                            {['일','월','화','수','목','금','토'].map((d, i) => (
                                <div key={i} className={`text-center text-[10px] font-bold ${i === 0 ? 'text-destructive' : i === 6 ? 'text-sky' : 'text-muted-foreground'}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, i) => {
                                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                                const isSelected = selectedDate === dateStr;
                                return (
                                    <button
                                        key={i}
                                        disabled={!day}
                                        onClick={() => handleDaySelect(day)}
                                        className={`h-8 w-full rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                            !day ? 'invisible' :
                                            isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/10 text-foreground'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
