/**
 * Страница "О нас" (About)
 * Данные для модального окна «Информация о доставке» загружаются из API (таблица Доставка).
 */
import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import iconDelivery from '../../../images/img_social/free-icon-fast-delivery-5465975.png';
import iconPayment from '../../../images/img_social/free-icon-money-box-14022258.png';
import api from '../../../services/api';
import './About.css';

const About = () => {
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  useEffect(() => {
    if (!deliveryModalOpen) return;
    setDeliveryLoading(true);
    setDeliveryError(null);
    api
      .get('delivery/')
      .then((res) => {
        setDeliveryItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setDeliveryError('Не удалось загрузить условия доставки.');
        setDeliveryItems([]);
      })
      .finally(() => setDeliveryLoading(false));
  }, [deliveryModalOpen]);

  const formatValue = (item) => {
    const hasNumber = item.value_number != null && item.value_number !== '';
    const hasText = item.value_text != null && String(item.value_text).trim() !== '';
    if (hasNumber && hasText) {
      return `${item.value_number} BYN — ${item.value_text}`;
    }
    if (hasNumber) return `${item.value_number} BYN`;
    if (hasText) return item.value_text;
    return null;
  };

  return (
    <main className="page-main about-page">
      <div className="page-container">
        <section className="page-section" id="about" aria-labelledby="about-heading">
          <span className="section-number" aria-hidden>02</span>
          <h1 id="about-heading" className="page-section-heading">
            О нас
          </h1>
          <p className="page-section-text">
            Это страница о Турковых. Мы занимаемся отопительным оборудованием в Бресте — котлы, доставка, монтаж, гарантия и сервис.
          </p>
          <div className="about-page-buttons">
            <button
              type="button"
              className="about-action-btn"
              aria-label="Оплата"
              onClick={() => setPaymentModalOpen(true)}
            >
              <img src={iconPayment} alt="" width={48} height={48} />
              <span>Оплата</span>
            </button>
            <button
              type="button"
              className="about-action-btn"
              aria-label="Доставка"
              onClick={() => setDeliveryModalOpen(true)}
            >
              <img src={iconDelivery} alt="" width={48} height={48} />
              <span>Доставка</span>
            </button>
          </div>
        </section>
      </div>

      <Dialog
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        maxWidth="sm"
        fullWidth
        className="about-delivery-modal"
        PaperProps={{ className: 'about-delivery-modal-paper' }}
      >
        <DialogTitle className="about-delivery-modal-title">
          Информация о доставке
          <IconButton
            aria-label="Закрыть"
            onClick={() => setDeliveryModalOpen(false)}
            className="about-delivery-modal-close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="about-delivery-modal-content">
          <h3 className="about-delivery-modal-heading">Условия доставки</h3>

          {deliveryLoading && (
            <p className="about-delivery-modal-loading">Загрузка…</p>
          )}
          {deliveryError && (
            <p className="about-delivery-modal-error">{deliveryError}</p>
          )}
          {!deliveryLoading && !deliveryError && deliveryItems.length === 0 && (
            <p className="about-delivery-modal-empty">Нет данных о доставке.</p>
          )}
          {!deliveryLoading && deliveryItems.length > 0 && (
            <ul className="about-delivery-modal-list about-delivery-modal-list--from-api">
              {deliveryItems.map((item) => {
                const valueStr = formatValue(item);
                return (
                  <li key={item.id} className="about-delivery-modal-item">
                    <span className="about-delivery-modal-item-title">{item.title}</span>
                    {valueStr != null && (
                      <span className="about-delivery-modal-item-value"> — {valueStr}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="about-delivery-modal-note">
            * Крупногабаритный товар — товар, размер которого в сумме трех измерений (высота, ширина, длина) превышает 150 см.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        maxWidth="sm"
        fullWidth
        className="about-payment-modal"
        PaperProps={{ className: 'about-payment-modal-paper' }}
      >
        <DialogTitle className="about-payment-modal-title">
          Оплата
          <IconButton
            aria-label="Закрыть"
            onClick={() => setPaymentModalOpen(false)}
            className="about-payment-modal-close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="about-payment-modal-content">
          <p className="about-payment-modal-lead">
            Оплата банковской картой VISA, MasterCard, БЕЛКАРТ через систему AssistBelarus
          </p>
          <p className="about-payment-modal-text">
            Оплата производится через интернет в режиме реального времени непосредственно после оформления заказа.
          </p>
          <p className="about-payment-modal-text">
            Для совершения финансовой операции подходят карточки международных платежных систем VISA (всех видов), MasterCard (в том числе Maestro), эмитированные любым банком мира, БЕЛКАРТ, American Express. При выборе оплаты заказа с помощью банковской карты, обработка платежа (включая ввод номера банковской карты) производится ООО «Компанией электронных платежей «АССИСТ» с использованием программно-аппаратного комплекса системы электронных платежей Assist Belarus, которая прошла международную сертификацию.
          </p>
          <p className="about-payment-modal-text">
            В системе, обеспечивающей безопасность платежей, используется защищённый протокол TLS для передачи конфиденциальной информации от клиента на сервер и дальнейшей обработки в процессинговом центре. Это значит, что конфиденциальные данные плательщика (реквизиты карты, регистрационные данные и др.) не поступают в интернет-магазин, их обработка полностью защищена, и никто не может получить персональные и банковские данные клиента. Кроме того, при обработке платежей по банковским картам, используется безопасная технология 3D-Secure и Белкарт ИнтернетПароль, которую в обязательном порядке требуют международные платёжные системы VISA, MasterCard и Белкарт.
          </p>
          <h4 className="about-payment-modal-heading">Порядок оплаты:</h4>
          <p className="about-payment-modal-text">
            Выбрать способ отплаты картой on-line.
          </p>
          <p className="about-payment-modal-text">
            После нажатия на кнопку «Подтвердить и оплатить» система направит вас на сайт провайдера электронных платежей belassist.by, обеспечивающего безопасность платежей. Авторизационный сервер устанавливает с покупателем соединение по защищённому протоколу TLS и принимает от покупателя параметры его банковской карты (номер карты, дата окончания действия карты, имя держателя карты в той транскрипции, как оно указано на банковской карте, а также номер CVC2 либо CVV2, указанные на обратной стороне карты). Операция оплаты банковской картой онлайн полностью конфиденциальна и безопасна.
          </p>
          <p className="about-payment-modal-text">
            Ваши персональные данные и реквизиты карточки вводятся не на странице нашего сайта, а на авторизационной странице платежной системы. Доступ к этим данным осуществляется по протоколу безопасной передачи данных TLS, также применяются технологии безопасных интернет-платежей Visa Secure, MasterCard ID Check и Белкарт ИнтернетПароль. К оплате принимаются карты платежных систем Visa, MasterCard, American Express, БЕЛКАРТ, эмитированные любыми банками мира. Мы рекомендуем заранее обратиться в свой банк, чтобы удостовериться в том, что ваша карта может быть использована для платежей в сети интернет.
          </p>
          <h4 className="about-payment-modal-heading">Причины отказа в авторизации могут быть следующими:</h4>
          <ul className="about-payment-modal-list">
            <li>на карте недостаточно средств для оплаты заказа;</li>
            <li>банк, выпустивший карточку покупателя, установил запрет на оплату в интернете;</li>
            <li>истекло время ожидания ввода данных банковской карты;</li>
            <li>введённые данные не были подтверждены вами на платежной странице, ошибка формата данных и.т.д.</li>
          </ul>
          <p className="about-payment-modal-text">
            В зависимости от причины отказа в авторизации для решения вопроса вы можете:
          </p>
          <ul className="about-payment-modal-list">
            <li>обратиться за разъяснениями в банк, выпустивший карточку покупателя;</li>
            <li>в случае невозможности решения проблемы банком — повторить попытку оплаты, воспользовавшись картой, выпущенной другим банком.</li>
          </ul>
          <p className="about-payment-modal-text">
            Все карт-чеки (подтверждения об оплате), полученные после совершения оплаты с использованием банковской карточки, необходимо сохранять для сверки с выпиской из карт-счёта с целью подтверждения совершённых операций в случае возникновения такой необходимости в спорных ситуациях.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default About;
