import { Button, FieldLabel } from '../ui/primitives.js';
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
        <Button
            variant="resetDate"
            onClick={handleReset}
        >
            전체 일정 보기 (필터 초기화)
        </Button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="일정 필터 선택" footer={footer}>
            <div className="space-y-8">
                {/* 월 선택 섹션 */}
                <div className="space-y-3">
                    <FieldLabel variant="dateFilter">빠른 월 선택</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {monthOptions.map((m) => (
                            <Button
                                key={m.value}
                                variant="dateFilter" active={selectedDate === m.value}
                                onClick={() => handleMonthSelect(m.value)}
                            >
                                {m.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* 미니 달력 섹션 */}
                <div className="space-y-3 pb-2">
                    <div className="flex items-center justify-between px-1">
                        <FieldLabel variant="orgProfileEdit">날짜 선택</FieldLabel>
                        <div className="flex items-center gap-3">
                            <Button onClick={() => setViewDate(new Date(year, month - 1, 1))} variant="monthArrow">◀</Button>
                            <span className="text-xs font-black">{year}.{String(month + 1).padStart(2, '0')}</span>
                            <Button onClick={() => setViewDate(new Date(year, month + 1, 1))} variant="monthArrow">▶</Button>
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
                                    <Button
                                        key={i}
                                        disabled={!day}
                                        onClick={() => handleDaySelect(day)}
                                        variant="dateFilter2" active={!day} alternateActive={isSelected}
                                    >
                                        {day}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
