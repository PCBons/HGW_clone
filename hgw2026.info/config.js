// HGW 2026 — configuratie
//
// Vul hieronder je Supabase project URL en anon-key in om multi-user sync te
// activeren. Zolang deze leeg zijn draait de app op localStorage (per-device,
// handig voor ontwikkelen).
//
// Supabase setup (eenmalig):
//   1. Maak gratis account op https://supabase.com en start een nieuw project
//   2. Kopieer "Project URL" en "anon public key" uit Settings > API
//   3. Plak ze hieronder
//   4. Run het SQL-script uit schema.sql in de Supabase SQL editor
//   5. Maak een storage bucket "photos" (public) voor de foto-wall
//
// Het weekend
export const WEEKEND = {
  name: "HGW 2026",
  location: "De Bonte Wever, Assen",
  // Pas deze datum aan naar de echte startdatum (YYYY-MM-DDTHH:mm)
  startDate: "2026-09-25T17:00",
  endDate: "2026-09-27T12:00",
  // Moment van de 'Grote Reveal': tot dan zien bezoekers enkel een countdown
  // met teasers. Daarna wordt de onboarding met foto's, video en info over
  // de locatie ontgrendeld.
  revealDate: "2026-04-24T17:00",
};

// Login (later te gebruiken)
export const AUTH = {
  // Gedeelde code voor de hele groep. Leeg laten = geen auth-gate.
  // Dit is 'soft' privacy: de check draait client-side en is te
  // omzeilen via DevTools, maar houdt toevallige bezoekers buiten.
  sharedCode: "",
};

// Supabase
export const SUPABASE = {
  url: "",      // bv. "https://xxxx.supabase.co"
  anonKey: "",  // bv. "eyJhbG..."
};
