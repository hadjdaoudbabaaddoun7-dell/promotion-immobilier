# Vérification — suppression des fiches

| Contrôle | Résultat | Preuve / périmètre |
|---|---|---|
| Suppression protégée par propriétaire | Réussi | La requête de suppression est filtrée simultanément par l’identifiant de la fiche et celui de son propriétaire authentifié. |
| Fiche inexistante | Réussi | La procédure renvoie « Fiche introuvable. » plutôt que de confirmer une suppression inexistante. |
| Confirmation avant suppression | Implémentée | L’action « Supprimer » ouvre une boîte de dialogue explicite avec l’option « Annuler » et le bouton destructif « Supprimer définitivement ». |
| Rafraîchissement sans rechargement | Implémenté | Après succès, la mutation invalide `intakeForms.list`, ce qui demande à la liste active de se recharger immédiatement. |
| Vérification en session connectée | À réaliser par le propriétaire | La session de prévisualisation ne possède pas de compte connecté. Après connexion, confirmer une suppression et vérifier que la ligne ou la carte disparaît sans rechargement manuel. |

Les tests TypeScript et Vitest valident la procédure de suppression réussie, le cas de fiche absente et le passage du propriétaire authentifié à la couche de données.
