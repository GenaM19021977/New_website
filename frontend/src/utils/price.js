/**
 * Утилиты для форматирования цен
 */

/** Извлекает число из строки цены (например "12 500 руб." → 12500) */
export function parsePrice(priceStr) {
  if (priceStr == null || priceStr === "") return 0;
  const s = String(priceStr).replace(/\s/g, "");
  const m = s.match(/[\d.,]+/);
  if (!m) return 0;
  return parseFloat(m[0].replace(",", ".")) || 0;
}

/** Форматирует число как цену (12500.5 → "12 500,50") */
export function formatPrice(num) {
  if (num == null || isNaN(num)) return "";
  const fixed = num.toFixed(2).replace(".", ",");
  const [intPart, decPart] = fixed.split(",");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decPart ? `${formatted},${decPart}` : formatted;
}

/**
 * Форматирует цену с указанием валюты. Конвертирует из BYN если передан convertPrice.
 * Если в значении нет ни одной цифры (например "По запросу", "Цена уточняется"),
 * возвращает этот текст как есть — для отображения в карточке товара.
 */
export function formatPriceWithCurrency(priceStrOrNum, currency, convertPrice) {
  if (priceStrOrNum == null || priceStrOrNum === "") return "";
  if (typeof priceStrOrNum === "number") {
    let num = priceStrOrNum;
    if (convertPrice && typeof convertPrice === "function") num = convertPrice(num);
    const formatted = formatPrice(num);
    return formatted ? `${formatted} ${currency || "BYN"}` : "";
  }
  const s = String(priceStrOrNum).trim();
  if (!s) return "";
  if (!/\d/.test(s)) return s; // в базе текст без цифр — показываем как есть
  let num = parsePrice(priceStrOrNum);
  if (convertPrice && typeof convertPrice === "function") num = convertPrice(num);
  const formatted = formatPrice(num);
  return formatted ? `${formatted} ${currency || "BYN"}` : "";
}
