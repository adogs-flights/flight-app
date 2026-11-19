import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    // 토큰은 HttpOnly 쿠키로 오간다. 자바스크립트가 토큰을 다루지 않는다.
    // access가 만료되면 백엔드가 refresh 쿠키로 조용히 재발급하므로
    // 프론트에 재시도 인터셉터가 필요 없다.
    withCredentials: true
});

// Google Drive Sync API
export const gdriveApi = {
    getStatus: () => apiClient.get('/gdrive/status'),
    connect: () => apiClient.get('/gdrive/connect'),
    disconnect: () => apiClient.delete('/gdrive/disconnect'),
    setupFolder: (folderName) =>
        apiClient.post(`/gdrive/setup-folder?folder_name=${encodeURIComponent(folderName)}`),
};

// 사이드바 '새 내역' 표기용 활동 요약
export const activityApi = {
    getSidebar: () => apiClient.get('/activity/sidebar'),
};

export default apiClient;

export const pushApi = {
    status: () => apiClient.get('/push/status'),
    publicKey: () => apiClient.get('/push/public-key'),
    subscribe: subscription => apiClient.post('/push/subscriptions', subscription),
    subscriptionStatus: endpoint => apiClient.post('/push/subscription-status', { endpoint }),
    unsubscribe: endpoint => apiClient.delete('/push/subscriptions', { data: { endpoint } }),
    test: () => apiClient.post('/push/test'),
};
