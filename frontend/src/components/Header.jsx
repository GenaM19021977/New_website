/**
 * Компонент Header
 * 
 * Главный header сайта с тремя секциями:
 * 1. Верхняя секция - навигация и селектор валюты
 * 2. Средняя секция - логотип, ссылки и контакты
 * 3. Нижняя секция - каталог, поиск, пользователь и корзина
 */

import { Link } from 'react-router-dom';
import './Header.css';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Footer from './Footer';

export default function Header(props) {
    const { content } = props;

    return (
        <div className="header-wrapper">
            {/* Верхняя секция - навигация и валюта */}
            <div className="header-top">
                <div className="header-top-left">
                    <Link to="/about" className="header-link">О нас</Link>
                    <Link to="/warranty" className="header-link">Гарантия</Link>
                    <Link to="/delivery" className="header-link">Доставка</Link>
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
                    <Link to="/home" className="logo">
                        <img
                            src="/images/logo-header.png"
                            alt="Kotelkv.by"
                            className="logo-image"
                        />
                    </Link>
                    <div className="header-middle-center">
                        <Link to="/new" className="header-link">Новинки</Link>
                        <Link to="/delivery" className="header-link">Доставка</Link>
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
                    <div className="user-section">
                        <PersonIcon className="user-icon" />
                        <div className="user-text">
                            <span>Здравствуйте,</span>
                            <Link to="/login" className="login-link">войдите в кабинет</Link>
                        </div>
                    </div>

                    <div className="divider"></div>

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
                </div>
            </div>

            {/* Контент страницы */}
            <div className="header-content">
                {content}
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
