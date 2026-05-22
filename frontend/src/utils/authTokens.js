import { STORAGE_KEYS } from "../config/constants";
import { dispatchAuthChanged } from "./authEvents";

/** Сохраняет JWT из ответа login/register/google. */
export function saveAuthTokens(data) {
  if (data?.access) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  }
  if (data?.refresh) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
  }
  dispatchAuthChanged();
}
