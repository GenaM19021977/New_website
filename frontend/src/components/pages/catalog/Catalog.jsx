import Card from '../../card/Card';
import './Catalog.css';

const Catalog = () => {
  return (
    <main className="page-main catalog-page">
      <div className="page-container">
        <section className="page-section" id="catalog" aria-labelledby="catalog-heading">
          <span className="section-number" aria-hidden>03</span>
          <h1 id="catalog-heading" className="page-section-heading">
            Каталог
          </h1>
          <p className="page-section-text">
            Каталог отопительного оборудования: котлы, водонагреватели, насосы и сопутствующие товары.
          </p>
        </section>
        <section id="catalog-preview" className="home-section home-catalog" aria-labelledby="catalog-heading">
        <div className="page-container">
          <div className="home-cards grid-cols-1 md-grid-cols-3">
            <Card />
            <Card />
            <Card />
          </div>
        </div>
      </section>
      </div>
    </main>
  );
};

export default Catalog;
