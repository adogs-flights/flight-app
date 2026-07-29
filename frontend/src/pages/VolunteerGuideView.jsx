import logo from '../assets/flight-app.PNG';
import Footer from '../components/layout/Footer';
import Reveal from '../components/ui/Reveal';

const CHECKLIST = [
    <>이동봉사는 <strong className="text-foreground">대한항공/아시아나/에어 캐나다</strong>를 이용하시는 경우 신청 가능합니다. 다른 항공사를 이용하시거나 경유 일정이 포함된 경우 경우에 따라 이동봉사가 불가능할 수 있습니다.</>,
    <>출국 당일 비행기 출발 시간 기준 <strong className="text-foreground">3시간 30분 전</strong>까지 공항에 도착하셔야 원활한 수속이 가능합니다.</>,
    <>강아지 자리 예약, 서류 준비 등은 저희가 준비하고 있으며, 이동봉사자님께는 <strong className="text-foreground">별도의 비용이 발생하지 않습니다.</strong></>,
    <>강아지 켄넬 수는 이동봉사자님의 짐 개수와 별개로 카운트됩니다.</>,
];

const STEPS = [
    {
        title: '이동봉사 신청',
        desc: (
            <>
                <p>탑승하시는 항공편에 강아지 자리가 남아있는지 확인 후 예약 진행합니다.</p>
                <p>예약 확인을 위해 이티켓, 예약 시 항공사에 남기신 연락처, 항공사에 따라 여권번호, 생년월일 등의 정보가 필요합니다.</p>
            </>
        ),
    },
    {
        title: '출국 서류 준비',
        desc: (
            <>
                <p>출국 서류 준비를 위해 여권 앞면 사본, 미국/캐나다 내 주소&연락처가 필요합니다.</p>
                <p>민감한 개인정보이지만 현지 세관에 강아지 입국을 미리 사전에 합법적으로 신고하고 입국 허가 넘버(엔트리넘버) 발급을 위해 꼭 필요한 정보입니다.</p>
                <p><strong className="text-foreground">보내주신 정보들은 출국 서류 준비에만 사용된 후 안전하게 파기됩니다.</strong></p>
                <p className="text-xs">(* 미국/캐나다 주소&연락처가 정해지지 않은 경우 한국 주소&연락처도 가능합니다.)</p>
            </>
        ),
    },
    {
        title: '출국 D-7',
        desc: (
            <p>출국일에 맞춰 출국이 가능한 아이가 있을 경우 별도의 카카오톡 그룹챗을 만들어 안내드릴 예정이며, 출국 확정된 아이가 없을 경우 이동봉사자님의 동의 하에 이동이 필요한 다른 단체를 연결해드리고 있습니다.</p>
        ),
    },
    {
        title: '출국 D-5',
        desc: (
            <p>생성된 그룹챗에서 공항에서 만나는 시간을 정하고 미국/캐나다 입국 이후의 이동봉사 프로세스 등에 대해 안내드릴 예정입니다.</p>
        ),
    },
    {
        title: '출국 당일 인천공항에서',
        desc: (
            <>
                <p>출국 스탭과 약속하신 시간(출국 3시간 30분 전)에 맞춰 늦지 않게 공항에 도착해주세요.</p>
                <p>공항에서 출국 스탭분이 모든 절차를 끝까지 함께 해주실 겁니다.</p>
            </>
        ),
    },
    {
        title: '현지 공항에 도착해서',
        desc: (
            <>
                <p>랜딩 이후 강아지를 인계하는 데까지 평균적으로 1시간 30분이 소요되며 상황에 따라 3시간까지 소요될 수 있습니다.</p>
                <p>세관을 원활하게 통과하기 위해 실시간으로 가이드해드릴 예정이니 <strong className="text-foreground">랜딩 이후부터 꼭 그룹챗에 상황을 공유해주세요.</strong></p>
            </>
        ),
    },
];

function CheckIcon() {
    return (
        <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

export default function VolunteerGuideView() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Hero */}
            <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky/10 via-background to-background border-b border-border">
                <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-sky/20 blur-3xl animate-float-delayed pointer-events-none" />

                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center gap-6">
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
                        <img src={logo} alt="" className="w-9 h-9" />
                        <span className="text-lg font-bold tracking-tight text-primary">해봉티켓</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '100ms' }}>
                        해외 이동 봉사 안내문
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '200ms' }}>
                        안녕하세요, 봉사자님! 해외 이동 봉사를 신청해주셔서 정말 감사드립니다.<br />
                        소중한 시간과 민감한 개인정보를 공유해주시는 만큼, 저희도 최선을 다해 불편함 없도록 준비하겠습니다.
                    </p>
                </div>
            </section>

            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 space-y-16">
                {/* Checklist */}
                <section className="space-y-6">
                    <Reveal>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">신청 전 꼭 확인해주세요</h2>
                    </Reveal>
                    <div className="space-y-3">
                        {CHECKLIST.map((item, i) => (
                            <Reveal key={i} delay={i * 80}>
                                <div className="flex items-start gap-3 p-4 bg-card rounded-xl border-2 border-border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
                                    <CheckIcon />
                                    <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* Timeline */}
                <section className="space-y-6">
                    <Reveal>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">진행 프로세스</h2>
                    </Reveal>
                    <ol className="relative border-l-2 border-border ml-4">
                        {STEPS.map((s, i) => (
                            <Reveal as="li" key={s.title} delay={i * 80} className={`ml-6 relative ${i !== STEPS.length - 1 ? 'mb-6' : ''}`}>
                                <span className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold -left-10 ring-4 ring-background">
                                    {i + 1}
                                </span>
                                <div className="p-4 sm:p-5 bg-muted/50 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:bg-muted/70">
                                    <h3 className="mb-2 text-base sm:text-lg font-bold text-foreground">{s.title}</h3>
                                    <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
                                        {s.desc}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </ol>
                </section>

                {/* Privacy banner */}
                <Reveal>
                    <section className="p-6 sm:p-8 text-center bg-destructive/10 border-2 border-destructive/20 rounded-2xl">
                        <p className="text-sm sm:text-base font-bold text-destructive leading-relaxed">
                            이동이 완료되거나 이동봉사가 취소되는 경우<br />
                            공유해주신 개인 정보는 전부 안전하게 파기하고 있습니다.
                        </p>
                    </section>
                </Reveal>
            </div>

            <Footer />
        </div>
    );
}
