import hostyn from '../assets/figma/act-hostyn.webp';
import javornik from '../assets/figma/act-javornik.webp';
import rusava from '../assets/figma/act-rusava.webp';
import trojak from '../assets/figma/act-trojak.webp';
import lukov from '../assets/activities/lukov.webp';
import helfstyn from '../assets/activities/helfstyn.webp';
import kromeriz from '../assets/activities/kromeriz.webp';
import holesov from '../assets/activities/holesov.webp';
import zoo from '../assets/activities/zoo.webp';
import jeskyne from '../assets/activities/jeskyne.webp';

export const CATEGORIES = [
  { id: 'all', label: 'Vše' },
  { id: 'nature', label: 'Příroda a výhledy' },
  { id: 'castles', label: 'Hrady a zámky' },
  { id: 'family', label: 'Rodinné výlety' },
];

/*
 * Fotografie 5–9 (Lukov, Helfštýn, Kroměříž, Holešov, Zoo) dodal klient.
 * Fotografie Zbrašovských jeskyní: Wikimedia Commons (CC BY-SA 3.0) – před ostrým
 * nasazením uveďte autora nebo ji nahraďte vlastní fotkou.
 */
export const ACTIVITIES = [
  {
    title: 'Svatý Hostýn',
    time: '15–20 min',
    category: 'nature',
    image: hostyn,
    text: 'Navštivte významné poutní místo s krásnou bazilikou, rozhlednou a nádhernými výhledy do okolní krajiny.',
  },
  {
    title: 'Kelčský Javorník',
    time: '20–25 min',
    category: 'nature',
    image: javornik,
    text: 'Vydejte se na výšlap k moderní rozhledně, ze které se otevírají nádherné výhledy na Hostýnské vrchy a široké okolí.',
  },
  {
    title: 'Rusava',
    time: '10–15 min',
    category: 'nature',
    image: rusava,
    text: 'Malebná valašská obec obklopená lesy a kopci. Ideální místo pro pěší turistiku, cyklistiku i odpočinek v přírodě.',
  },
  {
    title: 'Troják',
    time: '20–25 min',
    category: 'nature',
    image: trojak,
    text: 'Oblíbené výletní místo v Hostýnských vrších, které nabízí turistické trasy, cyklostezky a krásnou přírodu.',
  },
  {
    title: 'Hrad Lukov',
    time: '25–30 min',
    category: 'castles',
    image: lukov,
    text: 'Prozkoumejte jednu z nejkrásnějších hradních zřícenin na Moravě, ukrytou v lesích nedaleko Zlína.',
  },
  {
    title: 'Hrad Helfštýn',
    time: '35–45 min',
    category: 'castles',
    image: helfstyn,
    text: 'Rozsáhlý středověký hrad s monumentálními hradbami, historickou atmosférou a krásnými výhledy do okolí.',
  },
  {
    title: 'Kroměříž – zámek a zahrady',
    time: '25–30 min',
    category: 'castles',
    image: kromeriz,
    text: 'Objevte historický zámek zapsaný na seznamu UNESCO a projděte se nádhernými zámeckými zahradami.',
  },
  {
    title: 'Zámek Holešov',
    time: '15–20 min',
    category: 'castles',
    image: holesov,
    text: 'Navštivte barokní zámek s rozsáhlým parkem a unikátním vodním kanálem ve tvaru Neptunova trojzubce.',
  },
  {
    title: 'Zoo Zlín – Lešná',
    time: '35–45 min',
    category: 'family',
    image: zoo,
    text: 'Vydejte se za zvířaty z celého světa do jedné z nejkrásnějších zoologických zahrad v České republice.',
  },
  {
    title: 'Zbrašovské aragonitové jeskyně',
    time: '40–50 min',
    category: 'family',
    image: jeskyne,
    text: 'Objevte jedinečný podzemní svět s neobvyklými minerálními útvary a fascinujícími přírodními scenériemi.',
  },
];
