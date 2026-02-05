/**
 * Страница "Бренды"
 */
import './Brands.css';

const Brands = () => {
  return (
    <main className="page-main brands-page">
      <div className="page-container">
        <section className="page-section" id="brands" aria-labelledby="brands-heading">
          <span className="section-number" aria-hidden>05</span>
          <h1 id="brands-heading" className="page-section-heading">
            Бренды
          </h1>
          <p className="page-section-text">
            Проверенные производители отопительного оборудования: Bosch, Vaillant, Protherm, Kospel и другие.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Brands;
