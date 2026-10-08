import { useState } from 'react';
import { dico, formats, tr } from '../i18n/index.js';
import './panneau.css';

const CLE = 'dispatch-contact';
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function lire() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}').messages || []; } catch (e) { return []; }
}

function ecrire(messages) {
  try { localStorage.setItem(CLE, JSON.stringify({ messages })); } catch (e) {}
}

export default function Contact({ lang = 'fr', adresse = 'contact@controlemonrevenu.fr' }) {
  const t = dico(lang).contact;
  const f = formats(lang);
  const sep = lang === 'fr' ? ' : ' : ': ';
  const recapDe = (m) => t.recapSujet + sep + m.sujet + '\n' + t.recapDe + sep + m.nom + ' (' + m.email + ')\n\n' + m.texte;
  const [messages, setMessages] = useState(lire);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState(t.sujets[0]);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(null);
  const [copie, setCopie] = useState(false);

  function envoyer() {
    const n = nom.trim();
    const mail = email.trim().toLowerCase();
    const texte = message.trim();
    if (!n) return setErreur(t.errPrenom);
    if (!EMAIL_OK.test(mail)) return setErreur(t.errEmail);
    if (texte.length < 20) return setErreur(t.errMessage);
    const entree = { id: Date.now(), nom: n, email: mail, sujet, texte };
    const corps = t.recapDe + sep + n + ' (' + mail + ')\n\n' + texte;
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
          <div className="pn-surtitre">{t.surtitre}</div>
          <h2 className="pn-titre" style={{ fontWeight: 400, marginBottom: 0 }}>{t.titre}</h2>
          <div className="pn-texte">{t.texte}</div>
          <a href={'mailto:' + adresse} className="pn-mail">✉ {adresse}</a>
          <div className="pn-puces">
            {t.puces.map((p, i) => (
              <div key={i}><span className="pn-puce" style={{ background: ['#8FBFA8', '#F5CE63', '#C7B9E6'][i] }} />{p}</div>
            ))}
          </div>
          <div className="pn-avert">{t.avert}</div>
        </div>

        <div className="pn-boite">
          {!envoye ? (
            <form className="pn-form" onSubmit={(e) => { e.preventDefault(); envoyer(); }} noValidate>
              <div className="pn-ligne2">
                <label className="pn-champ">
                  <span className="pn-label">{t.prenom}</span>
                  <input className="pn-input" type="text" autoComplete="given-name" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t.phPrenom} />
                </label>
                <label className="pn-champ">
                  <span className="pn-label">{t.email}</span>
                  <input className="pn-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.phEmail} />
                </label>
              </div>
              <label className="pn-champ">
                <span className="pn-label">{t.sujet}</span>
                <select className="pn-input" value={sujet} onChange={(e) => setSujet(e.target.value)}>
                  {t.sujets.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="pn-champ">
                <span className="pn-label-row">
                  <span className="pn-label">{t.message}</span>
                  <span className="pn-compteur">{tr(t.compteur, { n: message.trim().length })}</span>
                </span>
                <textarea className="pn-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.phMessage} />
              </label>
              {erreur && <div className="pn-erreur" role="alert">{erreur}</div>}
              <button type="submit" className="pn-btn">{t.envoyer}</button>
              <div className="pn-note">{tr(t.note, { adresse })}</div>
            </form>
          ) : (
            <div className="pn-ok">
              <div className="pn-ok__ico">✓</div>
              <div className="pn-ok__t">{t.okTitre}</div>
              <div className="pn-texte" style={{ marginTop: 0, lineHeight: 1.55 }}>{tr(t.okTexte, { nom: envoye.nom, adresse })}</div>
              <div className="pn-recap">{recapDe(envoye)}</div>
              <div className="pn-ok__btns">
                <button type="button" className="pn-btn pn-btn--sm" onClick={copier}>{copie ? t.copie : t.copier}</button>
                <button type="button" className="pn-btn-ligne" onClick={() => { setEnvoye(null); setErreur(''); setCopie(false); }}>{t.nouveau}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="pn-hist">
          <div className="pn-hist__head">
            <div className="pn-hist__t">{t.histTitre}</div>
            <div className="pn-petit">{tr(t.histN, { n: messages.length })}</div>
          </div>
          <div className="pn-hist__list">
            {messages.slice().reverse().map((m) => (
              <div key={m.id} className="pn-hist__item">
                <div>
                  <div className="pn-hist__sujet">{m.sujet}</div>
                  <div className="pn-petit">{m.texte.length > 90 ? m.texte.slice(0, 90) + '…' : m.texte}</div>
                </div>
                <div className="pn-petit">{f.date(m.id)}</div>
                <button type="button" className="pn-btn-suppr" onClick={() => supprimer(m.id)}>{t.supprimer}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
