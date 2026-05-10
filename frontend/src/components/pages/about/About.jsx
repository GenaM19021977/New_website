/**
 * Страница "О нас" (About)
 * Данные для модального окна «Информация о доставке» загружаются из API (таблица Доставка).
 */
import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import iconDelivery from "../../../images/img_social/free-icon-fast-delivery-5465975.png";
import iconPayment from "../../../images/img_social/free-icon-secure-payment-11338230.png";
import iconPartners from "../../../images/img_social/free-icon-partner-11445175.png";
import api from "../../../services/api";
import "./About.css";

/**
 * Числовое значение / сумма из таблицы Доставка для текста в модалке.
 * −1 → «Согласовывайте с менеджером!», 0 → «Бесплатно!», иначе «X.XX BYN».
 */
function formatDeliveryMoneyPhrase(raw) {
  if (raw == null || raw === "") return "";
  const n = Number(String(raw).trim().replace(",", "."));
  if (Number.isNaN(n)) return `${String(raw).trim()} BYN`;
  if (n === -1) return "Согласовывайте с менеджером!";
  if (n === 0) return "Бесплатно!";
  return `${n.toFixed(2)} BYN`;
}

/** Точка в конце строки, если фраза не заканчивается на «!». */
function finalizeDeliveryLine(body) {
  const t = body.trim();
  if (!t) return t;
  if (/[!]\s*$/u.test(t)) return t;
  return t.endsWith(".") ? t : `${t}.`;
}

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
      .get("delivery/")
      .then((res) => {
        setDeliveryItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setDeliveryError("Не удалось загрузить условия доставки.");
        setDeliveryItems([]);
      })
      .finally(() => setDeliveryLoading(false));
  }, [deliveryModalOpen]);

  /**
   * Одна строка из админки: название + числовое значение и сумма через « -  »,
   * с подстановкой «Согласовывайте с менеджером!» / «Бесплатно!» для −1 и 0.
   */
  const buildDeliveryCostSentence = (item) => {
    const rawTitle = (item.title != null ? String(item.title) : "").trim();
    const title = rawTitle.replace(/[:.]+\s*$/u, "").trim();

    const hasNumber = item.value_number != null && item.value_number !== "";
    const hasAmount = item.amount != null && item.amount !== "";

    const numPhrase = hasNumber
      ? formatDeliveryMoneyPhrase(item.value_number)
      : "";
    const amtPhrase = hasAmount ? formatDeliveryMoneyPhrase(item.amount) : "";

    if (!title && !hasNumber && !hasAmount) {
      return "Пункт доставки: в админке не заполнены название и суммы.";
    }
    if (!title) {
      if (hasNumber && hasAmount) {
        return finalizeDeliveryLine(`${numPhrase} -  ${amtPhrase}`);
      }
      if (hasNumber) return finalizeDeliveryLine(numPhrase);
      if (hasAmount) return finalizeDeliveryLine(amtPhrase);
      return "Пункт доставки: в админке не заполнены название и суммы.";
    }
    if (!hasNumber && !hasAmount) {
      return `${title}.`;
    }
    if (hasNumber && hasAmount) {
      return finalizeDeliveryLine(`${title} ${numPhrase} -  ${amtPhrase}`);
    }
    if (hasNumber) {
      return finalizeDeliveryLine(`${title} ${numPhrase}`);
    }
    return finalizeDeliveryLine(`${title} ${amtPhrase}`);
  };

  return (
    <main className="page-main about-page">
      <div className="page-container">
        <section
          className="page-section"
          id="about"
          aria-labelledby="about-heading"
        >
          <span className="section-number" aria-hidden>
            02
          </span>
          {/* <h1 id="about-heading" className="page-section-heading">
            О нас
          </h1> */}
          <article className="about-page-article" lang="ru">
            <p>
              Электрическое отопление для частного дома — это современное,
              экологичное и безопасное решение, которое завоевывает всё большую
              популярность. Его ключевое преимущество — автономность и простота,
              но главный фактор, который требует внимания — стоимость
              эксплуатации.
            </p>
            <p>Давайте разберем все плюсы и особенности подробнее.</p>

            <h2 className="about-page-article-heading">
              ✅ Почему стоит рассмотреть электрическое отопление
            </h2>
            <p>
              Электрические системы дают владельцу дома ряд важных преимуществ,
              которые начинаются уже на этапе проектирования.
            </p>
            <div className="about-page-table-scroll">
              <table className="about-page-table">
                <thead>
                  <tr>
                    <th scope="col">Преимущество</th>
                    <th scope="col">Как это проявляется</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Низкий порог входа</td>
                    <td>
                      Подключение обходится значительно дешевле газификации. Вам
                      не нужен дорогостоящий проект, разрешения и согласования.
                    </td>
                  </tr>
                  <tr>
                    <td>Простота и скорость монтажа</td>
                    <td>
                      Установка электрокотла или теплых полов занимает минимум
                      времени. Не нужны дымоход, вентиляция, отдельное помещение
                      под котельную и емкость для хранения топлива.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Максимальная безопасность и экологичность
                    </td>
                    <td>
                      Нет открытого огня, утечек газа, продуктов сгорания или
                      запаха. Котлы и обогреватели не выделяют вредных веществ,
                      полностью безопасны для здоровья и требуют минимального
                      контроля.
                    </td>
                  </tr>
                  <tr>
                    <td>Комфорт и гибкость управления</td>
                    <td>
                      Вы можете легко настроить комфортную температуру в каждом
                      помещении, запрограммировать график работы (например,
                      снижать нагрев на время отсутствия) и даже управлять
                      системой удаленно со смартфона.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Надежность и низкие эксплуатационные расходы
                    </td>
                    <td>
                      Система не требует регулярного технического обслуживания,
                      чистки от сажи и нагара. Отсутствие труб и теплоносителя в
                      электрических конвекторах или теплых полах исключает риск
                      протечек и размораживания системы.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="about-page-article-heading">
              💸 Главный нюанс: стоимость эксплуатации
            </h2>
            <p>
              Несмотря на все перечисленные плюсы, электричество — самый
              дорогой энергоноситель. Эксплуатационные расходы могут существенно
              превышать затраты на газ или твердое топливо.
            </p>
            <ul className="about-page-list">
              <li>
                <strong>Зависимость от тарифов:</strong> Ежемесячные счета
                напрямую зависят от вашего региона, выбранного тарифа и
                выделенной мощности дома.
              </li>
              <li>
                <strong>Важность теплоизоляции:</strong> Чтобы система была
                экономичной, дом должен быть очень хорошо утеплен. Это ключевое
                условие: в плохо утепленном доме электричество «вылетит в трубу».
              </li>
              <li>
                <strong>Ограничения по мощности:</strong> В старых домах или
                садовых товариществах выделенной электрической мощности может не
                хватить для полноценного отопления.
              </li>
            </ul>

            <h2 className="about-page-article-heading">
              💡 Как выбрать тип электрического отопления?
            </h2>
            <p>
              Чтобы найти оптимальное решение для дома, стоит рассмотреть разные
              варианты. Электрические системы делятся на два основных типа:
            </p>
            <p>
              <strong>Системы с водяным контуром (с электрокотлом):</strong>{" "}
              Традиционное отопление с радиаторами и трубами. Теплоноситель
              нагревается от электричества и циркулирует по дому. Это хороший
              вариант, если в доме уже разведена система водяного отопления.
              Котлы могут быть ТЭНовыми, индукционными или электродными.
            </p>
            <p>
              <strong>
                Прямые электрические системы обогрева (без труб и жидкости).
              </strong>{" "}
              К ним относятся:
            </p>
            <ul className="about-page-list">
              <li>
                <strong>Электрические теплые полы:</strong> Создают наиболее
                комфортное распределение тепла (ноги в тепле, голова в
                прохладе). Однако они инерционны — прогревают помещение не
                сразу, зато долго сохраняют тепло.
              </li>
              <li>
                <strong>Электрические конвекторы:</strong> Просты и дешевы,
                быстро нагревают воздух, но могут его пересушивать.
              </li>
            </ul>
            <p>
              Достойной альтернативой также являются тепловые насосы. Они работают
              от электричества, но используют его в 3–4 раза эффективнее: на 1 кВт
              затраченной энергии они выдают 3–4 кВт тепла, забирая энергию с
              улицы, земли или из воды. Однако их установка — более
              дорогостоящий проект.
            </p>

            <h2 className="about-page-article-heading">💎 Вывод</h2>
            <p>
              Электрическое отопление — это идеальный выбор для хорошо
              утепленных домов, особенно если подвести газ невозможно или
              экономически нецелесообразно. Оно дарит вам независимость,
              безопасность и комфорт. Чтобы минимизировать затраты, можно
              использовать комбинированные схемы, например, отапливать дом
              электрокотлом, но в каждой комнате установить programmable
              thermostat (программируемые термостаты) для точного контроля
              температуры в каждой зоне.
            </p>
            <p>
              Если появятся вопросы на каком-то из этапов, спрашивайте — я
              постараюсь помочь.
            </p>
          </article>
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
            <a
              className="about-action-btn about-action-btn--link"
              href="https://kotelkov.by/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Партнеры — открыть сайт kotelkov.by"
            >
              <img src={iconPartners} alt="" width={48} height={48} />
              <span>Партнеры</span>
            </a>
          </div>
        </section>
      </div>

      <Dialog
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        maxWidth="sm"
        fullWidth
        className="about-delivery-modal"
        PaperProps={{ className: "about-delivery-modal-paper" }}
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
          <h3 className="about-delivery-modal-heading">
            Условия и стоимость доставки
          </h3>

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
              {deliveryItems.map((item) => (
                <li key={item.id} className="about-delivery-modal-item">
                  <span className="about-delivery-modal-item-sentence">
                    {buildDeliveryCostSentence(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="about-delivery-modal-note">
            * Крупногабаритный товар — товар, размер которого в сумме трех
            измерений (высота, ширина, длина) превышает 150 см.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        maxWidth="sm"
        fullWidth
        className="about-payment-modal"
        PaperProps={{ className: "about-payment-modal-paper" }}
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
            Оплата банковской картой VISA, MasterCard, БЕЛКАРТ через систему
            AssistBelarus
          </p>
          <p className="about-payment-modal-text">
            Оплата производится через интернет в режиме реального времени
            непосредственно после оформления заказа.
          </p>
          <p className="about-payment-modal-text">
            Для совершения финансовой операции подходят карточки международных
            платежных систем VISA (всех видов), MasterCard (в том числе
            Maestro), эмитированные любым банком мира, БЕЛКАРТ, American
            Express. При выборе оплаты заказа с помощью банковской карты,
            обработка платежа (включая ввод номера банковской карты)
            производится ООО «Компанией электронных платежей «АССИСТ» с
            использованием программно-аппаратного комплекса системы электронных
            платежей Assist Belarus, которая прошла международную сертификацию.
          </p>
          <p className="about-payment-modal-text">
            В системе, обеспечивающей безопасность платежей, используется
            защищённый протокол TLS для передачи конфиденциальной информации от
            клиента на сервер и дальнейшей обработки в процессинговом центре.
            Это значит, что конфиденциальные данные плательщика (реквизиты
            карты, регистрационные данные и др.) не поступают в
            интернет-магазин, их обработка полностью защищена, и никто не может
            получить персональные и банковские данные клиента. Кроме того, при
            обработке платежей по банковским картам, используется безопасная
            технология 3D-Secure и Белкарт ИнтернетПароль, которую в
            обязательном порядке требуют международные платёжные системы VISA,
            MasterCard и Белкарт.
          </p>
          <h4 className="about-payment-modal-heading">Порядок оплаты:</h4>
          <p className="about-payment-modal-text">
            Выбрать способ отплаты картой on-line.
          </p>
          <p className="about-payment-modal-text">
            После нажатия на кнопку «Подтвердить и оплатить» система направит
            вас на сайт провайдера электронных платежей belassist.by,
            обеспечивающего безопасность платежей. Авторизационный сервер
            устанавливает с покупателем соединение по защищённому протоколу TLS
            и принимает от покупателя параметры его банковской карты (номер
            карты, дата окончания действия карты, имя держателя карты в той
            транскрипции, как оно указано на банковской карте, а также номер
            CVC2 либо CVV2, указанные на обратной стороне карты). Операция
            оплаты банковской картой онлайн полностью конфиденциальна и
            безопасна.
          </p>
          <p className="about-payment-modal-text">
            Ваши персональные данные и реквизиты карточки вводятся не на
            странице нашего сайта, а на авторизационной странице платежной
            системы. Доступ к этим данным осуществляется по протоколу безопасной
            передачи данных TLS, также применяются технологии безопасных
            интернет-платежей Visa Secure, MasterCard ID Check и Белкарт
            ИнтернетПароль. К оплате принимаются карты платежных систем Visa,
            MasterCard, American Express, БЕЛКАРТ, эмитированные любыми банками
            мира. Мы рекомендуем заранее обратиться в свой банк, чтобы
            удостовериться в том, что ваша карта может быть использована для
            платежей в сети интернет.
          </p>
          <h4 className="about-payment-modal-heading">
            Причины отказа в авторизации могут быть следующими:
          </h4>
          <ul className="about-payment-modal-list">
            <li>на карте недостаточно средств для оплаты заказа;</li>
            <li>
              банк, выпустивший карточку покупателя, установил запрет на оплату
              в интернете;
            </li>
            <li>истекло время ожидания ввода данных банковской карты;</li>
            <li>
              введённые данные не были подтверждены вами на платежной странице,
              ошибка формата данных и.т.д.
            </li>
          </ul>
          <p className="about-payment-modal-text">
            В зависимости от причины отказа в авторизации для решения вопроса вы
            можете:
          </p>
          <ul className="about-payment-modal-list">
            <li>
              обратиться за разъяснениями в банк, выпустивший карточку
              покупателя;
            </li>
            <li>
              в случае невозможности решения проблемы банком — повторить попытку
              оплаты, воспользовавшись картой, выпущенной другим банком.
            </li>
          </ul>
          <p className="about-payment-modal-text">
            Все карт-чеки (подтверждения об оплате), полученные после совершения
            оплаты с использованием банковской карточки, необходимо сохранять
            для сверки с выпиской из карт-счёта с целью подтверждения
            совершённых операций в случае возникновения такой необходимости в
            спорных ситуациях.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default About;
