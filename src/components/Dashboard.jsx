import { Component, createRef, useEffect, useState } from 'react';
import './dashboard.css';

const CLE = 'dispatch-revenu';
const POSTES = ['placement', 'charges', 'epargneInv', 'plaisir', 'impot', 'don'];
const DEVISE = '€';

const DEFS = [
  { key: 'placement', nom: 'Placement (Bourse)', court: 'PLACEMENT', detail: 'Investi chaque mois, capitalisé', couleur: '#8FBFA8' },
  { key: 'charges', nom: 'Charges & Loyer', court: 'CHARGES', detail: 'Logement, factures, assurances', couleur: '#C7B9E6' },
  { key: 'epargneInv', nom: 'Épargne Investissement', court: 'ÉPARGNE', detail: "Fonds d'urgence puis investissement", couleur: '#F5CE63' },
  { key: 'plaisir', nom: 'Plaisir & Loisir', court: 'PLAISIR', detail: 'Sorties, voyages, envies', couleur: '#F08A7E' },
  { key: 'impot', nom: 'Impôt', court: 'IMPÔT', detail: 'Prélèvements et taxes', couleur: '#B9A48C' },
  { key: 'don', nom: 'Don', court: 'DON', detail: 'Don mensuel', couleur: '#7FA9C4' },
];

const SOUS = {
  placement: [
    { key: 'tradeRepublic', nom: 'Trade Republic' },
    { key: 'ibkr', nom: 'Interactive Brokers' },
  ],
  charges: [
    { key: 'loyer', nom: 'Loyer' },
    { key: 'credit', nom: 'Crédit' },
    { key: 'energie', nom: 'Électricité / gaz' },
    { key: 'eau', nom: 'Eau' },
    { key: 'internet', nom: 'Internet et téléphone' },
    { key: 'assurances', nom: 'Assurances' },
    { key: 'transport', nom: 'Transport / carburant' },
  ],
  epargneInv: [
    { key: 'banquePhysique', nom: 'Banque physique' },
    { key: 'banqueEnLigne', nom: 'Banque en ligne' },
  ],
  plaisir: [
    { key: 'sorties', nom: 'Sorties / restaurants' },
    { key: 'voyages', nom: 'Voyages' },
    { key: 'shopping', nom: 'Shopping' },
  ],
  impot: [
    { key: 'impotRevenu', nom: 'Impôt sur le revenu' },
    { key: 'taxes', nom: 'Taxes locales' },
  ],
  don: [
    { key: 'association', nom: 'Association' },
    { key: 'dons', nom: 'Dons ponctuels' },
  ],
};

const ETAT_INITIAL = {
  salaire: 3000,
  placement: 800, charges: 700, epargneInv: 700, plaisir: 480, impot: 170, don: 150,
  sous: {
    tradeRepublic: 400, ibkr: 400,
    loyer: 420, credit: 0, energie: 85, eau: 25, internet: 35, assurances: 65, transport: 70,
    banquePhysique: 450, banqueEnLigne: 250,
    sorties: 190, voyages: 190, shopping: 100,
    impotRevenu: 170, taxes: 0,
    association: 150, dons: 0,
  },
  ouverts: {}, historique: [], periode: '', cmpA: 'actuel', cmpB: 'actuel', cmpOuvert: false,
  depart: 0, moisEtf: 60, tauxEtf: 8, moisEp: 60,
  annee: '2025', situation: 'celibataire', personnes: 0, netAnnuel: null, cumulImposable: null,
  objectif: 4200,
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const fmt = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + DEVISE;
const eur0 = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0)) + ' ' + DEVISE;
const virgule = (n, d = 1) => n.toFixed(d).replace('.', ',');
const ans = (mois) => (mois / 12).toFixed(1).replace('.0', '').replace('.', ',');
const num = (e) => { const v = parseFloat(e.target.value); return isNaN(v) ? 0 : v; };

function moisCourant() {
  const d = new Date();
  return MOIS[d.getMonth()] + ' ' + d.getFullYear();
}

function nettoyer(data) {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  Object.keys(ETAT_INITIAL).forEach((k) => { if (k in data) out[k] = data[k]; });
  if (out.sous && typeof out.sous === 'object') out.sous = Object.assign({}, ETAT_INITIAL.sous, out.sous);
  return out;
}

/**
 * Number input that keeps a draft while typing and commits on blur / Enter.
 * Used for fields whose change cascades (revenu, postes with sub-items), so that
 * intermediate keystrokes ("3", "35", "350"…) don't rescale every other amount.
 */
function ChampDiffere({ valeur, onCommit, ...rest }) {
  const [brouillon, setBrouillon] = useState(null);
  useEffect(() => { setBrouillon(null); }, [valeur]);
  const valider = () => {
    if (brouillon == null) return;
    const v = parseFloat(brouillon);
    onCommit(isNaN(v) ? 0 : v);
    setBrouillon(null);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      {...rest}
      value={brouillon ?? valeur}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

export default class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.circle = createRef();
    this.fichier = createRef();
    this.drag = null;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) {}
    this.state = Object.assign({}, ETAT_INITIAL, nettoyer(saved));
  }

  componentDidMount() {
    const s = this.state;
    const somme = POSTES.reduce((t, x) => t + (s[x] || 0), 0);
    if (Math.abs(somme - s.salaire) > 0.5) this.set('salaire', s.salaire);
  }

  componentDidUpdate() {
    try { localStorage.setItem(CLE, JSON.stringify(this.state)); } catch (e) {}
  }

  sousDefs(parent) {
    return SOUS[parent] || [];
  }

  set(k, v) {
    const maj = { [k]: v };
    if (this.sousDefs(k).length) {
      const sous = Object.assign({}, this.state.sous);
      const anc = this.sousDefs(k).reduce((t, d) => t + (sous[d.key] || 0), 0);
      if (Math.abs(anc - v) > 0.5) maj.sous = this.repartir(k, v, sous);
    }
    // The revenu is the reference: changing it rescales every poste proportionally.
    if (k === 'salaire') {
      const s0 = this.state;
      const anc = POSTES.reduce((t, x) => t + (s0[x] || 0), 0);
      if (anc > 0 && Math.abs(anc - v) > 0.5) {
        const r = v / anc;
        let cumul = 0;
        POSTES.forEach((x, i) => {
          const val = i === POSTES.length - 1 ? Math.round(v - cumul) : Math.round((s0[x] || 0) * r);
          cumul += val;
          maj[x] = Math.max(0, val);
        });
        let sous = Object.assign({}, s0.sous);
        POSTES.forEach((x) => {
          const rep = this.repartir(x, maj[x], sous);
          if (rep) sous = rep;
        });
        maj.sous = sous;
      }
    }
    this.setState(maj);
  }

  setSous(parent, k, v) {
    const sous = Object.assign({}, this.state.sous, { [k]: v });
    const total = this.sousDefs(parent).reduce((t, d) => t + (sous[d.key] || 0), 0);
    this.setState({ sous }, () => this.set(parent, Math.round(total)));
  }

  repartir(parent, valeur, sous) {
    const defs = this.sousDefs(parent);
    if (!defs.length) return null;
    const anc = defs.reduce((t, d) => t + (sous[d.key] || 0), 0);
    const out = Object.assign({}, sous);
    if (anc > 0) {
      const r = valeur / anc;
      defs.forEach((d) => { out[d.key] = Math.round((out[d.key] || 0) * r); });
    } else {
      defs.forEach((d, i) => { out[d.key] = i === 0 ? Math.round(valeur) : 0; });
    }
    return out;
  }

  // ----- Historique / comparaison -----
  etat(id) {
    const s = this.state;
    if (!id || id === 'actuel') return DEFS.reduce((o, d) => { o[d.key] = s[d.key] || 0; return o; }, {});
    const h = (s.historique || []).find((x) => String(x.id) === String(id));
    return h ? h.postes : {};
  }

  nomEtat(id) {
    if (!id || id === 'actuel') return 'Budget actuel';
    const h = (this.state.historique || []).find((x) => String(x.id) === String(id));
    return h ? h.periode : '—';
  }

  comparer(a, b) {
    const A = this.etat(a), B = this.etat(b);
    return DEFS.map((d) => {
      const e = (B[d.key] || 0) - (A[d.key] || 0);
      const bon = d.key === 'placement' || d.key === 'epargneInv';
      return {
        key: d.key, nom: d.nom, couleur: d.couleur,
        a: fmt(A[d.key] || 0), b: fmt(B[d.key] || 0),
        ecart: (e > 0 ? '+ ' : e < 0 ? '− ' : '') + fmt(Math.abs(e)),
        couleurEcart: e === 0 ? '#8B979D' : (bon === (e > 0) ? '#4E8C74' : '#C0563F'),
      };
    });
  }

  enregistrer() {
    const s = this.state;
    const entree = {
      id: Date.now(),
      periode: (s.periode || '').trim() || moisCourant(),
      salaire: s.salaire,
      postes: POSTES.reduce((o, k) => { o[k] = s[k] || 0; return o; }, {}),
      sous: Object.assign({}, s.sous),
      reste: s.salaire - (s.impot || 0) - (s.charges || 0),
    };
    const hist = (s.historique || []).filter((h) => h.periode !== entree.periode).concat([entree]);
    this.setState({ historique: hist, periode: '' });
  }

  supprimer(id) {
    this.setState({ historique: (this.state.historique || []).filter((h) => h.id !== id) });
  }

  charger(id) {
    const h = (this.state.historique || []).find((x) => x.id === id);
    if (!h) return;
    this.setState(Object.assign({ salaire: h.salaire, sous: Object.assign({}, h.sous) }, h.postes));
  }

  exporter() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'controle-mon-revenu-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  importer(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { this.setState(nettoyer(JSON.parse(r.result))); } catch (err) {}
    };
    r.readAsText(f);
    e.target.value = '';
  }

  // ----- Barème -----
  bareme() {
    const t = this.state.annee === '2024' ? [11294, 28797, 82341, 177106] : [11600, 29579, 84577, 181917];
    return [
      { min: 0, max: t[0], taux: 0 },
      { min: t[0], max: t[1], taux: 11 },
      { min: t[1], max: t[2], taux: 30 },
      { min: t[2], max: t[3], taux: 41 },
      { min: t[3], max: null, taux: 45 },
    ];
  }

  partsFiscales() {
    const s = this.state, n = Math.max(0, Math.round(s.personnes || 0));
    let p = s.situation === 'couple' ? 2 : 1;
    if (s.situation === 'isole' && n > 0) p += 0.5;
    for (let i = 1; i <= n; i++) p += i <= 2 ? 0.5 : 1;
    return p;
  }

  calculImpot() {
    const s = this.state;
    const parts = this.partsFiscales();
    const netAnnuel = s.netAnnuel != null ? s.netAnnuel : Math.round(s.salaire * 12);
    const cumulImposable = s.cumulImposable != null ? s.cumulImposable : Math.round(netAnnuel * 1.04);
    const abattement = Math.min(Math.max(cumulImposable * 0.1, 504), 14171);
    const imposable = Math.max(0, cumulImposable - abattement);
    const parPart = imposable / parts;
    let impotBrut = 0;
    const tranches = this.bareme().map((t) => {
      const assiette = Math.max(0, Math.min(parPart, t.max == null ? parPart : t.max) - t.min);
      const du = assiette * t.taux / 100 * parts;
      impotBrut += du;
      return {
        plage: t.max == null ? 'au-delà de ' + eur0(t.min) : eur0(t.min) + ' – ' + eur0(t.max),
        taux: t.taux + ' %',
        assiette: eur0(assiette * parts),
        du: eur0(du),
        largeur: Math.max(2, Math.round(assiette / Math.max(1, parPart) * 100)),
      };
    });
    const couple = s.situation === 'couple';
    const decoteMax = couple ? 1470 : 889;
    const seuilDecote = decoteMax / 0.4525;
    const decote = impotBrut > 0 && impotBrut < seuilDecote ? Math.max(0, Math.min(impotBrut, decoteMax - impotBrut * 0.4525)) : 0;
    const reductionDon = Math.min((s.don || 0) * 12, imposable * 0.2) * 0.66;
    const impotNet = Math.max(0, impotBrut - decote - reductionDon);
    return {
      parts, netAnnuel, cumulImposable, imposable, parPart, tranches,
      impotBrut, decote, decoteMax, seuilDecote, reductionDon, impotNet,
      impotMensuel: impotNet / 12,
      tauxMoyen: imposable > 0 ? impotNet / imposable * 100 : 0,
      tauxMarginal: (this.bareme().filter((t) => parPart > t.min).pop() || { taux: 0 }).taux,
    };
  }

  // ----- Camembert -----
  base() {
    const s = this.state;
    const alloue = POSTES.reduce((t, k) => t + (s[k] || 0), 0);
    return alloue > 0 ? alloue : (s.salaire || 1);
  }

  fraction(e) {
    const el = this.circle.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
  }

  // Drag of the handle between poste i and poste i+1: moves money between the two.
  dragTo(i, e) {
    const f = this.fraction(e);
    if (f == null) return;
    const s = this.state, S = this.base();
    let frac = (f - (s.depart || 0)) % 1;
    if (frac < 0) frac += 1;
    const cible = frac * S;
    let avant = 0;
    for (let k = 0; k < i; k++) avant += s[POSTES[k]] || 0;
    const paire = (s[POSTES[i]] || 0) + Math.max(0, s[POSTES[i + 1]] || 0);
    const nouveau = Math.round(Math.min(paire, Math.max(0, cible - avant)) / 5) * 5;
    this.majPaire(POSTES[i], nouveau, POSTES[i + 1], paire - nouveau);
  }

  // Handle at the Don / Placement junction: moves money between Don and Placement.
  transfert(e) {
    const f = this.fraction(e);
    if (f == null) return;
    const s = this.state, S = this.base();
    const paire = (s.placement || 0) + (s.don || 0);
    const fin = ((s.depart || 0) + (s.placement || 0) / S) % 1;
    const ecart = (fin - f + 1) % 1;
    let p = Math.round(ecart * S / 5) * 5;
    if (p > paire) p = ecart - paire / S > 0.5 ? 0 : paire;
    const depart = ((fin - p / S) % 1 + 1) % 1;
    this.setState({ depart });
    this.majPaire('placement', p, 'don', paire - p);
  }

  majPaire(k1, v1, k2, v2) {
    const s = this.state;
    const maj = { [k1]: v1, [k2]: v2 };
    let sous = s.sous;
    [[k1, v1], [k2, v2]].forEach(([k, v]) => {
      const rep = this.repartir(k, v, sous);
      if (rep) sous = rep;
    });
    maj.sous = sous;
    this.setState(maj);
  }

  // Keyboard support for handles: ←/→ (or ↓/↑) move 5 € (50 € with Shift).
  clavier(i, e) {
    const pas = e.shiftKey ? 50 : 5;
    const sens = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!sens) return;
    e.preventDefault();
    const s = this.state;
    const k1 = i === 'don' ? 'don' : POSTES[i];
    const k2 = i === 'don' ? 'placement' : POSTES[i + 1];
    const paire = (s[k1] || 0) + (s[k2] || 0);
    const v1 = Math.min(paire, Math.max(0, (s[k1] || 0) + sens * pas));
    this.majPaire(k1, v1, k2, paire - v1);
  }

  poigneeProps(id, onMove) {
    return {
      onPointerDown: (e) => { e.currentTarget.setPointerCapture(e.pointerId); this.drag = id; },
      onPointerMove: (e) => { if (this.drag === id) onMove(e); },
      onPointerUp: (e) => { this.drag = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} },
      onKeyDown: (e) => this.clavier(id, e),
    };
  }

  render() {
    const s = this.state;
    const salaireBase = s.salaire || 1;
    const alloue = POSTES.reduce((t, k) => t + (s[k] || 0), 0);
    const pctOf = (v) => virgule(v / salaireBase * 100) + ' %';
    const reste = s.salaire - alloue;
    const depassement = reste < -0.5;
    const couleurAlerte = depassement ? '#C0563F' : '#4E7A66';
    const alerte = Math.abs(reste) < 0.5
      ? 'Budget équilibré : 100 % du salaire est affecté.'
      : reste < 0
        ? 'Attention : tes postes dépassent ton salaire de ' + fmt(-reste) + '.'
        : fmt(reste) + ' non affectés — le camembert montre la répartition des montants saisis.';

    // Pie geometry
    const rot = s.depart || 0;
    const baseCam = this.base();
    const stops = [];
    const etiquettes = [];
    const poignees = [];
    let acc = 0;
    DEFS.forEach((d, i) => {
      const f = Math.max(0, s[d.key] || 0) / baseCam;
      stops.push(d.couleur + ' ' + (acc * 100).toFixed(2) + '% ' + ((acc + f) * 100).toFixed(2) + '%');
      acc += f;
      const mid = 2 * Math.PI * (acc - f / 2 + rot);
      const ray = f >= 0.08 ? 34 : (i % 2 ? 44 : 26);
      if (f >= 0.015) {
        etiquettes.push({ key: d.key, court: d.court, x: 50 + ray * Math.sin(mid), y: 50 - ray * Math.cos(mid), taille: f >= 0.08 ? 15 : 12 });
      }
      if (i < DEFS.length - 1) {
        const a = 2 * Math.PI * (Math.min(1, acc) + rot);
        poignees.push({ id: i, label: d.nom + ' / ' + DEFS[i + 1].nom, x: 50 + 50 * Math.sin(a), y: 50 - 50 * Math.cos(a), props: this.poigneeProps(i, (e) => this.dragTo(i, e)) });
      }
    });
    poignees.push({
      id: 'don', label: 'Don / Placement (Bourse)',
      x: 50 + 50 * Math.sin(2 * Math.PI * rot), y: 50 - 50 * Math.cos(2 * Math.PI * rot),
      props: this.poigneeProps('don', (e) => this.transfert(e)),
    });
    const camembert = 'conic-gradient(from ' + (rot * 360).toFixed(2) + 'deg,' + stops.join(',') + ')';

    const avenir = (s.placement || 0) + (s.epargneInv || 0);
    const moisSecu = s.epargneInv > 0 ? Math.ceil(s.objectif / s.epargneInv) : 0;

    // Prévisionnel boursier
    const nE = Math.max(1, Math.round(s.moisEtf || 60));
    const mE = (s.tauxEtf / 100) / 12;
    const valEtf = (k) => (mE === 0 ? (s.placement || 0) * k : (s.placement || 0) * ((Math.pow(1 + mE, k) - 1) / mE));
    const maxE = valEtf(nE) || 1;
    const etapes = [1, 2, 3, 4, 5].map((j) => {
      const k = Math.max(1, Math.round(nE * j / 5));
      return {
        k, label: k + ' mois',
        verse: fmt((s.placement || 0) * k), valeur: fmt(valEtf(k)),
        gain: fmt(valEtf(k) - (s.placement || 0) * k),
        hauteur: Math.max(4, Math.round(valEtf(k) / maxE * 100)),
      };
    });

    // Prévisionnel épargne (simple cumul)
    const nS = Math.max(1, Math.round(s.moisEp || 60));
    const valEp = (k) => (s.epargneInv || 0) * k;
    const maxS = valEp(nS) || 1;
    const etapesEp = [1, 2, 3, 4, 5].map((j) => {
      const k = Math.max(1, Math.round(nS * j / 5));
      return { k, label: k + ' mois', ans: ans(k) + ' an(s)', valeur: fmt(valEp(k)), hauteur: Math.max(4, Math.round(valEp(k) / maxS * 100)) };
    });

    const imp = this.calculImpot();
    const historique = (s.historique || []).slice().reverse();
    const optionsCompare = [{ id: 'actuel', nom: 'Budget actuel' }].concat(historique.map((h) => ({ id: String(h.id), nom: h.periode })));

    return (
      <div className="bd">
        {depassement && (
          <div className="bd-alerte" role="alert">
            <div className="bd-alerte__ico">!</div>
            <div>
              <div className="bd-alerte__t">Budget dépassé de {fmt(-reste)}</div>
              <div className="bd-alerte__d">Le total affecté ({fmt(alloue)}) est supérieur à ton revenu de {fmt(s.salaire)}. Réduis un poste pour revenir à l'équilibre.</div>
            </div>
          </div>
        )}

        <div className="bd-revenu">
          <label className="bd-revenu__t" htmlFor="bd-revenu">Revenu</label>
          <div className="bd-revenu__row">
            <ChampDiffere id="bd-revenu" valeur={s.salaire} onCommit={(v) => this.set('salaire', Math.max(0, v))} />
            <span className="bd-revenu__eur">€</span>
          </div>
          <div className="gris" style={{ fontSize: 15, marginTop: 4 }}>Montant que tu répartis chaque mois</div>
        </div>

        <div className="bd-main">
          <div>
            <div className="bd-row bd-row--head">
              <div>CATÉGORIE</div>
              <div className="bd-right">MONTANT</div>
              <div className="bd-right">PART</div>
            </div>

            {DEFS.map((d) => {
              const sous = this.sousDefs(d.key);
              const ouvert = !!(s.ouverts || {})[d.key];
              return (
                <div key={d.key}>
                  <div className="bd-row bd-row--poste">
                    <div className="bd-cat">
                      <div className="bd-pastille" style={{ background: d.couleur }} />
                      <div>
                        <div className="bd-cat__nom">
                          <div>{d.nom}</div>
                          {sous.length > 0 && (
                            <button type="button" className="bd-chevron" title="Voir le détail" aria-expanded={ouvert} aria-label={'Détail ' + d.nom}
                              onClick={() => this.setState({ ouverts: Object.assign({}, s.ouverts, { [d.key]: !ouvert }) })}>
                              {ouvert ? '▾' : '▸'}
                            </button>
                          )}
                        </div>
                        <div className="bd-cat__detail">{d.detail}</div>
                      </div>
                    </div>
                    <div className="bd-montant">
                      <ChampDiffere aria-label={d.nom} valeur={s[d.key] || 0} onCommit={(v) => this.set(d.key, Math.max(0, v))} />
                      <span>€</span>
                    </div>
                    <div className="bd-pct">{pctOf(s[d.key] || 0)}</div>
                  </div>
                  {ouvert && (
                    <div className="bd-sous">
                      {sous.map((sd) => {
                        const v = (s.sous || {})[sd.key] || 0;
                        return (
                          <div key={sd.key} className="bd-row bd-row--sous">
                            <div className="bd-sous__nom">
                              <div className="bd-sous__trait" style={{ background: d.couleur }} />
                              <div>{sd.nom}</div>
                            </div>
                            <div className="bd-montant bd-montant--sous">
                              <input type="number" inputMode="decimal" aria-label={sd.nom} value={v}
                                onChange={(e) => this.setSous(d.key, sd.key, Math.max(0, num(e)))} />
                              <span>€</span>
                            </div>
                            <div className="bd-sous__pct">{pctOf(v)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="bd-row bd-row--total" style={{ color: couleurAlerte }}>
              <div className="bd-total__l">TOTAL AFFECTÉ</div>
              <div className="bd-total__m">{fmt(alloue)}</div>
              <div className="bd-total__p">{pctOf(alloue)}</div>
            </div>
            {depassement ? (
              <div className="bd-depasse">
                <div className="bd-depasse__ico">!</div>
                <div className="bd-depasse__t">{alerte}</div>
              </div>
            ) : (
              <div className="bd-equilibre">{alerte}</div>
            )}
          </div>

          <div>
            <div ref={this.circle} className="bd-cam" style={{ background: camembert }}>
              <div className="bd-cam__centre">
                <div className="bd-cam__k">POUR L'AVENIR</div>
                <div className="bd-cam__v">{virgule(avenir / salaireBase * 100)} %</div>
                <div className="bd-cam__m">{fmt(avenir)} / mois</div>
              </div>
              {etiquettes.map((l) => (
                <div key={l.key} className="bd-etiq" style={{ left: l.x + '%', top: l.y + '%', fontSize: l.taille }}>{l.court}</div>
              ))}
              {poignees.map((h) => (
                <div key={h.id} className="bd-poignee" role="slider" tabIndex={0} aria-label={'Frontière ' + h.label}
                  style={{ left: h.x + '%', top: h.y + '%' }} {...h.props} />
              ))}
            </div>
            <div className="bd-cam__aide">Fais glisser les poignées du camembert pour réajuster tes postes.</div>
          </div>
        </div>

        <div className="bd-urgence">
          <div className="bd-urgence__t">Fonds d'urgence</div>
          <div className="bd-urgence__l">
            <span>Objectif</span>
            <input type="number" className="bd-petit-input bd-petit-input--vert" style={{ width: 90 }} aria-label="Objectif du fonds d'urgence"
              value={s.objectif} onChange={(e) => this.set('objectif', Math.max(0, num(e)))} />
            <span>€ — atteint en</span>
            <ChampDiffere className="bd-petit-input bd-petit-input--vert" style={{ width: 60 }} aria-label="Nombre de mois" valeur={moisSecu}
              onCommit={(v) => this.set('objectif', Math.round((s.epargneInv || 0) * Math.max(1, v)))} />
            <span>mois</span>
          </div>
          <div className="bd-barre"><div style={{ width: Math.min(100, Math.round(moisSecu ? 100 / moisSecu : 0)) + '%' }} /></div>
          <div className="bd-urgence__n">Puis bascule complète sur l'épargne d'investissement.</div>
        </div>

        <div className="bd-bloc">
          <div className="bd-bloc__head">
            <div>
              <div className="bd-bloc__t" style={{ color: '#4E7A66' }}>PRÉVISIONNEL BOURSIER</div>
              <div className="bd-bloc__st">iShares Core S&amp;P 500 UCITS ETF (Acc) — {fmt(s.placement)} investis chaque mois</div>
            </div>
            <div className="bd-params">
              <div>
                <span>Horizon</span>
                <ChampDiffere className="bd-petit-input" style={{ width: 66 }} aria-label="Horizon en mois" valeur={s.moisEtf} onCommit={(v) => this.set('moisEtf', Math.max(1, v))} />
                <span>mois ({ans(nE)} ans)</span>
              </div>
              <div>
                <span>Rendement</span>
                <input type="number" step="0.5" className="bd-petit-input bd-petit-input--vert" style={{ width: 60 }} aria-label="Rendement annuel"
                  value={s.tauxEtf} onChange={(e) => this.set('tauxEtf', num(e))} />
                <span>% / an</span>
              </div>
            </div>
          </div>
          <div className="bd-barres">
            {etapes.map((e) => (
              <div key={e.k}>
                <div className="bd-barres__v">{e.valeur}</div>
                <div className="bd-barres__b" style={{ height: e.hauteur + '%', background: 'linear-gradient(180deg, #8FBFA8, #6FA98D)' }} />
              </div>
            ))}
          </div>
          <div className="bd-jalons">
            {etapes.map((e) => (
              <div key={e.k}>
                <div className="bd-jalons__l">{e.label}</div>
                <div className="gris2" style={{ fontSize: 14 }}>versé {e.verse}</div>
                <div style={{ fontSize: 14, color: '#4E8C74' }}>+{e.gain}</div>
              </div>
            ))}
          </div>
          <div className="bd-tuiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="bd-tuile" style={{ background: '#E4EFE8' }}>
              <div className="bd-tuile__k" style={{ color: '#4E7A66' }}>Total versé</div>
              <div className="bd-tuile__v">{fmt((s.placement || 0) * nE)}</div>
            </div>
            <div className="bd-tuile" style={{ background: '#FDF2DC' }}>
              <div className="bd-tuile__k" style={{ color: '#A8802E' }}>Intérêts composés</div>
              <div className="bd-tuile__v">{fmt(valEtf(nE) - (s.placement || 0) * nE)}</div>
            </div>
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">Valeur à {nE} mois</div>
              <div className="bd-tuile__v">{fmt(valEtf(nE))}</div>
            </div>
          </div>
          <div className="bd-mention">Simulation à rendement constant, dividendes capitalisés. Les performances passées ne préjugent pas des performances futures.</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#E8D9AE' }}>
          <div className="bd-bloc__head">
            <div>
              <div className="bd-bloc__t" style={{ color: '#A8802E' }}>PRÉVISIONNEL ÉPARGNE INVESTISSEMENT</div>
              <div className="bd-bloc__st">Capital mis de côté — {fmt(s.epargneInv)} versés chaque mois</div>
            </div>
            <div className="bd-params">
              <div>
                <span>Horizon</span>
                <ChampDiffere className="bd-petit-input" style={{ width: 66, borderColor: '#E8D9AE' }} aria-label="Horizon en mois" valeur={s.moisEp} onCommit={(v) => this.set('moisEp', Math.max(1, v))} />
                <span>mois ({ans(nS)} ans)</span>
              </div>
            </div>
          </div>
          <div className="bd-barres">
            {etapesEp.map((e) => (
              <div key={e.k}>
                <div className="bd-barres__v">{e.valeur}</div>
                <div className="bd-barres__b" style={{ height: e.hauteur + '%', background: 'linear-gradient(180deg, #F5CE63, #D9A93C)' }} />
              </div>
            ))}
          </div>
          <div className="bd-jalons" style={{ borderTopColor: '#E8D9AE' }}>
            {etapesEp.map((e) => (
              <div key={e.k}>
                <div className="bd-jalons__l">{e.label}</div>
                <div className="gris2" style={{ fontSize: 14 }}>{e.ans}</div>
              </div>
            ))}
          </div>
          <div className="bd-tuiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="bd-tuile" style={{ background: '#FDF2DC' }}>
              <div className="bd-tuile__k" style={{ color: '#A8802E' }}>Versement mensuel</div>
              <div className="bd-tuile__v">{fmt(s.epargneInv)}</div>
            </div>
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">Capital à {nS} mois</div>
              <div className="bd-tuile__v">{fmt(valEp(nS))}</div>
            </div>
          </div>
          <div className="bd-mention">Capital garanti, sans rémunération : simple cumul des versements. Le fonds d'urgence est constitué en premier, le reste alimente l'épargne d'investissement.</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#E0D6C8' }}>
          <div className="bd-bloc__head">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="bd-bloc__t" style={{ color: '#8A7355' }}>BARÈME FISCAL — REVENUS</div>
                <select className="bd-select fr" aria-label="Année du barème" style={{ fontSize: 20, fontWeight: 400, padding: '6px 10px' }}
                  value={s.annee} onChange={(e) => this.set('annee', e.target.value)}>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <span className="gris3" style={{ fontSize: 15 }}>Barème publié</span>
              </div>
              <div className="bd-bloc__st">Barème progressif, décote, plafonnement du quotient familial et réduction pour don.</div>
            </div>
            <div className="bd-params" style={{ gap: 16 }}>
              <div style={{ gap: 8 }}>
                <span>Situation</span>
                <select className="bd-select" value={s.situation} onChange={(e) => this.set('situation', e.target.value)}>
                  <option value="celibataire">Célibataire</option>
                  <option value="couple">Marié / pacsé</option>
                  <option value="isole">Parent isolé</option>
                </select>
              </div>
              <div style={{ gap: 8 }}>
                <span>Personnes à charge</span>
                <input type="number" min="0" className="bd-petit-input" aria-label="Personnes à charge"
                  style={{ width: 62, borderColor: '#E0D6C8', borderRadius: 10, padding: '8px 10px' }}
                  value={Math.max(0, Math.round(s.personnes || 0))} onChange={(e) => this.set('personnes', Math.max(0, num(e)))} />
              </div>
            </div>
          </div>

          <div className="bd-cartes3">
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>Net avant impôt annuel</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input type="number" aria-label="Net avant impôt annuel" value={imp.netAnnuel} onChange={(e) => this.set('netAnnuel', num(e))} />
                <span className="fr" style={{ fontSize: 20 }}>€</span>
              </div>
              <div className="gris3" style={{ fontSize: 14, marginTop: 6 }}>Initialisé à 12 × ton net mensuel</div>
            </div>
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>Cumul net imposable annuel</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input type="number" aria-label="Cumul net imposable annuel" value={imp.cumulImposable} onChange={(e) => this.set('cumulImposable', num(e))} />
                <span className="fr" style={{ fontSize: 20 }}>€</span>
              </div>
              <div style={{ fontSize: 14, color: '#8A7355', marginTop: 6 }}>Estimation : net avant impôt × 1,04 — saisis le cumul du bulletin de décembre</div>
            </div>
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>Parts fiscales</div>
              <div className="fr" style={{ fontWeight: 700, fontSize: 30 }}>{imp.parts}</div>
              <div className="gris3" style={{ fontSize: 14, marginTop: 6 }}>Calculé depuis ta situation familiale</div>
            </div>
          </div>

          <div className="gris2" style={{ marginTop: 14, fontSize: 15 }}>
            Après abattement de 10 % plafonné : revenu net imposable retenu <strong style={{ color: '#2B3A42' }}>{eur0(imp.imposable)}</strong> — soit {eur0(imp.parPart)} par part.
          </div>

          <div className="bd-tr bd-tr--head">
            <div>TRANCHE (PAR PART)</div>
            <div style={{ textAlign: 'center' }}>TAUX</div>
            <div className="bd-right">BASE IMPOSÉE</div>
            <div className="bd-right">IMPÔT DÛ</div>
          </div>
          {imp.tranches.map((t) => (
            <div key={t.plage} className="bd-tr bd-tr--ligne">
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{t.plage}</div>
                <div className="bd-tr__barre"><div style={{ width: t.largeur + '%' }} /></div>
              </div>
              <div className="fr" style={{ textAlign: 'center', fontSize: 20, color: '#8A7355' }}>{t.taux}</div>
              <div className="bd-right gris" style={{ fontSize: 17 }}>{t.assiette}</div>
              <div className="bd-right fr" style={{ fontSize: 21 }}>{t.du}</div>
            </div>
          ))}

          <div className="bd-recap">
            <div><span>Impôt brut du barème</span><strong>{eur0(imp.impotBrut)}</strong></div>
            <div><span>Plafonnement du quotient familial</span><strong>+ {eur0(0)}</strong></div>
            <div>
              <span>Décote ({eur0(imp.decoteMax)} − 45,25 % de l'impôt brut, applicable sous {eur0(imp.seuilDecote)})</span>
              <strong style={{ color: '#4E8C74' }}>− {eur0(imp.decote)}</strong>
            </div>
            <div><span>Réduction don (66 % du don annuel, plafond 20 % du revenu)</span><strong style={{ color: '#4E8C74' }}>− {eur0(imp.reductionDon)}</strong></div>
          </div>

          <div className="bd-tuiles" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              ['Impôt net annuel', eur0(imp.impotNet)],
              ['Taux moyen', virgule(imp.tauxMoyen) + ' %'],
              ['Tranche marginale', imp.tauxMarginal + ' %'],
            ].map(([k, v]) => (
              <div key={k} className="bd-tuile" style={{ background: '#F6F1E9' }}>
                <div className="bd-tuile__k" style={{ color: '#8A7355' }}>{k}</div>
                <div className="bd-tuile__v" style={{ fontSize: 24 }}>{v}</div>
              </div>
            ))}
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">Par mois</div>
              <div className="bd-tuile__v" style={{ fontSize: 24 }}>{eur0(imp.impotMensuel)}</div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div className="gris2" style={{ fontSize: 15 }}>
              Écart avec ton poste Impôt actuel : <strong style={{ color: '#2B3A42' }}>{fmt(Math.round(imp.impotMensuel) - (s.impot || 0))}</strong> / mois.
            </div>
            <button type="button" className="bd-btn bd-btn--taupe" onClick={() => this.set('impot', Math.round(imp.impotMensuel))}>Appliquer au poste Impôt</button>
          </div>
          <div className="bd-mention">Barème progressif de l'impôt sur le revenu (tranches indicatives). Décote, plafonnement du quotient familial et réduction pour don inclus — estimation indicative, ne remplace pas un calcul officiel.</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#C9D8CE' }}>
          <div className="bd-bloc__t" style={{ color: '#4E7A66', fontSize: 26 }}>MES DONNÉES FINANCIÈRES</div>
          <div className="bd-bloc__st">Enregistre l'état complet de ton budget, retrouve-le ou compare-le mois après mois.</div>

          <form style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            onSubmit={(e) => { e.preventDefault(); this.enregistrer(); }}>
            <input type="text" className="bd-texte-input" aria-label="Nom de l'enregistrement" value={s.periode || ''}
              onChange={(e) => this.setState({ periode: e.target.value })} placeholder={'Nom (ex. ' + moisCourant() + ')'} />
            <button type="submit" className="bd-btn bd-btn--vert">Enregistrer</button>
          </form>

          <div className="bd-hist bd-hist--head">
            <div>ENREGISTREMENT</div>
            <div>DATE</div>
            <div>SALAIRE</div>
            <div />
          </div>
          {historique.length === 0 && (
            <div className="gris3" style={{ padding: '18px 0', fontSize: 17 }}>Aucun enregistrement pour l'instant — nomme ton mois et clique sur Enregistrer.</div>
          )}
          {historique.map((h) => (
            <div key={h.id} className="bd-hist bd-hist--ligne">
              <div style={{ fontSize: 17, fontWeight: 800 }}>{h.periode}</div>
              <div className="gris2" style={{ fontSize: 16 }}>{new Date(h.id).toLocaleDateString('fr-FR')}</div>
              <div className="fr" style={{ fontSize: 19 }}>{fmt(h.salaire)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="bd-btn bd-btn--charger" onClick={() => this.charger(h.id)}>Charger</button>
                <button type="button" className="bd-btn bd-btn--suppr" onClick={() => this.supprimer(h.id)}>Supprimer</button>
              </div>
            </div>
          ))}

          <div className="gris" style={{ marginTop: 22, fontSize: 17 }}>Sauvegarde automatique dans ce navigateur. Exporte un fichier pour conserver tes données ailleurs.</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="bd-btn bd-btn--sombre" onClick={() => this.exporter()}>Exporter (.json)</button>
            <label className="bd-btn--import">
              Importer
              <input ref={this.fichier} type="file" accept="application/json" onChange={(e) => this.importer(e)} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginTop: 26, paddingTop: 24, borderTop: '1px solid #DDD5C8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div className="bd-bloc__t" style={{ color: '#4E7A66' }}>COMPARER DEUX ÉTATS</div>
              <div className="bd-bloc__st">Mesure l'écart entre deux enregistrements, poste par poste.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="bd-btn bd-btn--toggle" onClick={() => this.setState({ cmpOuvert: !s.cmpOuvert })}>{s.cmpOuvert ? 'Masquer' : 'Afficher'}</button>
              <select className="bd-select bd-select--grand" aria-label="État A" value={s.cmpA || 'actuel'} onChange={(e) => this.setState({ cmpA: e.target.value })}>
                {optionsCompare.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
              <span className="gris2" style={{ fontSize: 15 }}>vs</span>
              <select className="bd-select bd-select--grand" aria-label="État B" value={s.cmpB || 'actuel'} onChange={(e) => this.setState({ cmpB: e.target.value })}>
                {optionsCompare.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
          </div>

          {!s.cmpOuvert ? (
            <div className="gris3" style={{ marginTop: 14, fontSize: 17 }}>Tableau masqué — clique sur Afficher pour comparer les deux états.</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div className="bd-cmp bd-cmp--head">
                <div>POSTE</div>
                <div className="bd-right">{this.nomEtat(s.cmpA)}</div>
                <div className="bd-right">{this.nomEtat(s.cmpB)}</div>
                <div className="bd-right">ÉCART</div>
              </div>
              {this.comparer(s.cmpA, s.cmpB).map((c) => (
                <div key={c.key} className="bd-cmp bd-cmp--ligne">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 11, height: 11, borderRadius: 3, background: c.couleur, flex: 'none' }} />
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{c.nom}</div>
                  </div>
                  <div className="bd-cmp__v">{c.a}</div>
                  <div className="bd-cmp__v">{c.b}</div>
                  <div className="bd-cmp__v" style={{ color: c.couleurEcart }}>{c.ecart}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bd-conseil">
          <div className="bd-bloc__t" style={{ color: '#4E7A66', fontSize: 26 }}>CONSEIL — RÉPARTIR SES COMPTES</div>
          <div className="bd-conseil__cartes">
            <div className="bd-conseil__carte">
              <div className="fr" style={{ fontSize: 21 }}>Banque physique</div>
              <p>Elle te donne accès au crédit : acheter de l'immobilier, investir dans un ou plusieurs business qui t'apporteront des revenus supplémentaires. L'historique de tes finances y construit ta crédibilité auprès du banquier.</p>
            </div>
            <div className="bd-conseil__carte">
              <div className="fr" style={{ fontSize: 21 }}>Banque en ligne</div>
              <p>C'est ton compte du quotidien : les plaisirs, les voyages, les prélèvements, les charges et le loyer.</p>
            </div>
          </div>
          <p className="bd-conseil__note">
            <strong style={{ color: '#2B3A42' }}>Idéalement, deux comptes en ligne :</strong> l'un dédié aux charges fixes — loyer, prélèvements, abonnements — l'autre réservé au loisir &amp; plaisir. Le premier compte ne sert qu'à payer ce qui est obligatoire, tu n'y touches pas. Le second contient ton budget plaisir du mois : quand il est vide, tu t'arrêtes.
          </p>
        </div>

        <div className="bd-avert">
          <strong style={{ color: '#A6432C' }}>Outil d'estimation à usage personnel.</strong> Il ne remplace pas le simulateur officiel du site des impôts et ne constitue pas un conseil en investissement. Les données restent dans ce navigateur : pense à exporter une sauvegarde.
        </div>
      </div>
    );
  }
}
