// References: every dataset behind the app's numbers, plus the assessments and tools it relies on.
// Rendered on references.html and linked from a small footer on every page (mountRefsFooter).
// Sources checked against pipeline/*.py and the `source` fields in web/data/*.json; a dataset is listed only if
// something in web/data comes from it. Citations stay in English (author names, titles, DOIs); the short "used for"
// lines and headings are translated. Strings live here, not in i18n.js, so the list stays in one place.
import { h, clear } from "./dom.js";
import { getLang, onLangChange } from "../i18n.js";

const UI = {
  en: {
    title: "Data sources and references",
    intro: "Every number in this tool comes from the datasets below, processed by the scripts in the project's pipeline folder. NASA data comes first.",
    nasa: "NASA datasets", other: "Other data", climate: "Climate-change assessments (used to label trends)", tools: "Software and maps",
    used: "Used for", cite: "Cite as", link: "Link",
    foot: "📚 NASA datasets and references", back: "← Back to the tool",
    note: "Crop values (seasons, durations, water needs, storage) are approximate; each crop's own sources are listed in data/crops.json.",
  },
  ta: {
    title: "தரவு ஆதாரங்கள் மற்றும் மேற்கோள்கள்",
    intro: "இந்தக் கருவியின் ஒவ்வொரு எண்ணும் கீழே உள்ள தரவுத் தொகுப்புகளிலிருந்து வருகிறது; திட்டத்தின் pipeline கோப்புறையில் உள்ள நிரல்கள் அவற்றைச் செயலாக்குகின்றன. முதலில் நாசா தரவு.",
    nasa: "நாசா தரவுத் தொகுப்புகள்", other: "பிற தரவு", climate: "காலநிலை மாற்ற மதிப்பீடுகள் (போக்குகளை வகைப்படுத்த)", tools: "மென்பொருள் மற்றும் வரைபடங்கள்",
    used: "பயன்பாடு", cite: "மேற்கோள்", link: "இணைப்பு",
    foot: "📚 நாசா தரவுத் தொகுப்புகள் மற்றும் மேற்கோள்கள்", back: "← கருவிக்குத் திரும்பு",
    note: "பயிர் மதிப்புகள் (பருவம், காலம், நீர்த் தேவை, சேமிப்பு) தோராயமானவை; ஒவ்வொரு பயிரின் ஆதாரங்களும் data/crops.json-இல் உள்ளன.",
  },
};

// { name, used: {en, ta}, cite, url, doi? }
const REFS = {
  nasa: [
    {
      name: "NASA POWER (Prediction Of Worldwide Energy Resources), daily agroclimatology, 1981–2024",
      used: { en: "Temperature and very hot days, crop water demand (evapotranspiration), root-zone soil wetness, wind and storm days, and the 1981–2024 climate trends.",
              ta: "வெப்பநிலை, மிக வெப்ப நாட்கள், பயிர் நீர்த் தேவை (ஆவியுயிர்ப்பு), வேர்ப்பகுதி மண் ஈரம், காற்று மற்றும் புயல் நாட்கள், 1981–2024 காலநிலைப் போக்குகள்." },
      cite: "NASA Langley Research Center (LaRC) POWER Project, funded through the NASA Earth Science / Applied Science Program. Daily data, community AG, based on the MERRA-2 reanalysis (Gelaro et al., 2017, J. Climate 30, 5419–5454).",
      url: "https://power.larc.nasa.gov/",
      doi: "10.1175/JCLI-D-16-0758.1",
    },
    {
      name: "GPM IMERG Final Run, daily, 0.1°, Version 07 (2001–2024)",
      used: { en: "Rain in every season and year, heavy-rain days, the biggest one-day rains and 1-in-100-year rain levels, and a cross-check of POWER's rain trends.",
              ta: "ஒவ்வொரு பருவத்தின் மழை, கனமழை நாட்கள், அதிகபட்ச ஒருநாள் மழை, 100 ஆண்டுக்கு ஒருமுறை மழை அளவு, POWER மழைப் போக்கின் சரிபார்ப்பு." },
      cite: "Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., Tan, J. (2023). GPM IMERG Final Precipitation L3 1 day 0.1° x 0.1° V07. Goddard Earth Sciences Data and Information Services Center (GES DISC). Accessed through NASA Giovanni.",
      url: "https://giovanni.gsfc.nasa.gov/giovanni/",
      doi: "10.5067/GPM/IMERGDF/DAY/07",
    },
    {
      name: "MODIS Terra Vegetation Indices (MOD13Q1), 16-day, 250 m, Version 6.1",
      used: { en: "The greenness (NDVI) calendar: when fields are green or bare through the year.",
              ta: "பசுமை (NDVI) நாட்காட்டி: ஆண்டில் வயல்கள் எப்போது பசுமையாக அல்லது வெறுமையாக உள்ளன." },
      cite: "Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA EOSDIS Land Processes DAAC. Point samples through NASA AppEEARS and the ORNL DAAC MODIS subset service.",
      url: "https://lpdaac.usgs.gov/products/mod13q1v061/",
      doi: "10.5067/MODIS/MOD13Q1.061",
    },
    {
      name: "SMAP Enhanced L3 Radiometer Global Daily 9 km Soil Moisture (SPL3SMP_E), Version 6 (2015–2024)",
      used: { en: "The latest satellite reading of surface soil moisture in the \"Sow now or wait?\" panel, compared with the usual for that month.",
              ta: "\"இப்போது விதைக்கலாமா?\" பகுதியில் சமீபத்திய செயற்கைக்கோள் மேல்மண் ஈர அளவீடு, அந்த மாத வழக்கத்துடன் ஒப்பீடு." },
      cite: "O'Neill, P. E., Chan, S., Njoku, E. G., Jackson, T., Bindlish, R., Chaubell, J., Colliander, A. SMAP Enhanced L3 Radiometer Global and Polar Grid Daily 9 km EASE-Grid Soil Moisture, Version 6. NASA National Snow and Ice Data Center DAAC. Point samples through NASA AppEEARS.",
      url: "https://nsidc.org/data/spl3smp_e",
    },
    {
      name: "NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6), 0.25°",
      used: { en: "Climate ranges for 2041–2060 (SSP2-4.5 and SSP5-8.5) from 5 climate models, applied to the observed years.",
              ta: "2041–2060 காலநிலை வரம்புகள் (SSP2-4.5, SSP5-8.5), 5 காலநிலை மாதிரிகளிலிருந்து, கண்காணிக்கப்பட்ட ஆண்டுகளுக்குப் பொருத்தப்பட்டவை." },
      cite: "Thrasher, B., Wang, W., Michaelis, A., Melton, F., Lee, T., Nemani, R. (2022). NASA Global Daily Downscaled Projections, CMIP6. Scientific Data 9, 262. Data from the NASA Center for Climate Simulation (NCCS) THREDDS server.",
      url: "https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6",
      doi: "10.1038/s41597-022-01393-4",
    },
    {
      name: "GLDAS-2.2 Catchment Land Surface Model with GRACE data assimilation (GLDAS_CLSM025_DA1_D.2.2), daily, 0.25° (2003–2024)",
      used: { en: "The groundwater trend in the Policy view: whether stored groundwater has been rising or falling since 2003. GRACE sees regions about 300 km across, so this is a regional signal, not one village's wells.",
              ta: "கொள்கைப் பார்வையில் நிலத்தடி நீர்ப் போக்கு: 2003 முதல் நிலத்தடி நீர் சேமிப்பு உயர்கிறதா குறைகிறதா. GRACE சுமார் 300 கி.மீ பரப்பைப் பார்க்கிறது, எனவே இது ஒரு பகுதியின் போக்கு, ஒரு கிராமத்தின் கிணறுகள் அல்ல." },
      cite: "Li, B., Beaudoing, H., Rodell, M. (2020). GLDAS Catchment Land Surface Model L4 daily 0.25 x 0.25 degree GRACE-DA1 V2.2. Goddard Earth Sciences Data and Information Services Center (GES DISC). Method: Li, B., et al. (2019). Global GRACE data assimilation for groundwater and drought monitoring. Water Resources Research 55, 7564–7586. Accessed through NASA Giovanni.",
      url: "https://disc.gsfc.nasa.gov/datasets/GLDAS_CLSM025_DA1_D_2.2/summary",
      doi: "10.5067/TXBMLX370XX8",
    },
    {
      name: "NASA AppEEARS (Application for Extracting and Exploring Analysis Ready Samples)",
      used: { en: "The tool we used to extract the MODIS and SMAP point samples around each place.",
              ta: "ஒவ்வொரு இடத்தைச் சுற்றியும் MODIS, SMAP மாதிரிகளைப் பிரித்தெடுக்கப் பயன்பட்ட கருவி." },
      cite: "AppEEARS Team. Application for Extracting and Exploring Analysis Ready Samples (AppEEARS). NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC), USGS EROS Center, Sioux Falls, South Dakota, USA.",
      url: "https://appeears.earthdatacloud.nasa.gov/",
    },
  ],
  other: [
    {
      name: "ISRIC SoilGrids 2.0 (250 m)",
      used: { en: "Soil texture, organic carbon and pH, which set how much water the soil holds for a crop.",
              ta: "மண் வகை, அங்கக கரிமம், pH: மண் பயிருக்கு எவ்வளவு நீரைத் தக்கவைக்கும் என்பதைத் தீர்மானிக்கின்றன." },
      cite: "Poggio, L., de Sousa, L. M., Batjes, N. H., et al. (2021). SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty. SOIL 7, 217–240.",
      url: "https://soilgrids.org/",
      doi: "10.5194/soil-7-217-2021",
    },
    {
      name: "India Meteorological Department (IMD), 1.0° daily gridded rainfall, 1901–2024",
      used: { en: "A 124-year check on how rare the worst northeast-monsoon droughts and the wettest days really are.",
              ta: "மோசமான வடகிழக்கு பருவமழை வறட்சிகளும் அதிக மழை நாட்களும் எவ்வளவு அரிதானவை என்பதற்கான 124 ஆண்டுச் சரிபார்ப்பு." },
      cite: "Rajeevan, M., Bhate, J., Jaswal, A. K. (2008). Analysis of variability and trends of extreme rainfall events over India using 104 years of gridded daily rainfall data. Geophysical Research Letters 35, L18707. Data from IMD Pune.",
      url: "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_1_NetCDF.html",
      doi: "10.1029/2008GL035143",
    },
    {
      name: "NOAA IBTrACS v04r01 (International Best Track Archive for Climate Stewardship), North Indian basin",
      used: { en: "Cyclones that passed within 100 km of each place, 1981–2024, and which crops were in the field at the time.",
              ta: "1981–2024-இல் ஒவ்வொரு இடத்திலிருந்தும் 100 கி.மீ.க்குள் கடந்த புயல்கள், அப்போது வயலில் இருந்த பயிர்கள்." },
      cite: "Knapp, K. R., Kruk, M. C., Levinson, D. H., Diamond, H. J., Neumann, C. J. (2010). The International Best Track Archive for Climate Stewardship (IBTrACS). Bulletin of the American Meteorological Society 91, 363–376. Data: NOAA NCEI, doi:10.25921/82ty-9e16.",
      url: "https://www.ncei.noaa.gov/products/international-best-track-archive",
      doi: "10.1175/2009BAMS2755.1",
    },
    {
      name: "NOAA Oceanic Niño Index (ONI) and Dipole Mode Index (DMI)",
      used: { en: "Whether each season was El Niño, La Niña or neutral, and a positive or negative Indian Ocean Dipole.",
              ta: "ஒவ்வொரு பருவமும் எல் நினோ, லா நினா அல்லது நடுநிலையா; இந்தியப் பெருங்கடல் இருமுனை நேர்மறையா எதிர்மறையா." },
      cite: "NOAA Climate Prediction Center, ONI (ERSSTv5); NOAA Physical Sciences Laboratory, Dipole Mode Index from HadISST.",
      url: "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
    },
    {
      name: "Government of India, Directorate of Economics and Statistics (DES): district crop Area-Production-Yield",
      used: { en: "District crop areas for the Policy view's water-saving estimate, and the check of our model against real district yields (2001–2022).",
              ta: "கொள்கை பார்வையின் நீர்ச் சேமிப்பு மதிப்பீட்டுக்கான மாவட்டப் பயிர்ப் பரப்பு; உண்மையான மாவட்ட மகசூலுடன் (2001–2022) எங்கள் மாதிரியின் சரிபார்ப்பு." },
      cite: "Ministry of Agriculture & Farmers Welfare, Crop Statistics (APY), accessed through the India Data Portal.",
      url: "https://indiadataportal.com/",
    },
    {
      name: "Tamil Nadu Department of Agriculture: Season and crop statistics (Mettur dam opening and closing dates)",
      used: { en: "When Cauvery delta canals actually ran each year, for canal-fed places.",
              ta: "ஒவ்வொரு ஆண்டும் காவிரி டெல்டா கால்வாய்களில் உண்மையில் நீர் வந்த காலம் (கால்வாய்ப் பாசன இடங்களுக்கு)." },
      cite: "Tamil Nadu Department of Agriculture, Season & Crop Statistics, tables VII.10 and VII.12.",
      url: "http://tnagriculture.in/dashboard/report/",
    },
    {
      name: "Tamil Nadu Crop Production Guides (TN Agriculture Department / TNAU) and TNAU lecture notes on crop water needs",
      used: { en: "Each crop's sowing seasons, duration and approximate water need.",
              ta: "ஒவ்வொரு பயிரின் விதைப்புப் பருவம், காலம், தோராயமான நீர்த் தேவை." },
      cite: "Tamil Nadu Agricultural University (TNAU) Agritech Portal and Crop Production Guides; TNAU eagri course notes (AGRO 103).",
      url: "https://agritech.tnau.ac.in/",
    },
  ],
  climate: [
    {
      name: "IPCC AR6 Working Group I, Regional Fact Sheet: Asia (2021)",
      used: { en: "Whether a local trend matches what climate change is expected to do.", ta: "ஒரு உள்ளூர் போக்கு காலநிலை மாற்ற எதிர்பார்ப்புடன் பொருந்துகிறதா." },
      cite: "IPCC (2021). Climate Change 2021: The Physical Science Basis. Regional Fact Sheet: Asia.",
      url: "https://www.ipcc.ch/report/ar6/wg1/downloads/factsheets/IPCC_AR6_WGI_Regional_Fact_Sheet_Asia.pdf",
    },
    {
      name: "IPCC AR6 Working Group II, Chapter 10: Asia (2022)",
      used: { en: "Expected changes in heat, rain and their effects on farming in South Asia.", ta: "தெற்காசியாவில் வெப்பம், மழை மற்றும் விவசாயத்தில் எதிர்பார்க்கப்படும் மாற்றங்கள்." },
      cite: "Shaw, R., Luo, Y., Cheong, T. S., et al. (2022). Asia. In: Climate Change 2022: Impacts, Adaptation and Vulnerability. Cambridge University Press.",
      url: "https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-10/",
    },
    {
      name: "Assessment of Climate Change over the Indian Region (Ministry of Earth Sciences, 2020)",
      used: { en: "India-specific expectations for warming, monsoon rain and extremes.", ta: "வெப்பமயமாதல், பருவமழை, தீவிர நிகழ்வுகள் குறித்த இந்தியாவுக்கான எதிர்பார்ப்புகள்." },
      cite: "Krishnan, R., Sanjay, J., Gnanaseelan, C., et al. (eds.) (2020). Assessment of Climate Change over the Indian Region. Springer, Singapore.",
      url: "https://link.springer.com/book/10.1007/978-981-15-4327-2",
      doi: "10.1007/978-981-15-4327-2",
    },
    {
      name: "IMD Met Monograph: Northeast Monsoon of South Asia",
      used: { en: "How variable the northeast monsoon is and what is known about long-term changes.", ta: "வடகிழக்கு பருவமழை எவ்வளவு மாறுபடும், நீண்டகால மாற்றங்கள் பற்றி அறியப்பட்டவை." },
      cite: "India Meteorological Department, Met Monograph: Northeast Monsoon of South Asia.",
      url: "https://mausam.imd.gov.in/imd_latest/contents/met_monograph.pdf",
    },
  ],
  tools: [
    { name: "Leaflet 1.9.4", used: { en: "Interactive maps.", ta: "ஊடாடும் வரைபடங்கள்." }, cite: "Leaflet, open-source JavaScript library (BSD-2-Clause).", url: "https://leafletjs.com/" },
    { name: "Chart.js 4.4.1", used: { en: "Charts.", ta: "வரைபட விளக்கப்படங்கள்." }, cite: "Chart.js, open-source JavaScript charting library (MIT).", url: "https://www.chartjs.org/" },
    { name: "OpenStreetMap", used: { en: "Background map tiles.", ta: "பின்னணி வரைபட ஓடுகள்." }, cite: "© OpenStreetMap contributors, data under the Open Database License (ODbL).", url: "https://www.openstreetmap.org/copyright" },
  ],
};

const ui = (k) => UI[getLang()]?.[k] ?? UI.en[k];

function refItem(r) {
  return h("li", { class: "ref" },
    h("strong", {}, r.name),
    h("p", { class: "ref-used" }, h("span", { class: "ref-k" }, `${ui("used")}: `), r.used[getLang()] ?? r.used.en),
    h("p", { class: "ref-cite", lang: "en" }, h("span", { class: "ref-k" }, `${ui("cite")}: `), r.cite,
      r.doi ? [" ", h("a", { href: `https://doi.org/${r.doi}`, target: "_blank", rel: "noopener" }, `doi:${r.doi}`)] : null),
    h("p", { class: "ref-link" }, h("a", { href: r.url, target: "_blank", rel: "noopener" }, r.url)));
}

/** Fill the references page body. */
export function renderReferences(el) {
  clear(el).append(
    h("h2", {}, ui("title")),
    h("p", { class: "note" }, ui("intro")),
    ...["nasa", "other", "climate", "tools"].flatMap((g) => [
      h("h3", { class: `ref-group ref-${g}` }, ui(g)),
      h("ol", { class: "refs" }, ...REFS[g].map(refItem)),
    ]),
    h("p", { class: "note" }, ui("note")));
}

/** A small footer link to references.html on every page; keeps itself in the current language. */
export function mountRefsFooter() {
  if (document.getElementById("refs-foot")) return;
  const a = h("a", { href: "references.html" }, ui("foot"));
  document.body.append(h("footer", { id: "refs-foot", class: "refs-foot" }, a));
  onLangChange(() => { a.textContent = ui("foot"); });
}

export const refsUI = ui;
