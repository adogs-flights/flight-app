import { Badge } from './primitives.js';
export default function ApplicationStatusBadge({ status }) {
    switch (status) {
        case 'confirmed':
            return <Badge variant="applicationStatusBadge">✅ 확정</Badge>;
        case 'rejected':
            return <Badge variant="ticketCard2">❌ 미선정</Badge>;
        default:
            return <Badge variant="applicationStatusBadge2">⏳ 대기중</Badge>;
    }
}
