/**
 * Конфигурация API
 * 
 * Настройки для работы с backend API
 */

// Базовый URL backend API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/';

// Таймаут запросов (в миллисекундах)
export const API_TIMEOUT = 5000;

// Публичные endpoints, для которых не требуется токен авторизации
export const PUBLIC_ENDPOINTS = ['register/', 'login/'];

