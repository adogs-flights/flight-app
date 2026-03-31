import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const apiClient = axios.create({
    baseURL: '/api'
});

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

    // --- 🔒 토큰 갱신 로직 ---
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
        failedQueue.forEach(prom => {
            if (error) { prom.reject(error); }
            else { prom.resolve(token); }
        });
        failedQueue = [];
    };

    apiClient.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                    .then(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return apiClient(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    logout();
                    return Promise.reject(error);
                }

                try {
                    const response = await axios.post('/api/refresh', { refresh_token: refreshToken });
                    const { access_token, refresh_token: newRefreshToken } = response.data;

                    localStorage.setItem('token', access_token);
                    localStorage.setItem('refresh_token', newRefreshToken);
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                    
                    processQueue(null, access_token);
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    logout();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
            return Promise.reject(error);
        }
    );

    useEffect(() => {
        if (import.meta.env.DEV) return; // 개발 모드 패스

        const token = localStorage.getItem('token');
        if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            apiClient.get('/users/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    // 엑세스 토큰 실패 시 인터셉터가 갱신을 시도하겠지만, 
                    // 초기 로드 실패는 리프레시 토큰이 없을 확률이 큼
                    localStorage.removeItem('token');
                    delete apiClient.defaults.headers.common['Authorization'];
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const fetchStaticData = async () => {
        try {
            if (airlines.length === 0) {
                const airRes = await apiClient.get('/static/airlines');
                setAirlines(airRes.data);
            }
            if (airports.length === 0) {
                const portRes = await apiClient.get('/static/airports');
                setAirports(portRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch static data", error);
        }
    };

    const login = async (email, password) => {
        const response = await apiClient.post('/token', new URLSearchParams({
            username: email,
            password: password
        }));
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
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
        delete apiClient.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, apiClient, airlines, airports, fetchStaticData }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
