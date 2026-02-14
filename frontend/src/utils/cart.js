/**
 * Утилиты для работы с корзиной (localStorage)
 */

const CART_KEY = "turiki_cart";

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  } catch (e) {
    console.error("Cart setCart error:", e);
  }
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
