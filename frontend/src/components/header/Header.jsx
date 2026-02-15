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
import './Header.css';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Footer from '../footer/Footer';
import AuthModal from '../modals/AuthModal';
import api from '../../services/api';
import { STORAGE_KEYS, ROUTES, CURRENCIES } from '../../config/constants';
import { useCurrency } from '../../context/CurrencyContext';
import { getCartCount } from '../../utils/cart';
import { getFavoritesCount } from '../../utils/favorites';
import { getAvatarUrl } from '../../utils/avatar';

export default function Header(props) {
    const { children } = props;

    // Состояние для управления открытием/закрытием модального окна авторизации
    const [authModalOpen, setAuthModalOpen] = useState(false);

    // Состояние для данных пользователя
    const [user, setUser] = useState(null);

    // Состояние для проверки авторизации
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Состояние для управления адаптивным меню
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Список производителей котлов из БД для выпадающего меню «Каталог»
    const [manufacturers, setManufacturers] = useState([]);

    // Количество товаров в корзине
    const [cartCount, setCartCount] = useState(0);

    // Количество товаров в избранном
    const [favoritesCount, setFavoritesCount] = useState(0);

    // Выбранная валюта из контекста
    const { currency, setCurrency } = useCurrency();

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
     * Проверка размера экрана для адаптивного меню
     * Меню появляется когда ширина экрана меньше 768px
     */
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    /**
     * Обновление счётчика корзины
     */
    useEffect(() => {
        setCartCount(getCartCount());
        const handler = () => setCartCount(getCartCount());
        window.addEventListener('cart-updated', handler);
        return () => window.removeEventListener('cart-updated', handler);
    }, []);

    /**
     * Обновление счётчика избранного
     */
    useEffect(() => {
        setFavoritesCount(getFavoritesCount());
        const handler = () => setFavoritesCount(getFavoritesCount());
        window.addEventListener('favorites-updated', handler);
        return () => window.removeEventListener('favorites-updated', handler);
    }, []);

    /**
     * Загрузка списка производителей котлов из API для выпадающего меню «Каталог»
     */
    useEffect(() => {
        api.get('manufacturers/')
            .then((response) => {
                if (Array.isArray(response.data)) {
                    setManufacturers(response.data);
                }
            })
            .catch((err) => {
                console.error('Ошибка загрузки производителей:', err);
            });
    }, []);

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
     * Обработчик открытия адаптивного меню
     */
    const handleOpenMobileMenu = () => {
        setMobileMenuOpen(true);
    };

    /**
     * Обработчик закрытия адаптивного меню
     */
    const handleCloseMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const scrollToTop = () => window.scrollTo(0, 0);

    // Список пунктов меню для адаптивного меню
    const menuItems = [
        { label: 'О нас', path: ROUTES.ABOUT },
        { label: 'Каталог', path: ROUTES.CATALOG },
        { label: 'Подбор', path: ROUTES.SELECTION },
        { label: 'Бренды', path: ROUTES.BRANDS },
        { label: 'Контакты', path: ROUTES.CONTACTS },
        { label: 'Корзина', path: ROUTES.CART },
        { label: 'Избранное', path: ROUTES.FAVORITES },
        { label: isAuthenticated ? 'Личный кабинет' : 'Войти', path: isAuthenticated ? ROUTES.CABINET : ROUTES.LOGIN },
    ];

    return (
        <div className="header-wrapper">
            <header className="header-top">
                {/* Строка 1: Логотип, Поиск, Сравнение, Избранное, Валюта */}
                <div className="header-row header-row-1">
                    <Link to={ROUTES.HOME} className="header-logo" aria-label="На главную" title="На главную" onClick={scrollToTop}>
                        <svg width="450" height="100" viewBox="0 0 450 120" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">
                            <style>
                                {`.logo-main { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 34px; fill: #ffffff; letter-spacing: 0.75px; word-spacing: 0.375em; }
                                .logo-sub { font-family: 'Roboto', sans-serif; font-weight: 300; font-size: 17.6px; fill: #9FB0B8; }
                                .accent { fill: #C7A75A; }
                                .heat-dot { animation: logo-pulse 2s infinite; transform-origin: center; }
                                @keyframes logo-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.05); } }`}
                            </style>
                            <g transform="translate(20, 30)">
                                <rect x="0" y="20" width="40" height="30" rx="3" fill="#13232B" />
                                <polygon points="0,20 20,0 40,20" fill="#C7A75A" />
                                <g opacity="0.6">
                                    <circle cx="20" cy="50" r="25" fill="none" stroke="#C7A75A" strokeWidth="2" strokeDasharray="3,3" />
                                    <circle cx="20" cy="50" r="35" fill="none" stroke="#9FB0B8" strokeWidth="1.5" strokeDasharray="2,4" />
                                </g>
                                <circle cx="20" cy="35" r="8" fill="#C7A75A" className="heat-dot" opacity="0.9" />
                                <circle cx="20" cy="35" r="4" fill="#ffffff" />
                            </g>
                            <g transform="translate(80, 0)">
                                <text x="0" y="50" className="logo-main" textLength="360" lengthAdjust="spacing">
                                    <tspan className="accent">Тепло</tspan> в каждый дом
                                </text>
                                <text x="0" y="80" className="logo-sub" textLength="360" lengthAdjust="spacing">
                                    Современные системы электрического отопления
                                </text>
                                <line x1="0" y1="90" x2="360" y2="90" stroke="#C7A75A" strokeWidth="2" />
                                <g className="heat-dot">
                                    <circle cx="10" cy="100" r="3" fill="#C7A75A" />
                                    <circle cx="360" cy="100" r="3" fill="#C7A75A" />
                                    <circle cx="175" cy="100" r="4" fill="#9FB0B8" />
                                </g>
                            </g>
                        </svg>
                    </Link>
                    <div className="header-search">
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
                    </div>
                    <div className="header-row-1-right">
                        <Link
                            to={ROUTES.FAVORITES}
                            className="btn-site btn-favorites"
                            aria-label="Избранное"
                            onClick={scrollToTop}
                        >
                            <FavoriteBorderIcon className="btn-favorites-icon" />
                            <span>Избранное</span>
                            {favoritesCount > 0 && (
                                <span className="favorites-badge">{favoritesCount}</span>
                            )}
                        </Link>
                        <div className="currency-dropdown">
                            <button
                                type="button"
                                className="currency-selector btn-site"
                                aria-haspopup="listbox"
                                aria-expanded="false"
                                aria-label="Выбрать валюту"
                            >
                                {currency}. Валюта
                                <KeyboardArrowDownIcon className="dropdown-icon" />
                            </button>
                            <div className="currency-dropdown-panel" role="listbox">
                                {CURRENCIES.map((code) => (
                                    <button
                                        key={code}
                                        type="button"
                                        role="option"
                                        aria-selected={currency === code}
                                        className={`currency-dropdown-item ${currency === code ? 'currency-dropdown-item--active' : ''}`}
                                        onClick={() => setCurrency(code)}
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Строка 2: Навигация, Корзина, Вход в кабинет */}
                <div className="header-row header-row-2">
                    <div className="header-nav-row">
                        <IconButton
                            className="mobile-menu-button"
                            onClick={handleOpenMobileMenu}
                            sx={{ display: { xs: 'flex', md: 'none' } }}
                            aria-label="Открыть меню"
                        >
                            <MenuIcon />
                        </IconButton>
                        <Link to={ROUTES.HOME} className="logo logo-text" aria-label="На главную" onClick={scrollToTop}>
                            Домашняя
                        </Link>
                        <nav className="desktop-menu" aria-label="Основная навигация">
                            <Link to={ROUTES.ABOUT} className="header-link" onClick={scrollToTop}>О нас</Link>
                            <div className="header-catalog-dropdown">
                                <Link to={ROUTES.CATALOG} className="header-link header-link-with-dropdown" onClick={scrollToTop}>
                                    Каталог
                                    <KeyboardArrowDownIcon className="dropdown-icon-small" />
                                </Link>
                                <div className="header-catalog-dropdown-panel" role="list">
                                    <Link
                                        to={ROUTES.CATALOG}
                                        className="header-catalog-dropdown-item"
                                        role="listitem"
                                        onClick={scrollToTop}
                                    >
                                        Все товары
                                    </Link>
                                    {manufacturers.length > 0 ? manufacturers.map((m) => (
                                        <Link
                                            key={m.slug}
                                            to={`${ROUTES.CATALOG}?manufacturer=${encodeURIComponent(m.slug)}`}
                                            className="header-catalog-dropdown-item"
                                            role="listitem"
                                            onClick={scrollToTop}
                                        >
                                            {m.name}
                                        </Link>
                                    )) : null}
                                </div>
                            </div>
                            <Link to={ROUTES.SELECTION} className="header-link" onClick={scrollToTop}>Подбор</Link>
                            <Link to={ROUTES.BRANDS} className="header-link" onClick={scrollToTop}>Бренды</Link>
                            <Link to={ROUTES.CONTACTS} className="header-link" onClick={scrollToTop}>Контакты</Link>
                        </nav>
                    </div>
                    <div className="divider header-top-divider" aria-hidden />
                    <Link
                        to={ROUTES.CART}
                        className="icon-button cart-button header-top-cart"
                        aria-label="Корзина"
                        onClick={scrollToTop}
                    >
                        <ShoppingCartIcon />
                        <span className="cart-badge">{cartCount}</span>
                    </Link>
                    <div className="user-section header-top-user">
                        {isAuthenticated && user ? (
                            <Link
                                to={ROUTES.CABINET}
                                className="user-section-link"
                                onClick={scrollToTop}
                                aria-label="Личный кабинет"
                            >
                                <div className="user-info">
                                    <div className="user-name">{user.first_name || ''}</div>
                                    <div className="user-surname">{user.last_name || ''}</div>
                                </div>
                                <Avatar
                                    src={getAvatarUrl(user.avatar)}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="user-avatar"
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {!user.avatar && ((user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'U')}
                                </Avatar>
                            </Link>
                        ) : (
                            <>
                                <PersonIcon className="user-icon" />
                                <div className="user-text">
                                    <button
                                        type="button"
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
            </header>

            {/* Адаптивное меню (Drawer) */}
            <Drawer
                anchor="left"
                open={mobileMenuOpen}
                onClose={handleCloseMobileMenu}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                        backgroundColor: '#0B1419',
                        color: '#ffffff',
                    },
                    '& .MuiListItemButton-root': { color: '#9FB0B8' },
                    '& .MuiListItemButton-root:hover': { color: '#C7A75A', backgroundColor: 'rgba(199, 167, 90, 0.1)' },
                }}
            >
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                onClick={() => {
                                    scrollToTop();
                                    handleCloseMobileMenu();
                                }}
                            >
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>


            {/* Контент страницы */}
            {children}

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

        </div>
    );
}
