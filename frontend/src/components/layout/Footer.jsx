import React from 'react';

export default function Footer() {
    return (
        <footer className="w-full bg-white border-t border-border py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col items-center md:items-start">
                        <span className="text-lg font-bold text-primary mb-1">해봉티켓</span>
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} Haebong Ticket. All rights reserved.
                        </p>
                    </div>
                    
                    <nav className="flex flex-wrap justify-center gap-6">
                        <a 
                            href="/privacy.html" 
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            개인정보 처리방침
                        </a>
                        <a 
                            href="/terms.html" 
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            이용약관
                        </a>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
