/**
 * Сервис курсов валют НБРБ (Национальный банк Республики Беларусь)
 * Базовая валюта: BYN. Курсы: 1 USD = X BYN, 100 RUB = X BYN, 1 EUR = X BYN
 */

const NBRB_API = "https://api.nbrb.by/exrates/rates?periodicity=0";

/** Коды валют в API НБРБ */
const CURRENCY_IDS = { USD: 431, EUR: 451, RUB: 456 };

/**
 * Загружает курсы валют с API НБРБ
 * @returns {Promise<{USD: {rate: number, scale: number}, EUR: {...}, RUB: {...}}>}
 */
export async function fetchExchangeRates() {
  try {
    const res = await fetch(NBRB_API);
    if (!res.ok) throw new Error("NBRB API error");
    const data = await res.json();
    const result = {};
    for (const item of data) {
      if (item.Cur_Abbreviation === "USD") {
        result.USD = { rate: item.Cur_OfficialRate, scale: item.Cur_Scale || 1 };
      } else if (item.Cur_Abbreviation === "EUR") {
        result.EUR = { rate: item.Cur_OfficialRate, scale: item.Cur_Scale || 1 };
      } else if (item.Cur_Abbreviation === "RUB") {
        result.RUB = { rate: item.Cur_OfficialRate, scale: item.Cur_Scale || 100 };
      }
    }
    return result;
  } catch (e) {
    console.warn("Exchange rates fetch failed:", e);
    return getFallbackRates();
  }
}

/** Резервные курсы при недоступности API */
function getFallbackRates() {
  return {
    USD: { rate: 3.27, scale: 1 },
    EUR: { rate: 3.52, scale: 1 },
    RUB: { rate: 3.45, scale: 100 },
  };
}

/**
 * Конвертирует сумму из BYN в целевую валюту
 * @param {number} amountInBYN - сумма в белорусских рублях
 * @param {string} targetCurrency - BYN | RUB | USD | EUR
 * @param {Object} rates - объект с курсами от fetchExchangeRates
 * @returns {number}
 */
export function convertFromBYN(amountInBYN, targetCurrency, rates) {
  if (targetCurrency === "BYN" || !amountInBYN || isNaN(amountInBYN)) {
    return amountInBYN;
  }
  if (!rates || !rates[targetCurrency]) return amountInBYN;
  const { rate, scale } = rates[targetCurrency];
  const ratePerUnit = rate / scale;
  return amountInBYN / ratePerUnit;
}
