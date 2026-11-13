import { useReveal } from './hooks/useReveal.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import QuickFacts from './components/QuickFacts.jsx';
import Intro from './components/Intro.jsx';
import Story from './components/Story.jsx';
import NameOrigin from './components/NameOrigin.jsx';
import Location from './components/Location.jsx';
import Barn from './components/Barn.jsx';
import Gallery from './components/Gallery.jsx';
import Equipment from './components/Equipment.jsx';
import Activities from './components/Activities.jsx';
import Booking from './components/Booking.jsx';
import Reviews from './components/Reviews.jsx';
import MapSection from './components/MapSection.jsx';
import Footer from './components/Footer.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';

export default function App() {
  useReveal();

  return (
    <>
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <QuickFacts />
        <Intro />
        <Story />
        <NameOrigin />
        <Location />
        <Barn />
        <Gallery />
        <Equipment />
        <Activities />
        <Booking />
        <Reviews />
        <MapSection />
      </main>
      <Footer />
    </>
  );
}
