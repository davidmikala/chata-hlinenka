/**
 * Seznam fotek, které si zákazník může měnit v administraci (/admin).
 * Jeden zdroj pravdy pro: web (výchozí fotky), schéma Sanity Studia
 * a skript scripts/sanity-seed.mjs, který do Sanity nahraje současné fotky.
 *
 * file = výchozí fotka v src/assets (použije se, dokud v Sanity není jiná)
 */

export const GROUPS = [
  { name: 'uvod', title: 'Úvod' },
  { name: 'vitejte', title: 'Vítejte na Hliněnce' },
  { name: 'pribeh', title: 'Náš příběh a jméno' },
  { name: 'poloha', title: 'Poloha' },
  { name: 'stodola', title: 'Stodola' },
  { name: 'galerie', title: 'Galerie' },
  { name: 'cenik', title: 'Ceník a rezervace' },
];

export const SLOTS = [
  { key: 'hero', group: 'uvod', title: 'Velká fotka úplně nahoře', file: 'figma/drone.webp', alt: 'Chata Hliněnka z dronu' },

  { key: 'intro1', group: 'vitejte', title: '1. sloupec – horní (na výšku)', file: 'photos/obyvak-brizy.webp', alt: 'Obývací pokoj s březovými kmeny a zelenou sedačkou' },
  { key: 'intro2', group: 'vitejte', title: '1. sloupec – dolní (na šířku)', file: 'photos/chata-zahrada.webp', alt: 'Chata Hliněnka se zahradou a přístřeškem' },
  { key: 'intro3', group: 'vitejte', title: '2. sloupec – horní (na šířku)', file: 'photos/chata-svah.webp', alt: 'Chata na svahu v podzimních barvách' },
  { key: 'intro4', group: 'vitejte', title: '2. sloupec – dolní (na výšku)', file: 'photos/jidelna-stul.webp', alt: 'Jídelní stůl s ovocem a tulipány' },
  { key: 'intro5', group: 'vitejte', title: '3. sloupec – horní (na výšku)', file: 'photos/koupelna-vana.webp', alt: 'Koupelna s černou volně stojící vanou' },
  { key: 'intro6', group: 'vitejte', title: '3. sloupec – dolní (na šířku)', file: 'photos/obyvak-krb.webp', alt: 'Obývací pokoj s krbovými kamny' },

  { key: 'story', group: 'pribeh', title: 'Náš příběh – fotka vlevo (na výšku)', file: 'photos/stodola-pivo.webp', alt: 'Orosené pivo na dubovém stole ve stodole u kamen' },
  { key: 'originMain', group: 'pribeh', title: 'Původ jména – velká fotka (na výšku)', file: 'photos/hlinena-kamna.webp', alt: 'Krbová kamna s hliněnou omítkou v obývacím pokoji' },
  { key: 'originSmall', group: 'pribeh', title: 'Původ jména – malá fotka', file: 'photos/chata-krajina.webp', alt: 'Chata Hliněnka v krajině pod Hostýnskými vrchy' },

  { key: 'location', group: 'poloha', title: 'Poloha a soukromí – široká fotka', file: 'figma/drone.webp', alt: 'Chata Hliněnka z dronu, obklopená zahradou a poli' },

  { key: 'barnMain', group: 'stodola', title: 'Hlavní fotka stodoly (na šířku)', file: 'photos/stodola-interier.webp', alt: 'Interiér stodoly s dlouhými dubovými stoly, krbovými kamny a kuchyňkou' },
  { key: 'barnTable', group: 'stodola', title: '„Stůl pro celou partu“', file: 'photos/stodola-stul.webp', alt: 'Velký dřevěný stůl ve stodole' },
  { key: 'barnKitchen', group: 'stodola', title: '„Kuchyňka a krbová kamna“', file: 'photos/stodola-kuchynka.webp', alt: 'Kuchyňka s vinotékou a krbovými kamny ve stodole' },
  { key: 'barnDarts', group: 'stodola', title: '„Šipky na dlouhé večery“', file: 'photos/stodola-sipky.webp', alt: 'Osvětlený šipkový terč s cedulí Darts Zone na dřevěné stěně stodoly' },

  { key: 'pricingYear', group: 'cenik', title: 'Ceník – Během roku', file: 'photos/jidelna-krb.webp', alt: 'Jídelní stůl a krbová kamna v obývacím pokoji' },
  { key: 'pricingSummer', group: 'cenik', title: 'Ceník – Letní prázdniny', file: 'photos/chata-veranda.webp', alt: 'Chata Hliněnka s terasou a posezením venku' },
  { key: 'pricingHoliday', group: 'cenik', title: 'Ceník – Vánoce a Silvestr', file: 'photos/stodola-vecer.webp', alt: 'Večerní posezení u velkého stolu ve stodole' },
  { key: 'booking', group: 'cenik', title: 'Rezervace – fotka chaty v souhrnu', file: 'photos/chata-vecer.webp', alt: 'Chata Hliněnka za soumraku' },
];

/** Galerie – pořadí = pořadí na webu (první 4 = 1. řada, další 4 = 2. řada, zbytek = posuvník). */
export const GALLERY = [
  { file: 'photos/loznice-modra.webp', alt: 'Ložnice s tmavě modrou stěnou a dřevěnou postelí' },
  { file: 'photos/kuchyne.webp', alt: 'Kuchyně se zelenými skříňkami' },
  { file: 'photos/sprcha.webp', alt: 'Sprchový kout v koupelně s dřevěným obkladem' },
  { file: 'photos/obyvak-sedacka.webp', alt: 'Obývací pokoj se sedačkou, březovými kmeny a jídelnou' },
  { file: 'photos/chata-podzim.webp', alt: 'Chata Hliněnka a stodola v podzimní zahradě' },
  { file: 'photos/loznice-kvetiny.webp', alt: 'Ložnice s květinovým povlečením' },
  { file: 'photos/koupelna-umyvadlo.webp', alt: 'Koupelna s kulatým podsvíceným zrcadlem' },
  { file: 'photos/kuchyne-detail.webp', alt: 'Varná konvice a topinkovač v retro stylu' },
  { file: 'photos/terasa-vecer.webp', alt: 'Krytá terasa s lavicemi za večerního osvětlení' },
  { file: 'photos/stodola-terce.webp', alt: 'Podsvícený šipkový terč ve stodole' },
  { file: 'photos/obyvak-kamna.webp', alt: 'Obývací pokoj s krbovými kamny a zelenou sedačkou' },
  { file: 'photos/chata-terasa.webp', alt: 'Chata s dřevěnou terasou mezi stromy' },
  { file: 'photos/loznice-listy.webp', alt: 'Ložnice s povlečením s motivem listů' },
  { file: 'photos/stodola-bar.webp', alt: 'Kuchyňka ve stodole s cihlovou stěnou' },
  { file: 'photos/loznice-okno.webp', alt: 'Ložnice s posezením u okna' },
  { file: 'photos/brizy-detail.webp', alt: 'Březové kmeny u vstupu do kuchyně' },
  { file: 'photos/chata-zadni.webp', alt: 'Chata Hliněnka při západu slunce' },
];

/** Šířky dlaždic galerie podle pozice (z Figmy) – opakují se, když fotek přibude. */
export const GALLERY_WIDTHS = [250, 250, 250, 560, 560, 250, 250, 250, 263, 263, 567, 567, 263, 263, 567, 263, 567];
