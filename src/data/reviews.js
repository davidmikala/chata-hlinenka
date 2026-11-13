// Fiktivní ukázkové recenze – před spuštěním webu nahraďte skutečnými hodnoceními hostů.
// Portréty: randomuser.me (volně použitelné ilustrační fotografie).
import w44 from '../assets/avatars/women-44.jpg';
import m32 from '../assets/avatars/men-32.jpg';
import w68 from '../assets/avatars/women-68.jpg';
import m75 from '../assets/avatars/men-75.jpg';
import w21 from '../assets/avatars/women-21.jpg';
import m46 from '../assets/avatars/men-46.jpg';
import w65 from '../assets/avatars/women-65.jpg';
import m12 from '../assets/avatars/men-12.jpg';
import w90 from '../assets/avatars/women-90.jpg';
import m86 from '../assets/avatars/men-86.jpg';

export const REVIEWS = [
  {
    name: 'Martina Gellerová',
    place: 'Valtice',
    avatar: w44,
    rating: 5,
    date: '2026-10-27',
    text: 'Pobyt na Hliněnce byl naprosto kouzelný. Ráno káva na terase s výhledem na Hostýn, večer sauna a krbová kamna ve stodole. Takový klid jsme už dlouho nezažili.',
  },
  {
    name: 'Tomáš Dvořák',
    place: 'Brno',
    avatar: m32,
    rating: 5,
    date: '2026-10-12',
    text: 'Byli jsme tu s partou dvanácti kamarádů a místa bylo dost pro všechny. Stodola s grilem je bomba, i když celý víkend pršelo, vůbec nám to nevadilo.',
  },
  {
    name: 'Lucie Horáková',
    place: 'Olomouc',
    avatar: w68,
    rating: 4.5,
    date: '2026-09-21',
    text: 'Krásně čistá a útulná chata, hliněné omítky mají neskutečnou atmosféru. Děti si užily hřiště a my zase ticho. Jediné mínus – odjíždělo se nám strašně těžko.',
  },
  {
    name: 'Petr Novotný',
    place: 'Praha',
    avatar: m75,
    rating: 5,
    date: '2026-08-30',
    text: 'Skvělá poloha – deset minut z dálnice a přitom úplná samota. Kola jsme nechali v úschovně a vyrazili na Troják i Javorník. Majitelé jsou moc milí a ochotní.',
  },
  {
    name: 'Kateřina Malá',
    place: 'Zlín',
    avatar: w21,
    rating: 5,
    date: '2026-08-04',
    text: 'Oslavovali jsme tu maminčiny šedesátiny a bylo to dokonalé. Vybavená kuchyně, dost talířů i sklenic pro všechny a večer posezení u ohně pod hvězdami.',
  },
  {
    name: 'Jakub Procházka',
    place: 'Ostrava',
    avatar: m46,
    rating: 4.5,
    date: '2026-07-15',
    text: 'Klimatizace v létě přišla vhod, Wi-Fi fungovala bez problémů, takže jsem mohl i chvíli pracovat. Výlet na Helfštýn a do Kroměříže doporučujeme.',
  },
  {
    name: 'Veronika Černá',
    place: 'Hradec Králové',
    avatar: w65,
    rating: 5,
    date: '2026-06-02',
    text: 'Romantický víkend ve dvou, přesně jak jsme si ho představovali. Žádní sousedé, jen les, ptáci a sauna. Určitě se vrátíme na podzim, až se okolí zbarví.',
  },
  {
    name: 'Martin Kučera',
    place: 'Přerov',
    avatar: m12,
    rating: 5,
    date: '2026-04-18',
    text: 'Komunikace s majiteli rychlá a bez komplikací, rezervace i záloha proběhly hladce. Chata vypadá ještě lépe než na fotkách. Palec nahoru!',
  },
  {
    name: 'Eva Svobodová',
    place: 'Kroměříž',
    avatar: w90,
    rating: 4,
    date: '2026-02-09',
    text: 'Zimní pobyt jako z pohádky – sníh, praskající dřevo v kamnech a horká čokoláda. Příjezdová cesta byla krásně odhrnutá, za což moc děkujeme.',
  },
  {
    name: 'Ondřej Pokorný',
    place: 'Pardubice',
    avatar: m86,
    rating: 5,
    date: '2025-12-28',
    text: 'Silvestr na Hliněnce byl zážitek. Prostorné ložnice, velký stůl pro celou rodinu a ohňostroj nad Hostýnskými vrchy. Lepší místo jsme si vybrat nemohli.',
  },
];
