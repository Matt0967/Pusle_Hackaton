# Pulse : L'Ecosysteme Energetique Vivant

MVP hackathon Engie x Different Intelligence : un jeu de gestion 3D, une dataviz generative et une app de gamification eco-gestes, pilotes par des signaux energetiques temps reel simules.

## Lancer le projet

```bash
npm install
npm run dev
```

Le MVP utilise des mocks deterministes de l'API Eco2mix RTE/Data Gouv et d'Engie Open Data. Aucun token n'est necessaire pour jouer en local.

## Deploiement GitHub Pages

Le projet est configure pour etre publie sur GitHub Pages via GitHub Actions.

URL attendue apres deploiement :

```text
https://matt0967.github.io/Pusle_Hackaton/
```

Commandes utiles :

```bash
npm run build
npm run build:gh-pages
```

Le workflow `.github/workflows/deploy-pages.yml` publie automatiquement `dist/` a chaque push sur `main`. Dans les reglages GitHub du depot, Pages doit utiliser la source **GitHub Actions**.

## Architecture cible

```text
src/
  audio/                 Web Audio API, independant du renderer
  components/hud/        Surcouche DOM : etat, alertes, quetes, upgrades
  data/                  Providers de donnees : mock maintenant, API plus tard
  domain/                Types metier purs : energie, ville, quetes
  scene/                 Composition React Three Fiber
  simulation/            Modeles purs : derivation reseau, progression, quetes
  store/                 Etat applicatif partage par UI, simulation et scene
  utils/                 Helpers generiques
```

### 1. Frontiere donnees

`src/data/EnergyDataProvider.ts` definit le contrat unique :

- `getCurrentSnapshot()` pour l'etat courant du reseau.
- `getForecast(hours)` pour produire les alertes et quetes.

Aujourd'hui, `MockEnergyDataProvider` simule :

- consommation nationale, production, capacite et CO2 par kWh ;
- mix nucleaire, hydraulique, eolien, solaire, gaz, charbon, bioenergies ;
- signaux Engie : facteur de charge eolien, solaire, stockage et flexibilite ;
- scenarios tournants : base, pic national, surplus renouvelable, creux eolien.

Demain, il suffit d'ajouter :

- `RteEco2mixProvider` : ingestion Eco2mix, normalisation en `Eco2mixSnapshot`.
- `EngieOpenDataProvider` : ingestion jeux de donnees Engie, normalisation en `EngieSignalSnapshot`.
- `HybridEnergyDataProvider` : merge temporel, cache, retry, fallback mock.

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

Cette separation permet de rejouer une session, tester les regles sans WebGL, et brancher de vraies donnees sans casser le gameplay.

### 3. Frontiere rendu

`src/scene/PulseCanvas.tsx` est le seul composant qui cree le `Canvas`.

- Mode `city` : micro-citadelle low-poly, habitants, turbines, panneaux solaires, particules de pollution.
- Mode `oracle` : particules generatives pilotees par l'eolien, le solaire et le stress reseau.
- HUD : reste en DOM React pour rester lisible, responsive et rapide a modifier.

Le renderer n'est pas la source de verite. Il reflete les signaux de simulation.

### 4. Boucle MVP

1. Le mock provider emet un snapshot toutes les six secondes.
2. Le modele derive la meteo, le stress reseau et l'humeur de la ville.
3. La ville change visuellement : couleur, vitesse des habitants, pollution, luminosite.
4. Le moteur de quetes choisit une action reelle adaptee au signal.
5. Le joueur valide une quete, gagne des watts civiques, active du bouclier et achete des upgrades.
6. Le mode Oracle traduit les memes signaux en flux 3D abstraits et en musique generative.

### 5. Roadmap hackathon

**MVP 2h**

- Mocks temps reel, ville 3D, mode Oracle, quetes validables.
- State store propre et README defensible devant jury.

**Version demo**

- Adapter Eco2mix reel avec cache cote serveur.
- Ajouter donnees Engie choisies selon disponibilite : eolien, solaire, stockage, conso site.
- Persistance localStorage de la citadelle.
- Timeline previsionnelle 24h et notifications de fenetres favorables.

**Version ambitieuse**

- Backend edge qui agrege RTE, Engie, meteo et prix spot.
- Score d'impact personnel estime, pas seulement declare.
- Quetes collectives : une equipe stabilise un quartier virtuel.
- Installation artistique : mode Oracle plein ecran avec MIDI/Web Audio avance.

## Variables futures

```bash
VITE_DATA_MODE=mock
VITE_RTE_BASE_URL=
VITE_ENGIE_BASE_URL=
```

Pour garder le prototype robuste en hackathon, le mode mock reste le fallback par defaut.

## Licence

MIT, voir `LICENSE`.
