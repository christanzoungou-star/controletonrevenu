import { useState } from 'react';
import { dico, formats, tr } from '../i18n/index.js';
import './panneau.css';

const CLE = 'dispatch-compte';
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function lire() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) { return {}; }
}

function ecrire(comptes, actif) {
  try { localStorage.setItem(CLE, JSON.stringify({ comptes, actif })); } catch (e) {}
}

// Local-only account: the password is stored as a salted SHA-256 digest, never in clear.
async function empreinte(email, mdp) {
  const data = new TextEncoder().encode('cmr:' + email + ':' + mdp);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Inscription({ lang = 'fr' }) {
  const t = dico(lang).insc;
  const f = formats(lang);
  const [sauve] = useState(lire);
  const [comptes, setComptes] = useState(sauve.comptes || []);
  const [actif, setActif] = useState(sauve.actif || null);
  const [mode, setMode] = useState('inscription');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [accepte, setAccepte] = useState(false);
  const [message, setMessage] = useState('');

  const compte = comptes.find((c) => c.email === actif);
  const inscription = mode === 'inscription';

  async function valider() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_OK.test(mail)) return setMessage(t.errEmail);
    if (motDePasse.length < 8) return setMessage(t.errMdp);
    const existant = comptes.find((c) => c.email === mail);
    const hash = await empreinte(mail, motDePasse);
    if (inscription) {
      if (!prenom.trim()) return setMessage(t.errPrenom);
      if (!accepte) return setMessage(t.errCocher);
      if (existant) {
        setMode('connexion');
        return setMessage(t.errExiste);
      }
      const liste = comptes.concat([{ email: mail, prenom: prenom.trim(), mdp: hash, cree: Date.now() }]);
      setComptes(liste);
      setActif(mail);
      ecrire(liste, mail);
    } else {
      if (!existant) return setMessage(t.errAucun);
      if (existant.mdp !== hash) return setMessage(t.errIncorrect);
      setActif(mail);
      ecrire(comptes, mail);
    }
    setMessage('');
    setMotDePasse('');
  }

  function deconnexion() {
    setActif(null);
    setMotDePasse('');
    setMessage('');
    ecrire(comptes, null);
  }

  if (compte) {
    return (
      <div className="pn">
        <div className="pn-profil">
          <div className="pn-profil__id">
            <div className="pn-avatar">{compte.prenom.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="pn-bonjour">{tr(t.bonjour, { prenom: compte.prenom })}</div>
              <div className="pn-meta">{tr(t.membre, { email: compte.email, date: f.moisAnnee(compte.cree) })}</div>
            </div>
          </div>
          <div className="pn-actions">
            <a href="#outil" className="pn-btn">{t.allerTableau}</a>
            <button type="button" className="pn-btn-ligne" onClick={deconnexion}>{t.deconnexion}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pn">
      <div className="pn-2col">
        <div>
          <div className="pn-surtitre">{inscription ? t.surtitreCreer : t.surtitreConnexion}</div>
          <div className="pn-titre">{inscription ? t.titreCreer : t.titreConnexion}</div>
          <div className="pn-texte">{t.texte}</div>
          <div className="pn-puces">
            {t.puces.map((p, i) => (
              <div key={i}><span className="pn-puce" style={{ background: ['#8FBFA8', '#F5CE63', '#C7B9E6'][i] }} />{p}</div>
            ))}
          </div>
        </div>

        <form
          className="pn-boite"
          onSubmit={(e) => { e.preventDefault(); valider(); }}
          noValidate
        >
          <div className="pn-onglets" role="tablist">
            <button type="button" role="tab" aria-selected={inscription} className={'pn-onglet' + (inscription ? ' is-actif' : '')}
              onClick={() => { setMode('inscription'); setMessage(''); }}>{t.ongletCreer}</button>
            <button type="button" role="tab" aria-selected={!inscription} className={'pn-onglet' + (!inscription ? ' is-actif' : '')}
              onClick={() => { setMode('connexion'); setMessage(''); }}>{t.ongletConnexion}</button>
          </div>

          <div className="pn-form" style={{ marginTop: 18 }}>
            {inscription && (
              <label className="pn-champ">
                <span className="pn-label">{t.prenom}</span>
                <input className="pn-input" type="text" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder={t.phPrenom} />
              </label>
            )}
            <label className="pn-champ">
              <span className="pn-label">{t.email}</span>
              <input className="pn-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.phEmail} />
            </label>
            <label className="pn-champ">
              <span className="pn-label">{t.mdp}</span>
              <input className="pn-input" type="password" autoComplete={inscription ? 'new-password' : 'current-password'} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder={t.phMdp} />
            </label>
            {inscription && (
              <label className="pn-check">
                <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                <span>{t.accepte}</span>
              </label>
            )}
            {message && <div className="pn-erreur" role="alert">{message}</div>}
            <button type="submit" className="pn-btn">{inscription ? t.btnCreer : t.btnConnexion}</button>
            <div className="pn-note">{t.note}</div>
          </div>
        </form>
      </div>
    </div>
  );
}
