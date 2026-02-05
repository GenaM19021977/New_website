import { Link } from 'react-router-dom';
import Card from '../../card/Card';
import { ROUTES } from '../../../config/constants';
import './Home.css';

const Home = () => {
  return (
    <main className="page-main">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-overlay" />
        <div className="page-container home-hero-content">
          <span className="home-hero-label">— КОТЛЫ И ОТОПЛЕНИЕ</span>
          <h1 id="hero-title" className="home-hero-title">
            Надёжное отопительное оборудование для частного дома
          </h1>
          <p className="home-hero-desc">
            Энергоэффективные и безопасные решения. Каталог, доставка, гарантия.
          </p>
          <Link to={ROUTES.ABOUT} className="home-hero-cta">
            О компании
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
