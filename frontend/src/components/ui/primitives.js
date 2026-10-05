import { createElement } from 'react';
import { uiVariants } from './uiVariants.js';

// Preserve native semantics (including form submission, file inputs and refs).
// Only presentation props are consumed here; event handlers and DOM props pass through.
function renderUi(component, element, {
    variant, active = false, alternateActive = false, thirdActive = false, fourthActive = false,
    className, style, ...props
}) {
    const definition = uiVariants[component][variant];
    if (!definition) throw new Error(`Unknown UI variant: ${component}.${variant}`);
    const states = { active, alternateActive, thirdActive, fourthActive };
    const classes = typeof definition.className === 'function'
        ? definition.className(states)
        : definition.className;
    return createElement(element, {
        ...props,
        className: [classes, className].filter(Boolean).join(' ').trim() || undefined,
        style: definition.style ? { ...definition.style, ...style } : style,
    });
}

export function Button({ variant = 'primary', ...props }) {
    return renderUi('Button', 'button', { variant, ...props });
}

export function Input({ variant = 'default', ...props }) {
    return renderUi('Input', 'input', { variant, ...props });
}

export function Textarea({ variant = 'default', ...props }) {
    return renderUi('Textarea', 'textarea', { variant, ...props });
}

export function NativeSelect({ variant = 'default', ...props }) {
    return renderUi('NativeSelect', 'select', { variant, ...props });
}

export function FieldLabel({ variant = 'default', ...props }) {
    return renderUi('FieldLabel', 'label', { variant, ...props });
}

export function ActionLink({ as = 'a', variant = 'plain', ...props }) {
    return renderUi('ActionLink', as, { variant, ...props });
}

export function Heading({ as = 'h2', variant = 'page', ...props }) {
    return renderUi('Heading', as, { variant, ...props });
}

export function Badge({ variant, ...props }) {
    return renderUi('Badge', 'span', { variant, ...props });
}

export function Card({ variant, ...props }) {
    return renderUi('Card', 'div', { variant, ...props });
}

export function Alert({ variant, ...props }) {
    return renderUi('Alert', 'div', { variant, ...props });
}

export function Table({ variant = 'default', ...props }) {
    return renderUi('Table', 'table', { variant, ...props });
}

export function TableHead({ variant = 'plain', ...props }) {
    return renderUi('TableHead', 'thead', { variant, ...props });
}

export function TableBody({ variant, ...props }) {
    return renderUi('TableBody', 'tbody', { variant, ...props });
}

export function TableRow({ variant, ...props }) {
    return renderUi('TableRow', 'tr', { variant, ...props });
}

export function TableHeaderCell({ variant, ...props }) {
    return renderUi('TableHeaderCell', 'th', { variant, ...props });
}

export function TableCell({ variant, ...props }) {
    return renderUi('TableCell', 'td', { variant, ...props });
}
