/**
 * Утилиты для работы с корзиной (localStorage)
 * Корзина привязана к user_id — у каждого пользователя своя корзина.
 */
import { STORAGE_KEYS, AUTH_REQUIRED_PURCHASE } from "../config/constants";

const CART_KEY_PREFIX = "turiki_cart_";

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

function getCartStorageKey() {
  const userId = getUserIdFromToken();
  return userId != null ? `${CART_KEY_PREFIX}${userId}` : null;
}

export function getCart() {
  const key = getCartStorageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCart(items) {
  const key = getCartStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  } catch (e) {
    console.error("Cart setCart error:", e);
  }
}

/** Проверяет, авторизован ли пользователь (есть access_token). */
export function isAuth() {
  return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Добавляет товар в корзину только если пользователь авторизован.
 * Иначе показывает сообщение и возвращает false.
 */
export function addToCartIfAuth(product, quantity = 1) {
  if (!isAuth()) {
    alert(AUTH_REQUIRED_PURCHASE);
    return false;
  }
  addToCart(product, quantity);
  return true;
}

export function addToCart(product, quantity = 1) {
  const items = getCart();
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + quantity;
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image_1: product.image_1,
      product_url: product.product_url,
    });
  }
  setCart(items);
}

export function removeFromCart(productId) {
  setCart(getCart().filter((i) => i.id !== productId));
}

export function updateQuantity(productId, quantity) {
  const items = getCart();
  const item = items.find((i) => i.id === productId);
  if (!item) return;
  item.quantity = quantity < 1 ? 0 : quantity;
  setCart(items);
}

export function clearCart() {
  setCart([]);
}

export function getCartCount() {
  return getCart().reduce((sum, i) => sum + (i.quantity || 1), 0);
}
