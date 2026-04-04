/**
 * Страница «Наши партнеры»
 */
import './Partners.css';

const Partners = () => {
  return (
    <main className="page-main partners-page">
      <div className="page-container">
        <section className="page-section" id="partners" aria-labelledby="partners-heading">
          <span className="section-number" aria-hidden>04</span>
          <h1 id="partners-heading" className="page-section-heading">
            Наши партнеры
          </h1>
          <p className="page-section-text">
            Компании и организации, с которыми мы сотрудничаем. Раздел можно дополнить логотипами и описаниями партнёров.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Partners;
