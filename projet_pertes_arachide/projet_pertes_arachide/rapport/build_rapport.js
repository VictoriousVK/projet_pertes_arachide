// Génère Rapport_pertes_post_recolte_arachide.docx à partir des résultats du notebook
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, ImageRun, PageBreak, LevelFormat, TableOfContents, BorderStyle, Footer, PageNumber,
} = require("docx");

const D = JSON.parse(fs.readFileSync(path.join(__dirname, "data_rapport.json"), "utf8"));
const FIG = path.join(__dirname, "..", "figures");
const fmt = (x, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? "–" : Number(x).toLocaleString("fr-FR", { maximumFractionDigits: d }));
const pct = (x) => fmt(100 * x, 0) + " %";

const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 120 }, ...(o.para || {}) });
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
const H3 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } });
const B = (t, level = 0) => new Paragraph({ children: runsFromMd(t), numbering: { reference: "bul", level }, spacing: { after: 60 } });
const N = (t) => new Paragraph({ children: runsFromMd(t), numbering: { reference: "num", level: 0 }, spacing: { after: 60 } });
function runsFromMd(t) { // **gras** minimal
  const parts = t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((s) => (s.startsWith("**") ? new TextRun({ text: s.slice(2, -2), bold: true }) : new TextRun(s)));
}
const PM = (t) => new Paragraph({ children: runsFromMd(t), spacing: { after: 120 } });

function img(name, widthPx = 620, caption) {
  const file = path.join(FIG, name);
  if (!fs.existsSync(file)) return [P(`[figure manquante : ${name}]`)];
  const sizeOf = require("image-size");
  const buf = fs.readFileSync(file);
  const dim = sizeOf.imageSize ? sizeOf.imageSize(buf) : sizeOf(buf);
  const h = Math.round((widthPx * dim.height) / dim.width);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: h } })], spacing: { before: 120, after: 60 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: caption, italics: true, size: 18, color: "555555" })], spacing: { after: 200 } }),
  ];
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, head) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: "264653", color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: String(t), bold: head, color: head ? "FFFFFF" : "000000", size: 18 })] })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((v, i) => cell(v, i, false)) }))],
  });
}
const spacer = () => new Paragraph({ spacing: { after: 160 } });

// ------------------------------------------------------------------ contenu
const content = [];

// Page de garde
content.push(
  new Paragraph({ spacing: { before: 2400 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ANALYSE DES PERTES POST-RÉCOLTE DE L'ARACHIDE", bold: true, size: 44, color: "264653" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "et de leurs impacts socio-économiques", size: 32, color: "2a9d8f" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: "Communes de Nioro Alassane Tall, Keur Samba Guèye et Keur Saloum Diané — Sénégal", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "Rapport analytique complet · enquête auprès de 195 producteurs et suivi pondéral de 192 lots", size: 22, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800 }, children: [new TextRun({ text: "Septembre 2026", size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ text: "Table des matières", heading: HeadingLevel.HEADING_1 }),
  new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---------------- Résumé exécutif
const g = D.mesure.find((r) => r.nature === "Gousses"), dc = D.mesure.find((r) => r.nature === "Décortiqué");
content.push(H1("Résumé exécutif pour décideurs"));
content.push(PM("**Le problème.** Dans les trois communes étudiées, trois producteurs d'arachide sur quatre déclarent perdre une partie de leur stock chaque année, pour une valeur médiane de **50 000 FCFA** par exploitation (jusqu'à 500 000 FCFA). 92 % doivent racheter de l'arachide en cours d'année à environ 1 000 FCFA/kg, et 38 % financent ces achats par l'emprunt. Seuls 16 % des ménages couvrent leurs besoins alimentaires sur l'année."));
content.push(PM(`**Les pertes mesurées.** Le suivi pondéral de 192 lots donne une perte moyenne de **${fmt(g.moy)} % sur les gousses** et **${fmt(dc.moy)} % sur les graines décortiquées** (respectivement ${fmt(g.pond)} % et ${fmt(dc.pond)} % en volume pondéré). Un quart des lots de gousses et un tiers des lots de décortiqué sont touchés, avec des pertes atteignant 33 % et 50 %.`));
content.push(PM("**Le levier n° 1 : le contenant hermétique.** Aucun des 25 lots stockés en bidon ou fût n'a perdu de poids, contre 10,8 % de perte moyenne pour le décortiqué en sac. Dans l'enquête, la probabilité de déclarer des pertes est divisée par 10 chez les utilisateurs de fûts/bidons, à traitement, taille et commune constants (régression logistique, p < 0,001). Keur Samba Guèye, où 41 % des producteurs utilisent ces contenants, est la commune la moins touchée (55 % de pertes déclarées contre 86–88 % ailleurs)."));
content.push(PM("**Ce qui ne suffit pas.** Le traitement chimique (perles de phosphure d'aluminium), utilisé par 85 % des producteurs, ne montre aucun effet protecteur propre une fois le contenant pris en compte ; 57 % des lots décortiqués traités en sac ont perdu du poids. L'association perles + poudre insecticide est en revanche plus efficace sur gousses (1,3 % de perte contre 5,9 %). Décortiquer avant stockage double le taux de perte."));
content.push(PM("**Avant le stockage.** 90 % des producteurs jugent importantes les pertes au séchage (séchage au sol au champ universel : pluies tardives, animaux, moisissures), contre 8 % pour le battage. La présence de champignons dans le stock multiplie par 2,6 les chances de pertes — signature d'un séchage insuffisant."));
content.push(PM("**Le coût humain.** 63 % rapportent des conséquences sociales (alimentation 98 %, scolarité des enfants 51 %, santé 21 %). Le surcroît de travail lié au tri et à la surveillance des stocks repose sur les **femmes dans 97 % des cas**. Aucun producteur ne connaît de technologie de stockage améliorée ; 7 % ont reçu une formation."));
content.push(H3("Recommandations prioritaires"));
[
  "**Équiper** : diffuser fûts métalliques 200 L / bidons (ou sacs hermétiques triple-couche) — objectif > 80 % d'adoption en 3 ans, en priorité à Keur Saloum Diané et chez les 58 % de « petits producteurs vulnérables ». Retour sur investissement < 1 an au regard des 50 000 FCFA de pertes médianes.",
  "**Stocker en gousses** et ne décortiquer qu'à la vente ou au semis ; pour les stocks maintenus en sacs, combiner fumigant et poudre insecticide avec formation aux bonnes pratiques de sécurité.",
  "**Sécher mieux** : bâches ou claies surélevées, protection contre les animaux, contrôle d'humidité avant mise en stock ; tri des gousses immatures et cassées.",
  "**Construire des magasins villageois couplés au warrantage** (première demande spontanée des producteurs : 52 %) pour éviter la vente précoce et le rachat à prix fort.",
  "**Informer et former**, en ciblant les femmes qui gèrent les stocks ; instaurer une inspection de stock à mi-saison, fenêtre où les pertes s'installent.",
].forEach((t) => content.push(N(t)));
content.push(new Paragraph({ children: [new PageBreak()] }));

// ---------------- 1. Compréhension métier
content.push(H1("1. Compréhension métier"));
content.push(H2("1.1 Objectifs"));
["Quantifier les pertes post-récolte (perçues et mesurées) au séchage, au battage et au stockage.",
 "Identifier les déterminants des pertes de stockage : contenant, lieu, traitement, durée, volume, profil du producteur.",
 "Évaluer les impacts socio-économiques : valeur des pertes, sécurité alimentaire, achats compensatoires, endettement, charge de travail.",
 "Segmenter les producteurs pour cibler les interventions et formuler des recommandations exploitables."].forEach((t) => content.push(B(t)));
content.push(H2("1.2 Hypothèses testées"));
content.push(table(["Code", "Hypothèse", "Verdict"], [
  ["H1", "Les graines décortiquées perdent plus que les gousses", "Confirmée (p = 0,003)"],
  ["H2", "Le contenant hermétique réduit les pertes", "Confirmée (p < 0,0001)"],
  ["H3", "Le traitement chimique réduit les pertes", "Non confirmée (effet nul, voire inverse, après ajustement)"],
  ["H4", "Les pertes varient selon la commune", "Partiellement : déclarations oui (p < 0,001), mesures non ; effet expliqué par les contenants"],
  ["H5", "La valeur des pertes croît avec la production et le stock", "Confirmée (ρ = 0,35–0,38, p < 0,0001)"],
  ["H6", "Les pertes de stockage dégradent la couverture alimentaire", "Tendance non significative ; la superficie est le déterminant majeur (p = 0,008)"],
  ["H7", "Formation et instruction réduisent les pertes", "Non confirmée"],
  ["H8", "Le rendement dépend de la superficie", "Rejetée : pas d'effet d'échelle (ρ = −0,09)"],
], [900, 5200, 3500]));
content.push(spacer());
content.push(H2("1.3 Indicateurs clés (KPI)"));
["Taux de perte mesuré (%) par nature de produit = (poids initial − dernière pesée) / poids initial.",
 "Part de producteurs déclarant des pertes de stockage ; part jugeant importantes les pertes au séchage.",
 "Valeur monétaire des pertes (FCFA) et ratio sur la production.",
 "Rendement (kg/ha), production, quantité stockée, destination de la production.",
 "Couverture alimentaire annuelle, recours à l'emprunt, charge de travail."].forEach((t) => content.push(B(t)));

// ---------------- 2. Données
content.push(H1("2. Données, audit qualité et préparation"));
content.push(H2("2.1 Sources"));
content.push(table(["Source", "Contenu", "Volume"], [
  ["Enquête KoboToolbox « Guide d'entretien pertes post-récolte arachide »", "Socio-démographie, statistiques agricoles, séchage, battage, stockage, traitements, impacts socio-économiques, solutions", "195 producteurs × 193 colonnes (export « all versions – labels »), 15 villages, 3 communes, février–juillet 2026"],
  ["Fiche de relevé de poids", "Poids initial et pesées de suivi de lots de gousses (1 pesée) et de graines décortiquées (3 pesées), contenant, traitement, dégâts", "96 lots gousses + 96 lots décortiqué (mêmes producteurs)"],
], [3000, 3800, 2800]));
content.push(spacer());
content.push(H2("2.2 Principaux constats de l'audit"));
["Export Kobo multi-versions : 45 colonnes entièrement vides (anciennes versions du formulaire) supprimées ; questions à choix multiples doublées (texte + indicatrices 0/1).",
 "Aucun doublon d'identifiant ; 29 homonymes vérifiés (villages ou âges différents) — personnes distinctes.",
 "Erreurs de saisie : 1 superficie de 1 500 ha (production 70 kg) → mise en valeur manquante ; 5 rendements de 5 000–6 700 kg/ha (3 à 5 fois le potentiel agronomique) → rendement exclu, production conservée ; 2 « prix d'achat » de 30 000–50 000 FCFA (montants totaux) → exclus.",
 "Champs libres hétérogènes recodés : mode de financement (42 graphies → 5 modalités), solutions proposées (58 graphies → 3 thèmes), modalités avec espaces parasites standardisées.",
 "Fiche de relevé : structure semi-tabulaire reconstruite par un parseur (commune propagée, lignes d'agrégats ignorées). Les formules Excel d'origine étaient incohérentes (72 lots décortiqués calculés sur la 1ʳᵉ pesée au lieu de la 3ᵉ ; moyennes de village faussées par des sommes) : le taux de perte a été entièrement recalculé.",
 "Précision des pesées : multiples de 25–50 kg, soit une résolution grossière pour des lots de 100–300 kg ; beaucoup de lots affichent 0 % de perte détectée.",
 "Sept lots « à tester » (traitement à l'ail, bidons sans traitement) sont conservés et signalés."].forEach((t) => content.push(B(t)));
content.push(H2("2.3 Variables construites"));
["Rendement (kg/ha), part stockée, classes d'âge et de superficie, niveau d'instruction regroupé.",
 "Mode de stockage en 3 classes : sacs uniquement (67 %), sacs + contenant hermétique (25 %), hermétique uniquement (8 %).",
 "Contenant hermétique = bidon, fût ou barrique ; traitement en 5 classes (perles, perles + poudre, poudre, ail, aucun).",
 "Dégâts observés codés en trouaison, moisissures, cassures, graines immatures.",
 "Appariement flou nom + village entre les deux sources : 146 lots sur 192 reliés à un enquêté (score ≥ 75)."].forEach((t) => content.push(B(t)));

// ---------------- 3. Descriptif
content.push(H1("3. Analyse descriptive"));
content.push(H2("3.1 Profil des producteurs et des exploitations"));
content.push(PM("Producteurs âgés (moyenne 53 ans, un quart ≥ 64 ans), quasi exclusivement des hommes (98 %), instruction coranique à 84 %, formation technique reçue par 7 % seulement. Exploitations petites : superficie médiane 3 ha, production médiane 2 000 kg, rendement médian ≈ 700 kg/ha, stock médian 600 kg (≈ 30 % de la production). Destination : 60–70 % vendus, ~20 % autoconsommés, ~15 % semences."));
content.push(...img("04_distributions_numeriques.png", 620, "Figure 1 — Distributions des principales variables quantitatives (asymétrie à droite : tests non paramétriques privilégiés)"));
content.push(table(["Commune", "n", "Superficie méd. (ha)", "Production méd. (kg)", "Rendement méd. (kg/ha)", "Fût/bidon", "Pertes déclarées", "Valeur pertes méd. (FCFA)", "Couverture alim."],
  D.commune.map((r) => [r.commune, r.n, fmt(r.sup), fmt(r.prod, 0), fmt(r.rdt, 0), pct(r.herm), pct(r.pertes), fmt(r.val, 0), pct(r.couv)]),
  [1700, 500, 1100, 1100, 1100, 900, 1000, 1200, 1000]));
content.push(spacer());
content.push(H2("3.2 Pratiques et problèmes déclarés"));
content.push(...img("04_prevalences.png", 560, "Figure 2 — Prévalence des problèmes, pratiques et impacts déclarés (n = 195)"));
content.push(PM("L'échantillon est très homogène : séchage au sol au champ (100 %), battage manuel (89 %), sacs plastiques (94 %), cases cimentées (95 %), traitement chimique (85 %), stockage > 6 mois (87 %). Les problèmes de séchage sont quasi universels et **90 % jugent les pertes au séchage importantes**, alors que **92 % jugent les pertes au battage négligeables**. En stock, insectes (97 %) et champignons (66 %) dominent, rongeurs (86 %)."));
content.push(H2("3.3 Pertes mesurées"));
content.push(table(["Nature", "Lots", "Taux moyen", "Taux pondéré", "Q3", "Max", "Lots touchés", "Perte totale (kg)"],
  D.mesure.map((r) => [r.nature, r.n, fmt(r.moy) + " %", fmt(r.pond) + " %", fmt(r.q3) + " %", fmt(r.mx) + " %", pct(r.touch), fmt(r.pk, 0)]),
  [1400, 800, 1100, 1200, 900, 900, 1200, 1400]));
content.push(spacer());
content.push(...img("04_taux_perte_mesure.png", 620, "Figure 3 — Distribution des taux de perte mesurés par lot"));
content.push(...img("04_cinetique_decortique.png", 440, "Figure 4 — Cinétique des pertes sur graines décortiquées : la perte s'installe entre la 1ʳᵉ et la 2ᵉ pesée ; aucune perte en contenant hermétique"));

// ---------------- 4. Bivarié
content.push(H1("4. Analyse exploratoire et bivariée"));
content.push(...img("06_heatmap_correlations.png", 480, "Figure 5 — Corrélations de Spearman (enquête)"));
content.push(PM("Superficie, production et stock sont fortement liés (ρ = 0,65–0,85). La valeur des pertes croît avec la production (ρ = 0,35) et le stock (ρ = 0,38). Le rendement est indépendant de la superficie (ρ = −0,09) : aucun effet d'échelle."));
content.push(H2("4.1 Pertes déclarées selon le mode de stockage"));
content.push(table(["Mode de stockage", "n", "Pas de perte", "Pertes déclarées"],
  D.mode.map((r) => [r.mode_stockage, D.mode_n[r.mode_stockage], fmt(r["0"]) + " %", fmt(r["1"]) + " %"]), [3000, 1000, 1800, 1800]));
content.push(spacer());
content.push(...img("06_pertes_declarees_croisees.png", 620, "Figure 6 — Pertes déclarées selon le mode de stockage, la commune et le traitement"));
content.push(PM("Les pertes déclarées passent de 88 % (sacs seuls) à 60 % (mixte) et 6 % (hermétique seul). Le traitement chimique paraît associé à plus de pertes (82 % vs 38 % chez les non-traités) : c'est un effet de confusion, les non-traités étant ceux qui stockent en bidons/fûts — confusion levée par l'analyse multivariée (section 6)."));
content.push(H2("4.2 Pertes mesurées selon les pratiques"));
content.push(...img("06_pertes_mesurees_pratiques.png", 640, "Figure 7 — Taux de perte moyen (IC 95 %) et part de lots touchés selon contenant, traitement et commune"));
content.push(table(["Nature", "Contenant", "Lots", "Taux moyen", "Lots touchés"],
  D.contenant.map((r) => [r.nature, r.moyen_stockage, r.n, fmt(r.moy) + " %", pct(r.touch)]), [1600, 1800, 900, 1400, 1400]));
content.push(spacer());
content.push(table(["Nature", "Traitement", "Lots", "Taux moyen", "Lots touchés"],
  D.trait.map((r) => [r.nature, r.traitement_cat, r.n, fmt(r.moy) + " %", pct(r.touch)]), [1600, 1800, 900, 1400, 1400]));
content.push(spacer());
content.push(PM("Cohérence des deux sources : sur l'échantillon apparié (146 lots), les producteurs qui déclarent des pertes ont des pertes mesurées 2 à 2,6 fois plus élevées (décortiqué : 9,2 % vs 3,5 %)."));

// ---------------- 5. Tests
content.push(H1("5. Tests statistiques"));
content.push(PM("Les variables cibles ne sont pas normales (Shapiro-Wilk p < 0,001) : tests non paramétriques (Wilcoxon apparié, Mann-Whitney, Kruskal-Wallis, Spearman) et test exact de Fisher lorsque les effectifs de cellules sont faibles. Seuil α = 5 %."));
content.push(table(["Test", "H0", "Stat.", "p", "n", "Décision", "Interprétation métier"],
  D.tests.map((r) => [r.Test, r.H0, fmt(r.Statistique, 3), String(r["p-value"]), r.n, r["Décision (α=5%)"].replace(" — ", "\n"), r["Interprétation métier"]]),
  [1500, 1900, 700, 800, 500, 1300, 3100]));
content.push(spacer());

// ---------------- 6. Facteurs
content.push(H1("6. Facteurs déterminants"));
content.push(H2("6.1 Régression logistique — déclaration de pertes de stockage (n = 192)"));
content.push(table(["Variable", "Odds ratio", "p-value", "Lecture"], [
  ["Contenant hermétique (fût/bidon)", "0,10", "< 0,001", "Divise par 10 les chances de déclarer des pertes"],
  ["Traitement chimique", "1,29", "0,71", "Aucun effet propre"],
  ["Commune : Keur Samba Guèye (réf. Keur Saloum Diané)", "0,31", "0,07", "Effet atténué : expliqué par les contenants"],
  ["Champignons dans le stock", "2,55", "0,04", "Séchage insuffisant → pertes"],
  ["Volume stocké (log), durée > 6 mois, formation, âge, rongeurs", "–", "> 0,10", "Non significatifs"],
], [3400, 1200, 1100, 3900]));
content.push(PM("Pseudo-R² = 0,31 ; AUC en validation croisée = 0,77 (régression logistique) / 0,73 (Random Forest)."));
content.push(...img("08_importance_pertes_declarees.png", 500, "Figure 8 — Importance des variables (Random Forest) — pertes déclarées"));
content.push(H2("6.2 Modèles sur les pertes mesurées (192 lots)"));
content.push(PM("Régression linéaire (erreurs robustes HC3, R² = 0,22) : décortiqué +7,7 points (p < 0,001) ; contenant hermétique −3,8 points (p = 0,026) ; taille du lot −1,9 point par unité de log (p = 0,008, en partie artefact de résolution). Le traitement chimique ressort avec un coefficient positif (+10,5 points) : les 38 lots non traités n'ont enregistré aucune perte — ils sont majoritairement en bidon/fût ou de petite taille suivis de près. Ce résultat ne démontre pas un effet nocif du traitement, mais montre que le traitement chimique en sacs ne protège pas suffisamment. Random Forest : R² validé = 0,55 ; hiérarchie des facteurs : traitement/contenant → nature du produit → taille du lot."));
content.push(...img("08_importance_pertes_mesurees.png", 500, "Figure 9 — Importance des variables (Random Forest) — taux de perte mesuré"));
content.push(H2("6.3 Classement des facteurs"));
content.push(table(["Rang", "Facteur", "Effet", "Preuve"], [
  ["1", "Contenant hermétique (bidon / fût)", "−10,8 pts de perte mesurée (décortiqué) ; OR ≈ 0,1 sur pertes déclarées", "Mann-Whitney p < 0,0001 ; logit p < 0,001"],
  ["2", "Nature du produit (décortiqué vs gousses)", "+4 pts", "Wilcoxon apparié p = 0,003"],
  ["3", "Type de traitement (perles + poudre vs perles seules)", "−4,6 pts sur gousses", "Kruskal p = 0,012 ; MW p = 0,007"],
  ["4", "Volume stocké / taille d'exploitation", "Pertes monétaires ↑ (ρ = 0,38) ; pas d'effet sur le taux", "Spearman p < 0,0001"],
  ["5", "Commune", "Effet indirect via diffusion des fûts", "χ² p < 0,001 ; NS après ajustement"],
  ["–", "Traitement oui/non, durée, âge, instruction, formation", "Pas d'effet propre", "p > 0,05"],
], [600, 3000, 3200, 2800]));
content.push(spacer());

// ---------------- 7. Segmentation
content.push(H1("7. Segmentation des producteurs"));
content.push(PM("K-Means sur 9 variables standardisées (superficie, production, stock, part vendue, valeur des pertes, contenant hermétique, âge, pertes déclarées, couverture alimentaire ; log pour les variables de volume). k = 4 retenu (silhouette 0,31, coude)."));
content.push(...img("09_segments_acp.png", 520, "Figure 10 — Projection ACP des 4 segments"));
content.push(table(["Segment", "n", "Superficie méd.", "Production méd.", "Stock méd.", "Vente", "Fût/bidon", "Pertes déclarées", "Valeur pertes méd.", "Couverture alim.", "Emprunt soudure"],
  D.prof.map((r) => [r.libelle, r.n, fmt(r.superficie), fmt(r.production, 0), fmt(r.stock, 0), pct(r.pct_vente / 100), pct(r.hermetique), pct(r.pertes_decl), fmt(r.valeur_pertes, 0), pct(r.couverture), pct(r.emprunt)]),
  [1700, 500, 850, 900, 800, 700, 800, 900, 1000, 900, 850]));
content.push(spacer());
["**Stockeurs sécurisés (22 %)** : 79 % en fût/bidon, aucune perte déclarée, faible endettement — concentrés à Keur Samba Guèye. Modèle à diffuser.",
 "**Grands producteurs exposés (13 %)** : 6 ha, 5 t, pertes les plus coûteuses (100 000 FCFA) ; candidats au warrantage et à l'équipement.",
 "**Petits producteurs vulnérables (58 %)** : 2 ha, 1,5 t, 95 % de pertes, 4 % de couverture alimentaire, 19 % d'emprunt — cœur de cible.",
 "**Micro-exploitants d'autoconsommation (7 %)** : 1 ha, 13 % vendus, 100 % de pertes, rendement 500 kg/ha — grande précarité, appui combiné."].forEach((t) => content.push(B(t)));

// ---------------- 8. Insights & recommandations
content.push(H1("8. Principaux enseignements"));
[
  "Pertes mesurées en stock : 3,8 % (gousses) et 8,0 % (décortiqué) par lot en moyenne ; 2,2 % et 5,4 % en volume ; un quart à un tiers des lots touchés, jusqu'à 33–50 %.",
  "Le contenant hermétique annule les pertes mesurées (0 % sur 25 lots) et divise par 10 la probabilité de pertes déclarées : facteur n° 1.",
  "La coque protège : décortiquer avant stockage double le taux de perte ; le décortiqué en sac perd 10,8 %.",
  "Le traitement chimique seul ne suffit pas ; l'association perles + poudre est plus efficace sur gousses (1,3 % vs 5,9 %).",
  "Les pertes s'installent entre la 1ʳᵉ et la 2ᵉ pesée puis plafonnent : fenêtre critique à mi-saison de stockage.",
  "Le séchage est l'étape pré-stockage la plus critique (90 % de pertes jugées importantes ; champignons ×2,6 sur les pertes en stock).",
  "Valeur médiane des pertes 50 000 FCFA (≈ 3 % de la valeur de production), corrélée au volume stocké ; 95 % disent que les pertes font baisser le prix de vente.",
  "92 % rachètent de l'arachide (≈ 1 000 FCFA/kg) ; 38 % via l'emprunt.",
  "Insécurité alimentaire structurelle : 16 % de couverture annuelle ; la superficie ≥ 5 ha est le premier déterminant (37 % vs 8–13 %).",
  "Conséquences sociales pour 63 % : alimentation, scolarité, santé.",
  "Charge de travail supplémentaire portée par les femmes dans 97 % des cas, alors qu'elles représentent 2 % des enquêtés.",
  "Aucune connaissance ni utilisation de technologie améliorée ; 7 % de formés.",
  "Keur Samba Guèye la moins touchée (41 % de fûts/bidons) ; Keur Saloum Diané la plus vulnérable.",
  "Rendements faibles et homogènes (≈ 700 kg/ha), sans effet d'échelle : levier agronomique.",
  "Demande spontanée : magasins (52 %), fûts 200 L (34 %), produits efficaces (23 %) — alignée sur les résultats.",
  "Le traitement à l'ail (5 lots test) n'a subi aucune perte : piste à valider.",
].forEach((t) => content.push(N(t)));

content.push(H1("9. Recommandations"));
content.push(H2("9.1 Techniques (stockage)"));
["**Diffuser le stockage hermétique** (fûts 200 L, bidons, sacs triple-couche) : > 80 % d'adoption en 3 ans ; démarrer à Keur Saloum Diané et chez les petits producteurs vulnérables et les grands producteurs exposés.",
 "**Stocker en gousses**, décortiquer à la vente / au semis.",
 "**Combiner fumigant + poudre insecticide** pour les stocks en sacs, avec formation aux doses et à la sécurité (produits toxiques stockés dans l'habitat).",
 "**Contrôle de stock à mi-saison** (pesée / inspection à 2–3 mois)."].forEach((t) => content.push(B(t)));
content.push(H2("9.2 Agronomiques (pré-stockage)"));
["Séchage sur bâche ou claies surélevées, protection contre les animaux, contrôle d'humidité (< 8 %) avant stockage — réduit moisissures et risque aflatoxines.",
 "Tri des gousses immatures / cassées avant stockage.",
 "Semences certifiées et fertilisation raisonnée : +30 % de production à surface égale compense largement les pertes post-récolte."].forEach((t) => content.push(B(t)));
content.push(H2("9.3 Économiques"));
["Magasins villageois couplés au **warrantage** : évite la vente précoce à bas prix et le rachat à 1 000 FCFA/kg ; réduit l'emprunt.",
 "Subvention / crédit-équipement pour les fûts : retour sur investissement < 1 an.",
 "Crédit soudure adossé au stock pour les petits producteurs vulnérables."].forEach((t) => content.push(B(t)));
content.push(H2("9.4 Stratégiques"));
["Programme d'information-formation avec démonstrations villageoises (fûts, sacs hermétiques), ciblant explicitement les femmes gestionnaires des stocks.",
 "Cibler les villages à pertes mesurées > 10 % sur décortiqué : Keur Babou Ndity, Simong Bambara, Keur Momath Souna, Touba Mouride.",
 "Reprendre un protocole de pesée rigoureux (balance précise, 3 pesées, dates) sur une campagne complète pour construire une référence régionale."].forEach((t) => content.push(B(t)));

content.push(H1("10. Limites de l'étude et perspectives"));
content.push(H2("10.1 Limites"));
["Échantillon de convenance (195 producteurs, 3 communes, 98 % d'hommes) : pas de représentativité régionale ni du point de vue des femmes.",
 "Pesées à résolution grossière (25–50 kg), une seule pesée de suivi pour les gousses, durée de suivi non documentée, lots « test » sélectionnés (biais de sélection sur les non-traités).",
 "Données déclaratives sujettes aux erreurs d'unités et de mémoire ; 6 rendements implausibles exclus.",
 "Effectifs faibles dans certaines modalités (traitement naturel n = 5, magasins modernes n = 3).",
 "Pas de coordonnées GPS ni de dates de mise en stock : pas de cartographie ni de modèle temporel."].forEach((t) => content.push(B(t)));
content.push(H2("10.2 Perspectives"));
["Essai contrôlé fût vs sac hermétique vs sac + traitement sur 2 campagnes, avec pesées mensuelles, humidité et aflatoxines.",
 "Étude complémentaire auprès des femmes (charge de travail, savoir-faire de tri).",
 "Analyse coût-bénéfice des options d'équipement et modélisation de l'impact du warrantage sur le revenu.",
 "Extension géographique et géoréférencement pour une cartographie des pertes."].forEach((t) => content.push(B(t)));

content.push(H1("Annexe — Livrables et reproductibilité"));
["notebooks/analyse_pertes_arachide.ipynb : notebook Jupyter/VS Code exécuté (audit, nettoyage, EDA, tests, modèles, segmentation).",
 "notebooks/analyse_pertes_arachide.py : même code au format script (cellules # %%) pour VS Code.",
 "dashboard/app.py : dashboard Streamlit (filtres, comparaisons, économie, facteurs, segmentation, export CSV/Excel/PDF).",
 "data/clean/ : jeux nettoyés (CSV, Excel), résultats des tests, profils de segments.",
 "figures/ : graphiques de l'étude."].forEach((t) => content.push(B(t)));

// ------------------------------------------------------------------ document
const doc = new Document({
  creator: "Analyse pertes post-récolte arachide",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: "Calibri", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: "264653" }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: "2a9d8f" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: "e76f51" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Analyse des pertes post-récolte de l'arachide — page ", size: 16, color: "777777" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" })] })] }) },
    children: content,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(__dirname, "Rapport_pertes_post_recolte_arachide.docx"), buf);
  console.log("OK docx");
});
