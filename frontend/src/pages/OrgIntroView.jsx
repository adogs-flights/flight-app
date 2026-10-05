import { ActionLink, Card, Heading } from '../components/ui/primitives.js';
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/layout/Footer';
import logo from '../assets/flight-app.PNG';

// 외부 링크가 http(s) 없이 들어와도 안전하게 새 탭으로 열리게 보정.
const normalizeUrl = (url) => {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

// 공개 단체 소개 페이지(/org/:slug). 비로그인도 접근 가능.
export default function OrgIntroView() {
    const { slug } = useParams();
    const { apiClient } = useAuth();
    const [state, setState] = useState({ org: null, loading: true, notFound: false });

    useEffect(() => {
        let alive = true;
        setState({ org: null, loading: true, notFound: false });
        apiClient.get(`/organizations/by-slug/${slug}`)
            .then(res => { if (alive) setState({ org: res.data, loading: false, notFound: false }); })
            .catch(() => { if (alive) setState({ org: null, loading: false, notFound: true }); });
        return () => { alive = false; };
    }, [apiClient, slug]);

    const { org, loading, notFound } = state;

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky/10 via-background to-earth/5">
            <header className="w-full border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <ActionLink as={Link} to="/" variant="orgIntro">
                        <img src={logo} alt="해봉티켓" className="w-8 h-8" />
                        <span className="font-bold text-foreground">해봉티켓</span>
                    </ActionLink>
                    <ActionLink as={Link} to="/board" variant="orgIntro2">
                        구해요 게시판
                    </ActionLink>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">불러오는 중...</div>
                ) : notFound || !org ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <span className="text-4xl">🔍</span>
                        <p className="text-sm text-muted-foreground">단체를 찾을 수 없습니다.</p>
                        <ActionLink as={Link} to="/board" variant="orgIntro3">구해요 게시판으로 →</ActionLink>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* 헤더: 로고 + 이름 */}
                        <div className="flex flex-col items-center text-center gap-4">
                            <Card variant="orgIntro">
                                {org.has_logo ? (
                                    <img src={`/api/organizations/${org.id}/logo`} alt={org.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-5xl">🐶</span>
                                )}
                            </Card>
                            <div className="space-y-1">
                                <Heading as="h1" variant="orgIntro">{org.name}</Heading>
                                <p className="text-sm text-muted-foreground">유기견 해외 이동봉사 구조 단체</p>
                            </div>
                        </div>

                        {/* 소개글 */}
                        {org.description ? (
                            <Card variant="orgIntro2">
                                <Heading as="h2" variant="orgIntro2">단체 소개</Heading>
                                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{org.description}</p>
                            </Card>
                        ) : (
                            <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed border-border text-center text-sm text-muted-foreground">
                                아직 소개글이 등록되지 않았습니다.
                            </div>
                        )}

                        {/* 외부 링크 */}
                        {(org.homepage_url || org.instagram_url) && (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {org.homepage_url && (
                                    <ActionLink href={normalizeUrl(org.homepage_url)} target="_blank" rel="noreferrer"
                                        variant="orgIntro4">
                                        🌐 홈페이지
                                    </ActionLink>
                                )}
                                {org.instagram_url && (
                                    <ActionLink href={normalizeUrl(org.instagram_url)} target="_blank" rel="noreferrer"
                                        variant="orgIntro4">
                                        📷 인스타그램
                                    </ActionLink>
                                )}
                            </div>
                        )}

                        {/* 제출 CTA */}
                        <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/10 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-bold text-foreground">출국 일정이 있으신가요? 이 단체의 강아지 이동봉사에 함께해 주세요.</p>
                            <ActionLink as={Link} to={`/apply?org=${slug}`}
                                variant="orgIntro5">
                                🎁 이 단체로 봉사 티켓 제출하기
                            </ActionLink>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
