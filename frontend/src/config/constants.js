/**
 * Константы приложения
 * 
 * Централизованное хранение констант для использования по всему приложению
 */

// Ключи для localStorage
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
};

// Маршруты приложения
export const ROUTES = {
    HOME: '/home',
    ABOUT: '/about',
    LOGIN: '/login',
    REGISTER: '/register',
    WARRANTY: '/warranty',
    DELIVERY: '/delivery',
    PAYMENT: '/payment',
    RETURN: '/return',
    NEW: '/new',
};

// Страны для выбора в профиле
export const COUNTRIES = [
    'Беларусь',
    'Россия',
    'Украина',
    'Казахстан',
    'Польша',
    'Литва',
    'Латвия',
    'Эстония',
    'Другая'
];

