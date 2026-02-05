import { ArrowRight, ShoppingCart, User } from "lucide-react";
import { useState } from "react";

export default function BoilerShopTemplate() {
  const [cartCount] = useState(2);
  const [isAuth] = useState(false);
  return (
    <div className="bg-[#0E1A20] text-white font-sans">
      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0B1419]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-semibold tracking-wide">KATELKOF</div>
          <nav className="flex items-center gap-8 text-sm text-[#9FB0B8]">
            <a href="#catalog" className="hover:text-white">Каталог</a>
            <a href="#selection" className="hover:text-white">Подбор</a>
            <a href="#brands" className="hover:text-white">Бренды</a>
            <a href="#contact" className="hover:text-white">Контакты</a>
          </nav>
          <div className="flex items-center gap-6 text-[#9FB0B8]">
            <button className="relative hover:text-white">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#C7A75A] text-black text-xs rounded-full px-1.5">
                  {cartCount}
                </span>
              )}
            </button>
            {isAuth ? (
              <button className="flex items-center gap-2 hover:text-white">
                <User size={18} />
                <span className="text-sm">Профиль</span>
              </button>
            ) : (
              <button className="flex items-center gap-2 hover:text-white">
                <User size={18} />
                <span className="text-sm">Войти</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-screen flex items-center">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
          alt="House"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />

        <div className="relative max-w-7xl mx-auto px-6">
          <span className="text-[#C7A75A] tracking-widest text-sm">— ЭЛЕКТРИЧЕСКОЕ ОТОПЛЕНИЕ</span>
          <h1 className="mt-6 text-6xl font-serif leading-tight">
            Надёжные электрические котлы <br /> для частного дома
          </h1>
          <p className="mt-6 text-[#9FB0B8] max-w-xl">
            Энергоэффективные и безопасные решения для современного жилья
          </p>
          <button className="mt-10 flex items-center gap-2 text-[#C7A75A] hover:gap-4 transition-all">
            Подобрать котёл <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* SELECTION */}
      <section id="selection" className="py-32 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20">
        <div>
          <div className="text-8xl font-bold text-white/5">01</div>
          <h2 className="text-4xl font-serif mt-6">Какой котёл подойдёт вашему дому?</h2>
          <p className="mt-6 text-[#9FB0B8] max-w-md">
            Подбор по площади дома, мощности, типу подключения и бюджету.
          </p>
          <button className="mt-8 flex items-center gap-2 text-[#C7A75A]">
            Пройти подбор <ArrowRight size={16} />
          </button>
        </div>
        <img
          src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea"
          alt="Heating"
          className="rounded-2xl object-cover"
        />
      </section>

      {/* CATALOG */}
      <section id="catalog" className="py-32 bg-[#0B1419]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-8xl font-bold text-white/5">02</div>
          <h2 className="text-4xl font-serif mt-6">Каталог котлов</h2>

          <div className="mt-16 grid md:grid-cols-3 gap-10">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-[#13232B] rounded-2xl p-6 hover:-translate-y-2 transition-transform"
              >
                <img
                  src="https://images.unsplash.com/photo-1581092160562-40aa08e78837"
                  alt="Boiler"
                  className="h-48 w-full object-cover rounded-xl"
                />
                <span className="text-[#C7A75A] text-xs mt-4 block">Bosch</span>
                <h3 className="mt-2 font-serif text-xl">Tronic Heat 9kW</h3>
                <p className="text-sm text-[#9FB0B8] mt-2">До 90 м² • 9 кВт</p>
                <p className="mt-4 text-lg">€1 250</p>
                <button className="mt-4 flex items-center gap-2 text-[#C7A75A]">
                  Подробнее <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section id="brands" className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-center text-2xl font-serif mb-12">Проверенные производители</h2>
        <div className="flex flex-wrap justify-center gap-12 text-[#9FB0B8]">
          <span>Bosch</span>
          <span>Vaillant</span>
          <span>Protherm</span>
          <span>Kospel</span>
          <span>Stiebel Eltron</span>
        </div>
      </section>

      {/* CONSULTATION */}
      <section id="contact" className="py-32 bg-gradient-to-b from-black/40 to-black/80 text-center">
        <h2 className="text-4xl font-serif">Нужна помощь специалиста?</h2>
        <p className="mt-4 text-[#9FB0B8]">Подберём котёл под ваш дом за 15 минут</p>
        <button className="mt-10 inline-flex items-center gap-2 text-[#C7A75A]">
          Получить консультацию <ArrowRight size={18} />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B1419] py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-sm text-[#9FB0B8]">
          <div>
            <div className="text-white font-semibold mb-4">KATELKOF</div>
            <p>Современное отопление для частного дома</p>
          </div>
          <div>
            <p className="mb-2">Каталог</p>
            <p className="mb-2">Подбор котла</p>
            <p>Контакты</p>
          </div>
          <div>
            <p>© 2026 Katelkof</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
