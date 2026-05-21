/**
 * @file Глобальные константы фронтенда.
 *
 * Здесь: ключи localStorage, маршруты React Router, сообщения валидации, списки стран,
 * а также SHOP_LOCATION — юридический/фактический адрес магазина для доставки и подписей на сайте.
 */

// Ключи для localStorage
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    CURRENCY: 'turiki_currency',
};

/** Имя события window: смена access/refresh токена в этой вкладке (вход/выход). */
export const AUTH_CHANGED_EVENT = "turiki-auth-changed";

// Доступные валюты
export const CURRENCIES = ['BYN', 'RUB', 'USD', 'EUR'];

// Маршруты приложения
export const ROUTES = {
    HOME: '/home',
    ABOUT: '/about',
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    CATALOG: '/catalog',
    PRODUCT: '/catalog/:id',
    productById: (id) => `/catalog/${id}`,
    BRANDS: '/brands',
    BRAND: '/brands/:slug',
    brandBySlug: (slug) => `/brands/${slug}`,
    CONTACTS: '/contacts',
    CABINET: '/cabinet',
    /** История заказов (из личного кабинета) */
    MY_ORDERS: '/cabinet/orders',
    CART: '/cart',
    CHECKOUT: '/checkout',
    FAVORITES: '/favorites',
};

// Сообщение для неавторизованных при покупке
export const AUTH_REQUIRED_PURCHASE = "Для совершения покупки в нашем магазине зарегистрируйтесь или авторизуйтесь!";

// Сообщение для неавторизованных при просмотре избранного
export const AUTH_REQUIRED_FAVORITES = "Для просмотра избранного зарегистрируйтесь или авторизуйтесь!";

// Сообщение для неавторизованных при переходе в историю заказов
export const AUTH_REQUIRED_ORDERS =
  "Для перехода в историю заказов зарегистрируйтесь или авторизуйтесь!";

// Сообщение для неавторизованных в блоке «Задайте Ваш вопрос»
export const AUTH_REQUIRED_QUESTION =
  "Чтобы задать вопрос, зарегистрируйтесь или авторизуйтесь!";

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

/**
 * Географическая привязка магазина (точка отправления для курьерской доставки).
 *
 * label — строка для подписи «От:» на checkout и прочих подписей адреса.
 * lat, lon — WGS84 для расчёта расстояния по прямой до точки доставки (гаверсинус после геокодинга).
 */
export const SHOP_LOCATION = {
    label: 'Беларусь, г. Брест, ул. Гоголя, 89',
    lat: 52.09755,
    lon: 23.73485,
};

