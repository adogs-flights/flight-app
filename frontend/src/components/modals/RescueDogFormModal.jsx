import { Button, FieldLabel, Heading, Input, NativeSelect, Textarea } from '../ui/primitives.js';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { DOG_SEXES, DOG_STATUSES, formatDogAge } from '../../utils/rescueDogUtils';

const EMPTY_FORM = {
    name: '',
    noticeNumber: '',
    rescuedOn: '',
    birthOn: '',
    sex: '',
    rescuePlace: '',
    status: 'protecting',
    microchipNumber: '',
    isNeutered: false,
    note: '',
    fosterName: '',
    fosterAddress: '',
    fosterContact: '',
    fosterNote: '',
    adoptedOn: '',
    adopterName: '',
    adopterAddress: '',
    adopterContact: '',
    adopterEmail: '',
    adoptionNote: '',
};

function Field({ label, children }) {
    return (
        <div className="space-y-2">
            <FieldLabel variant="default">{label}</FieldLabel>
            {children}
        </div>
    );
}

function SectionTitle({ children, hint }) {
    return (
        <div className="flex items-center gap-2 pt-2">
            <Heading as="h4" variant="rescueDogSection">{children}</Heading>
            {hint && <span className="text-[11px] font-bold text-muted-foreground">{hint}</span>}
        </div>
    );
}

export default function RescueDogFormModal({ isOpen, onClose, dog, onDogSaved }) {
    const { apiClient } = useAuth();
    const [form, setForm] = useState(EMPTY_FORM);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const isEditing = dog != null;
    const existingPhotoUrl =
        isEditing && dog.has_photo && !photoFile ? `/api/rescue-dogs/${dog.id}/photo` : '';

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        setPhotoFile(null);
        setPhotoPreview('');
        if (isEditing) {
            setForm({
                name: dog.name || '',
                noticeNumber: dog.notice_number || '',
                rescuedOn: dog.rescued_on || '',
                birthOn: dog.birth_on || '',
                sex: dog.sex || '',
                rescuePlace: dog.rescue_place || '',
                status: dog.status || 'protecting',
                microchipNumber: dog.microchip_number || '',
                isNeutered: dog.is_neutered || false,
                note: dog.note || '',
                fosterName: dog.foster_name || '',
                fosterAddress: dog.foster_address || '',
                fosterContact: dog.foster_contact || '',
                fosterNote: dog.foster_note || '',
                adoptedOn: dog.adopted_on || '',
                adopterName: dog.adopter_name || '',
                adopterAddress: dog.adopter_address || '',
                adopterContact: dog.adopter_contact || '',
                adopterEmail: dog.adopter_email || '',
                adoptionNote: dog.adoption_note || '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [dog, isEditing, isOpen]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('이미지 크기는 10MB를 초과할 수 없습니다.');
            return;
        }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }

        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('notice_number', form.noticeNumber);
        fd.append('rescued_on', form.rescuedOn);
        fd.append('birth_on', form.birthOn);
        fd.append('sex', form.sex);
        fd.append('rescue_place', form.rescuePlace);
        fd.append('status', form.status);
        fd.append('microchip_number', form.microchipNumber);
        fd.append('is_neutered', form.isNeutered ? 'true' : 'false');
        fd.append('note', form.note);
        fd.append('foster_name', form.fosterName);
        fd.append('foster_address', form.fosterAddress);
        fd.append('foster_contact', form.fosterContact);
        fd.append('foster_note', form.fosterNote);
        fd.append('adopted_on', form.adoptedOn);
        fd.append('adopter_name', form.adopterName);
        fd.append('adopter_address', form.adopterAddress);
        fd.append('adopter_contact', form.adopterContact);
        fd.append('adopter_email', form.adopterEmail);
        fd.append('adoption_note', form.adoptionNote);
        if (photoFile) fd.append('photo', photoFile);

        setSaving(true);
        try {
            if (isEditing) {
                await apiClient.put(`/rescue-dogs/${dog.id}`, fd);
            } else {
                await apiClient.post('/rescue-dogs', fd);
            }
            onDogSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <div className="flex items-center justify-end w-full gap-2">
            <Button
                variant="secondary"
                onClick={onClose}
            >
                취소
            </Button>
            <Button
                variant="save"
                className="disabled:opacity-60"
                onClick={handleSubmit}
                disabled={saving}
            >
                {saving ? '저장 중...' : isEditing ? '수정하기' : '등록하기'}
            </Button>
        </div>
    );

    const shownPhoto = photoPreview || existingPhotoUrl;
    // 생년월일 입력에 맞춰 즉시 갱신되는 개월수.
    const age = formatDogAge(form.birthOn);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? '🐕 구조견 정보 수정' : '🐕 구조견 등록'}
            footer={footer}
            error={error}
        >
            <div className="space-y-5">
                {/* 사진 */}
                <div className="space-y-2">
                    <FieldLabel variant="default">사진</FieldLabel>
                    {shownPhoto ? (
                        <div className="relative group">
                            <img src={shownPhoto} alt="미리보기" className="w-full h-52 object-cover rounded-xl border-2 border-border" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <FieldLabel variant="rescueDogPhotoChange">
                                    사진 변경
                                    <Input type="file" accept="image/jpeg,image/png,image/webp" variant="hiddenFile" onChange={handlePhotoChange} />
                                </FieldLabel>
                            </div>
                        </div>
                    ) : (
                        <FieldLabel variant="rescueDogPhoto">
                            <span className="text-3xl">🐕</span>
                            <span className="text-xs font-bold text-muted-foreground">사진 추가 (JPG·PNG·WEBP, 최대 10MB)</span>
                            <Input type="file" accept="image/jpeg,image/png,image/webp" variant="hiddenFile" onChange={handlePhotoChange} />
                        </FieldLabel>
                    )}
                </div>

                {/* --- 구조견 정보 --- */}
                <SectionTitle>구조견 정보</SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={<>이름<span className="text-destructive ml-0.5">*</span></>}>
                        <Input
                            variant="default"
                            value={form.name}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="예: 구리"
                        />
                    </Field>
                    <Field label="공고번호">
                        <Input
                            variant="default"
                            value={form.noticeNumber}
                            onChange={e => handleChange('noticeNumber', e.target.value)}
                            placeholder="예: 경북-칠곡-2026-00159"
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="구조일">
                        <Input variant="default" type="date" value={form.rescuedOn} onChange={e => handleChange('rescuedOn', e.target.value)} />
                    </Field>
                    {/* 생년월일을 넣으면 개월수를 바로 계산해 보여준다. */}
                    <Field label={<>생년월일 (추정){age && <span className="ml-2 text-primary normal-case">{age}</span>}</>}>
                        <Input variant="default" type="date" value={form.birthOn} onChange={e => handleChange('birthOn', e.target.value)} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="성별">
                        <NativeSelect variant="default" value={form.sex} onChange={e => handleChange('sex', e.target.value)}>
                            <option value="">미확인</option>
                            {DOG_SEXES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </NativeSelect>
                    </Field>
                    <Field label="상태">
                        <NativeSelect variant="default" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                            {DOG_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </NativeSelect>
                    </Field>
                </div>

                <Field label="구조 장소">
                    <Input
                        variant="default"
                        value={form.rescuePlace}
                        onChange={e => handleChange('rescuePlace', e.target.value)}
                        placeholder="예: 칠곡시보호소"
                    />
                </Field>

                <Field label="내장칩 번호">
                    <Input
                        variant="default"
                        value={form.microchipNumber}
                        onChange={e => handleChange('microchipNumber', e.target.value)}
                        placeholder="미등록 시 비워두세요"
                    />
                </Field>

                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-muted/30">
                    <FieldLabel variant="airline">
                        <Input
                            type="checkbox"
                            variant="toggle"
                            checked={form.isNeutered}
                            onChange={e => handleChange('isNeutered', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ml-3 text-sm font-bold text-foreground">✂️ 중성화 완료</span>
                    </FieldLabel>
                </div>

                <Field label="비고">
                    <Textarea
                        variant="short"
                        value={form.note}
                        onChange={e => handleChange('note', e.target.value)}
                        placeholder="건강 상태, 성향, 모니터링 필요 사항 등..."
                    />
                </Field>

                {/* --- 임보 --- */}
                <SectionTitle hint="담당 단체만 열람">임보</SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="임보자명">
                        <Input variant="default" value={form.fosterName} onChange={e => handleChange('fosterName', e.target.value)} />
                    </Field>
                    <Field label="연락처">
                        <Input variant="default" value={form.fosterContact} onChange={e => handleChange('fosterContact', e.target.value)} placeholder="010-0000-0000" />
                    </Field>
                </div>

                <Field label="주소">
                    <Input variant="default" value={form.fosterAddress} onChange={e => handleChange('fosterAddress', e.target.value)} placeholder="예: 경기도 용인" />
                </Field>

                <Field label="임보 비고">
                    <Textarea variant="short" value={form.fosterNote} onChange={e => handleChange('fosterNote', e.target.value)} placeholder="소개 경로, 임보 조건 등..." />
                </Field>

                {/* --- 입양 --- */}
                <SectionTitle hint="담당 단체만 열람">입양</SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="입양일">
                        <Input variant="default" type="date" value={form.adoptedOn} onChange={e => handleChange('adoptedOn', e.target.value)} />
                    </Field>
                    <Field label="입양자명">
                        <Input variant="default" value={form.adopterName} onChange={e => handleChange('adopterName', e.target.value)} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="연락처">
                        <Input variant="default" value={form.adopterContact} onChange={e => handleChange('adopterContact', e.target.value)} placeholder="010-0000-0000" />
                    </Field>
                    <Field label="이메일">
                        <Input variant="default" type="email" value={form.adopterEmail} onChange={e => handleChange('adopterEmail', e.target.value)} />
                    </Field>
                </div>

                <Field label="주소">
                    <Input variant="default" value={form.adopterAddress} onChange={e => handleChange('adopterAddress', e.target.value)} />
                </Field>

                <Field label="입양 비고">
                    <Textarea variant="short" value={form.adoptionNote} onChange={e => handleChange('adoptionNote', e.target.value)} placeholder="내장칩/중성화 모니터링 필요 등..." />
                </Field>
            </div>
        </Modal>
    );
}
