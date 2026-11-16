// Home page (home.html): a scrolling overview of SowSmart for a first-time visitor or judge. Every number comes from
// data/story.json (pipeline/story_data.py, read from the engine replay, statewide_risk and backtest files) and the
// district outlines from data/boundaries.json. Sections fade in as they scroll into view; with reduced motion
// everything is simply shown. English and Tamil strings live here.
import { h, clear } from "./ui/dom.js";
import { initLang, setLang, getLang, onLangChange } from "./i18n.js";

const S = {
  en: {
    brand: "SowSmart", tagline: "Crop choices for an uncertain monsoon, checked against NASA data", langLabel: "Language",
    tabHome: "Home", tabFarm: "Farmers", tabPolicy: "Policy makers",
    heroKicker: "NASA Space Apps 2026 · Field Shift: Adapting Farms with NASA Data",
    heroH: "Plant for the monsoon you'll get, not the one you remember.",
    heroP: "SowSmart replays a Tamil Nadu farmer's crop plan through every real season in 24 years of NASA satellite and weather data, and shows which crops held up when the monsoon failed, flooded or came late.",
    ctaFarm: "I farm: show my options →", ctaPolicy: "I plan for a district →",
    heroNote: "Free · English and தமிழ் · works on a phone",
    scroll: "Scroll to see how it works",
    memK: "The problem", memH: "A farmer remembers about ten seasons.",
    memP: "Farmers judge risk by the last ten years or so. At Thanjavur, a farmer remembering 2005–2014 saw lake-fed long rice come through {mem} seasons.",
    recH: "NASA's record holds every season since 2001.",
    recP: "Over the full record it came through {full}, and the 2016 drought came right after that run of good years. Each square is one real season: green came through, red failed.",
    remembered: "Remembered (2005–2014)", record: "The full record ({a}–{b})",
    dataK: "The data", dataH: "{places} places. {datasets} NASA datasets. Every season since 2001.",
    dataP: "Tamil Nadu is covered by squares about 28 km wide. For each one, SowSmart has daily rain from GPM IMERG, heat, soil water and wind from NASA POWER, groundwater from GRACE, and climate projections to 2060.",
    mapDrought: "1-in-100-year drought", mapHeat: "Extra hot days by 2041–2060",
    mapDroughtNote: "Each district's 1-in-100-year northeast-monsoon rain, as % of normal (IMD, 124 years). Darker = harsher drought.",
    mapHeatNote: "Extra days above 38 °C a year by 2041–2060 (NASA NEX-GDDP-CMIP6, 5 models). Darker = more heat.",
    farmK: "For farmers", farmH: "Three questions. One clear answer.",
    f1h: "Where is your farm?", f1p: "Pick your district, then the place nearest your village, or use your location.",
    f2h: "What do you grow, and with what water?", f2p: "Tick your crops and every water source you have. In the Cauvery delta, tell us whether Mettur dam has opened.",
    f3h: "When do you sow?", f3p: "Choose a sowing season (pattam) or a month, and see each crop's chance of coming through.",
    damK: "Short rice, sown in June, Thanjavur", damOn: "if Mettur opens on time", damLate: "if it opens late",
    damP: "The same field, the same crop. The dam decides. SowSmart replays what Mettur dam really did each year.",
    planK: "Plans for the whole year", planH: "Compare your plan with a safer one, season by season.",
    planNow: "Today's rice–rice plan", planShift: "A bigger shift: green manure, little millet, cotton",
    planP: "Thanjavur, river canal water. Each plan is replayed through the same 24 real seasons, and one tap shows how it fares in the climate of 2041–2060.",
    ofN: "{g} of {n} seasons",
    polK: "For policy makers", polH: "The same engine, for the whole state.",
    pol1: "{layers} map layers: drought and heavy rain once in 100 years, cyclone tracks, heat today and by 2060, falling groundwater and more.",
    pol2: "See it square by square, or district by district.",
    pol3: "Click a place: what to avoid in a drought year, what came through 2016, and how much water a crop switch would save.",
    pol4: "Crop ideas: crops that suit a district's rain but are rarely grown there today.",
    ctaPolicy2: "Open the Policy makers view →",
    proofK: "Does it work?", proofH: "Tested against 22 years of real harvests.",
    proofLift: "times more likely", proofLiftP: "When SowSmart says a crop fails, a bad harvest really followed {a}% of the time, against {b}% otherwise ({n} district × crop series, government crop statistics 2001–2022).",
    proofR: "match across years", proofRP: "In years when SowSmart flags more failures, more districts really had bad harvests (correlation r).",
    proof16: "flagged in 2016", proof16P: "In the 2016 drought SowSmart flagged {a}% of series; {b}% really had bad yields.",
    futK: "Looking ahead", futH: "The climate is moving. SowSmart shows how far.",
    futT: "warmer days by 2041–2060", futD: "more very hot days a year, at most",
    futP: "From five NASA climate models. Where the models disagree, as they do on the northeast monsoon, SowSmart shows the range instead of picking one.",
    tnK: "Made for Tamil Nadu", tnH: "In the farmer's language, on the farmer's phone.",
    tn1h: "தமிழ் and English", tn1p: "Switch the whole site at any time.",
    tn2h: "Works on a phone", tn2p: "No app to install, no sign-up, free.",
    tn3h: "Guided tour", tn3p: "Press “Take a tour” on any page for a step-by-step walk-through.",
    tn4h: "Honest about limits", tn4p: "Odds from real seasons, never a forecast. Every number names its source.",
    teamK: "The team", teamH: "Who built SowSmart",
    t1n: "Siddarth", t1r: "Data and models", t1p: "NASA data pipeline, the crop engine, validation against real harvests, and the climate projections.",
    t2n: "Nimalan", t2r: "Web app and story", t2p: "The interface, maps and charts, the Tamil experience, and the video.",
    teamFarmer: "With thanks to the farmer who told us what matters: which crop in which season, what to avoid in a drought year, and that farmers remember about ten seasons.",
    teamAI: "Built with help from an AI assistant (Anthropic Claude) for code and drafting, under our direction. No data on this site is AI-generated.",
    teamAIlink: "How we used AI",
    endH: "Try it for your place.", endP: "It supports your judgement and your agriculture officer's advice. It does not replace them.",
  },
  ta: {
    brand: "ஸ்மார்ட் விதைப்பு", tagline: "நிச்சயமற்ற பருவமழைக்கான பயிர்த் தேர்வுகள், நாசா தரவுகளுடன் சரிபார்க்கப்பட்டவை", langLabel: "மொழி",
    tabHome: "முகப்பு", tabFarm: "விவசாயிகள்", tabPolicy: "கொள்கை வகுப்பாளர்கள்",
    heroKicker: "நாசா ஸ்பேஸ் ஆப்ஸ் 2026 · ஃபீல்ட் ஷிஃப்ட்: நாசா தரவுடன் பண்ணைகளைத் தகவமைத்தல்",
    heroH: "நினைவில் உள்ள பருவமழைக்கு அல்ல, வரப்போகும் பருவமழைக்குப் பயிரிடுங்கள்.",
    heroP: "ஸ்மார்ட் விதைப்பு, ஒரு தமிழ்நாட்டு விவசாயியின் பயிர்த் திட்டத்தை 24 ஆண்டுகளின் நாசா செயற்கைக்கோள் மற்றும் வானிலைத் தரவில் உள்ள ஒவ்வொரு உண்மையான பருவத்திலும் சோதிக்கிறது. பருவமழை பொய்த்தபோது, வெள்ளம் வந்தபோது, தாமதமானபோது எந்தப் பயிர்கள் தாங்கின என்று காட்டுகிறது.",
    ctaFarm: "நான் விவசாயி: என் தேர்வுகளைக் காட்டு →", ctaPolicy: "நான் மாவட்டத்துக்குத் திட்டமிடுகிறேன் →",
    heroNote: "இலவசம் · தமிழ் மற்றும் English · கைபேசியில் இயங்கும்",
    scroll: "எப்படி இயங்குகிறது என்று பார்க்கக் கீழே உருட்டுங்கள்",
    memK: "சிக்கல்", memH: "ஒரு விவசாயி சுமார் பத்து பருவங்களை நினைவில் வைத்திருக்கிறார்.",
    memP: "விவசாயிகள் கடந்த சுமார் பத்து ஆண்டுகளை வைத்தே அபாயத்தை மதிப்பிடுகிறார்கள். தஞ்சாவூரில் 2005–2014-ஐ நினைவில் கொண்ட ஒரு விவசாயி, ஏரி நீர் நீண்ட கால நெல் {mem} பருவங்களில் தாங்கியதைப் பார்த்தார்.",
    recH: "நாசாவின் பதிவில் 2001 முதல் ஒவ்வொரு பருவமும் உள்ளது.",
    recP: "முழுப் பதிவில் அது {full} தாங்கியது; அந்த நல்ல ஆண்டுகளுக்குப் பிறகு 2016 வறட்சி வந்தது. ஒவ்வொரு சதுரமும் ஓர் உண்மையான பருவம்: பச்சை தாங்கியது, சிவப்பு தோல்வியடைந்தது.",
    remembered: "நினைவில் (2005–2014)", record: "முழுப் பதிவு ({a}–{b})",
    dataK: "தரவு", dataH: "{places} இடங்கள். {datasets} நாசா தரவுத் தொகுப்புகள். 2001 முதல் ஒவ்வொரு பருவமும்.",
    dataP: "தமிழ்நாடு சுமார் 28 கி.மீ. அகலமுள்ள சதுரங்களால் மூடப்பட்டுள்ளது. ஒவ்வொன்றுக்கும் GPM IMERG தினசரி மழை, நாசா POWER வெப்பம், மண் ஈரம், காற்று, GRACE நிலத்தடி நீர், 2060 வரையிலான காலநிலைக் கணிப்புகள் உள்ளன.",
    mapDrought: "100 ஆண்டுகளுக்கு ஒருமுறை வறட்சி", mapHeat: "2041–2060-இல் கூடுதல் வெப்ப நாட்கள்",
    mapDroughtNote: "ஒவ்வொரு மாவட்டத்தின் 100 ஆண்டுகளுக்கு ஒருமுறை வடகிழக்குப் பருவமழை, இயல்பின் % ஆக (IMD, 124 ஆண்டுகள்). அடர் நிறம் = கடுமையான வறட்சி.",
    mapHeatNote: "2041–2060-இல் ஆண்டுக்கு 38 °C-க்கு மேல் கூடுதல் நாட்கள் (நாசா NEX-GDDP-CMIP6, 5 மாதிரிகள்). அடர் நிறம் = அதிக வெப்பம்.",
    farmK: "விவசாயிகளுக்கு", farmH: "மூன்று கேள்விகள். ஒரு தெளிவான பதில்.",
    f1h: "உங்கள் பண்ணை எங்கே?", f1p: "உங்கள் மாவட்டத்தையும், பிறகு உங்கள் ஊருக்கு அருகில் உள்ள இடத்தையும் தேர்ந்தெடுங்கள், அல்லது உங்கள் இருப்பிடத்தைப் பயன்படுத்துங்கள்.",
    f2h: "என்ன பயிரிடுகிறீர்கள், எந்த நீருடன்?", f2p: "உங்கள் பயிர்களையும் எல்லா நீர் ஆதாரங்களையும் தேர்ந்தெடுங்கள். காவிரி டெல்டாவில் மேட்டூர் அணை திறக்கப்பட்டதா என்றும் சொல்லுங்கள்.",
    f3h: "எப்போது விதைக்கிறீர்கள்?", f3p: "ஒரு விதைப்புப் பட்டம் அல்லது மாதத்தைத் தேர்ந்தெடுத்து, ஒவ்வொரு பயிரும் தாக்குப்பிடிக்கும் வாய்ப்பைப் பாருங்கள்.",
    damK: "குறுகிய கால நெல், ஜூனில் விதைப்பு, தஞ்சாவூர்", damOn: "மேட்டூர் சரியான நேரத்தில் திறந்தால்", damLate: "தாமதமாகத் திறந்தால்",
    damP: "அதே வயல், அதே பயிர். அணையே தீர்மானிக்கிறது. மேட்டூர் அணை ஒவ்வொரு ஆண்டும் உண்மையில் என்ன செய்தது என்பதை ஸ்மார்ட் விதைப்பு மீண்டும் இயக்குகிறது.",
    planK: "முழு ஆண்டுக்கான திட்டங்கள்", planH: "உங்கள் திட்டத்தைப் பாதுகாப்பான ஒன்றுடன், பருவம் பருவமாக ஒப்பிடுங்கள்.",
    planNow: "இன்றைய நெல்–நெல் திட்டம்", planShift: "ஒரு பெரிய மாற்றம்: பசுந்தாள் உரம், சாமை, பருத்தி",
    planP: "தஞ்சாவூர், ஆற்றுக் கால்வாய் நீர். ஒவ்வொரு திட்டமும் அதே 24 உண்மையான பருவங்களில் சோதிக்கப்படுகிறது; 2041–2060 காலநிலையில் எப்படி இருக்கும் என்பது ஒரு தொடுதலில் தெரியும்.",
    ofN: "{n} பருவங்களில் {g}",
    polK: "கொள்கை வகுப்பாளர்களுக்கு", polH: "அதே கணிப்பு முறை, முழு மாநிலத்துக்கும்.",
    pol1: "{layers} வரைபட அடுக்குகள்: 100 ஆண்டுகளுக்கு ஒருமுறை வறட்சியும் கனமழையும், புயல் பாதைகள், இன்றும் 2060-இலும் வெப்பம், குறையும் நிலத்தடி நீர் மற்றும் பல.",
    pol2: "சதுரம் சதுரமாகவோ, மாவட்டம் மாவட்டமாகவோ பாருங்கள்.",
    pol3: "ஓர் இடத்தைத் தொடுங்கள்: வறட்சி ஆண்டில் எதைத் தவிர்க்க வேண்டும், 2016-இல் எது தாங்கியது, பயிர் மாற்றத்தால் எவ்வளவு நீர் மிச்சமாகும்.",
    pol4: "பயிர் யோசனைகள்: ஒரு மாவட்டத்தின் மழைக்கு ஏற்ற, ஆனால் இன்று அங்கு அரிதாகப் பயிரிடப்படும் பயிர்கள்.",
    ctaPolicy2: "கொள்கை வகுப்பாளர்கள் பார்வையைத் திற →",
    proofK: "இது வேலை செய்கிறதா?", proofH: "22 ஆண்டுகளின் உண்மையான அறுவடைகளுடன் சோதிக்கப்பட்டது.",
    proofLift: "மடங்கு அதிக வாய்ப்பு", proofLiftP: "ஒரு பயிர் தோல்வியடையும் என்று ஸ்மார்ட் விதைப்பு சொன்னபோது, {a}% முறை உண்மையில் மோசமான அறுவடை வந்தது; மற்ற நேரங்களில் {b}% ({n} மாவட்ட × பயிர் தொடர்கள், அரசுப் பயிர்ப் புள்ளிவிவரம் 2001–2022).",
    proofR: "ஆண்டுகளுக்கு இடையே பொருத்தம்", proofRP: "ஸ்மார்ட் விதைப்பு அதிகத் தோல்விகளைக் காட்டிய ஆண்டுகளில், அதிக மாவட்டங்களில் உண்மையில் மோசமான அறுவடை (தொடர்பு r).",
    proof16: "2016-இல் எச்சரிக்கை", proof16P: "2016 வறட்சியில் ஸ்மார்ட் விதைப்பு {a}% தொடர்களுக்கு எச்சரித்தது; {b}% தொடர்களில் உண்மையில் விளைச்சல் குறைந்தது.",
    futK: "எதிர்காலம்", futH: "காலநிலை மாறுகிறது. எவ்வளவு என்று ஸ்மார்ட் விதைப்பு காட்டுகிறது.",
    futT: "2041–2060-இல் அதிக வெப்பமான பகல்கள்", futD: "ஆண்டுக்கு அதிகபட்சம் கூடுதல் கடும் வெப்ப நாட்கள்",
    futP: "ஐந்து நாசா காலநிலை மாதிரிகளிலிருந்து. வடகிழக்குப் பருவமழை போல மாதிரிகள் வேறுபடும் இடங்களில், ஒன்றைத் தேர்ந்தெடுக்காமல் வரம்பைக் காட்டுகிறது.",
    tnK: "தமிழ்நாட்டுக்காக", tnH: "விவசாயியின் மொழியில், விவசாயியின் கைபேசியில்.",
    tn1h: "தமிழ் மற்றும் English", tn1p: "எப்போது வேண்டுமானாலும் முழு தளத்தையும் மாற்றலாம்.",
    tn2h: "கைபேசியில் இயங்கும்", tn2p: "செயலி தேவையில்லை, பதிவு தேவையில்லை, இலவசம்.",
    tn3h: "வழிகாட்டும் சுற்றுலா", tn3p: "எந்தப் பக்கத்திலும் “சுற்றிப் பார்க்க” பொத்தானை அழுத்தி படிப்படியாக அறியலாம்.",
    tn4h: "வரம்புகள் பற்றி நேர்மை", tn4p: "உண்மையான பருவங்களிலிருந்து வாய்ப்புகள், முன்னறிவிப்பு அல்ல. ஒவ்வொரு எண்ணுக்கும் ஆதாரம் உண்டு.",
    teamK: "குழு", teamH: "ஸ்மார்ட் விதைப்பை உருவாக்கியவர்கள்",
    t1n: "சித்தார்த்", t1r: "தரவு மற்றும் மாதிரிகள்", t1p: "நாசா தரவுச் செயலாக்கம், பயிர்க் கணிப்பு முறை, உண்மையான அறுவடைகளுடன் சரிபார்ப்பு, காலநிலைக் கணிப்புகள்.",
    t2n: "நிமலன்", t2r: "இணையதளம் மற்றும் கதை", t2p: "பயனர் இடைமுகம், வரைபடங்கள், விளக்கப்படங்கள், தமிழ் அனுபவம், காணொளி.",
    teamFarmer: "எது முக்கியம் என்று சொன்ன விவசாயிக்கு நன்றி: எந்தப் பருவத்தில் எந்தப் பயிர், வறட்சி ஆண்டில் எதைத் தவிர்க்க வேண்டும், விவசாயிகள் சுமார் பத்து பருவங்களையே நினைவில் வைத்திருக்கிறார்கள் என்பவை.",
    teamAI: "எங்கள் வழிகாட்டுதலின் கீழ், நிரல் எழுதவும் வரைவுகளுக்கும் ஒரு செயற்கை நுண்ணறிவு உதவியாளரின் (Anthropic Claude) உதவியுடன் உருவாக்கப்பட்டது. இந்தத் தளத்தில் எந்தத் தரவும் செயற்கை நுண்ணறிவால் உருவாக்கப்படவில்லை.",
    teamAIlink: "செயற்கை நுண்ணறிவை எப்படிப் பயன்படுத்தினோம்",
    endH: "உங்கள் இடத்துக்கு முயற்சி செய்யுங்கள்.", endP: "இது உங்கள் சொந்த முடிவையும் வேளாண் அலுவலரின் ஆலோசனையையும் ஆதரிக்கிறது; அவற்றை மாற்றாது.",
  },
};
const s = (k, v = {}) => (S[getLang()]?.[k] ?? S.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
const DATASETS = ["GPM IMERG", "NASA POWER", "NEX-GDDP-CMIP6", "GLDAS · GRACE", "MODIS NDVI", "SMAP", "SRTM"];
const REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let story = null, bounds = null, mapMode = "drought";

/* ---------- small visual pieces ---------- */
// a row of seasons as squares (1 = came through, 0 = failed); squares pop in one after another when shown
function squares(years, { cls = "" } = {}) {
  return h("div", { class: "hm-squares " + cls, role: "img",
    "aria-label": years.map(([y, ok]) => `${y}: ${ok ? "✓" : "✕"}`).join(", ") },
    ...years.map(([y, ok], i) => h("span", { class: "hm-sq " + (ok ? "ok" : "fail"), title: String(y), style: { "--i": i } })));
}
const count = (years) => ({ g: years.filter(([, ok]) => ok).length, n: years.length });

// Tamil Nadu districts as an SVG, coloured by one district value (drought % of normal: low = harsh; or extra hot days)
function districtMap() {
  if (!bounds || !story) return h("div");
  const W = 420, H = 520, lon0 = 76.2, lon1 = 80.4, lat0 = 8.0, lat1 = 13.6;
  const kx = W / (lon1 - lon0), ky = H / (lat1 - lat0);
  const px = ([lon, lat]) => `${((lon - lon0) * kx).toFixed(1)},${((lat1 - lat) * ky).toFixed(1)}`;
  const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
  const path = (g) => polys(g).map((poly) => poly.map((ring) => "M" + ring.map(px).join("L") + "Z").join("")).join("");
  const vals = Object.values(story.districts).map((d) => (mapMode === "drought" ? d.drought_pct : d.hot_days_2050)).filter((v) => v != null);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  // 0 = mild, 1 = severe (low drought % is severe; many hot days is severe)
  const sev = (v) => (v == null ? null : mapMode === "drought" ? (hi - v) / (hi - lo || 1) : (v - lo) / (hi - lo || 1));
  const col = (t) => (t == null ? "var(--grid)" : `color-mix(in srgb, #8a3b00 ${Math.round(15 + 85 * t)}%, #fdf0e1)`);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "hm-map");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", s(mapMode === "drought" ? "mapDroughtNote" : "mapHeatNote"));
  bounds.districts.forEach((d, i) => {
    const v = story.districts[d.name];
    const val = v ? (mapMode === "drought" ? v.drought_pct : v.hot_days_2050) : null;
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", path(d.geometry));
    p.setAttribute("fill", col(sev(val)));
    p.setAttribute("class", "hm-district");
    p.style.setProperty("--i", i);
    const t = document.createElementNS(svgNS, "title");
    const name = getLang() === "ta" ? (v?.name_ta || d.name) : d.name;
    t.textContent = val == null ? name : `${name}: ${mapMode === "drought" ? `${val}%` : `+${val}`}`;
    p.append(t);
    svg.append(p);
  });
  return svg;
}

/* ---------- page ---------- */
function section(cls, ...kids) { return h("section", { class: "hm-sec " + cls }, h("div", { class: "hm-inner" }, ...kids)); }
const kicker = (k) => h("p", { class: "hm-kicker" }, s(k));

function render() {
  const el = clear(document.getElementById("home"));
  document.querySelectorAll("[data-h]").forEach((n) => { n.textContent = s(n.dataset.h); });
  document.title = `${s("brand")} · ${s("tabHome")}`;
  const lb = document.getElementById("lang");
  if (lb) { lb.textContent = getLang() === "ta" ? "English / ஆங்கிலம்" : "Tamil / தமிழ்"; lb.lang = getLang() === "ta" ? "en" : "ta"; }
  if (!story) { el.append(h("p", { class: "note hm-loading" }, "…")); return; }
  const st = story.stats, sea = story.seasons;
  const lake = sea.long_rice_lake_pond.years, mem = lake.filter(([y]) => y >= 2005 && y <= 2014);
  const cMem = count(mem), cAll = count(lake);
  const now = sea.current_canal.years, shift = sea.bigger_shift_canal.years;

  el.append(
    // hero
    section("hm-hero dark",
      h("p", { class: "hm-kicker" }, s("heroKicker")),
      h("h2", { class: "hm-display" }, s("heroH")),
      h("p", { class: "hm-lead" }, s("heroP")),
      h("div", { class: "hm-cta" },
        h("a", { class: "hm-btn primary", href: "index.html" }, s("ctaFarm")),
        h("a", { class: "hm-btn", href: "policy.html" }, s("ctaPolicy"))),
      h("p", { class: "hm-note" }, s("heroNote")),
      squares(lake, { cls: "hm-hero-sq" }),
      h("p", { class: "hm-scroll", "aria-hidden": "true" }, "↓ ", s("scroll"))),

    // memory vs record
    section("hm-memory",
      kicker("memK"),
      h("h2", { class: "hm-h" }, s("memH")),
      h("p", { class: "hm-p" }, s("memP", { mem: s("ofN", cMem) })),
      h("div", { class: "hm-row" }, h("span", { class: "hm-row-l" }, s("remembered")), squares(mem), h("strong", { class: "hm-row-n" }, s("ofN", cMem))),
      h("h2", { class: "hm-h hm-gap" }, s("recH")),
      h("p", { class: "hm-p" }, s("recP", { full: s("ofN", cAll) })),
      h("div", { class: "hm-row" }, h("span", { class: "hm-row-l" }, s("record", { a: lake[0][0], b: lake[lake.length - 1][0] })), squares(lake), h("strong", { class: "hm-row-n" }, s("ofN", cAll)))),

    // data + district map
    section("hm-data dark",
      h("div", { class: "hm-split" },
        h("div", {},
          kicker("dataK"),
          h("h2", { class: "hm-h" }, s("dataH", { places: st.places, datasets: DATASETS.length })),
          h("p", { class: "hm-p" }, s("dataP")),
          h("ul", { class: "hm-chips" }, ...DATASETS.map((d) => h("li", {}, d))),
          h("div", { class: "hm-toggle", role: "group" }, ...["drought", "heat"].map((m) => h("button", {
            type: "button", class: "hm-tbtn" + (mapMode === m ? " on" : ""), "aria-pressed": mapMode === m ? "true" : "false",
            onclick: () => { mapMode = m; render(); },
          }, s(m === "drought" ? "mapDrought" : "mapHeat")))),
          h("p", { class: "hm-small" }, s(mapMode === "drought" ? "mapDroughtNote" : "mapHeatNote"))),
        h("div", { class: "hm-map-wrap" }, districtMap()))),

    // farmers
    section("hm-farm",
      kicker("farmK"),
      h("h2", { class: "hm-h" }, s("farmH")),
      h("ol", { class: "hm-steps" }, ...[1, 2, 3].map((i) => h("li", { class: "hm-step", style: { "--i": i } },
        h("span", { class: "hm-step-n" }, String(i)), h("h3", {}, s(`f${i}h`)), h("p", {}, s(`f${i}p`))))),
      h("div", { class: "hm-dam" },
        h("p", { class: "hm-kicker" }, s("damK")),
        h("div", { class: "hm-dam-row" },
          h("div", { class: "hm-big good" }, h("span", { class: "hm-num", dataset: { to: "92", suffix: "%" } }, "92%"), h("span", {}, s("damOn"))),
          h("div", { class: "hm-big bad" }, h("span", { class: "hm-num", dataset: { to: "3", suffix: "%" } }, "3%"), h("span", {}, s("damLate")))),
        h("p", { class: "hm-p" }, s("damP"))),
      h("a", { class: "hm-btn primary", href: "index.html#site=thanjavur" }, s("ctaFarm"))),

    // plans
    section("hm-plans",
      kicker("planK"),
      h("h2", { class: "hm-h" }, s("planH")),
      h("div", { class: "hm-row" }, h("span", { class: "hm-row-l" }, s("planNow")), squares(now), h("strong", { class: "hm-row-n" }, s("ofN", count(now)))),
      h("div", { class: "hm-row" }, h("span", { class: "hm-row-l" }, s("planShift")), squares(shift), h("strong", { class: "hm-row-n" }, s("ofN", count(shift)))),
      h("p", { class: "hm-p" }, s("planP"))),

    // policy
    section("hm-policy dark",
      kicker("polK"),
      h("h2", { class: "hm-h" }, s("polH")),
      h("ul", { class: "hm-list" }, ...["pol1", "pol2", "pol3", "pol4"].map((k, i) => h("li", { style: { "--i": i } }, s(k, { layers: st.layers })))),
      h("a", { class: "hm-btn", href: "policy.html" }, s("ctaPolicy2"))),

    // proof
    section("hm-proof",
      kicker("proofK"),
      h("h2", { class: "hm-h" }, s("proofH")),
      h("div", { class: "hm-stats" },
        h("div", { class: "hm-stat" }, h("span", { class: "hm-num", dataset: { to: String(st.lift), dec: "2", suffix: "×" } }, `${st.lift}×`), h("strong", {}, s("proofLift")),
          h("p", {}, s("proofLiftP", { a: Math.round(100 * st.p_bad_fail), b: Math.round(100 * st.p_bad_pass), n: st.series }))),
        h("div", { class: "hm-stat" }, h("span", { class: "hm-num", dataset: { to: String(st.r_years), dec: "2", prefix: "r = " } }, `r = ${st.r_years.toFixed(2)}`), h("strong", {}, s("proofR")), h("p", {}, s("proofRP"))),
        h("div", { class: "hm-stat" }, h("span", { class: "hm-num", dataset: { to: String(Math.round(100 * st.y2016_flagged)), suffix: "%" } }, `${Math.round(100 * st.y2016_flagged)}%`), h("strong", {}, s("proof16")),
          h("p", {}, s("proof16P", { a: Math.round(100 * st.y2016_flagged), b: Math.round(100 * st.y2016_bad) }))))),

    // future
    section("hm-future dark",
      kicker("futK"),
      h("h2", { class: "hm-h" }, s("futH")),
      h("div", { class: "hm-stats two" },
        h("div", { class: "hm-stat" }, h("span", { class: "hm-num", dataset: { to: String(st.tmax_2050_median), dec: "1", prefix: "+", suffix: " °C" } }, `+${st.tmax_2050_median} °C`), h("strong", {}, s("futT"))),
        h("div", { class: "hm-stat" }, h("span", { class: "hm-num", dataset: { to: String(Math.round(st.hot_days_2050_max)), prefix: "+" } }, `+${Math.round(st.hot_days_2050_max)}`), h("strong", {}, s("futD")))),
      h("p", { class: "hm-p" }, s("futP"))),

    // made for Tamil Nadu
    section("hm-tn",
      kicker("tnK"),
      h("h2", { class: "hm-h" }, s("tnH")),
      h("div", { class: "hm-cards" }, ...[1, 2, 3, 4].map((i) => h("div", { class: "hm-card", style: { "--i": i } }, h("h3", {}, s(`tn${i}h`)), h("p", {}, s(`tn${i}p`)))))),

    // team
    section("hm-team dark",
      kicker("teamK"),
      h("h2", { class: "hm-h" }, s("teamH")),
      h("div", { class: "hm-cards two" }, ...[1, 2].map((i) => h("div", { class: "hm-card hm-person", style: { "--i": i } },
        h("span", { class: "hm-avatar", "aria-hidden": "true" }, s(`t${i}n`).charAt(0)),
        h("h3", {}, s(`t${i}n`)), h("strong", {}, s(`t${i}r`)), h("p", {}, s(`t${i}p`))))),
      h("p", { class: "hm-p" }, s("teamFarmer")),
      h("p", { class: "hm-small" }, s("teamAI"), " ", h("a", { href: "references.html#ai" }, s("teamAIlink")))),

    // end
    section("hm-end",
      h("h2", { class: "hm-display small" }, s("endH")),
      h("div", { class: "hm-cta" },
        h("a", { class: "hm-btn primary", href: "index.html" }, s("ctaFarm")),
        h("a", { class: "hm-btn", href: "policy.html" }, s("ctaPolicy"))),
      h("p", { class: "hm-note" }, s("endP"))));
  reveal();
}

/* ---------- scroll reveal + count-up ---------- */
let io = null;
const seen = new Set();            // sections already revealed stay visible when the page is redrawn (language, map switch)
const keyOf = (x) => [...x.classList].find((c) => c.startsWith("hm-") && c !== "hm-sec");
function reveal() {
  const secs = [...document.querySelectorAll(".hm-sec")];
  secs.forEach((x) => { if (seen.has(keyOf(x))) { x.classList.add("in"); x.querySelectorAll(".hm-num[data-to]").forEach((n) => { n.dataset.done = "1"; }); } });
  // the first screen never waits: show the hero at once (a frame later, so its squares still pop in)
  requestAnimationFrame(() => secs[0]?.classList.add("in"));
  setTimeout(() => { secs[0]?.classList.add("in"); seen.add(keyOf(secs[0])); }, 120);
  if (REDUCED || !("IntersectionObserver" in window)) { secs.forEach((x) => x.classList.add("in")); return; }
  io?.disconnect();
  io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    seen.add(keyOf(e.target));
    e.target.querySelectorAll(".hm-num[data-to]").forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.18 });
  secs.forEach((x) => io.observe(x));
}
function countUp(n) {
  if (n.dataset.done) return;
  n.dataset.done = "1";
  const to = Number(n.dataset.to), dec = Number(n.dataset.dec || 0), pre = n.dataset.prefix || "", suf = n.dataset.suffix || "";
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), v = to * (1 - (1 - k) ** 3);
    n.textContent = `${pre}${v.toFixed(dec)}${suf}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function init() {
  initLang();
  render();
  document.getElementById("lang")?.addEventListener("click", () => setLang(getLang() === "ta" ? "en" : "ta"));
  onLangChange(() => render());
  const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  [story, bounds] = await Promise.all([get("data/story.json"), get("data/boundaries.json")]);
  render();
}
init();
