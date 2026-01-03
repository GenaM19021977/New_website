/**
 * Компонент защищенного маршрута
 * 
 * Проверяет наличие JWT токена в localStorage.
 * Если токен отсутствует, перенаправляет пользователя на страницу логина.
 * Если токен присутствует, отображает дочерние компоненты через <Outlet />.
 */

import { Outlet, Navigate } from "react-router-dom";

const ProtectedRoute = () => {
    // Проверка наличия access токена в localStorage
    const token = localStorage.getItem('access_token')

    // Если токен есть - отображаем защищенный контент, иначе перенаправляем на логин
    return (
        token ? <Outlet /> : <Navigate to="/login" />
    )
}

export default ProtectedRoute