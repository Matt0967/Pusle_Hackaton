# Pulse : L'Ecosysteme Energetique Vivant

MVP hackathon Engie x Different Intelligence : un jeu de gestion 3D, une dataviz generative et une app de gamification eco-gestes, pilotes par des signaux energetiques temps reel simules ou par un backend edge optionnel.

## Lancer le projet

```bash
npm install
npm run dev
```

Le MVP utilise des mocks deterministes de l'API Eco2mix RTE/Data Gouv et d'Engie Open Data. Aucun token n'est necessaire pour jouer en local.

Pour tester le provider edge, lance l'app avec :

```bash
VITE_DATA_MODE=edge npm run dev
```

Sur GitHub Pages, laisse `VITE_DATA_MODE=mock` : Pages est statique et ne peut pas executer `/api/energy`.

## Deploiement GitHub Pages

Le projet est configure pour etre publie sur GitHub Pages.

URL attendue apres deploiement :

```text
https://matt0967.github.io/Pusle_Hackaton/
```

Commandes utiles :

```bash
npm run build
npm run build:gh-pages
npm run build:docs
```

Option la plus simple dans les reglages GitHub du depot :

- Source : **Deploy from a branch**
- Branch : `main`
- Folder : `/docs`

`npm run build:docs` genere le site statique dans `docs/`, pret pour GitHub Pages.

Le workflow `.github/workflows/deploy-pages.yml` est aussi present si Pages est configure en source **GitHub Actions**.

## Architecture cible

```text
src/
  audio/                 Web Audio API, independant du renderer
  components/hud/        Surcouche DOM : etat, alertes, quetes, upgrades
  data/                  Providers de donnees : mock et edge avec fallback
  domain/                Types metier purs : energie, ville, quetes
  scene/                 Composition React Three Fiber
  simulation/            Modeles purs : derivation reseau, progression, quetes, forecast
  store/                 Etat applicatif partage par UI, simulation et scene
  utils/                 Helpers generiques
api/
  energy.ts              Endpoint edge : snapshot RTE/Engie avec cache memoire
  forecast.ts            Endpoint edge : timeline 24h normalisee
```

### 1. Frontiere donnees

`src/data/EnergyDataProvider.ts` definit le contrat unique :

- `getCurrentSnapshot()` pour l'etat courant du reseau.
- `getForecast(hours)` pour produire les alertes et quetes.

Aujourd'hui, deux providers existent :

- `MockEnergyDataProvider`, utilise par defaut pour GitHub Pages et la demo locale.
- `EdgeEnergyDataProvider`, active par `VITE_DATA_MODE=edge`, qui lit `/api/energy` et `/api/forecast` puis retombe en mock si le backend n'existe pas.

Le mock simule :

- consommation nationale, production, capacite et CO2 par kWh ;
- mix nucleaire, hydraulique, eolien, solaire, gaz, charbon, bioenergies ;
- signaux Engie : facteur de charge eolien, solaire, stockage et flexibilite ;
- scenarios tournants : base, pic national, surplus renouvelable, creux eolien.

Le backend edge lit Eco2mix via ODRE/RTE, normalise les champs utiles, garde un cache memoire court et tente d'integrer des flux Engie configurables :

- `ENGIE_WIND_URL`
- `ENGIE_SOLAR_URL`
- `ENGIE_STORAGE_URL`
- `ENGIE_SITE_CONSUMPTION_URL`

La scene 3D ne connait jamais les API. Elle ne lit que `EnergySnapshot` et `DerivedEnergyState`.

### 2. Frontiere simulation

`src/simulation/energyModel.ts` transforme les donnees brutes en signaux jouables :

- `renewableShare` : part renouvelable du mix.
- `saturation` : pression consommation/capacite.
- `carbonPressure` : pression carbone normalisee.
- `gridStress` : `green`, `watch`, `strained`, `critical`.
- `weather` : ciel clair, vent, brume, tempete.
- `cityHealthBase` : sante brute de la citadelle avant actions joueur.

`src/simulation/cityModel.ts` applique ensuite les choix joueur :

- ressources gagnees via eco-gestes ;
- bouclier temporaire ;
- upgrades de ville : toits solaires, isolation, jardins, batteries.
- persistance `localStorage` de la citadelle ;
- score d'impact estime en kWh et CO2 evite ;
- quete collective pour stabiliser le quartier Aurore.

`src/simulation/forecastModel.ts` extrait les fenetres favorables et les pics probables depuis la timeline 24 h.

Cette separation permet de rejouer une session, tester les regles sans WebGL, et brancher de vraies donnees sans casser le gameplay.

### 3. Frontiere rendu

`src/scene/PulseCanvas.tsx` est le seul composant qui cree le `Canvas`.

- Mode `city` : micro-citadelle low-poly, habitants, turbines, panneaux solaires, particules de pollution.
- Mode `oracle` : particules generatives pilotees par l'eolien, le solaire et le stress reseau.
- Voix Oracle : narration robotisee via `speechSynthesis`, declenchable depuis le HUD.
- HUD : reste en DOM React pour rester lisible, responsive et rapide a modifier.

Le renderer n'est pas la source de verite. Il reflete les signaux de simulation.

### 4. Boucle MVP

1. Le mock provider emet un snapshot toutes les six secondes.
2. Le modele derive la meteo, le stress reseau et l'humeur de la ville.
3. La ville change visuellement : couleur, vitesse des habitants, pollution, luminosite.
4. Le moteur de quetes choisit une action reelle adaptee au signal.
5. Le joueur valide une quete, gagne des watts civiques, active du bouclier, nourrit la quete collective et achete des upgrades.
6. La timeline 24 h signale les fenetres favorables pour decaler les usages lourds.
7. Le mode Oracle traduit les memes signaux en flux 3D abstraits, musique generative et voix off.

### 5. Roadmap hackathon

**MVP 2h**

- Mocks temps reel, ville 3D, mode Oracle, quetes validables.
- State store propre et README defensible devant jury.

**Version demo implementee**

- Provider edge Eco2mix avec cache cote serveur.
- Donnees Engie configurables selon disponibilite : eolien, solaire, stockage, conso site.
- Persistance `localStorage` de la citadelle.
- Timeline previsionnelle 24 h et notifications de fenetres favorables.
- Score d'impact personnel estime.
- Quete collective de quartier.
- Voix off Oracle robotisee.

**Version ambitieuse**

- Meteo et prix spot reels dans le backend edge.
- Score d'impact personnel plus fin, base sur appareils, foyer et historique.
- Quetes collectives multi-joueur avec backend temps reel.
- Installation artistique : MIDI/Web Audio avance et controle scene.

## Variables futures

```bash
VITE_DATA_MODE=mock
ENGIE_WIND_URL=
ENGIE_SOLAR_URL=
ENGIE_STORAGE_URL=
ENGIE_SITE_CONSUMPTION_URL=
```

Pour garder le prototype robuste en hackathon, le mode mock reste le fallback par defaut.

## Licence

MIT, voir `LICENSE`.
