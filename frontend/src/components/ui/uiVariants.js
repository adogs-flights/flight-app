// 실제 페이지와 /admin/ui가 함께 사용하는 기존 UI 스타일입니다.
// 클래스나 상태별 스타일은 이 파일에서 수정합니다. 페이지에는 업무 상태와 이벤트만 전달합니다.

export const uiVariants = {
    Heading: {
        adminUi: {
            className: "text-lg font-bold text-foreground",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/LandingPage.jsx","src/pages/OrgSignup.jsx"],
        },
        adminUi2: {
            className: "text-sm font-bold text-foreground",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        page: {
            className: "text-2xl font-bold tracking-tight text-foreground",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/GeneralHome.jsx","src/pages/GeneralSignup.jsx","src/pages/GiveView.jsx","src/pages/LoginScreen.jsx","src/pages/MyApplicationsView.jsx","src/pages/MyTicketsView.jsx","src/pages/NeedPostView.jsx","src/pages/OrgProfileEdit.jsx","src/pages/OrgSignup.jsx","src/pages/PublicNeedBoard.jsx","src/pages/ScheduleView.jsx","src/pages/SignupChoice.jsx","src/pages/SubmissionReviewView.jsx","src/pages/SubmissionStatusView.jsx"],
        },
        guestTicketSubmit: {
            className: "text-xl sm:text-2xl font-bold tracking-tight text-foreground",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        landing: {
            className: "text-3xl sm:text-5xl font-bold tracking-tight text-foreground",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        landing2: {
            className: "text-xl sm:text-3xl font-bold tracking-tight text-foreground",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        landing3: {
            className: "text-2xl sm:text-3xl font-bold text-foreground",
            usedBy: ["src/pages/LandingPage.jsx","src/components/UsageGuideSection.jsx"],
        },
        myApplications: {
            className: "text-sm font-bold text-foreground truncate",
            usedBy: ["src/pages/MyApplicationsView.jsx"],
        },
        myTickets: {
            className: "font-bold text-slate-800 flex items-center gap-2",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        notifications: {
            className: "text-2xl font-black",
            usedBy: ["src/pages/NotificationsView.jsx"],
        },
        orgIntro: {
            className: "text-2xl sm:text-3xl font-black tracking-tight text-foreground",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgIntro2: {
            className: "text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        signupChoice: {
            className: "text-base font-bold text-foreground group-hover:text-primary transition-colors",
            usedBy: ["src/pages/SignupChoice.jsx"],
        },
        volunteerGuide: {
            className: "text-3xl sm:text-4xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both",
            style: {"animationDelay":"100ms"},
            usedBy: ["src/pages/VolunteerGuideView.jsx"],
        },
        volunteerGuide2: {
            className: "text-xl sm:text-2xl font-bold text-foreground",
            usedBy: ["src/pages/VolunteerGuideView.jsx","src/components/UsageGuideSection.jsx"],
        },
        volunteerGuide3: {
            className: "mb-2 text-base sm:text-lg font-bold text-foreground",
            usedBy: ["src/pages/VolunteerGuideView.jsx"],
        },
        calendar: {
            className: "text-xl font-bold text-foreground",
            usedBy: ["src/components/CalendarView.jsx"],
        },
        needPostCard: {
            className: ({ active }) => `text-base font-black tracking-tight leading-snug line-clamp-2 ${(active ? "line-through text-muted-foreground" : "text-foreground")}`,
            states: ["active"],
            usedBy: ["src/components/NeedPostCard.jsx"],
        },
        ticketCard: {
            className: "text-base font-bold leading-snug text-foreground line-clamp-2",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        usageGuide: {
            className: "text-lg sm:text-xl font-bold text-foreground",
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        usageGuide2: {
            className: "text-base sm:text-lg font-bold text-foreground",
            usedBy: ["src/components/UsageGuideSection.jsx","src/components/ui/Modal.jsx"],
        },
        sidebar: {
            className: "px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-3 ml-1",
            usedBy: ["src/components/layout/Sidebar.jsx"],
        },
        folderSetup: {
            className: "text-sm font-black text-foreground",
            usedBy: ["src/components/modals/FolderSetupModal.jsx"],
        },
        needPostDetail: {
            className: "text-xl font-black text-foreground tracking-tight",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        ticketDetail: {
            className: "text-2xl font-black text-slate-900",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
    },
    Card: {
        adminUi: {
            className: "min-w-0 space-y-3 rounded-xl border-2 border-border bg-card p-4 sm:p-5",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        adminUi2: {
            className: "overflow-x-auto rounded-xl border-2 border-border bg-card",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        admin: {
            className: "flex flex-col bg-card rounded-xl border-2 border-border shadow-sm overflow-hidden min-h-[400px]",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        generalHome: {
            className: "w-full max-w-[400px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500",
            usedBy: ["src/pages/GeneralHome.jsx","src/pages/GeneralSignup.jsx","src/pages/LoginScreen.jsx"],
        },
        guestTicketSubmit: {
            className: "w-full max-w-[480px] p-5 sm:p-8 space-y-6 sm:space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        myApplications: {
            className: "group flex items-center justify-between p-5 bg-card rounded-xl border-2 border-border shadow-sm transition-all hover:border-primary/30 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300",
            usedBy: ["src/pages/MyApplicationsView.jsx"],
        },
        orgIntro: {
            className: "w-28 h-28 rounded-3xl overflow-hidden border-2 border-border bg-card shadow-sm flex items-center justify-center",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgIntro2: {
            className: "p-6 rounded-2xl bg-card border-2 border-border shadow-sm",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgProfileEdit: {
            className: "p-5 rounded-2xl bg-card border-2 border-border shadow-sm space-y-3",
            usedBy: ["src/pages/OrgProfileEdit.jsx"],
        },
        orgProfileEdit2: {
            className: "p-5 rounded-2xl bg-card border-2 border-border shadow-sm space-y-4",
            usedBy: ["src/pages/OrgProfileEdit.jsx"],
        },
        orgSignup: {
            className: "w-full max-w-[440px] p-8 space-y-6 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500",
            usedBy: ["src/pages/OrgSignup.jsx"],
        },
        signupChoice: {
            className: "w-full max-w-[460px] p-8 space-y-8 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500",
            usedBy: ["src/pages/SignupChoice.jsx"],
        },
        submissionStatus: {
            className: "w-full max-w-[460px] p-8 space-y-6 bg-card rounded-2xl border-2 border-border shadow-xl animate-in fade-in zoom-in-95 duration-500",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        volunteerGuide: {
            className: "flex items-start gap-3 p-4 bg-card rounded-xl border-2 border-border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
            usedBy: ["src/pages/VolunteerGuideView.jsx"],
        },
        calendar: {
            className: "calendar-view bg-card rounded-xl border-2 border-border overflow-hidden flex flex-col",
            usedBy: ["src/components/CalendarView.jsx"],
        },
        ticketCard: {
            className: "group relative flex flex-col justify-between p-5 border-2 rounded-xl transition-all cursor-pointer hover:shadow-md overflow-hidden bg-card",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        usageGuide: {
            className: "inline-flex p-1 rounded-2xl border-2 border-border bg-card shadow-sm",
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        usageGuide2: {
            className: "flex items-start gap-4 p-5 sm:p-6 bg-card rounded-2xl border-2 border-border",
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        modal: {
            className: "w-full max-w-[520px] max-h-[92vh] sm:max-h-[90vh] flex flex-col relative bg-card rounded-t-2xl sm:rounded-2xl border-2 border-border shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden",
            usedBy: ["src/components/ui/Modal.jsx"],
        },
    },
    ActionLink: {
        adminUi: {
            className: "px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors shrink-0 text-center",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        adminUi2: {
            className: "rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        admin: {
            className: "inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        generalHome: {
            className: "inline-block text-xs font-bold text-primary hover:underline",
            usedBy: ["src/pages/GeneralHome.jsx","src/pages/GuestTicketSubmitView.jsx","src/pages/LoginScreen.jsx","src/pages/OrgSignup.jsx","src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        generalSignup: {
            className: "flex items-center justify-center w-14 h-14 rounded-2xl mb-2",
            usedBy: ["src/pages/GeneralSignup.jsx","src/pages/OrgSignup.jsx","src/pages/SignupChoice.jsx","src/pages/SubmissionStatusView.jsx"],
        },
        generalSignup2: {
            className: "block text-xs font-bold text-primary hover:underline",
            usedBy: ["src/pages/GeneralSignup.jsx","src/pages/OrgSignup.jsx"],
        },
        generalSignup3: {
            className: "block text-xs text-muted-foreground hover:underline",
            usedBy: ["src/pages/GeneralSignup.jsx"],
        },
        guestTicketSubmit: {
            className: "text-xs text-muted-foreground hover:text-foreground transition-colors",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        landing: {
            className: "inline-flex items-center justify-center h-9 px-4 text-sm font-bold rounded-lg text-foreground hover:bg-secondary transition-colors",
            usedBy: ["src/pages/LandingPage.jsx","src/pages/PublicNeedBoard.jsx"],
        },
        landing2: {
            className: "group inline-flex items-center justify-center gap-2 h-14 px-10 text-base font-black rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98]",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        landing3: {
            className: "inline-flex items-center justify-center h-14 px-8 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-secondary transition-all hover:scale-[0.99] active:scale-[0.97]",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        landing4: {
            className: "text-sm font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors animate-in fade-in duration-700 fill-mode-both",
            style: {"animationDelay":"300ms"},
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        landing5: {
            className: "inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        loginScreen: {
            className: "flex items-center justify-center w-14 h-14 rounded-2xl text-primary-foreground text-2xl font-bold mb-2",
            usedBy: ["src/pages/LoginScreen.jsx"],
        },
        loginScreen2: {
            className: "font-bold text-primary hover:underline",
            usedBy: ["src/pages/LoginScreen.jsx","src/pages/PublicNeedBoard.jsx","src/components/UsageGuideSection.jsx"],
        },
        notifications: {
            className: "text-sm text-primary",
            usedBy: ["src/pages/NotificationsView.jsx"],
        },
        orgIntro: {
            className: "flex items-center gap-2",
            usedBy: ["src/pages/OrgIntroView.jsx","src/pages/PublicNeedBoard.jsx"],
        },
        orgIntro2: {
            className: "inline-flex items-center justify-center h-9 px-3 text-sm font-bold rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
            usedBy: ["src/pages/OrgIntroView.jsx","src/pages/PublicNeedBoard.jsx"],
        },
        orgIntro3: {
            className: "text-sm font-bold text-primary hover:underline",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgIntro4: {
            className: "inline-flex items-center gap-2 h-10 px-4 text-sm font-bold rounded-xl border-2 border-border bg-card hover:border-primary/30 transition-all",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgIntro5: {
            className: "inline-flex items-center justify-center h-11 px-6 text-sm font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95",
            usedBy: ["src/pages/OrgIntroView.jsx"],
        },
        orgProfileEdit: {
            className: "shrink-0 inline-flex items-center justify-center h-9 px-4 text-xs font-bold rounded-lg border-2 border-border bg-card hover:border-primary/30 transition-all",
            usedBy: ["src/pages/OrgProfileEdit.jsx"],
        },
        publicNeedBoard: {
            className: "px-3 text-sm font-bold",
            usedBy: ["src/pages/PublicNeedBoard.jsx"],
        },
        signupChoice: {
            className: "block p-5 rounded-xl border-2 border-border bg-background hover:border-primary/50 hover:bg-muted/30 transition-all group",
            usedBy: ["src/pages/SignupChoice.jsx"],
        },
        signupChoice2: {
            className: "text-xs font-bold text-primary hover:underline",
            usedBy: ["src/pages/SignupChoice.jsx","src/pages/SubmissionStatusView.jsx","src/components/modals/GuestSubmissionReviewModal.jsx","src/components/modals/TicketDepartureSection.jsx"],
        },
        usageGuide: {
            className: "inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.99] active:scale-[0.97]",
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        usageGuide2: {
            className: "inline-flex items-center justify-center h-12 px-8 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-secondary transition-all",
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        footer: {
            className: "text-sm font-medium text-muted-foreground hover:text-primary transition-colors",
            usedBy: ["src/components/layout/Footer.jsx"],
        },
        header: {
            className: "flex items-center gap-2 group transition-opacity hover:opacity-90",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        plain: {
            className: "",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        publicNeedPostDetail: {
            className: "w-full inline-flex items-center justify-center gap-2 h-12 px-4 text-sm font-black rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.99] active:scale-[0.97]",
            usedBy: ["src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        ticketEticket: {
            className: "mt-2 inline-block text-xs font-bold text-primary hover:underline",
            usedBy: ["src/components/modals/TicketEticketSection.jsx"],
        },
        ticketEticket2: {
            className: "mt-2 block",
            usedBy: ["src/components/modals/TicketEticketSection.jsx"],
        },
    },
    Button: {
        primary: {
            className: "inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/MyTicketsView.jsx","src/pages/NeedPostView.jsx","src/pages/ScheduleView.jsx"],
        },
        secondary: {
            className: "px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors",
            usedBy: ["src/pages/AdminUiView.jsx","src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/ApplicantListModal.jsx","src/components/modals/ApplyModal.jsx","src/components/modals/ChangePasswordModal.jsx","src/components/modals/DayTicketsModal.jsx","src/components/modals/GuestSubmissionReviewModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/OrganizationModal.jsx","src/components/modals/RegisterUserModal.jsx"],
        },
        approveSmall: {
            className: "px-2.5 py-1 text-[11px] font-bold rounded-lg bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all active:scale-95",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx"],
        },
        dangerSmall: {
            className: "px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        primaryDisabled: {
            className: "inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        segmented: {
            className: ({ active }) => (active ? "inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors"),
            states: ["active"],
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        approveMobile: {
            className: "px-3 py-1.5 text-[11px] font-bold rounded-lg bg-green/10 text-green border border-green/20",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        dangerMobile: {
            className: "px-3 py-1.5 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive border border-destructive/20",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        secondarySmall: {
            className: "px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-all active:scale-95",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        secondaryMobile: {
            className: "px-3 py-1.5 text-[11px] font-bold rounded-lg bg-secondary border border-border",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        tab: {
            className: ({ active }) => `shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] ${(active ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}`,
            states: ["active"],
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        outlineFull: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg border-2 border-border bg-background text-foreground hover:bg-muted hover:scale-[0.99] active:scale-[0.97]",
            usedBy: ["src/pages/GeneralHome.jsx"],
        },
        kakaoSignup: {
            className: "w-full inline-flex items-center justify-center h-12 px-4 py-2 text-sm font-bold transition-all rounded-lg shadow-sm hover:scale-[0.99] active:scale-[0.97]",
            style: {"backgroundColor":"#FEE500","color":"#191600"},
            usedBy: ["src/pages/GeneralSignup.jsx"],
        },
        filter: {
            className: ({ active }) => `shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${(active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/30")}`,
            states: ["active"],
            usedBy: ["src/pages/GiveView.jsx","src/pages/MyTicketsView.jsx","src/pages/NeedPostView.jsx","src/pages/PublicNeedBoard.jsx","src/pages/ScheduleView.jsx"],
        },
        airportChip: {
            className: "shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all",
            usedBy: ["src/pages/GiveView.jsx","src/pages/MyTicketsView.jsx","src/pages/ScheduleView.jsx"],
        },
        filter2: {
            className: ({ active }) => `shrink-0 px-4 py-1.5 text-xs font-black rounded-full border-2 transition-all ${(active ? "bg-secondary text-secondary-foreground border-secondary" : "bg-background text-muted-foreground border-border hover:border-primary/30")}`,
            states: ["active"],
            usedBy: ["src/pages/GiveView.jsx","src/pages/MyTicketsView.jsx"],
        },
        give: {
            className: ({ active }) => `inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all shadow-sm active:scale-95 ${(active ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:bg-muted")}`,
            states: ["active"],
            usedBy: ["src/pages/GiveView.jsx","src/pages/MyTicketsView.jsx"],
        },
        clearFilter: {
            className: "p-2 text-muted-foreground hover:text-destructive transition-colors",
            usedBy: ["src/pages/GiveView.jsx","src/pages/MyTicketsView.jsx"],
        },
        copy: {
            className: "shrink-0 h-10 px-3 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        submitDisabled: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97] disabled:opacity-50",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        textLink: {
            className: "text-sm font-bold text-primary hover:underline",
            usedBy: ["src/pages/KakaoCallback.jsx"],
        },
        submit: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97]",
            usedBy: ["src/pages/LoginScreen.jsx"],
        },
        kakaoLogin: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg shadow-sm hover:scale-[0.99] active:scale-[0.97]",
            style: {"backgroundColor":"#FEE500","color":"#191600"},
            usedBy: ["src/pages/LoginScreen.jsx"],
        },
        googleDrive: {
            className: "w-full sm:w-auto bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        driveAction: {
            className: "flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        driveDanger: {
            className: "shrink-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        segmented2: {
            className: ({ active }) => `px-3 py-1.5 text-xs font-medium rounded-md transition-all ${(active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}`,
            states: ["active"],
            usedBy: ["src/pages/MyTicketsView.jsx","src/pages/ScheduleView.jsx"],
        },
        notificationPrimary: {
            className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40",
            usedBy: ["src/pages/NotificationsView.jsx"],
        },
        notificationSecondary: {
            className: "px-4 py-2 rounded-xl border disabled:opacity-40",
            usedBy: ["src/pages/NotificationsView.jsx"],
        },
        removeFile: {
            className: "text-left text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 disabled:opacity-50",
            usedBy: ["src/pages/OrgProfileEdit.jsx","src/components/modals/OrganizationModal.jsx"],
        },
        saveProfile: {
            className: "w-full h-10 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.99]",
            usedBy: ["src/pages/OrgProfileEdit.jsx"],
        },
        signup: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 py-2 text-sm font-bold transition-all rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[0.99] active:scale-[0.97] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100",
            usedBy: ["src/pages/OrgSignup.jsx"],
        },
        account: {
            className: "inline-flex items-center justify-center h-9 px-3 text-sm font-bold rounded-lg text-foreground hover:bg-secondary transition-colors",
            usedBy: ["src/pages/PublicNeedBoard.jsx"],
        },
        withdraw: {
            className: "inline-flex items-center justify-center h-9 px-3 text-sm font-bold rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            usedBy: ["src/pages/PublicNeedBoard.jsx"],
        },
        calendarExport: {
            className: "w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-4 text-sm font-bold rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors",
            usedBy: ["src/pages/ScheduleView.jsx"],
        },
        calendarCopy: {
            className: "w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm sm:hidden",
            usedBy: ["src/pages/ScheduleView.jsx"],
        },
        submitDocuments: {
            className: "w-full inline-flex items-center justify-center h-11 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        calendarArrow: {
            className: "p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
            usedBy: ["src/components/CalendarView.jsx"],
        },
        needPostCard: {
            className: ({ active }) => `group text-left flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${(active ? "opacity-60" : "")}`,
            states: ["active"],
            usedBy: ["src/components/NeedPostCard.jsx"],
        },
        ticketEdit: {
            className: "px-3 py-1 text-[11px] font-semibold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketDelete: {
            className: "px-3 py-1 text-[11px] font-semibold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketApplicants: {
            className: "px-3 py-1 text-[11px] font-semibold rounded-md bg-sky text-sky-foreground hover:bg-sky/90 transition-colors",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketApply: {
            className: "px-3 py-1 text-[11px] font-semibold rounded-md bg-green text-green-foreground hover:bg-green/90 transition-colors",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        usageGuide: {
            className: ({ active }) => `flex items-center gap-2 px-5 sm:px-7 h-12 rounded-xl text-sm font-bold transition-all ${(active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground")}`,
            states: ["active"],
            usedBy: ["src/components/UsageGuideSection.jsx"],
        },
        menu: {
            className: "inline-flex items-center justify-center py-2 pr-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:hidden transition-colors",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        headerPassword: {
            className: "hidden px-3 py-1.5 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors sm:flex items-center gap-1.5 text-muted-foreground",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        logout: {
            className: "px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        headerWithdraw: {
            className: "hidden sm:flex px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors items-center",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        sidebarClose: {
            className: "p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors",
            usedBy: ["src/components/layout/Sidebar.jsx"],
        },
        sidebarPassword: {
            className: "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden transition-all text-left w-full mt-2",
            usedBy: ["src/components/layout/Sidebar.jsx"],
        },
        save: {
            className: "px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
            usedBy: ["src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/GuestSubmissionReviewModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/OrganizationModal.jsx"],
        },
        resetColor: {
            className: "ml-auto px-3 py-1 text-[10px] font-bold rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors border",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        confirmApplicant: {
            className: "px-3 py-1.5 text-[11px] font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm",
            usedBy: ["src/components/modals/ApplicantListModal.jsx"],
        },
        rejectApplicant: {
            className: "px-3 py-1.5 text-[11px] font-bold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all",
            usedBy: ["src/components/modals/ApplicantListModal.jsx"],
        },
        apply: {
            className: "px-6 py-2 text-sm font-bold transition-all rounded-md bg-green text-green-foreground hover:bg-green/90 shadow-sm",
            usedBy: ["src/components/modals/ApplyModal.jsx"],
        },
        saveDisabled: {
            className: "px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:grayscale",
            usedBy: ["src/components/modals/ChangePasswordModal.jsx","src/components/modals/RegisterUserModal.jsx"],
        },
        resetDate: {
            className: "w-full h-11 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors",
            usedBy: ["src/components/modals/DateFilterModal.jsx"],
        },
        dateFilter: {
            className: ({ active }) => `h-12 rounded-xl text-sm font-bold transition-all border-2 ${(active ? "bg-primary border-primary text-primary-foreground shadow-md scale-[0.98]" : "bg-background border-border text-foreground hover:border-primary/30 active:scale-95")}`,
            states: ["active"],
            usedBy: ["src/components/modals/DateFilterModal.jsx"],
        },
        monthArrow: {
            className: "text-muted-foreground hover:text-foreground",
            usedBy: ["src/components/modals/DateFilterModal.jsx"],
        },
        dateFilter2: {
            className: ({ active, alternateActive }) => `h-8 w-full rounded-lg text-xs font-bold transition-all flex items-center justify-center ${(active ? "invisible" : (alternateActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/10 text-foreground"))}`,
            states: ["active","alternateActive"],
            usedBy: ["src/components/modals/DateFilterModal.jsx"],
        },
        createFolder: {
            className: "whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50",
            usedBy: ["src/components/modals/FolderSetupModal.jsx"],
        },
        cancelFolder: {
            className: "rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50",
            usedBy: ["src/components/modals/FolderSetupModal.jsx"],
        },
        rejectSubmission: {
            className: "px-4 py-2 text-sm font-bold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        requestDetails: {
            className: "text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 transition-colors pt-1",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        confirmReject: {
            className: "w-full h-11 text-sm font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        detailClose: {
            className: "h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96]",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx","src/components/modals/TicketDetailModal.jsx"],
        },
        detailEdit: {
            className: "h-10 px-5 text-[13px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 active:scale-[0.96]",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx"],
        },
        deleteText: {
            className: "text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 transition-all duration-200",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/TicketDetailModal.jsx"],
        },
        deleteImage: {
            className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90",
            usedBy: ["src/components/modals/NeedPostFormModal.jsx"],
        },
        saveDeparture: {
            className: "w-full h-10 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
            usedBy: ["src/components/modals/TicketDepartureSection.jsx"],
        },
        purgeDocuments: {
            className: "mt-3 block text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4",
            usedBy: ["src/components/modals/TicketDepartureSection.jsx"],
        },
        detailCopy: {
            className: "flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96] shadow-sm",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
        ticketDetail: {
            className: ({ active }) => `flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-bold rounded-lg transition-all duration-200 active:scale-[0.96] ${(active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-primary text-primary-foreground hover:bg-primary/90")}`,
            states: ["active"],
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
        formCancel: {
            className: "w-full sm:w-auto h-11 sm:h-auto px-4 py-2 text-sm font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors",
            usedBy: ["src/components/modals/TicketFormModal.jsx"],
        },
        formSave: {
            className: "w-full sm:w-auto h-11 sm:h-auto px-6 py-2 text-sm font-bold transition-all rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
            usedBy: ["src/components/modals/TicketFormModal.jsx"],
        },
        ticketForm: {
            className: ({ active }) => `flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${(active ? "bg-primary/5 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/30")}`,
            states: ["active"],
            usedBy: ["src/components/modals/TicketFormModal.jsx"],
        },
        ticketForm2: {
            className: ({ active }) => `flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all text-sm font-semibold ${(active ? "bg-green/5 border-green text-green" : "bg-background border-border text-muted-foreground hover:border-primary/30")}`,
            states: ["active"],
            usedBy: ["src/components/modals/TicketFormModal.jsx"],
        },
        modalClose: {
            className: "inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            usedBy: ["src/components/ui/Modal.jsx"],
        },
    },
    FieldLabel: {
        adminUi: {
            className: "flex flex-col gap-2 text-xs font-bold text-muted-foreground",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        adminUi2: {
            className: "flex items-center gap-2 text-xs text-muted-foreground",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        default: {
            className: "text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx","src/pages/LoginScreen.jsx","src/pages/OrgSignup.jsx","src/pages/SubmissionStatusView.jsx","src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/ApplyModal.jsx","src/components/modals/ChangePasswordModal.jsx","src/components/modals/GuestSubmissionReviewModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/OrganizationModal.jsx","src/components/modals/RegisterUserModal.jsx","src/components/modals/TicketFormModal.jsx","src/components/ui/SelectField.jsx"],
        },
        orgProfileEdit: {
            className: "text-[11px] font-black uppercase tracking-widest text-muted-foreground",
            usedBy: ["src/pages/OrgProfileEdit.jsx","src/components/modals/DateFilterModal.jsx"],
        },
        airline: {
            className: "relative inline-flex items-center cursor-pointer",
            usedBy: ["src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/OrganizationModal.jsx"],
        },
        airport: {
            className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 block text-center",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        dateFilter: {
            className: "text-[11px] font-black uppercase tracking-widest text-muted-foreground pl-1",
            usedBy: ["src/components/modals/DateFilterModal.jsx"],
        },
        needPostDetail: {
            className: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        needPostDetail2: {
            className: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        needPostForm: {
            className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-slate-900 cursor-pointer hover:bg-slate-100",
            usedBy: ["src/components/modals/NeedPostFormModal.jsx"],
        },
        needPostForm2: {
            className: "flex flex-col items-center justify-center gap-2 w-full h-40 rounded-xl border-2 border-dashed border-border bg-muted/20 cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-all",
            usedBy: ["src/components/modals/NeedPostFormModal.jsx"],
        },
        ticketDeparture: {
            className: "text-[12px] font-bold uppercase tracking-wider text-muted-foreground",
            usedBy: ["src/components/modals/TicketDepartureSection.jsx","src/components/modals/TicketDetailModal.jsx","src/components/modals/TicketEticketSection.jsx"],
        },
        ticketDetail: {
            className: "text-[12px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
        ticketDetail2: {
            className: "text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
        ticketDetail3: {
            className: "text-[12px] font-bold uppercase tracking-wider text-muted-foreground pl-1",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
    },
    Input: {
        default: {
            className: "h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/pages/AdminUiView.jsx","src/components/modals/GuestSubmissionReviewModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/TicketFormModal.jsx"],
        },
        disabled: {
            className: "h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        plain: {
            className: "",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        search: {
            className: "flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 sm:w-[240px]",
            usedBy: ["src/pages/GiveView.jsx","src/pages/NeedPostView.jsx"],
        },
        copy: {
            className: "flex-1 h-10 rounded-lg border-2 border-border bg-background px-3 text-[11px] text-muted-foreground focus:outline-none",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        file: {
            className: "flex w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        flex: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx","src/pages/OrgSignup.jsx","src/pages/SubmissionStatusView.jsx","src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/ChangePasswordModal.jsx","src/components/modals/OrganizationModal.jsx","src/components/modals/RegisterUserModal.jsx"],
        },
        login: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50",
            usedBy: ["src/pages/LoginScreen.jsx"],
        },
        ticketSearch: {
            className: "flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none transition-all focus:border-primary/50 sm:w-[240px]",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        logo: {
            className: "text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-primary file:text-primary-foreground disabled:opacity-50",
            usedBy: ["src/pages/OrgProfileEdit.jsx","src/components/modals/OrganizationModal.jsx"],
        },
        compact: {
            className: "flex h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/pages/OrgProfileEdit.jsx","src/components/modals/TicketDepartureSection.jsx"],
        },
        publicSearch: {
            className: "flex h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all focus:border-primary/50 sm:w-[260px]",
            usedBy: ["src/pages/PublicNeedBoard.jsx"],
        },
        document: {
            className: "flex w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        locked: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none disabled:bg-muted disabled:text-muted-foreground",
            usedBy: ["src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx"],
        },
        toggle: {
            className: "sr-only peer",
            usedBy: ["src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/NeedPostFormModal.jsx","src/components/modals/OrganizationModal.jsx"],
        },
        color: {
            className: "w-8 h-8 rounded border-none cursor-pointer overflow-hidden bg-transparent p-0",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        colorOffset: {
            className: "w-8 h-8 rounded border-none cursor-pointer overflow-hidden bg-transparent p-0 ml-2",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        success: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-green/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/ApplyModal.jsx"],
        },
        folder: {
            className: "h-10 flex-1 rounded-xl border-2 border-border px-3 text-sm transition-all focus:border-primary/50 focus:outline-none",
            usedBy: ["src/components/modals/FolderSetupModal.jsx"],
        },
        hiddenFile: {
            className: "hidden",
            usedBy: ["src/components/modals/NeedPostFormModal.jsx"],
        },
        compactFile: {
            className: "flex w-full rounded-lg border-2 border-border bg-background px-3 py-1.5 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-primary file:text-primary-foreground",
            usedBy: ["src/components/modals/TicketDepartureSection.jsx"],
        },
    },
    Table: {
        default: {
            className: "w-full text-sm text-left border-collapse",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    TableHead: {
        plain: {
            className: "",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    TableRow: {
        adminUi: {
            className: "bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        adminUi2: {
            className: "hover:bg-muted/30 transition-colors",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    TableHeaderCell: {
        adminUi: {
            className: "px-4 py-4",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        admin: {
            className: "px-6 py-4",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        admin2: {
            className: "px-6 py-4 text-right",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    TableBody: {
        adminUi: {
            className: "divide-y divide-border/50",
            usedBy: ["src/pages/AdminUiView.jsx","src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    TableCell: {
        adminUi: {
            className: "px-4 py-4 font-semibold",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        adminUi2: {
            className: "px-4 py-4 text-muted-foreground",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        adminUi3: {
            className: "px-4 py-4 whitespace-nowrap",
            usedBy: ["src/pages/AdminUiView.jsx"],
        },
        admin: {
            className: "px-6 py-4 font-bold text-foreground",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin2: {
            className: "px-6 py-4",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin3: {
            className: "px-6 py-4 text-muted-foreground",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin4: {
            className: "px-6 py-4 text-muted-foreground text-xs",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        admin5: {
            className: "px-6 py-4 text-right",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        admin6: {
            className: "px-6 py-4 font-semibold text-foreground",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        admin7: {
            className: "px-6 py-4 font-black text-foreground",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin8: {
            className: "px-6 py-4 font-bold",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin9: {
            className: "px-6 py-4 text-xs",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
    },
    Badge: {
        admin: {
            className: "px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        admin2: {
            className: "px-2 py-0.5 rounded-md text-[10px] font-black border",
            usedBy: ["src/pages/AdminView.jsx"],
        },
        landing: {
            className: "inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary text-sm font-bold",
            usedBy: ["src/pages/LandingPage.jsx"],
        },
        myTickets: {
            className: "bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-black",
            usedBy: ["src/pages/MyTicketsView.jsx"],
        },
        submissionReview: {
            className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm align-middle whitespace-nowrap",
            usedBy: ["src/pages/SubmissionReviewView.jsx"],
        },
        volunteerGuide: {
            className: "absolute flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold -left-10 ring-4 ring-background",
            usedBy: ["src/pages/VolunteerGuideView.jsx","src/components/UsageGuideSection.jsx"],
        },
        needPostCard: {
            className: "px-2.5 py-1 rounded-lg text-[10px] font-black bg-destructive text-destructive-foreground shadow-lg animate-pulse",
            usedBy: ["src/components/NeedPostCard.jsx"],
        },
        needPostCard2: {
            className: "px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-900/80 text-white shadow-lg",
            usedBy: ["src/components/NeedPostCard.jsx"],
        },
        needPostCard3: {
            className: "px-2.5 py-1 rounded-lg text-[11px] font-black border shadow-sm",
            usedBy: ["src/components/NeedPostCard.jsx"],
        },
        ticketCard: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-green/10 text-green border border-green/20",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketCard2: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border",
            usedBy: ["src/components/TicketCard.jsx","src/components/ui/ApplicationStatusBadge.jsx"],
        },
        ticketCard3: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketCard4: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold border",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        ticketCard5: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground border border-border",
            usedBy: ["src/components/TicketCard.jsx"],
        },
        header: {
            className: "hidden px-2 py-0.5 rounded-full text-[10px] font-bold bg-earth-foreground text-earth border border-earth/20 sm:block",
            usedBy: ["src/components/layout/Header.jsx"],
        },
        sidebar: {
            className: ({ active }) => `ml-auto px-2 py-0.5 rounded-full text-[10px] font-black border ${(active ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground" : "bg-primary/10 border-primary/20 text-primary")}`,
            states: ["active"],
            usedBy: ["src/components/layout/Sidebar.jsx"],
        },
        airport: {
            className: "px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        applicantList: {
            className: ({ active }) => `px-2 py-1 rounded-full text-[10px] font-bold border ${(active ? "bg-green/10 text-green border-green/20" : "bg-muted text-muted-foreground border-border")}`,
            states: ["active"],
            usedBy: ["src/components/modals/ApplicantListModal.jsx"],
        },
        dayTickets: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm",
            usedBy: ["src/components/modals/DayTicketsModal.jsx"],
        },
        guestSubmissionReview: {
            className: "ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm align-middle whitespace-nowrap",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        needPostDetail: {
            className: "px-2 py-1 rounded-md text-[10px] font-black bg-destructive text-destructive-foreground animate-pulse shadow-sm",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        needPostDetail2: {
            className: "px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        needPostDetail3: {
            className: "px-2.5 py-1 rounded-lg text-xs font-black border shadow-sm",
            usedBy: ["src/components/modals/NeedPostDetailModal.jsx","src/components/modals/PublicNeedPostDetailModal.jsx"],
        },
        ticketDetail: {
            className: "px-2 py-0.5 rounded-full text-[12px] font-bold border",
            usedBy: ["src/components/modals/TicketDetailModal.jsx"],
        },
        applicationStatusBadge: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-green text-green-foreground border border-green/20",
            usedBy: ["src/components/ui/ApplicationStatusBadge.jsx"],
        },
        applicationStatusBadge2: {
            className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-earth-foreground text-earth border border-earth/20",
            usedBy: ["src/components/ui/ApplicationStatusBadge.jsx"],
        },
        userRoleBadge: {
            className: ({ active, alternateActive, thirdActive }) => `px-2 py-0.5 rounded-full font-bold border ${(active ? "text-[9px]" : "text-[10px] whitespace-nowrap")} ${(alternateActive ? "bg-sky/10 text-sky border-sky/20" : (thirdActive ? "bg-earth/10 text-earth-foreground border-earth/20" : "bg-muted text-muted-foreground border-border"))}`,
            states: ["active","alternateActive","thirdActive"],
            usedBy: ["src/components/ui/UserRoleBadge.jsx"],
        },
    },
    Alert: {
        admin: {
            className: "m-4 px-4 py-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg",
            usedBy: ["src/pages/AdminView.jsx","src/pages/SubmissionReviewView.jsx"],
        },
        generalSignup: {
            className: "px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg",
            usedBy: ["src/pages/GeneralSignup.jsx","src/pages/OrgProfileEdit.jsx","src/pages/OrgSignup.jsx","src/pages/SubmissionStatusView.jsx","src/components/modals/AirlineModal.jsx","src/components/modals/AirportModal.jsx","src/components/modals/ApplyModal.jsx","src/components/modals/OrganizationModal.jsx","src/components/modals/RegisterUserModal.jsx","src/components/modals/TicketDepartureSection.jsx"],
        },
        guestTicketSubmit: {
            className: "p-6 rounded-xl border-2 border-green/20 bg-green/5 text-center space-y-2",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        guestTicketSubmit2: {
            className: "px-3 py-2 text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx"],
        },
        guestTicketSubmit3: {
            className: "px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in shake duration-300",
            usedBy: ["src/pages/GuestTicketSubmitView.jsx","src/pages/LoginScreen.jsx","src/components/modals/ChangePasswordModal.jsx"],
        },
        submissionStatus: {
            className: "px-4 py-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl text-center",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        submissionStatus2: {
            className: "px-4 py-3 rounded-xl border-2 border-destructive/20 bg-destructive/5 text-left",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        submissionStatus3: {
            className: "px-4 py-3 rounded-xl border-2 border-green/20 bg-green/5 text-sm text-foreground leading-relaxed",
            usedBy: ["src/pages/SubmissionStatusView.jsx"],
        },
        applicantList: {
            className: "p-4 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg",
            usedBy: ["src/components/modals/ApplicantListModal.jsx"],
        },
        registerUser: {
            className: ({ active }) => `flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-[11px] font-bold ${(active ? "bg-green/5 border-green text-green" : "bg-background border-border text-muted-foreground/50")}`,
            states: ["active"],
            usedBy: ["src/components/modals/RegisterUserModal.jsx"],
        },
        modal: {
            className: "px-4 py-3 text-sm font-bold text-white bg-destructive/80 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center gap-2 border border-white/20",
            usedBy: ["src/components/ui/Modal.jsx"],
        },
    },
    Textarea: {
        profile: {
            className: "w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm leading-relaxed transition-all focus:border-primary/50 focus-visible:outline-none resize-y",
            usedBy: ["src/pages/OrgProfileEdit.jsx"],
        },
        application: {
            className: "flex min-h-[120px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-green/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/ApplyModal.jsx"],
        },
        short: {
            className: "flex min-h-[80px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        default: {
            className: "flex min-h-[100px] w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/NeedPostFormModal.jsx","src/components/modals/TicketFormModal.jsx"],
        },
        organization: {
            className: "w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm leading-relaxed transition-all focus:border-primary/50 focus-visible:outline-none resize-y",
            usedBy: ["src/components/modals/OrganizationModal.jsx"],
        },
    },
    NativeSelect: {
        country: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none appearance-none",
            usedBy: ["src/components/modals/AirportModal.jsx"],
        },
        default: {
            className: "h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/GuestSubmissionReviewModal.jsx"],
        },
        flex: {
            className: "flex h-11 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm transition-all focus:border-primary/50 focus-visible:outline-none",
            usedBy: ["src/components/modals/RegisterUserModal.jsx"],
        },
    },
};
