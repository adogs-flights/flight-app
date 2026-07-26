import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api';
import { MAJOR_AIRPORTS } from '../utils/airportUtils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(import.meta.env.DEV ? {
        id: "dev-user-id",
        name: "개발용 관리자",
        email: "dev@example.com",
        role: "admin"
    } : null);
    const [loading, setLoading] = useState(import.meta.env.DEV ? false : true);
    const [airlines, setAirlines] = useState([]);
    const [airports, setAirports] = useState([]);
    const [rawAirports, setRawAirports] = useState([]); // DB 원본 데이터 (색상 등 포함)

    const fetchStaticData = useCallback(async () => {
        try {
            const [airRes, portRes, masterRes] = await Promise.all([
                apiClient.get('/static/airlines'),
                apiClient.get('/static/airports'),
                apiClient.get('/master/airports')
            ]);

            setAirlines(airRes.data);
            
            // MAJOR_AIRPORTS를 상단으로 정렬
            const sortedAirports = [...portRes.data].sort((a, b) => {
                const aIdx = MAJOR_AIRPORTS.indexOf(a.value);
                const bIdx = MAJOR_AIRPORTS.indexOf(b.value);
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;
                return a.label.localeCompare(b.label);
            });
            setAirports(sortedAirports);
            setRawAirports(masterRes.data);
        } catch (error) {
            console.error("Failed to fetch static data", error);
        }
    }, []);

    useEffect(() => {
        // 앱 초기 로드 시 정적 데이터 가져오기
        fetchStaticData();

        if (import.meta.env.DEV) return; // 개발 모드 패스

        // 토큰이 HttpOnly 쿠키에 있어 JS가 존재 여부를 확인할 수 없다.
        // /users/me 성공 여부로만 로그인 상태를 판단한다.
        apiClient.get('/users/me')
            .then(response => setUser(response.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, [fetchStaticData]);

    const login = async (email, password) => {
        await apiClient.post('/token', new URLSearchParams({
            username: email,
            password: password
        }));
        // 쿠키가 심어졌다. 사용자 정보를 새로 읽는다.
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    };

    const startKakaoLogin = async () => {
        const response = await apiClient.get('/auth/kakao/login-url');
        // href에 대입하면 react-compiler가 "외부 변수 쓰기"로 잡는다. assign은 동일 동작.
        window.location.assign(response.data.authorize_url);
    };

    const completeKakaoLogin = useCallback(async (code, state) => {
        await apiClient.post('/auth/kakao', { code, state });
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    }, []);

    const logout = async () => {
        try {
            // refresh 토큰은 쿠키로 전달된다. 본문이 없다.
            await apiClient.post('/logout');
        } catch (e) {
            console.error("Logout from server failed", e);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, startKakaoLogin, completeKakaoLogin, loading, apiClient, airlines, airports, rawAirports, fetchStaticData }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
