import { useState } from 'react';
import './panneau.css';

const CLE = 'dispatch-contact';
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SUJETS = ['Question sur la méthode', 'Bug ou calcul incohérent', 'Suggestion de fonctionnalité', 'Autre'];

function lire() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}').messages || []; } catch (e) { return []; }
}

function ecrire(messages) {
  try { localStorage.setItem(CLE, JSON.stringify({ messages })); } catch (e) {}
}

const recapDe = (m) => 'Sujet : ' + m.sujet + '\nDe : ' + m.nom + ' (' + m.email + ')\n\n' + m.texte;

export default function Contact({ adresse = 'contact@controlemonrevenu.fr' }) {
  const [messages, setMessages] = useState(lire);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState(SUJETS[0]);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(null);
  const [copie, setCopie] = useState(false);

  function envoyer() {
    const n = nom.trim();
    const mail = email.trim().toLowerCase();
    const texte = message.trim();
    if (!n) return setErreur('Indique ton prénom.');
    if (!EMAIL_OK.test(mail)) return setErreur('Saisis une adresse email valide.');
    if (texte.length < 20) return setErreur('Ton message doit faire au moins 20 caractères.');
    const entree = { id: Date.now(), nom: n, email: mail, sujet, texte };
    const corps = 'De : ' + n + ' (' + mail + ')\n\n' + texte;
    try {
      window.location.href = 'mailto:' + adresse + '?subject=' + encodeURIComponent('[Contrôle mon revenu] ' + sujet) + '&body=' + encodeURIComponent(corps);
    } catch (err) {}
    const liste = messages.concat([entree]);
    setMessages(liste);
    ecrire(liste);
    setEnvoye(entree);
    setErreur('');
    setCopie(false);
    setNom('');
    setEmail('');
    setMessage('');
  }

  function copier() {
    if (!envoye) return;
    try { navigator.clipboard.writeText(recapDe(envoye)); } catch (err) {}
    setCopie(true);
  }

  function supprimer(id) {
    const liste = messages.filter((x) => x.id !== id);
    setMessages(liste);
    ecrire(liste);
  }

  return (
    <div className="pn">
      <div className="pn-2col pn-2col--contact">
        <div>
          <div className="pn-surtitre">CONTACT</div>
          <h2 className="pn-titre" style={{ fontWeight: 400, marginBottom: 0 }}>Une question, une idée&nbsp;?</h2>
          <div className="pn-texte">Dis-moi ce qui te bloque dans le tableau, ce qui manque, ou ce que tu aimerais comprendre. Je lis tout et je réponds sous quelques jours.</div>
          <a href={'mailto:' + adresse} className="pn-mail">✉ {adresse}</a>
          <div className="pn-puces">
            <div><span className="pn-puce" style={{ background: '#8FBFA8' }} />Bug ou incohérence de calcul</div>
            <div><span className="pn-puce" style={{ background: '#F5CE63' }} />Suggestion de fonctionnalité</div>
            <div><span className="pn-puce" style={{ background: '#C7B9E6' }} />Question sur la méthode</div>
          </div>
          <div className="pn-avert">Je ne donne pas de conseil en investissement personnalisé et je ne demande jamais tes identifiants bancaires.</div>
        </div>

        <div className="pn-boite">
          {!envoye ? (
            <form className="pn-form" onSubmit={(e) => { e.preventDefault(); envoyer(); }} noValidate>
              <div className="pn-ligne2">
                <label className="pn-champ">
                  <span className="pn-label">Prénom</span>
                  <input className="pn-input" type="text" autoComplete="given-name" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Camille" />
                </label>
                <label className="pn-champ">
                  <span className="pn-label">Email</span>
                  <input className="pn-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@exemple.fr" />
                </label>
              </div>
              <label className="pn-champ">
                <span className="pn-label">Sujet</span>
                <select className="pn-input" value={sujet} onChange={(e) => setSujet(e.target.value)}>
                  {SUJETS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="pn-champ">
                <span className="pn-label-row">
                  <span className="pn-label">Message</span>
                  <span className="pn-compteur">{message.trim().length} caractère(s)</span>
                </span>
                <textarea className="pn-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explique-moi en quelques lignes…" />
              </label>
              {erreur && <div className="pn-erreur" role="alert">{erreur}</div>}
              <button type="submit" className="pn-btn">Envoyer mon message</button>
              <div className="pn-note">Le bouton ouvre ton logiciel de messagerie avec le message prérempli, adressé à {adresse}.</div>
            </form>
          ) : (
            <div className="pn-ok">
              <div className="pn-ok__ico">✓</div>
              <div className="pn-ok__t">Message prêt à partir</div>
              <div className="pn-texte" style={{ marginTop: 0, lineHeight: 1.55 }}>
                Merci {envoye.nom} — ta messagerie s'est ouverte avec ce message adressé à {adresse}. Si rien ne s'est ouvert, copie-le et envoie-le à cette adresse.
              </div>
              <div className="pn-recap">{recapDe(envoye)}</div>
              <div className="pn-ok__btns">
                <button type="button" className="pn-btn pn-btn--sm" onClick={copier}>{copie ? 'Copié ✓' : 'Copier le message'}</button>
                <button type="button" className="pn-btn-ligne" onClick={() => { setEnvoye(null); setErreur(''); setCopie(false); }}>Nouveau message</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="pn-hist">
          <div className="pn-hist__head">
            <div className="pn-hist__t">MES MESSAGES ENREGISTRÉS</div>
            <div className="pn-petit">{messages.length} sur cet appareil</div>
          </div>
          <div className="pn-hist__list">
            {messages.slice().reverse().map((m) => (
              <div key={m.id} className="pn-hist__item">
                <div>
                  <div className="pn-hist__sujet">{m.sujet}</div>
                  <div className="pn-petit">{m.texte.length > 90 ? m.texte.slice(0, 90) + '…' : m.texte}</div>
                </div>
                <div className="pn-petit">{new Date(m.id).toLocaleDateString('fr-FR')}</div>
                <button type="button" className="pn-btn-suppr" onClick={() => supprimer(m.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
