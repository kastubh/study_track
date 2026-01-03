import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxy in vite.config.js handles this
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh (simplified)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                // Call refresh endpoint (not implemented in backend yet, but structure is here)
                // const res = await axios.post('/api/auth/refresh', { refreshToken });
                // if (res.status === 200) {
                //    localStorage.setItem('accessToken', res.data.accessToken);
                //    api.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.accessToken;
                //    return api(originalRequest);
                // }
            } catch (refreshError) {
                // Logout if refresh fails
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
