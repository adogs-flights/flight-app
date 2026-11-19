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
