import { createElement, useState } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import * as UI from './primitives.js';
import { uiVariants } from './uiVariants.js';

const LABELS = {
    Skeleton: '스켈레톤 기본 요소', LoadingSkeleton: '화면별 스켈레톤',
    Button: '버튼', Input: '입력', Textarea: '여러 줄 입력', NativeSelect: '기본 선택',
    FieldLabel: '입력 라벨', ActionLink: '링크', Heading: '제목', Badge: '배지',
    Card: '카드', Alert: '상태 안내', Table: '표', TableHead: '표 머리글',
    TableBody: '표 본문', TableRow: '표 행', TableHeaderCell: '표 제목 셀', TableCell: '표 셀',
};

function Sample({ component, variant, states, disabled, onAction }) {
    const props = { variant, ...states };
    const Component = component === 'LoadingSkeleton' ? LoadingSkeleton : UI[component];
    if (component === 'Skeleton' || component === 'LoadingSkeleton') return <Component {...props} />;
    if (component === 'Button') return <Component {...props} type="button" disabled={disabled} onClick={onAction}>동작 확인</Component>;
    if (component === 'Input') {
        const type = /color/i.test(variant) ? 'color'
            : /file|document|logo/i.test(variant) ? 'file'
                : /toggle|plain/.test(variant) ? 'checkbox' : 'text';
        return <Component {...props} type={type} disabled={disabled} aria-label="입력 미리보기" placeholder="직접 입력해보세요" />;
    }
    if (component === 'Textarea') return <Component {...props} disabled={disabled} aria-label="여러 줄 입력 미리보기" placeholder="예시 내용을 입력해보세요" />;
    if (component === 'NativeSelect') return <Component {...props} disabled={disabled} aria-label="선택 미리보기"><option>첫 번째 항목</option><option>두 번째 항목</option></Component>;
    if (component === 'FieldLabel') return <Component {...props} htmlFor="catalog-label-input">입력 라벨 <UI.Input id="catalog-label-input" disabled={disabled} placeholder="라벨 연결 확인" /></Component>;
    if (component === 'ActionLink') return <Component {...props} href="#component-library" onClick={event => { event.preventDefault(); onAction(); }}>링크 확인</Component>;
    if (component === 'Heading') return <Component {...props} as="h3">해봉티켓 제목</Component>;
    if (component.startsWith('Table')) {
        const header = <UI.TableHeaderCell variant="adminUi" scope="col">예시 항목</UI.TableHeaderCell>;
        const cell = <UI.TableCell variant="adminUi">예시 내용</UI.TableCell>;
        const row = <UI.TableRow variant="adminUi2">{cell}</UI.TableRow>;
        switch (component) {
            case 'Table': return <Component {...props}><UI.TableBody variant="adminUi">{row}</UI.TableBody></Component>;
            case 'TableHead': return <UI.Table><Component {...props}><UI.TableRow variant="adminUi">{header}</UI.TableRow></Component></UI.Table>;
            case 'TableBody': return <UI.Table><Component {...props}>{row}</Component></UI.Table>;
            case 'TableRow': return <UI.Table><UI.TableBody variant="adminUi"><Component {...props}>{cell}</Component></UI.TableBody></UI.Table>;
            case 'TableHeaderCell': return <UI.Table><UI.TableHead><UI.TableRow variant="adminUi"><Component {...props} scope="col">예시 항목</Component></UI.TableRow></UI.TableHead></UI.Table>;
            default: return <UI.Table><UI.TableBody variant="adminUi"><UI.TableRow variant="adminUi2"><Component {...props}>예시 내용</Component></UI.TableRow></UI.TableBody></UI.Table>;
        }
    }
    return createElement(Component, props, component === 'Alert' ? '처리 상태를 안내하는 예시입니다.' : '해봉티켓 미리보기');
}

export default function UiVariantCatalog() {
    const [component, setComponent] = useState('Button');
    const [variant, setVariant] = useState('primary');
    const [states, setStates] = useState({});
    const [disabled, setDisabled] = useState(false);
    const [notice, setNotice] = useState('입력과 동작은 이 미리보기 안에서만 확인합니다.');
    const definition = uiVariants[component][variant];
    const onAction = () => setNotice(`${component}.${variant} 동작을 확인했습니다. 실제 데이터는 변경하지 않았습니다.`);
    const changeComponent = event => {
        const next = event.target.value;
        setComponent(next);
        setVariant(Object.keys(uiVariants[next])[0]);
        setStates({});
        setDisabled(false);
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <UI.FieldLabel variant="adminUi" htmlFor="catalog-component">
                    컴포넌트
                    <UI.NativeSelect id="catalog-component" value={component} onChange={changeComponent}>
                        {Object.keys(LABELS).map(name => <option key={name} value={name}>{LABELS[name]} · {name}</option>)}
                    </UI.NativeSelect>
                </UI.FieldLabel>
                <UI.FieldLabel variant="adminUi" htmlFor="catalog-variant">
                    실제 사용 스타일 ({Object.keys(uiVariants[component]).length})
                    <UI.NativeSelect id="catalog-variant" value={variant} onChange={event => { setVariant(event.target.value); setStates({}); }}>
                        {Object.keys(uiVariants[component]).map(name => <option key={name} value={name}>{name}</option>)}
                    </UI.NativeSelect>
                </UI.FieldLabel>
            </div>
            <div className="flex flex-wrap gap-4">
                {['Button', 'Input', 'Textarea', 'NativeSelect'].includes(component) && (
                    <UI.FieldLabel variant="adminUi2"><UI.Input variant="plain" type="checkbox" checked={disabled} onChange={event => setDisabled(event.target.checked)} />비활성 상태</UI.FieldLabel>
                )}
                {(definition.states || []).map(name => (
                    <UI.FieldLabel key={name} variant="adminUi2"><UI.Input variant="plain" type="checkbox" checked={Boolean(states[name])} onChange={event => setStates(previous => ({ ...previous, [name]: event.target.checked }))} />{name}</UI.FieldLabel>
                ))}
            </div>
            <div className="relative isolate min-h-32 overflow-auto rounded-xl border-2 border-border bg-background p-6" data-ui-catalog-preview>
                <Sample key={`${component}.${variant}`} component={component} variant={variant} states={states} disabled={disabled} onAction={onAction} />
                <p className="mt-6 text-xs text-muted-foreground">반응형 스타일은 화면 너비에 따라 표시가 달라집니다. 숨김 입력은 연결된 라벨을 통해 사용합니다.</p>
            </div>
            <p role="status" className="text-xs text-muted-foreground">{notice}</p>
            <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-xs">
                <p className="font-bold">공통 코드 수정 위치</p>
                <code className="block break-all">src/components/ui/{component === 'LoadingSkeleton' ? 'LoadingSkeleton.jsx' : 'primitives.js'} · {component}</code>
                <code className="block break-all">src/components/ui/uiVariants.js · {component}.{variant}</code>
                <p className="pt-2 font-bold">현재 사용처</p>
                <ul className="space-y-1 text-muted-foreground">
                    {definition.usedBy.map(file => <li key={file} className="break-all">{file}</li>)}
                </ul>
            </div>
        </div>
    );
}
