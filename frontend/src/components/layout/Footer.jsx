import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="w-full bg-white mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col items-center md:items-start">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} Haebong Ticket. All rights reserved.
                        </p>
                    </div>
                    
                    <nav className="flex flex-wrap justify-center gap-6">
                        <Link 
                            to="/privacy" 
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            개인정보 처리방침
                        </Link>
                        <Link 
                            to="/terms" 
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            이용약관
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
