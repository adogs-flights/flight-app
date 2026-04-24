import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api';
import { MAJOR_AIRPORTS } from '../utils/airportUtils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(import.meta.env.DEV ? {
        id: "dev-user-id",
        name: "개발용 관리자",
        email: "dev@example.com",
        admin_info: { approved: true }
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

        const token = localStorage.getItem('token');
        if (token) {
            apiClient.get('/users/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [fetchStaticData]);

    const login = async (email, password) => {
        const response = await apiClient.post('/token', new URLSearchParams({
            username: email,
            password: password
        }));
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                await apiClient.post('/logout', { refresh_token: refreshToken });
            } catch (e) {
                console.error("Logout from server failed", e);
            }
        }
        localStorage.removeItem('token');
        localStorage.setItem('refresh_token', ''); // Clear
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, apiClient, airlines, airports, rawAirports, fetchStaticData }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
