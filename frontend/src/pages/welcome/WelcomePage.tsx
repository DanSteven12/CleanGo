import Hero from '@/components/hero/Hero';
import AboutSection from './components/AboutSection';
import FeaturesGrid from './components/FeaturesGrid';
import HowItWorks from './components/HowItWorks';
import TeamSection from './components/TeamSection';
import AppDownloadSection from './components/AppDownloadSection';
import Footer from './components/Footer';

/**
 * Public welcome page — mounted at / and /welcome (no auth required).
 *
 * The page resets body background to the Hero's dark canvas (#050607)
 * so it doesn't inherit the app's light-mode background.
 */
export function WelcomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050607',
        fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Inter", sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <Hero />
      <AboutSection />
      <FeaturesGrid />
      <HowItWorks />
      <TeamSection />
      <AppDownloadSection />
      <Footer />
    </div>
  );
}
