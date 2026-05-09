import { AUTH_CHANGED_EVENT } from "../config/constants";

/** Уведомляет слушателей (в т.ч. Header), что токен изменился в этой вкладке. */
export function dispatchAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}
