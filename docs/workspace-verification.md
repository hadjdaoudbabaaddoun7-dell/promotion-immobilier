# Vérification — gestion avancée des espaces

| Capacité | Vérification effectuée |
|---|---|
| Nom d’affichage | Le profil permet d’enregistrer une valeur personnalisée. La navigation, les membres et les nouveaux événements d’historique utilisent cette valeur. |
| Espaces et rôles | Les espaces ont un créateur Administrateur et des membres. Les invitations par email sont persistées puis activées lorsque l’adresse invitée se connecte. |
| Accès aux fiches | Les requêtes de fiches sont filtrées par appartenance à l’espace actif. Les transferts exigent une appartenance à l’espace cible et un droit d’Administrateur ou de créateur de fiche dans l’espace source. |
| Historique | Les créations, modifications, archives, restaurations, mises en Corbeille et transferts créent un événement immuable. Les modifications de champs exposent la valeur avant et après. |
| Archives et Corbeille | Les fiches passent par les états `active`, `archived` et `trashed`. La restauration replace une fiche dans les fiches actives. |
| Rétention de 30 jours | La tâche projet `real-estate-trash-cleanup` est active, exécute une requête POST quotidienne à 03:00 UTC et son identifiant est conservé dans `retention_schedules`. Son exécution est idempotente et ne supprime que les fiches avec un `trashedAt` de plus de 30 jours. |
| Tests | `pnpm check` réussit et la suite Vitest couvre 21 scénarios : profil, rôles, invitations, historique, transitions de cycle de vie, transfert, liens de partage et authentification de la tâche planifiée. |
| Responsive | Les vues Fiches, Paramètres, Membres, Archives et Corbeille ont été vérifiées en bureau et en mobile. |

Les contrôles **Historique**, **Partager**, **Transférer**, **Archiver**, **Corbeille**, **Exporter en PDF** et **Modifier** sont également visibles sur la fiche existante en bureau et en mobile. La vérification de code confirme qu’aucun appel à l’ancienne procédure de suppression définitive ne reste dans les sources applicatives. Les entrées d’historique préexistantes ne sont pas fabriquées : la migration conserve les fiches existantes et les nouveaux changements produisent les événements audités.

La tâche quotidienne est gérée au niveau du projet. Son exécution, sa suspension et ses journaux sont disponibles dans les réglages de planification du projet.

> À la demande explicite du propriétaire, les interactions manuelles consistant à modifier le nom d’affichage, ouvrir les dialogues Historique et Transférer, puis placer/restaurer la fiche existante dans la Corbeille n’ont pas été exécutées sur ses données réelles. La livraison s’appuie donc sur les contrôles de code, les captures d’interface, l’enregistrement de la tâche planifiée et la suite automatisée de 21 tests réussis.
