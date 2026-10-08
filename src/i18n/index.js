import fr from './fr.js';
import en from './en.js';
import es from './es.js';
import pt from './pt.js';
import de from './de.js';
import it from './it.js';
import nl from './nl.js';

export const LANGUES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'];
export const DEFAUT = 'fr';

const DICOS = { fr, en, es, pt, de, it, nl };

export const LOCALES = {
  fr: 'fr-FR', en: 'en-GB', es: 'es-ES', pt: 'pt-PT', de: 'de-DE', it: 'it-IT', nl: 'nl-NL',
};

export function dico(lang) {
  return DICOS[lang] || DICOS[DEFAUT];
}

export function chemin(lang) {
  return lang === DEFAUT ? '/' : '/' + lang + '/';
}

// Replaces {cle} placeholders with values.
export function tr(texte, vars = {}) {
  return String(texte).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// Locale-aware formatters shared by the interactive components.
export function formats(lang) {
  const loc = LOCALES[lang] || LOCALES[DEFAUT];
  const eur2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur0 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(loc, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct0 = new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 0 });
  const dec1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  return {
    loc,
    fmt: (n) => eur2.format(n || 0),
    eur0: (n) => eur0.format(Math.round(n || 0)),
    pct: (n) => pct.format((n || 0) / 100),
    pct0: (n) => pct0.format((n || 0) / 100),
    dec1: (n) => dec1.format(n || 0),
    date: (d) => new Date(d).toLocaleDateString(loc),
    moisAnnee: (d) => new Date(d).toLocaleDateString(loc, { month: 'long', year: 'numeric' }),
  };
}
