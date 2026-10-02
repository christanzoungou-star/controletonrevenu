# Contrôle mon revenu — développement et mise en ligne

Site statique Astro + React. Le tableau de dispatch, l'inscription et le contact
fonctionnent entièrement dans le navigateur (localStorage) : aucun serveur, aucune
base de données.

## Structure

```
src/
  layouts/Base.astro        <head>, polices, balises SEO
  pages/index.astro         page d'accueil (d'après « Site Budget »)
  components/Dashboard.jsx  tableau de dispatch (d'après « Budget Ideal »)
  components/Inscription.jsx
  components/Contact.jsx
  styles/site.css           styles de la page (thème ardoise)
public/                     favicon, robots.txt, _headers (en-têtes Cloudflare)
project/, chats/            maquettes Claude Design d'origine (référence)
```

Pour ajouter plus tard des articles de blog : créer `src/pages/blog/…` (fichiers
`.astro` ou `.md`) — ils réutilisent `Base.astro` et sont ajoutés automatiquement
au sitemap.

## En local

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # génère dist/
```

## 1. Publier sur Cloudflare Pages

**Option A — via GitHub (recommandée, redéploiement automatique à chaque push)**

1. Pousser ce dépôt sur GitHub.
2. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → choisir le dépôt.
3. Réglages de build :
   - Framework preset : **Astro**
   - Build command : `npm run build`
   - Build output directory : `dist`
   - Variable d'environnement : `NODE_VERSION` = `22`
4. *Save and Deploy*. Le site est disponible sur `controlemonrevenu.pages.dev`.

**Option B — envoi direct depuis ton ordinateur**

```bash
npx wrangler login
npm run deploy
```

## 2. Brancher le domaine Gandi `controlemonrevenu.fr`

Cloudflare Pages n'accepte un domaine racine (sans `www`) que si son DNS est géré
par Cloudflare. On délègue donc le DNS de Gandi vers Cloudflare (le domaine reste
enregistré et payé chez Gandi).

1. Cloudflare → *Add a domain* → `controlemonrevenu.fr` → offre **Free**.
   Cloudflare importe les enregistrements DNS existants : **vérifie que les
   enregistrements MX / TXT (email) de Gandi sont bien présents** avant de continuer.
2. Cloudflare affiche deux serveurs de noms (ex. `xxx.ns.cloudflare.com`).
3. Gandi → *Noms de domaine* → `controlemonrevenu.fr` → *Serveurs de noms* →
   *Modifier* → **Externes** → saisir les deux serveurs Cloudflare → enregistrer.
   (Si DNSSEC est actif chez Gandi, le désactiver d'abord ; on pourra le réactiver
   depuis Cloudflare ensuite.)
4. Attendre l'e-mail « domaine actif » de Cloudflare (de quelques minutes à 24 h).
5. Cloudflare → projet Pages → *Custom domains* → *Set up a custom domain* :
   ajouter `controlemonrevenu.fr`, puis `www.controlemonrevenu.fr`.
   Cloudflare crée les enregistrements DNS et le certificat HTTPS automatiquement.
6. Rediriger `www` vers le domaine nu : Cloudflare → domaine → *Rules* →
   *Redirect Rules* → modèle « Redirect from WWW to root » (301).

## 3. Adresse de contact

Le formulaire de contact ouvre la messagerie du visiteur vers
`contact@controlemonrevenu.fr`. Cette adresse doit exister : le plus simple est
Cloudflare → domaine → *Email* → *Email Routing* → créer `contact@` et le faire
suivre vers ta boîte personnelle (gratuit). Pour changer l'adresse, modifier
l'attribut `adresse` de `<Contact>` dans `src/pages/index.astro`.
