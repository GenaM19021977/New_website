/**
 * Компонент Header
 * 
 * Главный header сайта с тремя секциями:
 * 1. Верхняя секция - навигация и селектор валюты
 * 2. Средняя секция - логотип, ссылки и контакты
 * 3. Нижняя секция - каталог, поиск, пользователь и корзина
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../components/Header.css';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Avatar from '@mui/material/Avatar';
import Footer from './Footer';
import AuthModal from '../../components/modals/AuthModal';
import ProfileModal from '../../components/modals/ProfileModal';
import api from '../../services/api';
import { STORAGE_KEYS, ROUTES } from '../../config/constants';
import { getAvatarUrl } from '../../utils/avatar';

export default function Header(props) {
    const { children } = props;

    // Состояние для управления открытием/закрытием модального окна авторизации
    const [authModalOpen, setAuthModalOpen] = useState(false);

    // Состояние для управления открытием/закрытием модального окна профиля
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Состояние для данных пользователя
    const [user, setUser] = useState(null);

    // Состояние для проверки авторизации
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /**
     * Функция для загрузки данных пользователя
     */
    const loadUserData = () => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
            api.get('me/')
                .then((response) => {
                    setUser(response.data);
                    setIsAuthenticated(true);
                })
                .catch((error) => {
                    console.error('Error fetching user data:', error);
                    // Если токен невалиден, очищаем состояние
                    if (error.response?.status === 401) {
                        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                });
        } else {
            setIsAuthenticated(false);
            setUser(null);
        }
    };

    /**
     * Получение данных текущего пользователя при монтировании компонента
     */
    useEffect(() => {
        loadUserData();

        // Проверка токена при изменении localStorage
        const handleStorageChange = () => {
            loadUserData();
        };

        window.addEventListener('storage', handleStorageChange);

        // Проверка каждую секунду (для отслеживания изменений в той же вкладке)
        const interval = setInterval(() => {
            const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (token && !user) {
                loadUserData();
            } else if (!token && user) {
                setIsAuthenticated(false);
                setUser(null);
            }
        }, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    /**
     * Обработчик открытия модального окна авторизации
     */
    const handleOpenAuthModal = () => {
        setAuthModalOpen(true);
    };

    /**
     * Обработчик закрытия модального окна авторизации
     */
    const handleCloseAuthModal = () => {
        setAuthModalOpen(false);
    };

    /**
     * Обработчик открытия модального окна профиля
     */
    const handleOpenProfileModal = () => {
        setProfileModalOpen(true);
    };

    /**
     * Обработчик закрытия модального окна профиля
     */
    const handleCloseProfileModal = () => {
        setProfileModalOpen(false);
    };

    /**
     * Обработчик обновления данных пользователя
     */
    const handleUserUpdate = (updatedUser) => {
        setUser(updatedUser);
        loadUserData(); // Перезагружаем данные для получения актуального аватара
    };

    return (
        <div className="header-wrapper">
            {/* Верхняя секция - навигация и валюта */}
            <div className="header-top">
                <div className="header-top-left">
                    <Link to={ROUTES.ABOUT} className="header-link">О нас</Link>
                    <Link to="/warranty" className="header-link">Гарантия</Link>
                    <Link to="/payment" className="header-link">Оплата</Link>
                    <Link to="/return" className="header-link">Возврат товара</Link>
                </div>
                <div className="header-top-right">
                    <span className="currency-selector">
                        руб. Валюта
                        <KeyboardArrowDownIcon className="dropdown-icon" />
                    </span>
                </div>
            </div>

            {/* Средняя секция - логотип и контакты */}
            <div className="header-middle">
                <div className="header-middle-left">
                    <Link to={ROUTES.HOME} className="logo">
                        <img
                            src="/images/logo-header.png"
                            alt="Kotelkv.by"
                            className="logo-image"
                        />
                    </Link>
                    <div className="header-middle-center">
                        <Link to="/new" className="header-link">Новинки</Link>
                        <Link to={ROUTES.DELIVERY} className="header-link">Доставка</Link>
                    </div>
                </div>
                <div className="header-middle-right">
                    <div className="phone-numbers">
                        <div className="phone-number">+375(44) 787 18 88</div>
                        <div className="phone-number">
                            +375(29) 235 31 00
                            <KeyboardArrowDownIcon className="dropdown-icon-small" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Нижняя секция - каталог, поиск, пользователь */}
            <div className="header-bottom">
                <button className="catalog-button">
                    <MenuIcon className="catalog-icon" />
                    <span>Каталог товаров</span>
                    <KeyboardArrowDownIcon className="dropdown-icon" />
                </button>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Поиск"
                        className="search-input"
                    />
                    <button className="search-button">
                        <SearchIcon />
                    </button>
                </div>

                <div className="header-bottom-right">
                    <div className="header-icons">
                        <button className="icon-button">
                            <CompareArrowsIcon />
                        </button>
                        <button className="icon-button">
                            <FavoriteBorderIcon />
                        </button>
                        <button className="icon-button cart-button">
                            <ShoppingCartIcon />
                            <span className="cart-badge">0</span>
                        </button>
                    </div>
                    <div className="divider"></div>
                    <div className="user-section">
                        {isAuthenticated && user ? (
                            <>
                                <div className="user-info">
                                    <div className="user-name">{user.first_name || ''}</div>
                                    <div className="user-surname">{user.last_name || ''}</div>
                                </div>
                                <Avatar
                                    src={getAvatarUrl(user.avatar)}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="user-avatar"
                                    onClick={handleOpenProfileModal}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {!user.avatar && ((user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'U')}
                                </Avatar>
                            </>
                        ) : (
                            <>
                                <PersonIcon className="user-icon" />
                                <div className="user-text">
                                    <button
                                        className="login-link-button"
                                        onClick={handleOpenAuthModal}
                                    >
                                        <h3>Войти в кабинет</h3>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Контент страницы */}
            <div className="header-content">
                {children}
            </div>

            {/* Footer */}
            <Footer />

            {/* Модальное окно авторизации/регистрации */}
            <AuthModal
                open={authModalOpen}
                onClose={() => {
                    handleCloseAuthModal();
                    // Обновление данных пользователя после закрытия модального окна
                    loadUserData();
                }}
            />

            {/* Модальное окно профиля */}
            {user && (
                <ProfileModal
                    open={profileModalOpen}
                    onClose={handleCloseProfileModal}
                    user={user}
                    onUserUpdate={handleUserUpdate}
                />
            )}
        </div>
    );
}

