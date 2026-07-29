import { useReveal } from '../../hooks/useReveal';

export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
    const [ref, isVisible] = useReveal();
    return (
        <Tag
            ref={ref}
            className={`${isVisible ? 'animate-in fade-in slide-in-from-bottom-4 fill-mode-both' : 'opacity-0'} ${className}`}
            style={isVisible ? { animationDelay: `${delay}ms`, animationDuration: '600ms' } : undefined}
        >
            {children}
        </Tag>
    );
}
