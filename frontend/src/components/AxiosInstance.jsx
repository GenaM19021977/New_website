/**
 * Настроенный экземпляр Axios для работы с API
 * 
 * Автоматически добавляет JWT токен в заголовки запросов для авторизованных endpoints.
 * Исключает публичные endpoints (register, login) из добавления токена.
 */

import axios from 'axios'

// Базовый URL backend API
const baseURL = 'http://127.0.0.1:8000/'

// Создание настроенного экземпляра Axios
const AxiosInstance = axios.create({
    baseURL: baseURL,  // Базовый URL для всех запросов
    timeout: 5000,  // Таймаут запроса (5 секунд)
    headers: {
        'Content-Type': 'application/json',  // Тип контента для отправки
        accept: 'application/json',  // Тип контента для получения
    }
})

/**
 * Interceptor для автоматического добавления JWT токена в заголовки запросов
 * 
 * Проверяет, является ли endpoint публичным (не требует авторизации).
 * Если endpoint не публичный, добавляет access_token из localStorage в заголовок Authorization.
 */
AxiosInstance.interceptors.request.use(
    (config) => {
        // Список публичных endpoints, для которых не нужен токен
        const publicEndpoints = ['register/', 'login/']
        const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))
        
        // Если endpoint не публичный, добавляем токен авторизации
        if (!isPublicEndpoint) {
            const token = localStorage.getItem('access_token')
            if (token) {
                // Добавление токена в заголовок Authorization в формате "Bearer <token>"
                config.headers.Authorization = `Bearer ${token}`
            }
        }
        return config
    },
    (error) => {
        // Обработка ошибок при настройке запроса
        return Promise.reject(error)
    }
)

export default AxiosInstance