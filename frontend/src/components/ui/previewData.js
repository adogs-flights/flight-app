// 이 데이터와 클라이언트는 관리자 미리보기에서만 사용한다. 실제 HTTP 클라이언트를 가져오지 않는다.
export const previewUser = { id: 'ui-preview-user', name: '예시 담당자', email: 'preview@example.invalid', role: 'admin' };
export const previewOrganization = { id: 'ui-preview-org', name: '예시 단체', slug: '', is_active: true };
export const previewAirports = [{ id: 'ui-preview-airport', code: 'JFK', name: '뉴욕 (JFK)', country: '미국', bg_color: '#e0f2fe', text_color: '#0369a1', is_active: true }];
export const previewAirlines = [{ value: 'KE', label: '대한항공' }];
export const previewTicket = {
    id: 'ui-preview-ticket', title: '뉴욕행 이동봉사 예시', arrival_airport: 'JFK',
    departure_date: '2026-10-15', arrival_date: '2026-10-15', departure_time: '10:00', arrival_time: '11:00',
    flight_info: 'ICN → JFK', airline: 'KE', capacity: 2, cabin_capacity: 1, cargo_capacity: 1,
    status: 'sharing', owner_id: previewUser.id, created_by_id: previewUser.id,
    owner: previewUser, manager_name: previewUser.name, contact: '연락처 예시', memo: '미리보기용 티켓입니다.',
    has_eticket: false, has_passport: false, has_seat_confirm: false, departure_submitted: false,
};
export const previewPost = {
    id: 'ui-preview-post', title: '뉴욕행 이동봉사자를 찾아요', airport_code: 'JFK', desired_date: '2026-10-15',
    seats_needed: 2, detail: '실제 게시판에서 사용하는 상세·입력 화면입니다.', is_urgent: true,
    is_resolved: false, has_image: false, author_id: previewUser.id, author: previewUser,
    organization: previewOrganization,
};
export const previewSubmission = {
    id: 'ui-preview-submission', status: 'pending', phone: '연락처 예시', airline: 'KE',
    verification_method: 'reservation_number', reservation_number: 'SAMPLE',
    passenger_last_name_en: 'SAMPLE', passenger_first_name_en: 'USER',
    organization: previewOrganization, need_post: previewPost,
};

// 출국 준비 체크리스트 미리보기. 기본 항목 일부를 지운 상태로 두어
// '지워진 기본 항목 복원' 동작까지 확인할 수 있게 한다.
export const previewChecklist = {
    ticket_id: previewTicket.id,
    items: [
        {
            id: 'ui-preview-checklist-1', ticket_id: previewTicket.id, template_key: 'airline_pet_booking',
            label: '항공사 반려동물 동반 예약 확인', note: '기내 1마리 확약 완료', is_done: true,
            completed_at: '2026-10-01T01:00:00Z', sort_order: 0,
            created_at: '2026-09-30T01:00:00Z', updated_at: '2026-10-01T01:00:00Z',
        },
        {
            id: 'ui-preview-checklist-2', ticket_id: previewTicket.id, template_key: 'rabies_record',
            label: '광견병 예방접종·항체 검사 확인', note: null, is_done: false,
            completed_at: null, sort_order: 1,
            created_at: '2026-09-30T01:00:00Z', updated_at: '2026-09-30T01:00:00Z',
        },
        {
            id: 'ui-preview-checklist-3', ticket_id: previewTicket.id, template_key: null,
            label: '켄넬 대여 확인', note: '공항 카운터에서 수령', is_done: false,
            completed_at: null, sort_order: 2,
            created_at: '2026-09-30T02:00:00Z', updated_at: '2026-09-30T02:00:00Z',
        },
    ],
    total: 3,
    done: 1,
    documents: {
        has_address: true, has_kakao_id: false, has_passport: true,
        has_seat_confirm: false, has_eticket: false, total: 5, done: 2,
    },
    missing_template_keys: ['export_quarantine', 'microchip'],
};

export function createPreviewApi(onAction) {
    const mutate = async (method, url, payload) => {
        onAction(`${method} ${url}`);
        // 체크리스트 엔드포인트는 티켓이 아니라 체크리스트를 돌려준다.
        if (url.includes('/checklist')) return { data: previewChecklist };
        return { data: { ...previewTicket, ...(payload instanceof FormData ? {} : payload) } };
    };
    return {
        async get(url) {
            if (url === '/organizations') return { data: [previewOrganization] };
            if (url === '/users') return { data: [previewUser] };
            if (url === `/tickets/${previewTicket.id}/applications`) return {
                data: [{ id: 'ui-preview-application', applicant: previewUser, status: 'pending', message: '이동봉사를 신청합니다.', contact: '연락처 예시' }],
            };
            if (url === `/tickets/${previewTicket.id}/checklist`) return { data: previewChecklist };
            if (url === `/tickets/${previewTicket.id}/eticket`) return {
                data: new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180"><rect width="400" height="180" fill="#f4f4f5"/><text x="30" y="90" font-size="24">SAMPLE E-TICKET</text></svg>'], { type: 'image/svg+xml' }),
            };
            throw new Error(`미리보기 데이터가 없는 요청입니다: ${url}`);
        },
        post: (url, payload) => mutate('POST', url, payload),
        put: (url, payload) => mutate('PUT', url, payload),
        patch: (url, payload) => mutate('PATCH', url, payload),
        delete: url => mutate('DELETE', url),
    };
}
