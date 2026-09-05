"""
Dashboard interactif — Pertes post-récolte de l'arachide (Nioro Alassane Tall, Keur Samba Guèye, Keur Saloum Diané)
Lancement :  streamlit run dashboard/app.py   (depuis la racine du projet)
Pré-requis : exécuter d'abord le notebook notebooks/analyse_pertes_arachide.ipynb (génère data/clean/*.csv)
"""
import io
import os
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from scipy import stats

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLEAN = os.path.join(ROOT, "data", "clean")

st.set_page_config(page_title="Pertes post-récolte arachide", layout="wide", page_icon="🥜")
PAL = px.colors.qualitative.Set2


# ----------------------------------------------------------------------------- données
@st.cache_data
def load():
    enq = pd.read_csv(os.path.join(CLEAN, "enquete_producteurs_clean.csv"))
    poids = pd.read_csv(os.path.join(CLEAN, "releve_poids_clean.csv"))
    tests = pd.read_excel(os.path.join(CLEAN, "resultats_tests_statistiques.xlsx"))
    prof = pd.read_csv(os.path.join(CLEAN, "profils_segments.csv"))
    return enq, poids, tests, prof


enq_all, poids_all, tests, prof = load()

# ----------------------------------------------------------------------------- filtres
st.sidebar.title("Filtres")
communes = st.sidebar.multiselect("Commune", sorted(enq_all.commune.unique()), default=sorted(enq_all.commune.unique()))
villages_dispo = sorted(enq_all[enq_all.commune.isin(communes)].village.unique())
villages = st.sidebar.multiselect("Village", villages_dispo, default=villages_dispo)
modes = st.sidebar.multiselect("Mode de stockage (enquête)", sorted(enq_all.mode_stockage.unique()), default=sorted(enq_all.mode_stockage.unique()))
sup_min, sup_max = st.sidebar.slider("Superficie (ha)", 0.0, float(np.nanmax(enq_all.superficie_ha)), (0.0, float(np.nanmax(enq_all.superficie_ha))))
natures = st.sidebar.multiselect("Nature du produit (relevé de poids)", ["Gousses", "Décortiqué"], default=["Gousses", "Décortiqué"])

enq = enq_all[enq_all.commune.isin(communes) & enq_all.village.isin(villages) & enq_all.mode_stockage.isin(modes)
              & (enq_all.superficie_ha.fillna(0).between(sup_min, sup_max))]
poids = poids_all[poids_all.commune.isin(communes) & poids_all.village.isin(villages) & poids_all.nature.isin(natures)]

st.sidebar.markdown("---")
st.sidebar.caption(f"{len(enq)} producteurs · {len(poids)} lots pesés sélectionnés")


def dl_buttons(df, name):
    """Boutons de téléchargement CSV / Excel pour un DataFrame."""
    c1, c2 = st.columns(2)
    c1.download_button("⬇️ CSV", df.to_csv(index=False).encode("utf-8-sig"), f"{name}.csv", "text/csv")
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        df.to_excel(xw, index=False, sheet_name=name[:30])
    c2.download_button("⬇️ Excel", buf.getvalue(), f"{name}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


st.title("🥜 Pertes post-récolte de l'arachide — tableau de bord")
st.caption("Enquête auprès de 195 producteurs et suivi pondéral de 192 lots (2026) · bassin arachidier, Sénégal")

tabs = st.tabs(["Vue générale", "Pertes mesurées", "Rendements & production", "Analyse économique", "Facteurs clés", "Segmentation", "Données & export"])

# ----------------------------------------------------------------------------- 1. Vue générale
with tabs[0]:
    c = st.columns(6)
    c[0].metric("Producteurs", len(enq))
    c[1].metric("Production totale (t)", f"{enq.production_kg.sum()/1000:,.0f}")
    c[2].metric("Rendement médian (kg/ha)", f"{enq.rendement_kg_ha.median():,.0f}")
    c[3].metric("Pertes déclarées", f"{100*enq.pertes_stockage.mean():.0f} %")
    c[4].metric("Valeur médiane des pertes", f"{enq.valeur_pertes_fcfa.median():,.0f} FCFA")
    c[5].metric("Couverture alimentaire", f"{100*enq.couverture_alim.mean():.0f} %")

    c1, c2 = st.columns(2)
    g = enq.groupby("commune").agg(producteurs=("id", "size"), pertes=("pertes_stockage", "mean"), hermetique=("stock_hermetique", "mean")).reset_index()
    fig = px.bar(g, x="commune", y=["pertes", "hermetique"], barmode="group", title="Pertes déclarées vs usage de contenants hermétiques, par commune",
                 labels={"value": "Proportion", "variable": ""}, color_discrete_sequence=[PAL[1], PAL[0]])
    fig.for_each_trace(lambda t: t.update(name={"pertes": "Déclare des pertes", "hermetique": "Utilise fût / bidon"}[t.name]))
    c1.plotly_chart(fig, use_container_width=True)

    prev = {"Pertes séchage jugées importantes": (enq.perte_sechage == "Importante").mean(), "Pertes de stockage déclarées": enq.pertes_stockage.mean(),
            "Achat d'arachide de complément": enq.achat_supplementaire.mean(), "Pertes font baisser le prix": enq.baisse_prix.mean(),
            "Surcharge de travail (femmes)": enq.travail_femmes.mean(), "Conséquences sociales": enq.consequences_sociales.mean(),
            "Recours à l'emprunt (soudure)": enq.soudure_emprunt.mean(), "Formation reçue": enq.formation.mean(),
            "Connaît une technologie améliorée": 0.0}
    p = pd.Series(prev).sort_values()
    fig = px.bar(x=p.values * 100, y=p.index, orientation="h", title="Prévalence des impacts et pratiques déclarés (%)", labels={"x": "%", "y": ""}, color_discrete_sequence=[PAL[2]])
    c2.plotly_chart(fig, use_container_width=True)

    st.subheader("Analyse géographique")
    st.info("Les données ne contiennent pas de coordonnées GPS : la vue géographique est une comparaison commune → village. "
            "Ajouter une colonne latitude/longitude dans data/clean/enquete_producteurs_clean.csv activera une carte (px.scatter_mapbox).")
    v = enq.groupby(["commune", "village"]).agg(n=("id", "size"), pertes=("pertes_stockage", "mean"), hermetique=("stock_hermetique", "mean"),
                                                 valeur=("valeur_pertes_fcfa", "median"), rendement=("rendement_kg_ha", "median")).reset_index()
    pm = poids.groupby("village").taux_perte.mean().rename("perte_mesuree").reset_index()
    v = v.merge(pm, on="village", how="left")
    fig = px.treemap(v, path=["commune", "village"], values="n", color="pertes", color_continuous_scale="RdYlGn_r",
                     title="Villages (taille = producteurs enquêtés, couleur = % déclarant des pertes)", hover_data=["hermetique", "valeur", "rendement", "perte_mesuree"])
    st.plotly_chart(fig, use_container_width=True)

# ----------------------------------------------------------------------------- 2. Pertes mesurées
with tabs[1]:
    st.subheader("Suivi pondéral des lots (fiche de relevé)")
    k = poids.groupby("nature").agg(lots=("taux_perte", "size"), taux_moyen=("taux_perte", "mean"), lots_touches=("perte_positive", "mean"),
                                    perte_kg=("perte_kg", "sum"), poids_kg=("poids_initial", "sum")).reset_index()
    k["taux_pondere"] = 100 * k.perte_kg / k.poids_kg
    cols = st.columns(len(k) * 2 or 1)
    for i, r in k.iterrows():
        cols[2 * i].metric(f"{r.nature} — taux moyen", f"{r.taux_moyen:.1f} %", help=f"Pondéré par le poids : {r.taux_pondere:.1f} %")
        cols[2 * i + 1].metric(f"{r.nature} — lots touchés", f"{100*r.lots_touches:.0f} %", help=f"{int(r.lots)} lots")

    c1, c2 = st.columns(2)
    poids["contenant"] = np.where(poids.stockage_hermetique == 1, "Bidon / fût", "Sac")
    fig = px.box(poids, x="nature", y="taux_perte", color="contenant", points="all", title="Taux de perte par nature et contenant", labels={"taux_perte": "Taux de perte (%)"}, color_discrete_sequence=PAL)
    c1.plotly_chart(fig, use_container_width=True)
    g = poids.groupby(["nature", "traitement_cat"]).agg(taux=("taux_perte", "mean"), n=("taux_perte", "size")).reset_index()
    fig = px.bar(g, x="traitement_cat", y="taux", color="nature", barmode="group", text="n", title="Taux de perte moyen par traitement (étiquette = nb lots)", labels={"taux": "Taux de perte (%)", "traitement_cat": ""}, color_discrete_sequence=PAL)
    c2.plotly_chart(fig, use_container_width=True)

    c1, c2 = st.columns(2)
    g = poids.groupby(["commune", "village", "nature"]).taux_perte.mean().reset_index()
    fig = px.bar(g, x="village", y="taux_perte", color="nature", barmode="group", facet_col="commune", facet_col_wrap=3, title="Taux de perte moyen par village", labels={"taux_perte": "%"}, color_discrete_sequence=PAL)
    fig.update_xaxes(matches=None, tickangle=45)
    c1.plotly_chart(fig, use_container_width=True)
    d3 = poids[(poids.nature == "Décortiqué") & (poids.nb_pesees == 3)].copy()
    if len(d3):
        for i, cc in enumerate(["pesee_1", "pesee_2", "pesee_3"], 1):
            d3[f"P{i}"] = 100 * (d3.poids_initial - d3[cc]) / d3.poids_initial
        kin = d3.groupby("contenant")[["P1", "P2", "P3"]].mean().T.reset_index().rename(columns={"index": "pesée"})
        kin = pd.concat([pd.DataFrame({"pesée": ["P0"], **{c: [0] for c in kin.columns if c != "pesée"}}), kin])
        fig = px.line(kin.melt(id_vars="pesée"), x="pesée", y="value", color="variable", markers=True, title="Cinétique des pertes — décortiqué", labels={"value": "Perte cumulée (%)", "variable": ""}, color_discrete_sequence=PAL)
        c2.plotly_chart(fig, use_container_width=True)
    deg = poids.groupby("nature")[["degat_trouaison", "degat_moisissure", "degat_cassure", "degat_immature"]].mean().T * 100
    deg.index = ["Trouaison / perforation", "Moisissures", "Cassures", "Graines immatures"]
    st.plotly_chart(px.bar(deg.reset_index().melt(id_vars="index"), x="index", y="value", color="nature", barmode="group", title="Nature des dégâts observés (% des lots)", labels={"value": "%", "index": ""}, color_discrete_sequence=PAL), use_container_width=True)

# ----------------------------------------------------------------------------- 3. Rendements
with tabs[2]:
    c1, c2 = st.columns(2)
    c1.plotly_chart(px.box(enq, x="commune", y="rendement_kg_ha", color="commune", points="all", title="Rendement (kg/ha) par commune", color_discrete_sequence=PAL), use_container_width=True)
    c2.plotly_chart(px.box(enq, x="classe_superficie", y="rendement_kg_ha", color="classe_superficie", title="Rendement par classe de superficie", category_orders={"classe_superficie": ["≤1 ha", "2 ha", "3-4 ha", "≥5 ha"]}, color_discrete_sequence=PAL), use_container_width=True)
    c1, c2 = st.columns(2)
    c1.plotly_chart(px.scatter(enq.dropna(subset=["superficie_ha", "production_kg"]), x="superficie_ha", y="production_kg", color="commune", size="qte_stockee_kg", hover_data=["village", "rendement_kg_ha"], title="Production vs superficie (taille = stock)", color_discrete_sequence=PAL), use_container_width=True)
    dest = enq[["pct_vente", "pct_autoconso", "pct_semence"]].mean().rename({"pct_vente": "Vente", "pct_autoconso": "Autoconsommation", "pct_semence": "Semence"})
    c2.plotly_chart(px.pie(values=dest.values, names=dest.index, title="Destination moyenne de la production", color_discrete_sequence=PAL), use_container_width=True)
    st.dataframe(enq.groupby(["commune", "village"]).agg(producteurs=("id", "size"), superficie_med=("superficie_ha", "median"), production_med=("production_kg", "median"), rendement_med=("rendement_kg_ha", "median"), stock_med=("qte_stockee_kg", "median")).round(0), use_container_width=True)

# ----------------------------------------------------------------------------- 4. Économie
with tabs[3]:
    c = st.columns(4)
    val = enq.valeur_pertes_fcfa
    c[0].metric("Valeur totale des pertes déclarées", f"{val.sum():,.0f} FCFA")
    c[1].metric("Médiane par producteur", f"{val.median():,.0f} FCFA")
    c[2].metric("Prix d'achat médian (arachide de complément)", f"{enq.prix_achat_kg.median():,.0f} FCFA/kg")
    c[3].metric("Financement par emprunt / banque", f"{100*enq.fin_emprunt.mean():.0f} %")
    c1, c2 = st.columns(2)
    c1.plotly_chart(px.histogram(enq, x="valeur_pertes_fcfa", color="commune", nbins=25, title="Distribution de la valeur des pertes (FCFA)", color_discrete_sequence=PAL), use_container_width=True)
    c2.plotly_chart(px.scatter(enq, x="qte_stockee_kg", y="valeur_pertes_fcfa", color="mode_stockage", trendline="ols", hover_data=["village"], title="Valeur des pertes vs quantité stockée", color_discrete_sequence=PAL), use_container_width=True)
    # Marge / coût implicite : valeur des pertes rapportée à la valeur de production (prix médian d'achat comme proxy)
    prix = enq.prix_achat_kg.median()
    eco = enq.assign(valeur_prod=lambda d: d.production_kg * prix, pct_perte_valeur=lambda d: 100 * d.valeur_pertes_fcfa / (d.production_kg * prix))
    c1, c2 = st.columns(2)
    c1.plotly_chart(px.box(eco, x="commune", y="pct_perte_valeur", color="commune", title=f"Pertes en % de la valeur de production (prix {prix:.0f} FCFA/kg)", color_discrete_sequence=PAL), use_container_width=True)
    fin = enq.financement.value_counts().reset_index(); fin.columns = ["financement", "n"]
    c2.plotly_chart(px.pie(fin, values="n", names="financement", title="Financement des achats compensatoires", color_discrete_sequence=PAL), use_container_width=True)
    imp = enq[["impact_alimentation", "impact_etudes", "impact_sante", "impact_habillement"]].mean() * 100
    imp.index = ["Alimentation", "Études", "Santé", "Habillement"]
    st.plotly_chart(px.bar(x=imp.index, y=imp.values, title="Domaines impactés par les pertes (% des ménages concernés)", labels={"x": "", "y": "%"}, color_discrete_sequence=[PAL[1]]), use_container_width=True)

# ----------------------------------------------------------------------------- 5. Facteurs
with tabs[4]:
    st.subheader("Corrélations (Spearman) — enquête")
    cv = ["age", "superficie_ha", "production_kg", "rendement_kg_ha", "qte_stockee_kg", "pct_vente", "valeur_pertes_fcfa", "nb_ennemis", "stock_hermetique", "pertes_stockage"]
    corr = enq[cv].corr(method="spearman")
    st.plotly_chart(px.imshow(corr, text_auto=".2f", color_continuous_scale="RdBu_r", zmin=-1, zmax=1, aspect="auto", title="Matrice de corrélation"), use_container_width=True)
    c1, c2 = st.columns(2)
    ct = pd.crosstab(enq.mode_stockage, enq.pertes_stockage, normalize="index").reset_index().melt(id_vars="mode_stockage")
    ct["pertes_stockage"] = ct.pertes_stockage.map({0: "Pas de perte", 1: "Pertes déclarées"})
    c1.plotly_chart(px.bar(ct, x="mode_stockage", y="value", color="pertes_stockage", title="Pertes déclarées selon le mode de stockage", labels={"value": "Proportion", "mode_stockage": ""}, color_discrete_sequence=[PAL[0], PAL[1]]), use_container_width=True)
    ct = pd.crosstab(enq.nature_traitement, enq.pertes_stockage, normalize="index").reset_index().melt(id_vars="nature_traitement")
    ct["pertes_stockage"] = ct.pertes_stockage.map({0: "Pas de perte", 1: "Pertes déclarées"})
    c2.plotly_chart(px.bar(ct, x="nature_traitement", y="value", color="pertes_stockage", title="Pertes déclarées selon la nature du traitement", labels={"value": "Proportion", "nature_traitement": ""}, color_discrete_sequence=[PAL[0], PAL[1]]), use_container_width=True)
    st.subheader("Importance des variables (Random Forest, calculée dans le notebook)")
    for f_ in ["08_importance_pertes_declarees.png", "08_importance_pertes_mesurees.png"]:
        pth = os.path.join(ROOT, "figures", f_)
        if os.path.exists(pth):
            st.image(pth, use_container_width=True)
    st.subheader("Tests statistiques")
    st.dataframe(tests, use_container_width=True, hide_index=True)

# ----------------------------------------------------------------------------- 6. Segmentation
with tabs[5]:
    st.subheader("Typologie des producteurs (K-Means, k = 4)")
    st.dataframe(prof.set_index("libelle").drop(columns=["segment"]).T, use_container_width=True)
    c1, c2 = st.columns(2)
    seg = enq.segment_lib.value_counts().reset_index(); seg.columns = ["segment", "n"]
    c1.plotly_chart(px.pie(seg, values="n", names="segment", title="Répartition des producteurs par segment", color_discrete_sequence=PAL), use_container_width=True)
    c2.plotly_chart(px.histogram(enq, x="commune", color="segment_lib", barnorm="percent", title="Composition des communes par segment", labels={"segment_lib": ""}, color_discrete_sequence=PAL), use_container_width=True)
    st.plotly_chart(px.scatter(enq.dropna(subset=["production_kg", "superficie_ha"]), x="production_kg", y="valeur_pertes_fcfa", color="segment_lib", size="superficie_ha", hover_data=["village", "mode_stockage"], log_x=True, title="Segments : production vs valeur des pertes", color_discrete_sequence=PAL), use_container_width=True)

# ----------------------------------------------------------------------------- 7. Export
with tabs[6]:
    st.subheader("Enquête producteurs (filtrée)")
    st.dataframe(enq, use_container_width=True, height=300)
    dl_buttons(enq, "enquete_producteurs_filtre")
    st.subheader("Relevé de poids (filtré)")
    st.dataframe(poids, use_container_width=True, height=300)
    dl_buttons(poids, "releve_poids_filtre")
    st.subheader("Rapport PDF")
    pdf = os.path.join(ROOT, "rapport", "Rapport_pertes_post_recolte_arachide.pdf")
    if os.path.exists(pdf):
        with open(pdf, "rb") as f:
            st.download_button("⬇️ Télécharger le rapport analytique (PDF)", f.read(), "Rapport_pertes_post_recolte_arachide.pdf", "application/pdf")
    else:
        st.caption("Rapport PDF non trouvé dans rapport/.")
