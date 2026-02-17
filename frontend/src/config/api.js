/**
 * Конфигурация API
 * 
 * Настройки для работы с backend API
 */

// Базовый URL backend API (для CRA: REACT_APP_API_BASE_URL в .env)
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/';

// Таймаут запросов (в миллисекундах)
export const API_TIMEOUT = 5000;

// Публичные endpoints, для которых не требуется токен авторизации
export const PUBLIC_ENDPOINTS = ['register/', 'login/', 'manufacturers/', 'boilers/'];

