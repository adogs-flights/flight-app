/**
 * 티켓별 출국 준비 체크리스트의 표시 규칙.
 *
 * 항목 자체는 백엔드(`/tickets/{id}/checklist`)가 내려주고, 여기서는 진행률
 * 계산과 완료 여부에 따른 스타일만 다룬다. 기한이 없으므로 구조견 기록처럼
 * 지연(overdue) 상태는 두지 않는다.
 */

/**
 * 기존 '출국 준비 추가정보'에서 파생된 서류 상태의 표시 순서와 이름.
 * 응답의 `documents` 플래그 키와 1:1로 맞춘다.
 */
export const CHECKLIST_DOCUMENT_FIELDS = [
  { key: 'has_address', label: '주소' },
  { key: 'has_kakao_id', label: '카카오톡 아이디' },
  { key: 'has_passport', label: '여권 사본' },
  { key: 'has_seat_confirm', label: '자리 확약' },
  { key: 'has_eticket', label: 'e티켓' },
];

/** 완료 비율(0~100 정수). 항목이 없으면 0. */
export const getChecklistPercent = (done, total) => {
  if (!total) return 0;
  return Math.round((Math.min(done, total) / total) * 100);
};

/** 체크리스트 행 배경·테두리. 완료한 항목은 눌러서 끝낸 느낌으로 가라앉힌다. */
export const getChecklistRowClass = (isDone) =>
  isDone
    ? 'border-emerald-200 bg-emerald-50/60'
    : 'border-border bg-background';

/** 완료한 항목의 라벨은 취소선으로 흐리게 둔다. */
export const getChecklistLabelClass = (isDone) =>
  isDone ? 'line-through text-muted-foreground' : 'text-foreground';

/**
 * 서류 상태 한 칸의 색. 완료/미완료만 구분한다.
 * 공통 뱃지(Badge.rescueDogRecord)에는 테두리 유틸리티가 없어 함께 넘긴다.
 */
export const getDocumentChipClass = (isDone) =>
  isDone
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-border bg-muted/40 text-muted-foreground';

/** ISO 시각 → 'YYYY. MM. DD'. 완료 시각만 쓰므로 시·분은 생략한다. */
export const formatCompletedAt = (value, placeholder = '') => {
  if (!value) return placeholder;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return placeholder;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
};
