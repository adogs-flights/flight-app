import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api';
import { MAJOR_AIRPORTS } from '../utils/airportUtils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 로그인/회원가입 플로우를 실제로 테스트하려면 DEV에서도 실인증을 태워야 한다.
    // (예전엔 DEV에서 관리자 계정을 하드코딩해 항상 로그인 상태였다)
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
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

    const registerOrg = async (payload) => {
        // 단체 자율 회원가입. 성공해도 승인 대기 상태라 로그인시키지 않는다.
        await apiClient.post('/auth/register-org', payload);
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

    const refreshUser = useCallback(async () => {
        // 프로필·단체 소개 등을 수정한 뒤 user 정보를 다시 읽어 전역에 반영한다.
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
        return userResponse.data;
    }, []);

    const deleteAccount = async () => {
        // 본인 탈퇴: 계정을 삭제하고 로그아웃 상태로 전환한다.
        await apiClient.delete('/users/me');
        setUser(null);
    };

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
        <AuthContext.Provider value={{ user, login, logout, deleteAccount, registerOrg, startKakaoLogin, completeKakaoLogin, refreshUser, loading, apiClient, airlines, airports, rawAirports, fetchStaticData }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
