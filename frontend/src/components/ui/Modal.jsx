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
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 sm:p-6" 
            onClick={onClose}
        >
            <div 
                className="w-full max-w-[520px] max-h-[90vh] flex flex-col relative bg-card rounded-2xl border-2 border-border shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Toast Error Message */}
                {error && (
                    <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-[1010] w-[90%] animate-in slide-in-from-top-4 duration-300 pointer-events-none">
                        <div className="px-4 py-3 text-sm font-bold text-white bg-destructive/80 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center gap-2 border border-white/20">
                            {error}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50">
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <button 
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" 
                        onClick={onClose}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 px-6 py-6 overflow-y-auto scrollbar-hide">
                    {children}
                </div>
                
                {footer && (
                    <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
