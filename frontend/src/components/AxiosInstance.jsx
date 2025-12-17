import axios from 'axios'

const baseURL = 'http://127.0.0.1:8000/'

const AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers:{
        'Content-Type':'application/json',
        accept: 'application/json',
    }
})

// Добавляем interceptor для автоматического добавления токена в заголовки
// Но не добавляем токен для публичных endpoints (register, login)
AxiosInstance.interceptors.request.use(
    (config) => {
        // Публичные endpoints, для которых не нужен токен
        const publicEndpoints = ['register/', 'login/']
        const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))
        
        if (!isPublicEndpoint) {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
            }
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default AxiosInstance