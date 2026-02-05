/**
 * Страница "Подбор"
 */
import './Selection.css';

const Selection = () => {
  return (
    <main className="page-main selection-page">
      <div className="page-container">
        <section className="page-section" id="selection" aria-labelledby="selection-heading">
          <span className="section-number" aria-hidden>04</span>
          <h1 id="selection-heading" className="page-section-heading">
            Подбор
          </h1>
          <p className="page-section-text">
            Подбор оборудования по площади дома, мощности, типу подключения и бюджету.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Selection;
