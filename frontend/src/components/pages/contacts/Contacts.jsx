/**
 * Страница "Контакты" — вкладки «Контакты» и «Часто задаваемые вопросы».
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "../../../services/api";
import {
  ROUTES,
  AUTH_REQUIRED_QUESTION,
  AUTH_CHANGED_EVENT,
} from "../../../config/constants";
import { isAuth } from "../../../utils/cart";
import "./Contacts.css";

/** Имя, email и телефон из профиля пользователя (GET /me/). */
function profileToFormValues(user) {
  const first = (user?.first_name || "").trim();
  const last = (user?.last_name || "").trim();
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  const username = (user?.username || "").trim();
  return {
    user_name: fullName || username || (user?.email || "").trim(),
    email: (user?.email || "").trim(),
    phone: (user?.phone || "").trim(),
  };
}

function formatQuestionDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

const FAQ_ITEMS = [
  {
    question: "Как оформить заказ на сайте?",
    answer:
      "Добавьте товары в корзину, перейдите к оформлению заказа, укажите адрес доставки и способ оплаты. Для оформления необходима регистрация или вход в личный кабинет.",
  },
  {
    question: "Какие способы оплаты доступны?",
    answer:
      "Доступны оплата наличными при получении, банковской картой онлайн и банковской картой при получении. Подробности уточняйте у менеджера при подтверждении заказа.",
  },
  {
    question: "Как рассчитывается стоимость доставки?",
    answer:
      "Стоимость доставки зависит от адреса и условий, указанных в разделе «О нас». При оформлении заказа сумма доставки рассчитывается автоматически для курьерской доставки по указанному адресу.",
  },
  {
    question: "Где посмотреть историю моих заказов?",
    answer:
      "Войдите в личный кабинет и откройте раздел «Мои заказы» или «История заказов» в меню сайта. Там отображаются статус и состав каждого заказа.",
  },
  {
    question: "Можно ли отменить заказ?",
    answer:
      "Да, заказ со статусом «Новый» или «В обработке» можно отменить в разделе «Мои заказы». Отправленный заказ отменить нельзя — свяжитесь с нами по телефону.",
  },
  {
    question: "Есть ли гарантия на оборудование?",
    answer:
      "На товары распространяется гарантия производителя. Условия гарантийного обслуживания описаны в разделе «О нас» и в документации к конкретной модели котла.",
  },
  {
    question: "Как с вами связаться?",
    answer:
      "Позвоните по телефонам +375 (44) 787 18 88 или +375 (29) 235 31 00, напишите на malchewski@mail.ru или посетите магазин: г. Брест, ул. Гоголя 89, Пн–Вс с 9:00 до 19:00.",
  },
];

const Contacts = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [authenticated, setAuthenticated] = useState(() => isAuth());
  const [questionName, setQuestionName] = useState("");
  const [questionEmail, setQuestionEmail] = useState("");
  const [questionPhone, setQuestionPhone] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [myQuestions, setMyQuestions] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfileIntoForm = useCallback(() => {
    if (!isAuth()) {
      setQuestionName("");
      setQuestionEmail("");
      setQuestionPhone("");
      return Promise.resolve();
    }
    setProfileLoading(true);
    return api
      .get("me/")
      .then((res) => {
        const { user_name, email, phone } = profileToFormValues(res.data);
        setQuestionName(user_name);
        setQuestionEmail(email);
        setQuestionPhone(phone);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      const authed = isAuth();
      setAuthenticated(authed);
      if (!authed) {
        setQuestionName("");
        setQuestionEmail("");
        setQuestionPhone("");
      }
    };
    syncAuth();
    const onAuthChanged = () => {
      syncAuth();
      if (isAuth()) {
        loadProfileIntoForm();
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [loadProfileIntoForm]);

  useEffect(() => {
    if (!authenticated) {
      setMyQuestions([]);
      return;
    }
    api
      .get("user-questions/")
      .then((res) => {
        setMyQuestions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setMyQuestions([]));
  }, [authenticated, questionSent]);

  useEffect(() => {
    if (authenticated && activeTab === 1) {
      loadProfileIntoForm();
    }
  }, [authenticated, activeTab, loadProfileIntoForm]);

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!isAuth()) return;
    const text = questionText.trim();
    const name = questionName.trim();
    const email = questionEmail.trim();
    if (!text || !name || !email) return;

    setQuestionSubmitting(true);
    setQuestionError(null);
    try {
      await api.post("user-questions/", {
        user_name: name,
        email,
        phone: questionPhone.trim(),
        question: text,
      });
      setQuestionSent(true);
      setQuestionText("");
      await loadProfileIntoForm();
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = data[firstKey];
        setQuestionError(
          Array.isArray(msg) ? msg[0] : String(msg || "Не удалось отправить вопрос."),
        );
      } else {
        setQuestionError("Не удалось отправить вопрос. Попробуйте позже.");
      }
    } finally {
      setQuestionSubmitting(false);
    }
  };

  return (
    <main className="page-main contacts-page">
      <div className="page-container">
        <section
          className="page-section contacts-section"
          id="contacts"
          aria-labelledby="contacts-tabs"
        >
          <span className="section-number" aria-hidden>
            05
          </span>

          <Tabs
            id="contacts-tabs"
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            className="contacts-tabs"
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Разделы страницы контактов"
          >
            <Tab label="Контакты" id="contacts-tab-0" aria-controls="contacts-panel-0" />
            <Tab
              label="Часто задаваемые вопросы"
              id="contacts-tab-1"
              aria-controls="contacts-panel-1"
            />
          </Tabs>

          <div
            id="contacts-panel-0"
            role="tabpanel"
            aria-labelledby="contacts-tab-0"
            hidden={activeTab !== 0}
            className="contacts-panel"
          >
            {activeTab === 0 ? (
              <>
                <p className="page-section-text">
                  Свяжитесь с нами: адрес, режим работы. г. Брест, ул. Гоголя 89, Пн–Вс
                  с 9:00 до 19:00.
                </p>
                <div className="contacts-phones">
                  <a href="tel:+375447871888" className="contacts-phone">
                    +375 (44) 787 18 88
                  </a>
                  <a href="tel:+375292353100" className="contacts-phone">
                    +375 (29) 235 31 00
                  </a>
                </div>
                <p className="contacts-email">
                  <a href="mailto:info@kotelkov.by">info@kotelkov.by</a>
                </p>
              </>
            ) : null}
          </div>

          <div
            id="contacts-panel-1"
            role="tabpanel"
            aria-labelledby="contacts-tab-1"
            hidden={activeTab !== 1}
            className="contacts-panel contacts-faq"
          >
            {activeTab === 1 ? (
              <>
              <div className="contacts-faq-list">
                {FAQ_ITEMS.map((item, index) => (
                  <Accordion
                    key={item.question}
                    disableGutters
                    className="contacts-faq-item"
                    defaultExpanded={index === 0}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`faq-content-${index}`}
                      id={`faq-header-${index}`}
                    >
                      {item.question}
                    </AccordionSummary>
                    <AccordionDetails id={`faq-content-${index}`}>
                      {item.answer}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>

              <div className="contacts-ask">
                <h2 className="contacts-ask-heading">Задайте Ваш вопрос.</h2>
                <p className="contacts-ask-desc">
                  Не нашли ответ в списке? Напишите нам — ответим в ближайшее время.
                </p>
                {authenticated ? (
                  <>
                    {questionSent ? (
                      <p className="contacts-ask-success" role="status">
                        Спасибо! Ваш вопрос сохранён. Ответ появится в личном
                        кабинете и придёт на вашу электронную почту.
                      </p>
                    ) : null}
                    {questionError ? (
                      <p className="contacts-ask-error">{questionError}</p>
                    ) : null}
                    <form
                      className="contacts-ask-form"
                      onSubmit={handleQuestionSubmit}
                    >
                      <TextField
                        label="Имя пользователя"
                        value={questionName}
                        variant="outlined"
                        fullWidth
                        size="small"
                        required
                        className="contacts-ask-field contacts-ask-field--profile"
                        InputProps={{ readOnly: true }}
                        disabled={profileLoading}
                      />
                      <TextField
                        label="Адрес электронной почты"
                        type="email"
                        value={questionEmail}
                        variant="outlined"
                        fullWidth
                        size="small"
                        required
                        className="contacts-ask-field contacts-ask-field--profile"
                        InputProps={{ readOnly: true }}
                        disabled={profileLoading}
                      />
                      <TextField
                        label="Контактный телефон"
                        value={questionPhone}
                        variant="outlined"
                        fullWidth
                        size="small"
                        className="contacts-ask-field contacts-ask-field--profile"
                        InputProps={{ readOnly: Boolean(questionPhone.trim()) }}
                        onChange={
                          questionPhone.trim()
                            ? undefined
                            : (e) => {
                                setQuestionPhone(e.target.value);
                                setQuestionSent(false);
                              }
                        }
                        disabled={profileLoading}
                      />
                      <TextField
                        label="Ваш вопрос"
                        value={questionText}
                        onChange={(e) => {
                          setQuestionText(e.target.value);
                          setQuestionSent(false);
                        }}
                        variant="outlined"
                        fullWidth
                        required
                        multiline
                        minRows={4}
                        className="contacts-ask-field"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        className="contacts-ask-submit"
                        disabled={
                          profileLoading ||
                          questionSubmitting ||
                          !questionText.trim() ||
                          !questionName.trim() ||
                          !questionEmail.trim()
                        }
                      >
                        {questionSubmitting ? "Отправка…" : "Отправить вопрос"}
                      </Button>
                    </form>

                    {myQuestions.length > 0 ? (
                      <div className="contacts-my-questions">
                        <h3 className="contacts-my-questions-heading">Мои вопросы</h3>
                        <ul className="contacts-my-questions-list">
                          {myQuestions.map((item) => (
                            <li key={item.id} className="contacts-my-questions-item">
                              <p className="contacts-my-questions-meta">
                                {formatQuestionDate(item.created_at)}
                              </p>
                              <p className="contacts-my-questions-q">{item.question}</p>
                              {(item.admin_answer || "").trim() ? (
                                <p className="contacts-my-questions-a">
                                  <strong>Ответ:</strong> {item.admin_answer}
                                </p>
                              ) : (
                                <p className="contacts-my-questions-pending">
                                  Ожидает ответа администратора
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="contacts-ask-guest">
                    <p className="contacts-ask-guest-message">
                      {AUTH_REQUIRED_QUESTION}
                    </p>
                    <div className="contacts-ask-guest-actions">
                      <Link
                        to={ROUTES.LOGIN}
                        className="contacts-ask-guest-btn contacts-ask-guest-btn--primary"
                      >
                        Войти
                      </Link>
                      <Link
                        to={ROUTES.REGISTER}
                        className="contacts-ask-guest-btn contacts-ask-guest-btn--secondary"
                      >
                        Регистрация
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Contacts;
