/**
 * Конфигурация API
 * 
 * Настройки для работы с backend API
 */

// Базовый URL backend API (для CRA: REACT_APP_API_BASE_URL в .env)
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/';

// Таймаут запросов (в миллисекундах)
export const API_TIMEOUT = 15000;

/** Таймаут для операций с отправкой email (SMTP может быть медленным). */
export const API_TIMEOUT_EMAIL = 30000;

// Публичные endpoints, для которых не требуется токен авторизации
export const PUBLIC_ENDPOINTS = [
    'register/',
    'login/',
    'password-reset/',
    'manufacturers/',
    'boilers/',
    'delivery/',
];

