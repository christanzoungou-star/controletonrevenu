import { useState } from 'react';
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

export default function Inscription() {
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
    if (!EMAIL_OK.test(mail)) return setMessage('Saisis une adresse email valide.');
    if (motDePasse.length < 8) return setMessage('Le mot de passe doit faire au moins 8 caractères.');
    const existant = comptes.find((c) => c.email === mail);
    const hash = await empreinte(mail, motDePasse);
    if (inscription) {
      if (!prenom.trim()) return setMessage('Indique ton prénom.');
      if (!accepte) return setMessage('Coche la case pour continuer.');
      if (existant) {
        setMode('connexion');
        return setMessage('Un compte existe déjà avec cet email — connecte-toi.');
      }
      const liste = comptes.concat([{ email: mail, prenom: prenom.trim(), mdp: hash, cree: Date.now() }]);
      setComptes(liste);
      setActif(mail);
      ecrire(liste, mail);
    } else {
      if (!existant) return setMessage('Aucun compte avec cet email.');
      if (existant.mdp !== hash) return setMessage('Mot de passe incorrect.');
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
              <div className="pn-bonjour">Bonjour {compte.prenom}</div>
              <div className="pn-meta">
                {compte.email} · membre depuis {new Date(compte.cree).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="pn-actions">
            <a href="#outil" className="pn-btn">Aller à mon tableau</a>
            <button type="button" className="pn-btn-ligne" onClick={deconnexion}>Se déconnecter</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pn">
      <div className="pn-2col">
        <div>
          <div className="pn-surtitre">{inscription ? 'CRÉER UN COMPTE' : 'SE CONNECTER'}</div>
          <div className="pn-titre">{inscription ? 'Garde ton budget au même endroit' : 'Content de te revoir'}</div>
          <div className="pn-texte">
            Ton compte reste sur cet appareil : il protège l'accès à tes relevés et te permet de retrouver ton budget d'une visite à l'autre. Aucune donnée n'est envoyée sur internet.
          </div>
          <div className="pn-puces">
            <div><span className="pn-puce" style={{ background: '#8FBFA8' }} />Aucun email de vérification, aucun spam</div>
            <div><span className="pn-puce" style={{ background: '#F5CE63' }} />Ton budget rattaché à ton profil</div>
            <div><span className="pn-puce" style={{ background: '#C7B9E6' }} />Export possible à tout moment</div>
          </div>
        </div>

        <form
          className="pn-boite"
          onSubmit={(e) => { e.preventDefault(); valider(); }}
          noValidate
        >
          <div className="pn-onglets" role="tablist">
            <button type="button" role="tab" aria-selected={inscription} className={'pn-onglet' + (inscription ? ' is-actif' : '')}
              onClick={() => { setMode('inscription'); setMessage(''); }}>Créer un compte</button>
            <button type="button" role="tab" aria-selected={!inscription} className={'pn-onglet' + (!inscription ? ' is-actif' : '')}
              onClick={() => { setMode('connexion'); setMessage(''); }}>Se connecter</button>
          </div>

          <div className="pn-form" style={{ marginTop: 18 }}>
            {inscription && (
              <label className="pn-champ">
                <span className="pn-label">Prénom</span>
                <input className="pn-input" type="text" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" />
              </label>
            )}
            <label className="pn-champ">
              <span className="pn-label">Email</span>
              <input className="pn-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@exemple.fr" />
            </label>
            <label className="pn-champ">
              <span className="pn-label">Mot de passe</span>
              <input className="pn-input" type="password" autoComplete={inscription ? 'new-password' : 'current-password'} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="8 caractères minimum" />
            </label>
            {inscription && (
              <label className="pn-check">
                <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                <span>Je comprends que cet outil est une estimation personnelle et ne constitue pas un conseil financier.</span>
              </label>
            )}
            {message && <div className="pn-erreur" role="alert">{message}</div>}
            <button type="submit" className="pn-btn">{inscription ? 'Créer mon compte' : 'Me connecter'}</button>
            <div className="pn-note">Mot de passe stocké localement, sous forme non lisible — si tu l'oublies, réimporte simplement ton fichier d'export.</div>
          </div>
        </form>
      </div>
    </div>
  );
}
