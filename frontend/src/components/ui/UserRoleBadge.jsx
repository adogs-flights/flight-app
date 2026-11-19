import { Badge } from './primitives.js';
const labels = { admin: '관리자', org: '단체', general: '일반' };

export default function UserRoleBadge({ role, compact = false }) {
    return (
        <Badge variant="userRoleBadge" active={compact} alternateActive={role === 'admin'} thirdActive={role === 'org'}>
            {labels[role] || role}
        </Badge>
    );
}
