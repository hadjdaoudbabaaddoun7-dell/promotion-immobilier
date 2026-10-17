# PWA hors ligne — Dossier Immo

L’application est installable avec un manifeste autonome, des icônes PNG 192 × 192 et 512 × 512, une couleur de thème cohérente et un bouton **Installer l’application**. Le navigateur affiche son invitation d’installation lorsqu’il la prend en charge. Sur iPhone et iPad, le même bouton donne l’instruction d’ajout à l’écran d’accueil.

| Situation | Comportement |
|---|---|
| Connexion disponible | Les fiches et espaces sont mis en cache dans IndexedDB. Les créations et modifications sont enregistrées localement avant leur synchronisation. |
| Hors ligne | L’utilisateur déjà connecté retrouve son identité, ses espaces et ses fiches en cache. Les nouvelles fiches et les modifications s’ajoutent à une file locale horodatée. |
| Réseau restauré | La file est rejouée chronologiquement. Les créations reçoivent leur identifiant serveur, puis les modifications associées sont rejouées. |
| Synchronisation en arrière-plan disponible | Le service worker demande une tâche de synchronisation et rejoue la file sans attendre une interaction utilisateur. |
| Plateforme limitant l’arrière-plan | La synchronisation reprend automatiquement au retour de réseau, au focus ou à la réouverture de l’application. |

La file de synchronisation est protégée contre les doubles créations par un identifiant client unique, persisté côté serveur. Les opérations d’édition s’appuient sur le contrôle d’accès de l’espace de travail existant. La barre d’état indique **En ligne — données synchronisées**, **Hors ligne — enregistré localement**, **Synchronisation des données…**, ou le nombre de modifications en attente.

Les vérifications automatiques couvrent l’enregistrement des fiches dans IndexedDB, l’ordre chronologique de la file, les opérations de création et modification synchronisées avec identité authentifiée, les ressources du manifeste et du service worker, ainsi que le typage global de l’application.

Les actions nécessitant impérativement le serveur — **Historique**, **Partager**, **Transférer**, archivage, restauration et Corbeille — restent explicitement indisponibles hors ligne. Les écrans conservent les actions locales de consultation, impression et modification, puis signalent que les fonctions avancées seront à nouveau disponibles après reconnexion.

| Vérification local-first automatisée | Résultat |
|---|---|
| Ouverture des données sauvegardées | Les fiches synchronisées sont sauvegardées dans IndexedDB par espace et état. |
| Création sans réseau | Une fiche locale reçoit un identifiant client et une opération de création horodatée. |
| Modification sans réseau | Une opération de mise à jour est ajoutée après la création correspondante. |
| Retour de réseau | La file est parcourue du plus ancien au plus récent, bloque une mise à jour dépendante tant que sa création n’a pas reçu d’identifiant serveur, puis remplace l’identifiant local par l’identifiant serveur. |
| Contrat serveur | Les rejouements exigent une identité authentifiée et utilisent les contrôles d’accès de l’espace de travail existants. |

La suite contient 27 tests réussis, dont trois scénarios IndexedDB pour le cache, l’ordre de file et la réconciliation de l’identifiant serveur.

> À la demande explicite du propriétaire, la vérification manuelle dans un navigateur avec bascule réelle hors ligne / en ligne n’a pas été exécutée sur ses données. La livraison s’appuie sur les tests automatisés IndexedDB et serveur, la validation TypeScript, les contrôles visuels des indicateurs bureau et mobile, ainsi que la vérification des ressources du manifeste et du service worker.
