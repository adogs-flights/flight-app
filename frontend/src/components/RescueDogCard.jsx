import {
    formatDogAge,
    formatDogDate,
    getSexLabel,
    getStatusLabel,
    getStatusStyle,
} from '../utils/rescueDogUtils';

// 구조견 대장 카드. 사진을 앞세우고 공고번호·상태를 한눈에 보여준다.
const RescueDogCard = ({ dog, onClick }) => {
    const age = formatDogAge(dog.birth_on);

    return (
        <button
            type="button"
            onClick={onClick}
            className="group text-left flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            {/* 사진 영역 */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {dog.has_photo ? (
                    <img
                        src={`/api/rescue-dogs/${dog.id}/photo`}
                        alt={dog.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/10 via-sky/10 to-earth/10 text-primary/40">
                        <span className="text-5xl">🐕</span>
                        <span className="text-[11px] font-bold">사진 준비 중</span>
                    </div>
                )}

                <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm ${getStatusStyle(dog.status)}`}>
                        {getStatusLabel(dog.status)}
                    </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* 예정일이 지난 접종·검진이 있으면 카드에서 바로 보이게 한다. */}
                    {dog.overdue_count > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-destructive text-destructive-foreground shadow-sm">
                            ⚠️ 지연 {dog.overdue_count}
                        </span>
                    )}
                    {!dog.is_neutered && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-900/75 text-white shadow-sm">
                            중성화 미완
                        </span>
                    )}
                </div>
            </div>

            {/* 본문 */}
            <div className="flex flex-col flex-1 p-4 gap-2">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-black tracking-tight text-foreground">{dog.name}</h3>
                    <span className="text-xs font-bold text-muted-foreground">
                        {getSexLabel(dog.sex)}{age ? ` · ${age}` : ''}
                    </span>
                </div>

                {dog.notice_number && (
                    <span className="font-mono text-[11px] font-bold text-muted-foreground/80">
                        {dog.notice_number}
                    </span>
                )}

                <div className="mt-auto pt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="opacity-70">🗓</span> {formatDogDate(dog.rescued_on, '구조일 미기재')}
                    </span>
                    {dog.rescue_place && (
                        <span className="flex items-center gap-1 truncate">
                            <span className="opacity-70">📍</span> {dog.rescue_place}
                        </span>
                    )}
                </div>

                {dog.organization?.name && (
                    <span className="text-[11px] font-bold text-primary/80">{dog.organization.name}</span>
                )}
            </div>
        </button>
    );
};

export default RescueDogCard;
