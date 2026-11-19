/**
 * 구조견 대장의 코드값 ↔ 한글 라벨 변환. 백엔드는 영문 코드로 저장하고
 * (models.RescueDog의 CHECK 제약), 화면은 구글 시트와 같은 한글로 보여준다.
 */

export const DOG_STATUSES = [
  { value: 'protecting', label: '보호중' },
  { value: 'fostering', label: '임보중' },
  { value: 'adopted', label: '입양완료' },
];

export const DOG_SEXES = [
  { value: 'male', label: '남' },
  { value: 'female', label: '여' },
];

/** 상태 뱃지 색. Tailwind 토큰 대신 상태별 고정 팔레트를 쓴다. */
const STATUS_STYLES = {
  protecting: 'bg-sky-100 text-sky-700 border-sky-200',
  fostering: 'bg-amber-100 text-amber-700 border-amber-200',
  adopted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const getStatusLabel = (status) =>
  DOG_STATUSES.find((s) => s.value === status)?.label ?? '알 수 없음';

export const getStatusStyle = (status) =>
  STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border';

export const getSexLabel = (sex) =>
  DOG_SEXES.find((s) => s.value === sex)?.label ?? '미확인';

/** 'YYYY-MM-DD' → 'YYYY. MM. DD'. 값이 없으면 placeholder. */
export const formatDogDate = (value, placeholder = '-') => {
  if (!value) return placeholder;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return placeholder;
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 생년월일로 개월 수 나이를 만든다. 구조견은 대부분 추정 생년월일이라
 * "약 2개월" 수준으로만 보여준다.
 */
export const formatDogAge = (birthOn) => {
  if (!birthOn) return null;
  const birth = new Date(birthOn);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 0) return null;
  if (months < 12) return `약 ${months}개월`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `약 ${years}살` : `약 ${years}살 ${rest}개월`;
};

/** 접종·검진·모니터링 기록의 종류. 백엔드 kind 값과 1:1로 맞춘다. */
export const RECORD_KINDS = [
  {
    value: 'vaccination',
    label: '접종',
    icon: '💉',
    titleLabel: '백신 종류',
    titlePlaceholder: '예: 종합백신 2차',
    notePlaceholder: '접종 병원, 특이사항 등...',
  },
  {
    value: 'checkup',
    label: '검진',
    icon: '🩺',
    titleLabel: '검진 항목',
    titlePlaceholder: '예: 피부 재진',
    notePlaceholder: '진단 결과, 소견, 처방 등...',
  },
  {
    value: 'monitoring',
    label: '모니터링',
    icon: '📞',
    titleLabel: '구분',
    titlePlaceholder: '예: 입양 1개월 차 연락',
    notePlaceholder: '통화 내용, 근황 등...',
  },
];

/**
 * 모니터링은 입양자 사후관리 기록이라 담당 단체만 본다. 백엔드가 아예
 * 내려주지 않으므로 탭 자체를 숨겨 빈 탭이 보이지 않게 한다.
 */
export const MANAGER_ONLY_KINDS = ['monitoring'];

export const getRecordKind = (kind) =>
  RECORD_KINDS.find((k) => k.value === kind) ?? RECORD_KINDS[0];

/** 기록 한 건의 표시 상태. 지연이면 붉게 쓰기 위해 쓴다. */
export const getRecordState = (record) => {
  if (record.is_overdue) {
    return {
      key: 'overdue',
      label: '지연',
      rowClass: 'border-destructive/40 bg-destructive/5',
      badgeClass: 'bg-destructive text-destructive-foreground',
      dateClass: 'text-destructive',
    };
  }
  if (record.is_completed) {
    return {
      key: 'done',
      label: '완료',
      rowClass: 'border-border bg-muted/20',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      dateClass: 'text-muted-foreground',
    };
  }
  return {
    key: 'scheduled',
    label: '예정',
    rowClass: 'border-border bg-card',
    badgeClass: 'bg-sky-100 text-sky-700',
    dateClass: 'text-foreground',
  };
};

/** 오늘 날짜를 input[type=date]가 받는 'YYYY-MM-DD'로. */
export const todayValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
