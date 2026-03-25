/**
 * @file Курьерская доставка: вспомогательные функции для расстояния и денежного расчёта.
 *
 * Расстояние «по прямой»:
 *   Используется, когда нет маршрута Яндекса или как запасной путь: геокодирование адреса
 *   через публичный Photon (komoot), затем формула гаверсинуса между SHOP_LOCATION и точкой доставки.
 *
 * Стоимость доставки:
 *   Берётся из тех же записей Django GET /delivery/, что показываются на странице «О нас»
 *   во вкладке «Доставка». Названия строк (title) задают смысл числа value_number — см. parseCourierTariffFromDeliveryItems.
 *
 * Типичная логика магазинов, реализованная здесь:
 *   - Пробег для оплаты округляется вверх до целых км («каждый начатый километр»).
 *   - Фиксированная часть + км × тариф, затем применяются минимум/максимум итога.
 *   - Опционально бесплатная доставка от суммы заказа.
 */

import { SHOP_LOCATION } from "../config/constants";

/**
 * Собирает одну строку запроса для геокодера (Photon) и для согласованности с полями формы.
 * Если страна не указана, подставляется «Беларусь», чтобы снизить неоднозначность (например, «Брест»).
 */
export function buildDeliveryGeocodeQuery(addr) {
  if (!addr) return "";
  const house =
    addr.house_number?.trim() &&
    `д. ${addr.house_number.trim()}${addr.building_number?.trim() ? `, корп. ${addr.building_number.trim()}` : ""}`;
  const country = (addr.country || "").trim();
  const parts = [
    country || "Беларусь",
    addr.region,
    addr.district,
    addr.city,
    addr.street,
    house,
    addr.apartment_number?.trim() && `кв. ${addr.apartment_number.trim()}`,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
}

/**
 * Расстояние между двумя точками на сфере (Земля ~6371 км радиус), результат в километрах.
 * Не учитывает дороги — только кратчайшую дугу по поверхности.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Прямой HTTP-запрос к Photon: первый feature в выдаче — координаты [lon, lat] в GeoJSON.
 */
export async function geocodeWithPhoton(query, signal) {
  const q = (query || "").trim();
  if (!q) throw new Error("empty query");
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=ru`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geocode http error");
  const data = await res.json();
  const f = data.features?.[0];
  if (!f?.geometry?.coordinates || f.geometry.coordinates.length < 2) {
    throw new Error("geocode not found");
  }
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon };
}

/** Безопасный разбор числа из API (строка с запятой или уже number). */
function toNum(raw) {
  if (raw == null || raw === "") return null;
  const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  return Number.isNaN(num) ? null : num;
}

/**
 * Преобразует список записей модели Delivery из бэкенда в параметры формулы стоимости.
 *
 * Правила сопоставления по подстрокам в title (регистр не важен):
 * - Есть «км» / «километр» / шаблон «за км» → ratePerKm (BYN за один тарифицируемый км).
 * - «бесплатн» и (доставк|курьер|заказ|свыше) → порог суммы заказа BYN, начиная с которого доставка 0.
 * - «минимальн» → нижняя граница итоговой платы за доставку после расчёта.
 * - «макс», «потолок», «не более» → верхняя граница итога.
 * - «базов», «подъезд», «выезд», «фиксир» (и нет отдельной строки с км) → фиксированная надбавка BYN к сумме км×тариф.
 *
 * Первая подходящая запись по каждому типу выигрывает (порядок списка — как отдал API, обычно sort_order).
 */
export function parseCourierTariffFromDeliveryItems(items) {
  const empty = {
    ratePerKm: null,
    fixedHandlingFee: 0,
    minDeliveryFee: null,
    maxDeliveryFee: null,
    freeDeliveryOrderMin: null,
  };
  if (!Array.isArray(items) || items.length === 0) return empty;

  let ratePerKm = null;
  let fixedHandlingFee = 0;
  let fixedSet = false;
  let minDeliveryFee = null;
  let maxDeliveryFee = null;
  let freeDeliveryOrderMin = null;

  for (const item of items) {
    const title = String(item.title || "").toLowerCase();
    const num = toNum(item.value_number);
    if (num == null) continue;

    const mentionsKm =
      title.includes("км") || title.includes("километр") || /\/\s*км|за\s*км/.test(title);

    if (mentionsKm) {
      if (ratePerKm == null) ratePerKm = num;
      continue;
    }

    if (
      title.includes("бесплатн") &&
      (title.includes("доставк") || title.includes("курьер") || title.includes("заказ") || title.includes("свыше"))
    ) {
      if (freeDeliveryOrderMin == null) freeDeliveryOrderMin = num;
      continue;
    }

    if (title.includes("минимальн")) {
      if (minDeliveryFee == null) minDeliveryFee = num;
      continue;
    }

    if (title.includes("макс") || title.includes("потолок") || title.includes("не более")) {
      if (maxDeliveryFee == null) maxDeliveryFee = num;
      continue;
    }

    if (/базов|подъезд|выезд|фиксир/.test(title)) {
      if (!fixedSet) {
        fixedHandlingFee = num;
        fixedSet = true;
      }
      continue;
    }
  }

  return {
    ratePerKm,
    fixedHandlingFee: Number(fixedHandlingFee) || 0,
    minDeliveryFee,
    maxDeliveryFee,
    freeDeliveryOrderMin,
  };
}

/** Округление денег до 2 знаков (копейки). */
function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Сколько полных «тарифных» километров выставить клиенту: ceil(факт), 0 если расстояние нулевое.
 * Используется вместе с фактическим расстоянием от Яндекса или по прямой.
 */
export function billableDistanceKm(actualKm) {
  const d = Math.max(0, Number(actualKm) || 0);
  if (d <= 0) return 0;
  return Math.ceil(d);
}

/**
 * Полная стоимость курьерской доставки и величина billableKm для подписи на экране.
 *
 * @param {number} actualDistanceKm — километры «как пришли» из маршрута или гаверсинуса
 * @param {ReturnType<typeof parseCourierTariffFromDeliveryItems>} tariff
 * @param {number} orderSubtotalByn — сумма товаров в корзине без доставки
 * @returns {{ amount: number, billableKm: number, isFreeByOrder: boolean } | null} null, если в админке не задан тариф за км
 */
export function computeCourierDeliveryQuote(actualDistanceKm, tariff, orderSubtotalByn) {
  if (!tariff || tariff.ratePerKm == null) return null;

  const order = Math.max(0, Number(orderSubtotalByn) || 0);
  if (
    tariff.freeDeliveryOrderMin != null &&
    order >= Number(tariff.freeDeliveryOrderMin)
  ) {
    const billableKm = billableDistanceKm(actualDistanceKm);
    return { amount: 0, billableKm, isFreeByOrder: true };
  }

  const billableKm = billableDistanceKm(actualDistanceKm);
  const rate = Number(tariff.ratePerKm) || 0;
  const fixed = Number(tariff.fixedHandlingFee) || 0;

  let subtotal = fixed + billableKm * rate;

  if (tariff.minDeliveryFee != null) {
    subtotal = Math.max(subtotal, Number(tariff.minDeliveryFee));
  }
  if (tariff.maxDeliveryFee != null) {
    subtotal = Math.min(subtotal, Number(tariff.maxDeliveryFee));
  }

  return {
    amount: roundMoney(subtotal),
    billableKm,
    isFreeByOrder: false,
  };
}

/**
 * @deprecated Предпочтительно computeCourierDeliveryQuote — там есть billableKm и флаг бесплатной доставки.
 */
export function computeCourierDeliveryCost(distanceKm, tariff, orderSubtotalByn = 0) {
  const q = computeCourierDeliveryQuote(distanceKm, tariff, orderSubtotalByn);
  return q ? q.amount : null;
}

/**
 * Километры по прямой от магазина (SHOP_LOCATION) до точки доставки по её широте/долготе.
 */
export function distanceFromShopKm(destLat, destLon) {
  return haversineDistanceKm(SHOP_LOCATION.lat, SHOP_LOCATION.lon, destLat, destLon);
}
