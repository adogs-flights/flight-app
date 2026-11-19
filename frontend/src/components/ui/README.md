# 공통 UI와 관리자 미리보기

공통 UI 사용·등록·권한·검증 규칙의 원본은 루트 [AGENTS.md](../../../../AGENTS.md)입니다. 이 문서는 코드 위치와 사용 예시를 설명합니다.

개발·운영 환경 모두 관리자 로그인 후 `/admin/ui`에서 확인합니다. 실제 화면과 미리보기는 같은 컴포넌트를 import합니다.

- 기본 요소의 마크업·속성 전달: `primitives.js`
- 기존 스타일·선택 상태·사용처: `uiVariants.js`
- 실제 업무 컴포넌트: `../TicketCard.jsx`, `../NeedPostCard.jsx`, `../CalendarView.jsx`, `../modals/*`
- 공통 색상·글꼴: `../../index.css`

예를 들어 `Button.primary` 스타일을 바꾸면 관리자 등록 버튼, 일정·구해요·내 티켓의 등록 버튼, `/admin/ui`의 예시가 함께 변경됩니다. 페이지에서는 `variant`, 상태, 이벤트, 데이터만 넘기고 같은 디자인을 `className`으로 다시 작성하지 않습니다. 페이지의 배치와 간격은 페이지에서 관리할 수 있습니다.

기존의 세부 스타일 차이를 유지하기 위해 이름별 스타일을 보존했습니다. 같은 스타일은 여러 화면이 하나의 정의를 공유합니다. 새 사용처를 추가하거나 컴포넌트를 옮기면 해당 정의의 `usedBy`도 갱신합니다. 컴포넌트·스타일 선택기로 미리보기, 비활성·선택 상태, 수정할 파일과 사용처를 확인할 수 있습니다.

`UiVariantCatalog`는 `uiVariants`에서 목록을 읽어 실제 공통 컴포넌트를 렌더링합니다. 업무 모달 미리보기는 `BusinessComponentCatalog`에서 같은 모달을 렌더링하되, 별도의 `AuthContext`와 `createPreviewApi`로 샘플 데이터를 공급합니다. 미리보기 클라이언트는 HTTP 요청을 하지 않으며 미등록 조회는 실패합니다. 업무 모달에서는 전역 API를 직접 가져오는 대신 `useAuth().apiClient` 또는 주입된 `apiClient`를 사용해야 합니다.

버튼의 `type`, 입력의 `name`·`required`·`ref`, 라우터 링크와 이벤트는 그대로 전달됩니다. 새로운 컴포넌트도 HTML의 폼 동작과 접근성 속성을 유지해야 합니다.

검증: `node --test tests/*.test.mjs`, `npm run lint`, `npm run build`.

## 로딩 스켈레톤

`primitives.js`의 `Skeleton`은 장식용 기본 블록이며, `LoadingSkeleton.jsx`는 실제 화면에 맞춘 공통 로딩 레이아웃이다. 스타일과 사용처는 `uiVariants.js`의 `Skeleton`, `LoadingSkeleton`, `Card.skeleton*`에서 관리한다. `/admin/ui` → 공통 컴포넌트 → 화면별 스켈레톤에서 같은 컴포넌트를 선택해 확인한다.

```jsx
<LoadingSkeleton variant="tickets" />
<LoadingSkeleton variant="calendar" />
<LoadingSkeleton variant="table" columns={7} />
```

지원 형태: `tickets`, `needs`, `calendar`, `table`, `applications`, `organization`, `status`, `sync`, `notifications`, `page`, `app`, `image`, `field`. `count`는 목록 개수, `columns`는 표 열 수, `label`은 스크린리더 안내를 조정한다.

조회 중인 콘텐츠 영역만 대체하고 제목·검색·필터는 유지한다. 오류나 빈 결과에는 기존 안내를 표시하며 저장·업로드 진행에는 기존 버튼 상태를 유지한다. 스켈레톤은 데이터나 권한을 조회하지 않고, 한 개의 `role="status"`와 장식 영역의 `aria-hidden`을 사용한다. 애니메이션은 `motion-safe`로 동작 줄이기 설정을 따른다. 별도 타이머로 로딩 시간을 늘리지 않는다.
