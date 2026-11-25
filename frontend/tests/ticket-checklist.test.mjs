import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createPreviewApi, previewChecklist, previewTicket } from '../src/components/ui/previewData.js';
import { uiVariants } from '../src/components/ui/uiVariants.js';
import {
    CHECKLIST_DOCUMENT_FIELDS,
    formatCompletedAt,
    getChecklistLabelClass,
    getChecklistPercent,
    getChecklistRowClass,
    getDocumentChipClass,
} from '../src/utils/ticketChecklistUtils.js';

test('checklist progress stays within 0-100 and tolerates an empty list', () => {
    assert.equal(getChecklistPercent(0, 0), 0);
    assert.equal(getChecklistPercent(3, 0), 0);
    assert.equal(getChecklistPercent(0, 9), 0);
    assert.equal(getChecklistPercent(3, 9), 33);
    assert.equal(getChecklistPercent(9, 9), 100);
    // 서버 집계가 어긋나도 막대가 넘치지 않는다.
    assert.equal(getChecklistPercent(12, 9), 100);
});

test('done and pending rows are visually distinguished', () => {
    assert.notEqual(getChecklistRowClass(true), getChecklistRowClass(false));
    assert.match(getChecklistLabelClass(true), /line-through/);
    assert.doesNotMatch(getChecklistLabelClass(false), /line-through/);
    // 공통 뱃지에는 테두리 유틸리티가 없어 상태 클래스가 함께 넘겨야 한다.
    assert.match(getDocumentChipClass(true), /\bborder\b/);
    assert.match(getDocumentChipClass(false), /\bborder\b/);
});

test('completed timestamps render as a date and blank values stay blank', () => {
    assert.equal(formatCompletedAt('2026-10-01T01:00:00Z').length, 12);
    assert.match(formatCompletedAt('2026-10-01T01:00:00Z'), /^2026\. 10\. 0[12]$/);
    assert.equal(formatCompletedAt(null), '');
    assert.equal(formatCompletedAt('not-a-date', '-'), '-');
});

test('checklist preview answers locally for reads and writes alike', async () => {
    const calls = [];
    const api = createPreviewApi(action => calls.push(action));
    const read = await api.get(`/tickets/${previewTicket.id}/checklist`);
    assert.equal(read.data, previewChecklist);

    // 추가·완료·삭제·복원 모두 체크리스트 모양을 돌려줘야 화면이 깨지지 않는다.
    for (const [method, url, payload] of [
        ['post', `/tickets/${previewTicket.id}/checklist`, { label: '예시 항목' }],
        ['put', `/tickets/${previewTicket.id}/checklist/ui-preview-checklist-1`, { is_done: true }],
        ['delete', `/tickets/${previewTicket.id}/checklist/ui-preview-checklist-1`, undefined],
        ['post', `/tickets/${previewTicket.id}/checklist/restore-template`, undefined],
    ]) {
        const response = await api[method](url, payload);
        assert.equal(response.data, previewChecklist);
        assert.ok(Array.isArray(response.data.items));
    }
    assert.equal(calls.length, 4);
});

test('checklist preview data matches the fields the section reads', () => {
    for (const field of CHECKLIST_DOCUMENT_FIELDS) {
        assert.equal(typeof previewChecklist.documents[field.key], 'boolean', field.key);
    }
    assert.equal(previewChecklist.total, previewChecklist.items.length);
    assert.equal(
        previewChecklist.done,
        previewChecklist.items.filter(item => item.is_done).length,
    );
    // 복원 버튼까지 미리볼 수 있도록 빠진 기본 항목을 남겨 둔다.
    assert.ok(previewChecklist.missing_template_keys.length > 0);
});

test('checklist skeleton and its new variants are registered with real usedBy paths', async () => {
    const section = 'src/components/modals/TicketChecklistSection.jsx';
    assert.ok(uiVariants.LoadingSkeleton.checklist);
    assert.deepEqual(uiVariants.LoadingSkeleton.checklist.usedBy, [section]);
    assert.deepEqual(uiVariants.Input.ticketChecklist.usedBy, [section]);
    assert.deepEqual(uiVariants.FieldLabel.ticketChecklistItem.usedBy, [section]);
    assert.deepEqual(uiVariants.Badge.ticketChecklistProgress.usedBy, [section]);

    // 스켈레톤은 실제 컴포넌트가 선택하는 variant 이름으로 그려진다.
    const source = await readFile(new URL(`../${section}`, import.meta.url), 'utf8');
    assert.match(source, /variant="checklist"/);
    for (const variant of ['ticketChecklist', 'ticketChecklistItem', 'ticketChecklistProgress']) {
        assert.match(source, new RegExp(`variant="${variant}"`), variant);
    }
    // 재사용한 기존 스타일도 사용처로 등록해 둔다.
    for (const [component, variant] of [
        ['Button', 'rescueRecordSave'], ['Button', 'rescueRecordCancel'], ['Button', 'rescueRecordAdd'],
        ['Button', 'rescueRowAction'], ['Button', 'rescueRowDanger'], ['Button', 'purgeDocuments'],
        ['Input', 'compact'], ['Textarea', 'short'], ['FieldLabel', 'ticketDeparture'],
        ['Alert', 'generalSignup'], ['Badge', 'rescueDogRecord'],
    ]) {
        assert.ok(
            uiVariants[component][variant].usedBy.includes(section),
            `${component}.${variant}`,
        );
    }
});
