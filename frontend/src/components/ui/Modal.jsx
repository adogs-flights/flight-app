import { Alert, Button, Card, Heading } from './primitives.js';
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, footer, error }) {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };
        
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            // 배경 스크롤 방지
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            // 모달 닫힐 때 스크롤 복구
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-6"
            onClick={onClose}
        >
            <Card
                variant="modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile drag handle */}
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-border" />
                </div>

                {/* Toast Error Message */}
                {error && (
                    <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-[1010] w-[90%] animate-in slide-in-from-top-4 duration-300 pointer-events-none">
                        <Alert variant="modal">
                            {error}
                        </Alert>
                    </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b bg-background/50">
                    <Heading as="h3" variant="usageGuide2">{title}</Heading>
                    <Button
                        variant="modalClose"
                        onClick={onClose}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </Button>
                </div>

                <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 overflow-y-auto scrollbar-hide">
                    {children}
                </div>

                {footer && (
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-t bg-muted/30 flex items-center justify-end gap-2">
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    );
}
