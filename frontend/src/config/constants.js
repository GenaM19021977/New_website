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
    CATALOG: '/catalog',
    PRODUCT: '/catalog/:id',
    productById: (id) => `/catalog/${id}`,
    SELECTION: '/selection',
    BRANDS: '/brands',
    CONTACTS: '/contacts',
    CABINET: '/cabinet',
};

// Валидация телефона: + и ровно 12 цифр
export const PHONE_REGEX = /^\+[0-9]{12}$/;
export const PHONE_ERROR = "Некорректный ввод номера телефона.";

// Валидация email: обязательно наличие @
export const EMAIL_ERROR = "Некорректный адрес электронной почты!";
export const EMAIL_EXISTS_ERROR = "Пользователь с таким адресом электронной почты уже зарегистрирован!";

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

