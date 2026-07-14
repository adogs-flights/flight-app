# Frontend Technical Specification (Harness)

## Tech Stack
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS v4 (Shadcn UI Style)
- **State Management**: Context API
- **External API**: Google Drive OAuth Flow

## 🎨 디자인 원칙 (AI_HARNESS_RULES)

### 1. 톤앤매너 (Shadcn UI Style)
- **Google Integration**: 구글 관련 버튼은 구글 브랜드 컬러(`#4285F4`)를 준수하되, 앱의 전반적인 디자인과 조화되도록 `rounded-xl` 스타일을 적용한다.
- **Sync Badge**: 동기화된 아이템은 초록색 계열(`bg-green-50`, `text-green-700`)의 뱃지를 사용하여 안정감을 준다.

### 2. 구글 드라이브 연동 UI (NEW)
- **GoogleDriveSyncPanel**: 사용자의 연동 상태(미연결, 폴더 설정 필요, 연동 완료)를 3단계로 명확히 구분하여 보여준다.
- **Action Feedback**: OAuth 리다이렉트 후 성공 시 반드시 알림(Alert/Toast)을 통해 사용자에게 현재 상태를 고지한다.
- **Drive Link**: 티켓 카드 내의 드라이브 링크는 반드시 `target="_blank"` 속성을 사용하여 서비스 이탈을 방지한다.

### 3. 반응형 대응
- **Mobile First**: 640px(`sm`) 미만 환경에서는 설정 패널의 가로 배치를 세로 배치로 전환한다.
- **Touch Targets**: 연동 버튼 등 주요 액션 버튼은 최소 `h-11` 이상의 높이를 확보한다.

### 4. 코드 품질
- **Lint**: 수정 직후 `npm run lint`를 실행한다.
- **OAuth Callback**: `window.location.search`를 통해 전달된 인증 결과 파라미터를 감지하고 처리한 후에는 `window.history.replaceState`를 사용해 URL을 정돈한다.
