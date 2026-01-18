/**
 * Настроенный экземпляр Axios для работы с API
 * 
 * Автоматически добавляет JWT токен в заголовки запросов для авторизованных endpoints.
 * Исключает публичные endpoints (register, login) из добавления токена.
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, PUBLIC_ENDPOINTS } from '../config/api';
import { STORAGE_KEYS } from '../config/constants';

// Создание настроенного экземпляра Axios
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
    }
});

/**
 * Interceptor для автоматического добавления JWT токена в заголовки запросов
 * 
 * Проверяет, является ли endpoint публичным (не требует авторизации).
 * Если endpoint не публичный, добавляет access_token из localStorage в заголовок Authorization.
 */
api.interceptors.request.use(
    (config) => {
        // Если данные FormData, не устанавливаем Content-Type (браузер установит автоматически)
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // Проверка, является ли endpoint публичным
        const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => config.url?.includes(endpoint));

        // Если endpoint не публичный, добавляем токен авторизации
        if (!isPublicEndpoint) {
            const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (token) {
                // Добавление токена в заголовок Authorization в формате "Bearer <token>"
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        // Обработка ошибок при настройке запроса
        return Promise.reject(error);
    }
);

export default api;

