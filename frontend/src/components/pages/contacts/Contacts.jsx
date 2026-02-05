/**
 * Страница "Контакты"
 */
import './Contacts.css';

const Contacts = () => {
  return (
    <main className="page-main contacts-page">
      <div className="page-container">
        <section className="page-section" id="contacts" aria-labelledby="contacts-heading">
          <span className="section-number" aria-hidden>06</span>
          <h1 id="contacts-heading" className="page-section-heading">
            Контакты
          </h1>
          <p className="page-section-text">
            Свяжитесь с нами: адрес, режим работы. г. Брест, ул. Гоголя 89, Пн–Вс с 9:00 до 19:00.
          </p>
          <div className="contacts-phones">
            <a href="tel:+375447871888" className="contacts-phone">+375 (44) 787 18 88</a>
            <a href="tel:+375292353100" className="contacts-phone">+375 (29) 235 31 00</a>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Contacts;
