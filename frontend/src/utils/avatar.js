/**
 * Утилиты для работы с аватарами
 * 
 * Функции для обработки URL аватаров пользователей
 */

import { API_BASE_URL } from '../config/api';

/**
 * Получение полного URL аватара пользователя
 * 
 * @param {string|null|undefined} avatar - URL аватара (может быть относительным или абсолютным)
 * @returns {string|undefined} Полный URL аватара или undefined если аватар отсутствует
 */
export const getAvatarUrl = (avatar) => {
    if (!avatar) return undefined;

    // Если URL уже абсолютный (начинается с http), возвращаем как есть
    if (avatar.startsWith('http')) {
        return avatar;
    }

    // Если относительный URL, добавляем базовый URL API
    const baseUrl = API_BASE_URL.endsWith('/')
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;

    const avatarPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
    return `${baseUrl}${avatarPath}`;
};

