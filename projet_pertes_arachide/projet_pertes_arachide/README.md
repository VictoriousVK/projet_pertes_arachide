# Analyse des pertes post-récolte de l'arachide — Sénégal (Nioro Alassane Tall, Keur Samba Guèye, Keur Saloum Diané)

Projet Python reproductible (Jupyter / VS Code) : audit, nettoyage, analyse statistique, modélisation, segmentation, dashboard et rapport.

## Structure
```
projet_pertes_arachide/
├── data/raw/            enquete_arachide_kobo.xlsx, fiche_releve_poids.xlsx (fichiers d'origine)
├── data/clean/          jeux nettoyés (CSV/XLSX), résultats des tests, profils de segments
├── notebooks/
│   ├── analyse_pertes_arachide.ipynb   notebook exécuté (78 cellules, étapes 1 à 10, graphiques inclus)
│   ├── analyse_pertes_arachide.py      même code en script à cellules `# %%` (VS Code : "Run Cell")
│   └── analyse_pertes_arachide.html    export HTML lisible sans Python
├── dashboard/app.py     dashboard Streamlit (étape 11) + requirements.txt
├── figures/             graphiques PNG
└── rapport/             Rapport_pertes_post_recolte_arachide.docx / .pdf (rapport complet + résumé exécutif)
```

## Installation
```bash
python -m venv .venv && source .venv/bin/activate      # Windows : .venv\Scripts\activate
pip install -r dashboard/requirements.txt
```

## Utilisation
1. **Notebook** : `jupyter lab notebooks/analyse_pertes_arachide.ipynb` (ou ouvrir le `.py` dans VS Code et exécuter les cellules).
   Le notebook lit `data/raw/`, écrit `data/clean/` et `figures/`.
2. **Dashboard** : `streamlit run dashboard/app.py` (depuis la racine du projet).
   Filtres commune / village / mode de stockage / superficie / nature du produit ; exports CSV, Excel, PDF.
3. **Rapport** : `rapport/Rapport_pertes_post_recolte_arachide.docx` — dans Word, accepter la mise à jour des champs pour afficher la table des matières.

## Principaux résultats
- Pertes mesurées en stock : 3,8 % (gousses) et 8,0 % (décortiqué) en moyenne par lot ; un quart à un tiers des lots touchés.
- Contenant hermétique (fût/bidon) : 0 % de perte mesurée sur 25 lots ; probabilité de pertes déclarées divisée par 10 (logit, p < 0,001).
- Le traitement chimique seul ne protège pas (effet nul après ajustement) ; perles + poudre plus efficace sur gousses.
- Valeur médiane des pertes : 50 000 FCFA ; 92 % rachètent de l'arachide, 38 % par emprunt ; 16 % de couverture alimentaire annuelle.
- Charge de travail supplémentaire portée par les femmes (97 %) ; aucune connaissance des technologies améliorées.
