# Vérification — partage de fiches

| Contrôle | Résultat | Preuve / périmètre |
|---|---|---|
| Stockage du lien | Réussi | La migration `0002_lucky_kronos.sql` crée un jeton unique, un niveau d’autorisation, un état actif et une relation de suppression en cascade avec la fiche. |
| Procédures propriétaire | Réussi | Les tests couvrent la création ou mise à jour d’un lien et la révocation en passant l’identifiant du propriétaire authentifié. |
| Consultation publique | Réussi | Une procédure publique renvoie seulement la fiche désignée par un jeton actif. Elle ne nécessite pas de session de l’espace propriétaire. |
| Restriction Lecture seule | Réussi | Un test vérifie qu’une mutation par lien de type `view` est refusée avec le statut `FORBIDDEN`. |
| Révocation | Réussi | Un test vérifie qu’un lien sans partage actif est refusé avec le statut `NOT_FOUND`. Le parcours public affiche également une page d’accès indisponible pour un lien invalide. |
| Fiche sans lien de partage | Réussi | La requête propriétaire renvoie désormais explicitement `null` avec un statut HTTP 200. La vérification réseau post-correctif confirme que le tableau de bord charge le contrôle « Partager » sans erreur de cache de requête. |
| Rendu des contrôles actifs | Vérification différée à la demande du propriétaire | La prévisualisation authentifiée ne contient actuellement aucune fiche, et aucun contenu factice n’a été créé. La vérification avec une fiche réelle a été explicitement ignorée pour finaliser cette livraison. |

La suite de tests contient 16 scénarios réussis après cette mise à jour. Les liens sont générés avec des octets cryptographiquement aléatoires. La révocation désactive le lien, tandis qu’une réactivation génère un nouveau jeton afin que l’ancienne URL reste inutilisable.
