import { Component, createRef, useEffect, useState } from 'react';
import { dico, formats, tr } from '../i18n/index.js';
import './dashboard.css';

const CLE = 'dispatch-revenu';
const POSTES = ['placement', 'charges', 'epargneInv', 'plaisir', 'impot', 'don'];

const DEFS = [
  { key: 'placement', couleur: '#8FBFA8' },
  { key: 'charges', couleur: '#C7B9E6' },
  { key: 'epargneInv', couleur: '#F5CE63' },
  { key: 'plaisir', couleur: '#F08A7E' },
  { key: 'impot', couleur: '#B9A48C' },
  { key: 'don', couleur: '#7FA9C4' },
];

const SOUS = {
  placement: ['tradeRepublic', 'ibkr'],
  charges: ['loyer', 'credit', 'energie', 'eau', 'internet', 'assurances', 'transport'],
  epargneInv: ['banquePhysique', 'banqueEnLigne'],
  plaisir: ['sorties', 'voyages', 'shopping'],
  impot: ['impotRevenu', 'taxes'],
  don: ['association', 'dons'],
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

const num = (e) => { const v = parseFloat(e.target.value); return isNaN(v) ? 0 : v; };

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
    this.t = dico(props.lang).dash;
    this.f = formats(props.lang);
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
    return (SOUS[parent] || []).map((key) => ({ key }));
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
    if (!id || id === 'actuel') return this.t.budgetActuel;
    const h = (this.state.historique || []).find((x) => String(x.id) === String(id));
    return h ? h.periode : '—';
  }

  comparer(a, b) {
    const { fmt } = this.f;
    const A = this.etat(a), B = this.etat(b);
    return DEFS.map((d) => {
      const e = (B[d.key] || 0) - (A[d.key] || 0);
      const bon = d.key === 'placement' || d.key === 'epargneInv';
      return {
        key: d.key, nom: this.t.postes[d.key].nom, couleur: d.couleur,
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
      periode: (s.periode || '').trim() || this.f.moisAnnee(Date.now()),
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
    const { eur0, pct0 } = this.f;
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
        plage: t.max == null ? tr(this.t.auDela, { x: eur0(t.min) }) : eur0(t.min) + ' – ' + eur0(t.max),
        taux: pct0(t.taux),
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
    const T = this.t;
    const { fmt, eur0, pct, pct0, dec1 } = this.f;
    const nomDe = (k) => T.postes[k].nom;
    const salaireBase = s.salaire || 1;
    const alloue = POSTES.reduce((t, k) => t + (s[k] || 0), 0);
    const pctOf = (v) => pct(v / salaireBase * 100);
    const reste = s.salaire - alloue;
    const depassement = reste < -0.5;
    const couleurAlerte = depassement ? '#C0563F' : '#4E7A66';
    const alerte = Math.abs(reste) < 0.5
      ? T.equilibre
      : reste < 0
        ? tr(T.depasseLigne, { x: fmt(-reste) })
        : tr(T.nonAffecte, { x: fmt(reste) });

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
        etiquettes.push({ key: d.key, court: T.postes[d.key].court, x: 50 + ray * Math.sin(mid), y: 50 - ray * Math.cos(mid), taille: f >= 0.08 ? 15 : 12 });
      }
      if (i < DEFS.length - 1) {
        const a = 2 * Math.PI * (Math.min(1, acc) + rot);
        poignees.push({ id: i, label: tr(T.frontiere, { a: nomDe(d.key), b: nomDe(DEFS[i + 1].key) }), x: 50 + 50 * Math.sin(a), y: 50 - 50 * Math.cos(a), props: this.poigneeProps(i, (e) => this.dragTo(i, e)) });
      }
    });
    poignees.push({
      id: 'don', label: tr(T.frontiere, { a: nomDe('don'), b: nomDe('placement') }),
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
        k, label: tr(T.nMois, { n: k }),
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
      return { k, label: tr(T.nMois, { n: k }), ans: tr(T.nAns, { n: dec1(k / 12) }), valeur: fmt(valEp(k)), hauteur: Math.max(4, Math.round(valEp(k) / maxS * 100)) };
    });

    const imp = this.calculImpot();
    const historique = (s.historique || []).slice().reverse();
    const optionsCompare = [{ id: 'actuel', nom: T.budgetActuel }].concat(historique.map((h) => ({ id: String(h.id), nom: h.periode })));

    return (
      <div className="bd" lang={this.props.lang}>
        {depassement && (
          <div className="bd-alerte" role="alert">
            <div className="bd-alerte__ico">!</div>
            <div>
              <div className="bd-alerte__t">{tr(T.depasseTitre, { x: fmt(-reste) })}</div>
              <div className="bd-alerte__d">{tr(T.depasseTexte, { total: fmt(alloue), revenu: fmt(s.salaire) })}</div>
            </div>
          </div>
        )}

        <div className="bd-revenu">
          <label className="bd-revenu__t" htmlFor="bd-revenu">{T.revenu}</label>
          <div className="bd-revenu__row">
            <ChampDiffere id="bd-revenu" valeur={s.salaire} onCommit={(v) => this.set('salaire', Math.max(0, v))} />
            <span className="bd-revenu__eur">€</span>
          </div>
          <div className="gris" style={{ fontSize: 15, marginTop: 4 }}>{T.revenuSous}</div>
        </div>

        <div className="bd-main">
          <div>
            <div className="bd-row bd-row--head">
              <div>{T.colCategorie}</div>
              <div className="bd-right">{T.colMontant}</div>
              <div className="bd-right">{T.colPart}</div>
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
                          <div>{nomDe(d.key)}</div>
                          {sous.length > 0 && (
                            <button type="button" className="bd-chevron" title={T.voirDetail} aria-expanded={ouvert} aria-label={tr(T.detailDe, { nom: nomDe(d.key) })}
                              onClick={() => this.setState({ ouverts: Object.assign({}, s.ouverts, { [d.key]: !ouvert }) })}>
                              {ouvert ? '▾' : '▸'}
                            </button>
                          )}
                        </div>
                        <div className="bd-cat__detail">{T.postes[d.key].detail}</div>
                      </div>
                    </div>
                    <div className="bd-montant">
                      <ChampDiffere aria-label={nomDe(d.key)} valeur={s[d.key] || 0} onCommit={(v) => this.set(d.key, Math.max(0, v))} />
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
                              <div>{T.sous[sd.key]}</div>
                            </div>
                            <div className="bd-montant bd-montant--sous">
                              <input type="number" inputMode="decimal" aria-label={T.sous[sd.key]} value={v}
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
              <div className="bd-total__l">{T.total}</div>
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
                <div className="bd-cam__k">{T.avenir}</div>
                <div className="bd-cam__v">{pct(avenir / salaireBase * 100)}</div>
                <div className="bd-cam__m">{tr(T.parMois, { x: fmt(avenir) })}</div>
              </div>
              {etiquettes.map((l) => (
                <div key={l.key} className="bd-etiq" style={{ left: l.x + '%', top: l.y + '%', fontSize: l.taille }}>{l.court}</div>
              ))}
              {poignees.map((h) => (
                <div key={h.id} className="bd-poignee" role="slider" tabIndex={0} aria-label={h.label}
                  style={{ left: h.x + '%', top: h.y + '%' }} {...h.props} />
              ))}
            </div>
            <div className="bd-cam__aide">{T.aideCam}</div>
          </div>
        </div>

        <div className="bd-urgence">
          <div className="bd-urgence__t">{T.urgTitre}</div>
          <div className="bd-urgence__l">
            <span>{T.urgObjectif}</span>
            <input type="number" className="bd-petit-input bd-petit-input--vert" style={{ width: 90 }} aria-label={T.urgObjectifAria}
              value={s.objectif} onChange={(e) => this.set('objectif', Math.max(0, num(e)))} />
            <span>{T.urgAtteint}</span>
            <ChampDiffere className="bd-petit-input bd-petit-input--vert" style={{ width: 60 }} aria-label={T.urgMoisAria} valeur={moisSecu}
              onCommit={(v) => this.set('objectif', Math.round((s.epargneInv || 0) * Math.max(1, v)))} />
            <span>{T.urgMois}</span>
          </div>
          <div className="bd-barre"><div style={{ width: Math.min(100, Math.round(moisSecu ? 100 / moisSecu : 0)) + '%' }} /></div>
          <div className="bd-urgence__n">{T.urgNote}</div>
        </div>

        <div className="bd-bloc">
          <div className="bd-bloc__head">
            <div>
              <div className="bd-bloc__t" style={{ color: '#4E7A66' }}>{T.etfTitre}</div>
              <div className="bd-bloc__st">{tr(T.etfSous, { x: fmt(s.placement) })}</div>
            </div>
            <div className="bd-params">
              <div>
                <span>{T.horizon}</span>
                <ChampDiffere className="bd-petit-input" style={{ width: 66 }} aria-label={T.horizonAria} valeur={s.moisEtf} onCommit={(v) => this.set('moisEtf', Math.max(1, v))} />
                <span>{tr(T.moisAns, { n: dec1(nE / 12) })}</span>
              </div>
              <div>
                <span>{T.rendement}</span>
                <input type="number" step="0.5" className="bd-petit-input bd-petit-input--vert" style={{ width: 60 }} aria-label={T.rendementAria}
                  value={s.tauxEtf} onChange={(e) => this.set('tauxEtf', num(e))} />
                <span>{T.pctAn}</span>
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
                <div className="gris2" style={{ fontSize: 14 }}>{tr(T.verse, { x: e.verse })}</div>
                <div style={{ fontSize: 14, color: '#4E8C74' }}>+{e.gain}</div>
              </div>
            ))}
          </div>
          <div className="bd-tuiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="bd-tuile" style={{ background: '#E4EFE8' }}>
              <div className="bd-tuile__k" style={{ color: '#4E7A66' }}>{T.totalVerse}</div>
              <div className="bd-tuile__v">{fmt((s.placement || 0) * nE)}</div>
            </div>
            <div className="bd-tuile" style={{ background: '#FDF2DC' }}>
              <div className="bd-tuile__k" style={{ color: '#A8802E' }}>{T.interets}</div>
              <div className="bd-tuile__v">{fmt(valEtf(nE) - (s.placement || 0) * nE)}</div>
            </div>
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">{tr(T.valeurA, { n: nE })}</div>
              <div className="bd-tuile__v">{fmt(valEtf(nE))}</div>
            </div>
          </div>
          <div className="bd-mention">{T.etfMention}</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#E8D9AE' }}>
          <div className="bd-bloc__head">
            <div>
              <div className="bd-bloc__t" style={{ color: '#A8802E' }}>{T.epTitre}</div>
              <div className="bd-bloc__st">{tr(T.epSous, { x: fmt(s.epargneInv) })}</div>
            </div>
            <div className="bd-params">
              <div>
                <span>{T.horizon}</span>
                <ChampDiffere className="bd-petit-input" style={{ width: 66, borderColor: '#E8D9AE' }} aria-label={T.horizonAria} valeur={s.moisEp} onCommit={(v) => this.set('moisEp', Math.max(1, v))} />
                <span>{tr(T.moisAns, { n: dec1(nS / 12) })}</span>
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
              <div className="bd-tuile__k" style={{ color: '#A8802E' }}>{T.versement}</div>
              <div className="bd-tuile__v">{fmt(s.epargneInv)}</div>
            </div>
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">{tr(T.capitalA, { n: nS })}</div>
              <div className="bd-tuile__v">{fmt(valEp(nS))}</div>
            </div>
          </div>
          <div className="bd-mention">{T.epMention}</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#E0D6C8' }}>
          <div className="bd-bloc__head">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="bd-bloc__t" style={{ color: '#8A7355' }}>{T.barTitre}</div>
                <select className="bd-select fr" aria-label={T.barAnneeAria} style={{ fontSize: 20, fontWeight: 400, padding: '6px 10px' }}
                  value={s.annee} onChange={(e) => this.set('annee', e.target.value)}>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <span className="gris3" style={{ fontSize: 15 }}>{T.barPublie}</span>
              </div>
              <div className="bd-bloc__st">{T.barSous}</div>
            </div>
            <div className="bd-params" style={{ gap: 16 }}>
              <div style={{ gap: 8 }}>
                <span>{T.situation}</span>
                <select className="bd-select" value={s.situation} onChange={(e) => this.set('situation', e.target.value)}>
                  <option value="celibataire">{T.celibataire}</option>
                  <option value="couple">{T.couple}</option>
                  <option value="isole">{T.isole}</option>
                </select>
              </div>
              <div style={{ gap: 8 }}>
                <span>{T.personnes}</span>
                <input type="number" min="0" className="bd-petit-input" aria-label={T.personnes}
                  style={{ width: 62, borderColor: '#E0D6C8', borderRadius: 10, padding: '8px 10px' }}
                  value={Math.max(0, Math.round(s.personnes || 0))} onChange={(e) => this.set('personnes', Math.max(0, num(e)))} />
              </div>
            </div>
          </div>

          <div className="bd-cartes3">
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>{T.netAnnuel}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input type="number" aria-label={T.netAnnuel} value={imp.netAnnuel} onChange={(e) => this.set('netAnnuel', num(e))} />
                <span className="fr" style={{ fontSize: 20 }}>€</span>
              </div>
              <div className="gris3" style={{ fontSize: 14, marginTop: 6 }}>{T.netAnnuelNote}</div>
            </div>
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>{T.cumul}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input type="number" aria-label={T.cumul} value={imp.cumulImposable} onChange={(e) => this.set('cumulImposable', num(e))} />
                <span className="fr" style={{ fontSize: 20 }}>€</span>
              </div>
              <div style={{ fontSize: 14, color: '#8A7355', marginTop: 6 }}>{T.cumulNote}</div>
            </div>
            <div className="bd-carte">
              <div className="gris" style={{ fontSize: 16 }}>{T.parts}</div>
              <div className="fr" style={{ fontWeight: 700, fontSize: 30 }}>{imp.parts}</div>
              <div className="gris3" style={{ fontSize: 14, marginTop: 6 }}>{T.partsNote}</div>
            </div>
          </div>

          <div className="gris2" style={{ marginTop: 14, fontSize: 15 }}>
            {tr(T.apresAbattement, { x: eur0(imp.imposable), y: eur0(imp.parPart) })}
          </div>

          <div className="bd-tr bd-tr--head">
            <div>{T.colTranche}</div>
            <div style={{ textAlign: 'center' }}>{T.colTaux}</div>
            <div className="bd-right">{T.colBase}</div>
            <div className="bd-right">{T.colDu}</div>
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
            <div><span>{T.impotBrut}</span><strong>{eur0(imp.impotBrut)}</strong></div>
            <div><span>{T.plafonnement}</span><strong>+ {eur0(0)}</strong></div>
            <div>
              <span>{tr(T.decote, { max: eur0(imp.decoteMax), seuil: eur0(imp.seuilDecote) })}</span>
              <strong style={{ color: '#4E8C74' }}>− {eur0(imp.decote)}</strong>
            </div>
            <div><span>{T.reductionDon}</span><strong style={{ color: '#4E8C74' }}>− {eur0(imp.reductionDon)}</strong></div>
          </div>

          <div className="bd-tuiles" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              [T.impotNet, eur0(imp.impotNet)],
              [T.tauxMoyen, pct(imp.tauxMoyen)],
              [T.tauxMarginal, pct0(imp.tauxMarginal)],
            ].map(([k, v]) => (
              <div key={k} className="bd-tuile" style={{ background: '#F6F1E9' }}>
                <div className="bd-tuile__k" style={{ color: '#8A7355' }}>{k}</div>
                <div className="bd-tuile__v" style={{ fontSize: 24 }}>{v}</div>
              </div>
            ))}
            <div className="bd-tuile bd-tuile--sombre">
              <div className="bd-tuile__k">{T.mensuel}</div>
              <div className="bd-tuile__v" style={{ fontSize: 24 }}>{eur0(imp.impotMensuel)}</div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div className="gris2" style={{ fontSize: 15 }}>
              {tr(T.ecart, { x: fmt(Math.round(imp.impotMensuel) - (s.impot || 0)) })}
            </div>
            <button type="button" className="bd-btn bd-btn--taupe" onClick={() => this.set('impot', Math.round(imp.impotMensuel))}>{T.appliquer}</button>
          </div>
          <div className="bd-mention">{T.barMention}</div>
        </div>

        <div className="bd-bloc" style={{ borderColor: '#C9D8CE' }}>
          <div className="bd-bloc__t" style={{ color: '#4E7A66', fontSize: 26 }}>{T.donTitre}</div>
          <div className="bd-bloc__st">{T.donSous}</div>

          <form style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            onSubmit={(e) => { e.preventDefault(); this.enregistrer(); }}>
            <input type="text" className="bd-texte-input" aria-label={T.nomAria} value={s.periode || ''}
              onChange={(e) => this.setState({ periode: e.target.value })} placeholder={tr(T.nomPh, { m: this.f.moisAnnee(Date.now()) })} />
            <button type="submit" className="bd-btn bd-btn--vert">{T.enregistrer}</button>
          </form>

          <div className="bd-hist bd-hist--head">
            <div>{T.colEnreg}</div>
            <div>{T.colDate}</div>
            <div>{T.colSalaire}</div>
            <div />
          </div>
          {historique.length === 0 && (
            <div className="gris3" style={{ padding: '18px 0', fontSize: 17 }}>{T.vide}</div>
          )}
          {historique.map((h) => (
            <div key={h.id} className="bd-hist bd-hist--ligne">
              <div style={{ fontSize: 17, fontWeight: 800 }}>{h.periode}</div>
              <div className="gris2" style={{ fontSize: 16 }}>{this.f.date(h.id)}</div>
              <div className="fr" style={{ fontSize: 19 }}>{fmt(h.salaire)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="bd-btn bd-btn--charger" onClick={() => this.charger(h.id)}>{T.charger}</button>
                <button type="button" className="bd-btn bd-btn--suppr" onClick={() => this.supprimer(h.id)}>{T.supprimer}</button>
              </div>
            </div>
          ))}

          <div className="gris" style={{ marginTop: 22, fontSize: 17 }}>{T.sauvegarde}</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="bd-btn bd-btn--sombre" onClick={() => this.exporter()}>{T.exporter}</button>
            <label className="bd-btn--import">
              {T.importer}
              <input ref={this.fichier} type="file" accept="application/json" onChange={(e) => this.importer(e)} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginTop: 26, paddingTop: 24, borderTop: '1px solid #DDD5C8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div className="bd-bloc__t" style={{ color: '#4E7A66' }}>{T.cmpTitre}</div>
              <div className="bd-bloc__st">{T.cmpSous}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="bd-btn bd-btn--toggle" onClick={() => this.setState({ cmpOuvert: !s.cmpOuvert })}>{s.cmpOuvert ? T.masquer : T.afficher}</button>
              <select className="bd-select bd-select--grand" aria-label={T.etatA} value={s.cmpA || 'actuel'} onChange={(e) => this.setState({ cmpA: e.target.value })}>
                {optionsCompare.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
              <span className="gris2" style={{ fontSize: 15 }}>{T.vs}</span>
              <select className="bd-select bd-select--grand" aria-label={T.etatB} value={s.cmpB || 'actuel'} onChange={(e) => this.setState({ cmpB: e.target.value })}>
                {optionsCompare.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
          </div>

          {!s.cmpOuvert ? (
            <div className="gris3" style={{ marginTop: 14, fontSize: 17 }}>{T.cmpMasque}</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div className="bd-cmp bd-cmp--head">
                <div>{T.colPoste}</div>
                <div className="bd-right">{this.nomEtat(s.cmpA)}</div>
                <div className="bd-right">{this.nomEtat(s.cmpB)}</div>
                <div className="bd-right">{T.colEcart}</div>
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
          <div className="bd-bloc__t" style={{ color: '#4E7A66', fontSize: 26 }}>{T.conseilTitre}</div>
          <div className="bd-conseil__cartes">
            <div className="bd-conseil__carte">
              <div className="fr" style={{ fontSize: 21 }}>{T.physiqueT}</div>
              <p>{T.physiqueD}</p>
            </div>
            <div className="bd-conseil__carte">
              <div className="fr" style={{ fontSize: 21 }}>{T.enLigneT}</div>
              <p>{T.enLigneD}</p>
            </div>
          </div>
          <p className="bd-conseil__note">
            <strong style={{ color: '#2B3A42' }}>{T.conseilFort}</strong>{T.conseilTexte}
          </p>
        </div>

        <div className="bd-avert">
          <strong style={{ color: '#A6432C' }}>{T.avertFort}</strong>{T.avertTexte}
        </div>
      </div>
    );
  }
}
