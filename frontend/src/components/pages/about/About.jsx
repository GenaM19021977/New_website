/**
 * Страница "О нас" (About)
 */
import './About.css';

const About = () => {
  return (
    <main className="page-main about-page">
      <div className="page-container">
        <section className="page-section" id="about" aria-labelledby="about-heading">
          <span className="section-number" aria-hidden>02</span>
          <h1 id="about-heading" className="page-section-heading">
            О нас
          </h1>
          <p className="page-section-text">
            Это страница о Турковых. Мы занимаемся отопительным оборудованием в Бресте — котлы, доставка, гарантия и сервис.
          </p>
        </section>
      </div>
    </main>
  );
};

export default About;
