/**
 * Компонент Footer
 * 
 * Подвал сайта со следующими секциями:
 * 1. Верхняя секция - подписка на рассылку
 * 2. Основной контент - 4 колонки (Информация о компании, Информация, Категории, Личный кабинет)
 * 3. Нижняя секция - способы оплаты, копирайт, социальные сети
 * 4. Плавающие кнопки - чат, телефон, прокрутка вверх
 */

import { Link } from 'react-router-dom';
import './Footer.css';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MenuIcon from '@mui/icons-material/Menu';
import { ROUTES } from '../../config/constants';
import logoHeader from '../../images/logo-header.png';
import iconVk from '../../images/img_social/free-icon-vk-2504953.png';
import iconFacebook from '../../images/img_social/free-icon-facebook-2504903.png';
import iconWhatsapp from '../../images/img_social/free-icon-whatsapp-2504957.png';
import iconInstagram from '../../images/img_social/free-icon-instagram-1409946.png';

export default function Footer() {
    // Функция для прокрутки страницы вверх
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <footer className="footer-wrapper" role="contentinfo">
            {/* Верхняя секция - подписка на рассылку
            <div className="footer-subscribe">
                <div className="subscribe-content">
                    <MailOutlineIcon className="subscribe-icon" />
                    <div className="subscribe-text">
                        <p>Хотите быть в курсе всех акций и скидок? Подпишитесь на нашу рассылку</p>
                        <div className="subscribe-form">
                            <input
                                type="email"
                                placeholder="Введите ваш e-mail"
                                className="subscribe-input"
                            />
                            <button className="subscribe-button">Подписаться</button>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Основной контент - 4 колонки */}
            <div className="footer-main">
                <div className="footer-container">
                    {/* Левая колонка - Информация о компании */}
                    <div className="footer-column footer-column-company">
                        <h3 className="footer-column-title">
                            <span className="footer-title-icon" aria-hidden>■</span>
                            Контакты
                        </h3>
                        {/* <Link to={ROUTES.HOME} className="footer-logo"> */}
                            {/* <img
                                src={logoHeader}
                                alt="Kotelkov.by"
                                className="footer-logo-image"
                            /> */}
                        {/* </Link> */}
                        <div className="company-info">
                            <p>ИП Турков Д.А</p>
                            <p>УНП 291600425</p>
                            <p>Интернет магазин зарегистрирован в торговом реестре №510218 18 мая 2021</p>
                        </div>
                        <div className="contact-info">
                            <div className="contact-item">
                                <PhoneIcon className="contact-icon" />
                                <a href="tel:+375292353100">+375(29) 235 31 00</a>
                            </div>
                            <div className="contact-item">
                                <PhoneIcon className="contact-icon" />
                                <a href="tel:+375447871888">+375(44) 787 18 88</a>
                            </div>
                            <div className="contact-item">
                                <EmailIcon className="contact-icon" />
                                <a href="mailto:info@kotelkov.by">info@kotelkov.by</a>
                            </div>
                            <div className="contact-item">
                                <LocationOnIcon className="contact-icon" />
                                <span>г. Брест ул. Гоголя 89 Пн - Вс с 9-00 до 19-00</span>
                            </div>
                        </div>
                        {/* <div className="footer-links">
                            <Link to="/promotion" className="footer-link-single">Продвижение сайта&gt;</Link>
                            <a href="https://t.me/kotelkovby" className="footer-link-single">
                                <SendIcon className="footer-link-icon" />
                                telegram
                            </a>
                        </div> */}
                    </div>

                    <div className="footer-column">
                        <h3 className="footer-column-title">
                            <span className="footer-title-icon" aria-hidden>■</span>
                            Информация
                        </h3>
                        <ul className="footer-links-list">
                            {/* <li><Link to="/installation">Монтаж отопления в Бресте</Link></li> */}
                            <li><Link to={ROUTES.ABOUT}>О нас</Link></li>
                            <li><Link to={ROUTES.CATALOG}>Каталог</Link></li>
                            <li><Link to={ROUTES.SELECTION}>Подбор</Link></li>
                            <li><Link to={ROUTES.BRANDS}>Бренды</Link></li>
                            <li><Link to={ROUTES.CONTACTS}>Контакты</Link></li>
                            {/* <li><Link to="/order">Оформление заказа</Link></li>
                            <li><Link to="/privacy">Политика безопасности</Link></li>
                            <li><Link to="/offer">Публичная оферта</Link></li>
                            <li><Link to="/terms">Условия соглашения</Link></li>
                            <li><Link to="/contact">Связаться с нами</Link></li>
                            <li><Link to="/manufacturers">Производители</Link></li>
                            <li><Link to="/promotions">Акции</Link></li> */}
                        </ul>
                    </div>

                    {/* Средняя-правая колонка - Категории
                    <div className="footer-column">
                        <h3 className="footer-column-title">
                            <MenuIcon className="footer-title-icon" />
                            Категории
                        </h3>
                        <ul className="footer-links-list">
                            <li><Link to="/category/automation">Автоматика и электроника</Link></li>
                            <li><Link to="/category/water-heaters">Водонагреватели и ёмкости</Link></li>
                            <li><Link to="/category/boilers">Котлы в Бресте</Link></li>
                            <li><Link to="/category/pumps">Насосное оборудование</Link></li>
                            <li><Link to="/category/heating">Отопительное оборудование</Link></li>
                            <li><Link to="/category/expansion-tanks">Расширительные баки</Link></li>
                            <li><Link to="/category/plumbing">Сантехника</Link></li>
                            <li><Link to="/category/pipes">Трубы и фитинги</Link></li>
                        </ul>
                    </div> */}

                    {/* Правая колонка - Личный кабинет */}
                    <div className="footer-column">
                        <h3 className="footer-column-title">
                            <span className="footer-title-icon">■</span>
                            Личный кабинет
                        </h3>
                        <ul className="footer-links-list">
                            <li><Link to={ROUTES.CABINET}>Личный кабинет</Link></li>
                            <li><Link to={ROUTES.FAVORITES}>Избранное</Link></li>
                            <li><Link to="/orders">История заказа</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Нижняя секция */}
            <div className="footer-bottom">
                <div className="footer-bottom-container">
                    {/* Способы оплаты */}
                    <div className="payment-methods">
                        {/* <span className="payment-text">Способы оплаты:</span> */}
                        <div className="payment-logos">
                            {/* Здесь должны быть изображения логотипов платежных систем */}
                            {/* <span className="payment-logo">Visa</span>
                            <span className="payment-logo">Mastercard</span>
                            <span className="payment-logo">Maestro</span>
                            <span className="payment-logo">Belkart</span>
                            <span className="payment-logo">Assist</span> */}
                        </div>
                    </div>

                    {/* Копирайт */}
                    <div className="footer-copyright">
                        <p>Отопительное оборудование в Бресте - Kotelkov.by © 2025</p>
                        <p>Создание и продвижение сайта - InternetSozdateli</p>
                    </div>

                    {/* Социальные сети */}
                    <div className="social-icons">
                        <a href="https://vk.com/kotelkovby" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте">
                            <img src={iconVk} alt="VK" className="social-icon__img" />
                        </a>
                        <a href="https://facebook.com/kotelkovby" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <img src={iconFacebook} alt="Facebook" className="social-icon__img" />
                        </a>
                        <a href="https://wa.me/375447871888" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <img src={iconWhatsapp} alt="WhatsApp" className="social-icon__img" />
                        </a>
                        <a href="https://instagram.com/kotelkovby" className="social-icon" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <img src={iconInstagram} alt="Instagram" className="social-icon__img" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Плавающие кнопки */}
            <div className="floating-buttons">
                <button className="floating-button floating-button-top" onClick={scrollToTop}>
                    <KeyboardArrowUpIcon />
                </button>
            </div>
        </footer>
    );
}
