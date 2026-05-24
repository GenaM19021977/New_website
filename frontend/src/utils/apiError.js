/**
 * Текст ошибки из ответа Axios для показа пользователю.
 */
export function getApiErrorMessage(error, fallback) {
  if (!error?.response) {
    if (error?.code === "ECONNABORTED") {
      return "Превышено время ожидания ответа сервера. Попробуйте ещё раз.";
    }
    if (error?.message === "Network Error") {
      return (
        "Не удалось связаться с сервером. Убедитесь, что backend запущен " +
        "(python manage.py runserver) и адрес API в .env совпадает с ним."
      );
    }
    return fallback;
  }

  const data = error.response.data;
  if (typeof data?.detail === "string") {
    return data.detail;
  }
  if (typeof data?.message === "string") {
    return data.message;
  }
  const firstKey = Object.keys(data || {})[0];
  if (firstKey && data[firstKey] != null) {
    const value = data[firstKey];
    return Array.isArray(value) ? value.join(", ") : String(value);
  }
  return fallback;
}
