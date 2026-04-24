import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api'
});

// Request Interceptor: 모든 요청에 토큰 자동 포함
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Google Drive Sync API
export const gdriveApi = {
    getStatus: () => apiClient.get('/gdrive/status'),
    connect: () => apiClient.get('/gdrive/connect'),
    disconnect: () => apiClient.delete('/gdrive/disconnect'),
    setupFolder: (folderName, autoCreate = true) => 
        apiClient.post(`/gdrive/setup-folder?folder_name=${encodeURIComponent(folderName)}&auto_create=${autoCreate}`),
    listFolders: () => apiClient.get('/gdrive/folders'),
    setFolder: (folderId) => apiClient.post(`/gdrive/set-folder?folder_id=${folderId}`),
};

export default apiClient;
