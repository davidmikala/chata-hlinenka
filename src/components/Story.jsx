import { Photo } from '../content/photos.jsx';
import './Story.css';

export default function Story() {
  return (
    <section className="story" id="pribeh">
      <div className="container story__inner">
        <figure className="story__media" data-reveal="clip">
          <Photo slot="story" loading="lazy" sizes="(max-width: 820px) 100vw, 520px" />
        </figure>

        <div className="story__body">
          <p className="eyebrow" data-reveal>
            Náš příběh
          </p>
          <h2 className="h2 story__title" data-reveal style={{ '--d': '80ms' }}>
            Hliněnka je pro nás víc než jen chata
          </h2>
          <p className="story__text" data-reveal style={{ '--d': '160ms' }}>
            Je to místo, které jsme si postupně vytvářeli podle vlastních představ. Místo pro rodinu, odpočinek, setkávání s přáteli a chvíle, kdy chceme nechat
            každodenní shon daleko za sebou.
          </p>
          <p className="story__text" data-reveal style={{ '--d': '240ms' }}>
            Při jejím zvelebování jsme se snažili zachovat přirozený charakter prostředí, propojit útulnost s přírodou a vytvořit atmosféru, ve které se člověk cítí
            opravdu dobře. A protože věříme, že taková místa stojí za to sdílet, rozhodli jsme se naši rodinnou chatu otevřít i dalším hostům.
          </p>
          <blockquote className="story__quote" data-reveal style={{ '--d': '320ms' }}>
            <p className="quote">
              „Rádi bychom vám dopřáli stejný pocit, pro který máme Hliněnku tak rádi – pocit naprostého klidu, svobody a soukromí.“
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
