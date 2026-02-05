import styles from './Card.module.css';
import image from '../../images/kat_01.png';

const Card = () => {
  return (
    <article className={styles.card}>
      <img className={styles.card__image} src={image} alt="Категория товара" />
    </article>
  );
};

export default Card;
