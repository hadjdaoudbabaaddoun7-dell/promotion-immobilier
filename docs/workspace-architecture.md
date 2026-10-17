# Architecture de gestion des espaces

Chaque fiche appartient à un **Espace**. Un utilisateur peut appartenir à plusieurs espaces et sélectionne son espace actif depuis la navigation. Lors de sa première utilisation, un espace personnel est créé automatiquement afin de préserver le fonctionnement existant des fiches déjà enregistrées.

| Domaine | Modèle retenu | Règle d’accès |
|---|---|---|
| Profil | `displayName` optionnel sur l’utilisateur | La valeur personnalisée remplace le nom du compte dans la navigation, les membres et l’historique. |
| Espaces | Un créateur, des membres, et une configuration de tâche de maintenance | Le créateur est Administrateur. |
| Membres | Rôle `admin` ou `member` | Les Administrateurs gèrent les membres et les invitations. Les Membres créent, consultent, modifient, archivent, restaurent et mettent à la corbeille les fiches de leur espace. |
| Invitations | Invitation par email, activée automatiquement lorsque cette adresse se connecte | Seul un Administrateur crée ou révoque une invitation. L’envoi d’email n’est pas simulé sans service de messagerie configuré. |
| Transferts | Déplacement vers un autre espace dont l’acteur est membre | Administrateur ou créateur de la fiche uniquement. |
| Archives | État `archived` réversible | Tout membre de l’espace peut archiver et restaurer. |
| Corbeille | État `trashed` avec horodatage | Tout membre peut restaurer. Les éléments sont définitivement supprimés après 30 jours. |
| Historique | Événement immuable avec acteur, horodatage et diff JSON par champ | Toute mise à jour et toute transition de cycle de vie génèrent une entrée. |

La purge de la Corbeille s’exécute **une fois par jour** dans une requête authentifiée dédiée. Elle est idempotente : seules les fiches ayant un `trashedAt` antérieur à 30 jours sont supprimées. Une configuration durable conserve l’identifiant de la tâche planifiée afin que celle-ci puisse être auditée ou gérée ultérieurement.
