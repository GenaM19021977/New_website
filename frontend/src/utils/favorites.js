/**
 * Утилиты для работы с избранным (localStorage)
 * Избранное привязано к user_id — у каждого пользователя свой список.
 */
import { STORAGE_KEYS } from "../config/constants";

const FAVORITES_KEY_PREFIX = "turiki_favorites_";

/** Извлекает user_id из JWT access_token. */
function getUserIdFromToken() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return payload.user_id ?? null;
  } catch {
    return null;
  }
}

function getFavoritesStorageKey() {
  const userId = getUserIdFromToken();
  return userId != null ? `${FAVORITES_KEY_PREFIX}${userId}` : null;
}

export function getFavorites() {
  const key = getFavoritesStorageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(items) {
  const key = getFavoritesStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("favorites-updated"));
  } catch (e) {
    console.error("Favorites setFavorites error:", e);
  }
}

/** Проверяет, есть ли товар в избранном. */
export function isInFavorites(productId) {
  return getFavorites().some((i) => i.id === productId);
}

/** Добавляет товар в избранное. Работает только для авторизованных. */
export function addToFavoritesIfAuth(product) {
  const key = getFavoritesStorageKey();
  if (!key) return false;
  const items = getFavorites();
  if (items.some((i) => i.id === product.id)) return true;
  items.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image_1: product.image_1,
    product_url: product.product_url,
  });
  setFavorites(items);
  return true;
}

export function addToFavorites(product) {
  const key = getFavoritesStorageKey();
  if (!key) return;
  const items = getFavorites();
  if (items.some((i) => i.id === product.id)) return;
  items.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image_1: product.image_1,
    product_url: product.product_url,
  });
  setFavorites(items);
}

export function removeFromFavorites(productId) {
  setFavorites(getFavorites().filter((i) => i.id !== productId));
}

export function getFavoritesCount() {
  return getFavorites().length;
}
