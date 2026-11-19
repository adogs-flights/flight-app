import { Card, Skeleton } from './primitives.js';
import { uiVariants } from './uiVariants.js';

const repeat = (count, render) => Array.from({ length: count }, (_, index) => render(index));

function Lines() {
    return <div className="space-y-3"><Skeleton /><Skeleton style={{ width: '75%' }} /></div>;
}

function TicketPlaceholder() {
    return (
        <Card variant="skeleton">
            <div className="flex items-start justify-between gap-4"><Skeleton variant="title" /><Skeleton variant="badge" /></div>
            <Skeleton style={{ width: '65%' }} />
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <Skeleton style={{ width: '35%' }} /><Skeleton variant="badge" />
            </div>
        </Card>
    );
}

function ApplicationPlaceholder() {
    return (
        <Card variant="skeleton">
            <div className="flex items-start justify-between gap-4"><Skeleton variant="title" /><Skeleton variant="badge" /></div>
            <Skeleton style={{ width: '40%' }} />
            <Lines />
        </Card>
    );
}

function CalendarPlaceholder() {
    return (
        <Card variant="calendar">
            <div className="flex items-center justify-between gap-4 p-4"><Skeleton variant="title" /><Skeleton variant="button" /></div>
            <div className="grid grid-cols-7 border-y border-border py-3">
                {repeat(7, index => <Skeleton key={index} style={{ width: '40%', margin: 'auto' }} />)}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-border">
                {repeat(42, index => (
                    <div key={index} className="min-h-[85px] min-w-0 space-y-3 p-1 sm:p-2">
                        <Skeleton style={{ width: '35%' }} />
                        {index % 3 === 0 && <Skeleton />}
                    </div>
                ))}
            </div>
        </Card>
    );
}

function TablePlaceholder({ columns, rows }) {
    // Decorative rows keep the same desktop/mobile switch as the real tables.
    return (
        <>
            <div className="hidden sm:block">
                {repeat(rows + 1, row => (
                    <div key={row} className={`grid gap-4 border-b border-border/50 px-6 py-5 ${row === 0 ? 'bg-muted/50' : ''}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {repeat(columns, column => <Skeleton key={column} style={{ width: column === 0 ? '85%' : '65%' }} />)}
                    </div>
                ))}
            </div>
            <div className="divide-y divide-border sm:hidden">
                {repeat(rows, index => (
                    <div key={index} className="space-y-3 p-4">
                        <div className="flex justify-between gap-4"><Skeleton variant="title" /><Skeleton variant="badge" /></div>
                        <Lines />
                    </div>
                ))}
            </div>
        </>
    );
}

function StatusPlaceholder() {
    return <><div className="flex flex-col items-center gap-4"><Skeleton variant="avatar" /><Skeleton variant="title" /></div><Lines /></>;
}

function PagePlaceholder() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="space-y-3"><Skeleton variant="title" /><Skeleton style={{ width: '45%' }} /></div>
            <div className="flex gap-3">{repeat(3, index => <Skeleton key={index} variant="button" />)}</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{repeat(6, index => <TicketPlaceholder key={index} />)}</div>
        </div>
    );
}

function Content({ variant, count, columns }) {
    switch (variant) {
        case 'tickets': return repeat(count ?? 6, index => <TicketPlaceholder key={index} />);
        case 'needs': return repeat(count ?? 6, index => (
            <Card key={index} variant="skeletonNeed">
                <Skeleton variant="image" />
                <div className="space-y-4 p-4"><Skeleton variant="title" /><Lines /></div>
            </Card>
        ));
        case 'calendar': return <CalendarPlaceholder />;
        case 'table': return <TablePlaceholder columns={columns} rows={count ?? 5} />;
        case 'applications': return repeat(count ?? 3, index => <ApplicationPlaceholder key={index} />);
        case 'organization': return (
            <>
                <div className="flex flex-col items-center gap-4"><Skeleton variant="logo" /><Skeleton variant="title" /><Skeleton style={{ width: '40%' }} /></div>
                <Card variant="skeletonIntro"><Skeleton variant="badge" /><Lines /><Lines /></Card>
                <div className="flex justify-center gap-3"><Skeleton variant="button" /><Skeleton variant="button" /></div>
                <Card variant="skeletonIntro"><Skeleton /><div className="flex justify-center"><Skeleton variant="button" /></div></Card>
            </>
        );
        case 'status': return <StatusPlaceholder />;
        case 'sync': return (
            <Card variant="skeletonPanel">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-4"><Skeleton variant="avatar" /><div className="min-w-0 flex-1 space-y-3"><Skeleton variant="title" /><Skeleton /></div></div>
                    <Skeleton variant="button" />
                </div>
            </Card>
        );
        case 'notifications': return <Card variant="skeletonPanel"><div className="space-y-4">{repeat(4, index => <Skeleton key={index} style={{ width: index % 2 ? '75%' : '55%' }} />)}</div></Card>;
        case 'image': return <Skeleton variant="image" />;
        case 'field': return <><Skeleton style={{ width: '30%' }} /><Skeleton variant="field" /></>;
        default: return <PagePlaceholder />;
    }
}

// No data, auth context, timers or API calls: pages and the catalog share this renderer.
export default function LoadingSkeleton({ variant = 'page', label, count, columns = 5, className = '' }) {
    const definition = uiVariants.LoadingSkeleton[variant];
    if (!definition) throw new Error(`Unknown loading skeleton: ${variant}`);
    return (
        <div role="status" aria-live="polite" className={`col-span-full min-w-0 w-full ${className}`} data-loading-skeleton={variant}>
            <span className="sr-only">{label || `${definition.label} 불러오는 중입니다.`}</span>
            <div aria-hidden="true" className={definition.className}>
                <Content variant={variant} count={count} columns={columns} />
            </div>
        </div>
    );
}
