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
AxiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default AxiosInstance