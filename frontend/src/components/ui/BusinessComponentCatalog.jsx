import { useMemo, useState } from 'react';
import AuthContext from '../../contexts/AuthContext';
import { Button, FieldLabel, NativeSelect } from './primitives.js';
import Modal from './Modal';
import TicketFormModal from '../modals/TicketFormModal';
import TicketDetailModal from '../modals/TicketDetailModal';
import NeedPostFormModal from '../modals/NeedPostFormModal';
import NeedPostDetailModal from '../modals/NeedPostDetailModal';
import PublicNeedPostDetailModal from '../modals/PublicNeedPostDetailModal';
import ApplyModal from '../modals/ApplyModal';
import ApplicantListModal from '../modals/ApplicantListModal';
import RegisterUserModal from '../modals/RegisterUserModal';
import AirportModal from '../modals/AirportModal';
import AirlineModal from '../modals/AirlineModal';
import OrganizationModal from '../modals/OrganizationModal';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import GuestSubmissionReviewModal from '../modals/GuestSubmissionReviewModal';
import FolderSetupModal from '../modals/FolderSetupModal';
import TicketDepartureSection from '../modals/TicketDepartureSection';
import TicketEticketSection from '../modals/TicketEticketSection';
import { createPreviewApi, previewUser, previewOrganization, previewAirports, previewAirlines, previewTicket, previewPost, previewSubmission } from './previewData.js';

const COMPONENTS = {
    TicketFormModal: [TicketFormModal, '티켓 등록·수정'], TicketDetailModal: [TicketDetailModal, '티켓 상세'],
    NeedPostFormModal: [NeedPostFormModal, '구해요 등록·수정'], NeedPostDetailModal: [NeedPostDetailModal, '구해요 상세'],
    PublicNeedPostDetailModal: [PublicNeedPostDetailModal, '공개 구해요 상세'], ApplyModal: [ApplyModal, '나눔 신청'],
    ApplicantListModal: [ApplicantListModal, '신청자 목록'], RegisterUserModal: [RegisterUserModal, '회원 등록'],
    AirportModal: [AirportModal, '공항 관리'], AirlineModal: [AirlineModal, '항공사 관리'],
    OrganizationModal: [OrganizationModal, '단체 관리'], ChangePasswordModal: [ChangePasswordModal, '비밀번호 변경'],
    GuestSubmissionReviewModal: [GuestSubmissionReviewModal, '제출 검토'], FolderSetupModal: [FolderSetupModal, 'Drive 폴더 설정'],
    TicketDepartureSection: [TicketDepartureSection, '출국 준비 정보'], TicketEticketSection: [TicketEticketSection, 'e티켓 표시'],
};

export default function BusinessComponentCatalog() {
    const [selected, setSelected] = useState('TicketFormModal');
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState('실제 화면에서 사용하는 컴포넌트입니다. 저장·삭제는 예시 응답으로 처리합니다.');
    const apiClient = useMemo(() => createPreviewApi(action => setNotice(`${action} 동작을 미리보기에서 처리했습니다. 서버 데이터는 변경하지 않았습니다.`)), []);
    const auth = useMemo(() => ({
        user: previewUser, apiClient, rawAirports: previewAirports,
        airports: previewAirports.map(a => ({ value: a.code, label: a.name })), airlines: previewAirlines,
    }), [apiClient]);
    const [Component, label] = COMPONENTS[selected];
    const close = () => setOpen(false);
    const done = () => { setNotice(`${label} 동작을 확인했습니다. 서버 데이터는 변경하지 않았습니다.`); close(); };
    const props = {
        isOpen: true, onClose: close, apiClient, ticket: previewTicket, post: previewPost,
        submission: previewSubmission, airport: previewAirports[0], airline: { id: 'ui-preview-airline', code: 'KE', name: '대한항공', is_active: true },
        organization: previewOrganization, canManage: true, onDone: done, onUpdate: done,
        onSaved: done, onTicketSaved: done, onPostSaved: done, onApplicationSaved: done,
        onStatusChanged: done, onUserRegistered: done, onReviewed: done, onCreate: done,
        onEditClick: done, onDeleteClick: done,
    };

    return (
        <div className="space-y-4" onClickCapture={event => {
            // 공개 상세의 제출 링크도 실제 신청 화면으로 이동시키지 않는다.
            if (event.target.closest('a')) { event.preventDefault(); setNotice('링크 동작을 확인했습니다. 현재 미리보기를 유지합니다.'); }
        }}>
            <FieldLabel variant="adminUi" htmlFor="catalog-business">기존 업무 컴포넌트
                <NativeSelect id="catalog-business" value={selected} onChange={event => { setSelected(event.target.value); close(); }}>
                    {Object.entries(COMPONENTS).map(([name, [, title]]) => <option key={name} value={name}>{title} · {name}</option>)}
                </NativeSelect>
            </FieldLabel>
            <Button type="button" onClick={() => setOpen(true)}>선택한 컴포넌트 열기</Button>
            <p role="status" className="text-xs text-muted-foreground">{notice}</p>
            <code className="block break-all text-xs text-muted-foreground">src/components/modals/{selected}.jsx</code>
            {open && (
                <AuthContext.Provider value={auth}>
                    {selected.endsWith('Section') ? (
                        <Modal isOpen onClose={close} title={`${label} 미리보기`}>
                            <Component {...props} ticket={selected === 'TicketEticketSection' ? { ...previewTicket, has_eticket: true } : previewTicket} />
                        </Modal>
                    ) : <Component {...props} />}
                </AuthContext.Provider>
            )}
        </div>
    );
}
