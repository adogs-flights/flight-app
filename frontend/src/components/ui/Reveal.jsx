import { useReveal } from '../../hooks/useReveal';

// eslint-disable-next-line no-unused-vars
export default function Reveal({ children, className = '', delay = 0, as: Component = 'div' }) {
    const [ref, isVisible] = useReveal();
    return (
        <Component
            ref={ref}
            className={`${isVisible ? 'animate-in fade-in slide-in-from-bottom-4 fill-mode-both' : 'opacity-0'} ${className}`}
            style={isVisible ? { animationDelay: `${delay}ms`, animationDuration: '600ms' } : undefined}
        >
            {children}
        </Component>
    );
}
