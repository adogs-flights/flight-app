import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Input, NativeSelect, ActionLink, Heading } from '../src/components/ui/primitives.js';
import { createPreviewApi, previewTicket } from '../src/components/ui/previewData.js';

test('shared controls retain native form attributes, refs and event handlers', () => {
    const onChange = () => {};
    const ref = { current: null };
    const input = Input({ name: 'email', type: 'email', value: 'preview@example.invalid', onChange, required: true, ref, active: true });
    assert.equal(input.type, 'input');
    assert.equal(input.props.onChange, onChange);
    assert.equal(input.props.ref, ref);
    assert.equal(input.props.active, undefined);
    assert.equal(input.props.variant, undefined);
    const markup = renderToStaticMarkup(input);
    assert.match(markup, /name="email"/);
    assert.match(markup, /type="email"/);
    assert.match(markup, /required=""/);
    assert.match(markup, /value="preview@example.invalid"/);
    assert.match(renderToStaticMarkup(createElement(Button, { type: 'submit', disabled: true }, '저장')), /type="submit" disabled=""/);
    const select = renderToStaticMarkup(createElement(NativeSelect, { name: 'role', defaultValue: 'org' }, [
        createElement('option', { key: 'general', value: 'general' }, '일반'),
        createElement('option', { key: 'org', value: 'org' }, '단체'),
    ]));
    assert.match(select, /value="org" selected=""/);
});

test('shared links and headings preserve navigation and document semantics', () => {
    const RouterLink = props => createElement('a', { ...props, href: props.to, to: undefined });
    const click = () => {};
    const link = ActionLink({ as: RouterLink, to: '/admin/ui', onClick: click, children: '컴포넌트' });
    assert.equal(link.type, RouterLink);
    assert.equal(link.props.onClick, click);
    assert.match(renderToStaticMarkup(link), /href="\/admin\/ui"/);
    assert.match(renderToStaticMarkup(createElement(Heading, { as: 'h1', id: 'title' }, '제목')), /^<h1 id="title"/);
});

test('state variants change presentation without leaking state props to DOM', () => {
    const selected = renderToStaticMarkup(createElement(Button, { variant: 'tab', active: true }, '탭'));
    const idle = renderToStaticMarkup(createElement(Button, { variant: 'tab', active: false }, '탭'));
    assert.match(selected, /text-primary border-primary/);
    assert.match(idle, /border-transparent/);
    assert.doesNotMatch(selected, /active=|variant=/);
});

test('business previews use local responses and never fall back to real requests', async () => {
    const calls = [];
    const api = createPreviewApi(action => calls.push(action));
    assert.equal((await api.get('/users')).data[0].id, 'ui-preview-user');
    for (const method of ['post', 'put', 'patch', 'delete']) {
        await api[method](`/tickets/${previewTicket.id}`, { title: '예시 수정' });
    }
    assert.equal(calls.length, 4);
    assert.equal(previewTicket.title, '뉴욕행 이동봉사 예시');
    await assert.rejects(api.get('/private/unknown'), /미리보기 데이터가 없는 요청/);
    const blob = (await api.get(`/tickets/${previewTicket.id}/eticket`)).data;
    assert.equal(blob.type, 'image/svg+xml');
});

test('all application pages and components use shared controls instead of native copies', async () => {
    const roots = [new URL('../src/pages/', import.meta.url), new URL('../src/components/', import.meta.url)];
    const files = [];
    async function scan(root) {
        for (const entry of await readdir(root, { withFileTypes: true })) {
            const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), root);
            if (entry.isDirectory()) await scan(url);
            else if (entry.name.endsWith('.jsx')) files.push(url);
        }
    }
    for (const root of roots) await scan(root);
    for (const file of files) {
        const source = (await readFile(file, 'utf8')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
        assert.doesNotMatch(source, /<(?:button|input|textarea|select|label|table|thead|tbody|tr|th|td|h[1-4])\b/, file.pathname);
    }
    const detail = await readFile(new URL('../src/components/modals/TicketDetailModal.jsx', import.meta.url), 'utf8');
    assert.doesNotMatch(detail, /from ['"].*utils\/api/);
});
