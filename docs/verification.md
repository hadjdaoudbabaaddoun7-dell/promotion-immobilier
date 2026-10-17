# Vérification de l’application

| Contrôle | Résultat | Preuve / périmètre |
|---|---|---|
| Typage TypeScript | Réussi | `pnpm check` s’exécute sans erreur. |
| Tests unitaires | Réussi | `pnpm test` : 8 tests réussis, couvrant la validation, la recherche et les procédures `get`, `create` et `update`. |
| Migration de base de données | Réussie | La migration `0001_woozy_overlord.sql` a été générée puis la table `intake_forms` et sa clé étrangère ont été créées. |
| Rendu de l’espace de connexion | Réussi | Vérification par capture en format bureau 1280 × 900 et mobile 375 × 812. |
| Parcours connecté | À vérifier par le propriétaire | La prévisualisation ne disposait pas d’une session utilisateur authentifiée. Les écrans protégés et les procédures sont en place, mais la création réelle, la recherche, la modification et l’impression doivent être validées après connexion. |

La fonctionnalité d’export ouvre la boîte d’impression native du navigateur. Pour produire un fichier, l’utilisateur connecté choisit **« Enregistrer au format PDF »** depuis cette boîte de dialogue après avoir sélectionné **« Imprimer / Enregistrer en PDF »**.
