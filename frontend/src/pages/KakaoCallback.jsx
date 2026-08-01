import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function KakaoCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { completeKakaoLogin } = useAuth();
    const [loginError, setLoginError] = useState(null);
    const attempted = useRef(false);

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hasParams = Boolean(code && state);

    useEffect(() => {
        if (!hasParams) return;
        // 카카오 code는 한 번만 쓸 수 있다. StrictMode의 이중 실행을 막지 않으면
        // 두 번째 호출이 502로 실패한다.
        if (attempted.current) return;
        attempted.current = true;

        completeKakaoLogin(code, state)
            .then(() => navigate('/', { replace: true }))
            .catch(() => setLoginError('카카오 로그인에 실패했습니다. 다시 시도해주세요.'));
    }, [hasParams, code, state, completeKakaoLogin, navigate]);

    // 파라미터 누락은 렌더 중에 판정한다. effect 안에서 setState 하면
    // 불필요한 연쇄 렌더가 생긴다.
    const message = hasParams ? loginError : '로그인 정보가 올바르지 않습니다.';

    if (message) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
                <p className="text-sm font-medium text-destructive text-center">{message}</p>
                <button
                    type="button"
                    onClick={() => navigate('/', { replace: true })}
                    className="text-sm font-bold text-primary hover:underline"
                >
                    처음으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-sm text-muted-foreground">로그인 중입니다...</p>
        </div>
    );
}
