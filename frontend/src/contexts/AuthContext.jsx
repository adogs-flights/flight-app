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

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            apiClient.get('/users/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
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
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    };

    const logout = () => {
        localStorage.removeItem('token');
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
