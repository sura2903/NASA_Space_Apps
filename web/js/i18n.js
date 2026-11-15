// English / Tamil switch (Lane B). One language at a time across the UI.
// Strings the scoring engine writes (why / evidence / risks ...) come from scoring.js in
// English; translateEngine() covers the short "why" and tag lines, the rest stays English
// until the engine supports Tamil (see docs/IDEAS.md, I2).
// Tamil wording: first draft, to be checked by a native speaker before the demo.

let lang = "en";
const listeners = [];

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ta: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
};
const MONTHS_SHORT = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ta: ["ஜன", "பிப்", "மார்", "ஏப்", "மே", "ஜூன்", "ஜூலை", "ஆக", "செப்", "அக்", "நவ", "டிச"],
};
// one-glyph column headers for the 12-month calendar
const MONTHS_INITIAL = {
  en: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  ta: ["ஜ", "பி", "மா", "ஏ", "மே", "ஜூ", "ஜூ", "ஆ", "செ", "அ", "ந", "டி"],
};

const STR = {
  en: {
    "lang.switch": "தமிழ்", "lang.switch.aria": "Switch to Tamil",
    brand: "Field Shift",
    tagline: "Crop rotation choices for an uncertain monsoon, checked against NASA data",
    expert: "Expert details",
    print: "🖨 Print for my agriculture officer",
    "step.place": "Your place", "step.place.select": "Choose a place",
    "map.aria": "Map of the demo sites. Click a dot to choose it.",
    "step.grow": "What you grow now",
    "step.grow.note": "Pick each crop and the month you sow it.",
    "step.water": "Water for the field",
    "step.prio": "What matters to you",
    "step.prio.note": "Slide each one. The options below re-rank as you go.",
    "step.climate": "What if the climate shifts?",
    "site.eyebrow": "What NASA data says about this place",
    loading: "Loading…",
    "loading.data": "Loading NASA data…",
    "fig.monthly": "Rain vs [[et|evapotranspiration]] (crop thirst), average month",
    "fig.monthly.note": "When the orange line is above the blue bars, crops need stored soil water or irrigation.",
    "fig.monsoon": "The [[ne_monsoon|northeast monsoon]], year by year",
    "fig.ndvi": "Satellite greenness ([[ndvi|NDVI]]), by month",
    "fig.compare": "Two NASA rain datasets, side by side",
    "opts.eyebrow": "Compare",
    "opts.title": "Three options for your field",
    "opts.support": "These options support your own judgment and local advice; they do not replace them. Use the print button to take them to your agriculture officer.",
    "engine.english": "",
    "gloss.title": "Words used here",
    "limits.title": "Honest limits",
    "limits.1": "NASA POWER temperature and GPM IMERG rain are regional grids. They describe the area around your village, not your exact field. Satellite rain also smooths the very biggest downpours.",
    "limits.2": "Crop water needs and traits are approximate averages, and the scores are simple rules we can explain, not a trained model.",
    "limits.3": "Climate what-ifs are rough scalings to explore, not forecasts.",
    "limits.4": "Soil nutrients, pests, markets and water allocations need local knowledge. The printed sheet lists what to check.",

    "meta.rain": "Rain: {rain}; temperature and evapotranspiration: NASA POWER",
    "monsoon.note": "{n} of {total} northeast monsoons were 20% or more below this site's average: {years}.",
    "ndvi.note": "Median {years}, {source}.",
    "ndvi.mixed": " This pixel window mixes in trees, so bare months do not show clearly yet.",
    "src.rain": "Rain: {x}", "src.weather": "Weather: {x}", "src.soil": "Soil: {x}", "src.ndvi": "Greenness: {x}",
    "cmp.year": "Rain per year", "cmp.ne": "Oct–Dec monsoon", "cmp.dry": "Driest monsoon year",
    "cmp.agree": "Both agree {year} was the driest northeast monsoon. ",
    "cmp.disagree": "They disagree on the driest northeast monsoon. ",
    "cmp.corr": "Their year-to-year monsoon totals move together (correlation {r}). ",
    "cmp.bigdiff": "POWER shows {pct}% {dir} rain a year, likely because its coarser grid mixes in nearby hills. We use IMERG, the finer satellite rain record, for rain.",
    "cmp.more": "more", "cmp.less": "less",
    "cmp.close": "Yearly totals are within {pct}%. We use IMERG, the finer satellite rain record, for rain.",
    "busy": "Re-scoring…", "busy.years": "Re-scoring against {n} real years…",
    "err.score": "Could not score this rotation: {msg}",
    "err.load": "Could not load data ({msg}). If you opened the file directly, run: python -m http.server 8000 --directory web",
    "sum.current": "Your current rotation is already the best fit for these priorities ({total}/100). It came through {good} of {years} years.",
    "sum.best": "\"{tag}\" fits your priorities best: {total}/100 vs {cur} for what you grow now. It came through {good} of {years} years (yours: {curGood}) and needs ~{need} mm of water a year (yours: ~{curNeed} mm).",
    "scenario.on": "Climate what-if is on: {dT} °C and {dP}% rain applied to every year. This is an illustration, not a forecast.",

    // inputs
    "grp.cash": "Crops", "grp.forage": "Fodder / pulses", "grp.green_manure": "Green manure (ploughed in)",
    "rot.year": "Year {n}", "rot.each": "Each year",
    "rot.crop.aria": "Year {y}, crop {n}", "rot.sow.aria": "Year {y}, crop {n} sowing month",
    "rot.sown": "Sown in {m}", "rot.unusual": " (unusual)",
    "rot.remove": "Remove this crop", "rot.add": "+ Add a crop to this year",
    "rot.second": "+ Second year is different", "rot.same": "Same every year",
    "rot.reset": "Reset to typical for this place",
    levels: ["Not important", "A little", "Somewhat", "Important", "Very important", "Top priority"],
    "clim.dt": "Hotter days", "clim.dp": "More or less rain", "clim.rain": "{x}% rain",
    "clim.trend": "Continue the observed trend 10 years ({dT} °C, {dP}% rain)",
    "clim.today": "Today's climate",
    "clim.note": "The trend button extends this site's own {start}–{end} trend (temperature: NASA POWER; rain: {rain}). These are rough what-if adjustments to explore, not a forecast.",

    // charts
    "ch.rain": "Rain ({src})", "ch.et": "Evapotranspiration (NASA POWER)", "ch.mm": "mm per month",
    "ch.ne.axis": "mm, Oct–Dec", "ch.ne.label": "Oct–Dec rain (orange = 20%+ below average, IMD 'deficient')",
    "ch.ne.avg": "Average {x} mm", "ch.ne.tip": "Oct–Dec rain: {x} mm ({pct}% of average)",
    "ch.ndvi.axis": "NDVI (0 bare → 1 dense)",

    // calendar
    "cal.aria": "Field calendar: what is in the field each month",
    "band.rain": "Rain", "band.dry": "Dry", "band.heat": "Heat", "band.heavy": "Downpour",
    "tip.rain": "{x} mm rain (average)",
    "tip.dry.neg": "water balance {x} mm (rain falls short of evapotranspiration)",
    "tip.dry.pos": "water balance +{x} mm (rain exceeds evapotranspiration)",
    "tip.heat": "{x} days above {t} °C (average)", "tip.heavy": "{x} heavy-rain days (average)",
    "cal.field": "Field", "cal.bare": "Bare", "cal.bare.tip": "bare soil", "cal.gm.tip": " (green manure, ploughed in)",
    "cal.key.crop": "Crop", "cal.key.cover": "Green manure", "cal.key.bare": "Bare soil",
    "cal.note": "Bands: darker = more, {start}–{end} averages{sc}. ",
    "cal.note.sc": " with your climate what-if",
    "cal.note.imerg": "Rain and downpours: GPM IMERG; heat and dryness: NASA POWER.",
    "cal.note.power": "Source: NASA POWER.",

    // cards
    "tag.Your current rotation": "Your current rotation", "tag.Bigger shift": "Bigger shift",
    "tag.Small step": "Small step", "tag.Alternative": "Alternative",
    "card.best": "★ Best fit for your priorities", "card.timing": "Has a timing problem",
    "card.outof": "out of 100", "card.fit": "fit with your priorities", "card.fit.aria": "Fit score",
    "card.came": "Came through", "card.of": " {good} of {total} years",
    "card.hardest": "Hardest years: ",
    "card.water": "Water: needs ~{need} mm a year",
    "card.water.irr": "; ~{irr} mm of it from the {src}",
    "card.water.rain": "; rain and soil water only",
    "card.why": "Why this option", "card.evidence": "Evidence from NASA data ",
    "card.hint": "point at a ▦ fact to see its months",
    "card.benefits": "Benefits", "card.risks": "Risks to check locally",
    "card.gaps": "What the data can't tell us ({n})",
    "card.subs": "Sub-scores (0–100)", "card.engine": "Engine label: {label}. Water source: {src}.",
    "card.chip.aria": "{text}. Highlights {months} on the calendar",
    "card.year": "Year {n}",
    "sub.pest": "Pest & disease break",
    "replay.ok": "{year}: came through", "replay.bad": "{year}: {reason}",

    // print
    "ps.title": "Field Shift: crop plan notes for my agriculture officer",
    "ps.printed": "printed {date}",
    "ps.farm": "My farm today", "ps.grow": "What I grow: ", "ps.water": "Water source: ",
    "ps.matters": "What matters to me: ", "ps.whatif": "Climate what-if used: ",
    "ps.whatif.val": "{dT} °C, {dP}% rain (illustration, not a forecast)",
    "ps.says": "What the NASA data says about this place",
    "ps.compared": "Three options compared",
    "ps.cols": ["Option", "Crops", "Fit (0–100)", "Came through", "Water need / irrigation", "Hardest years"],
    "ps.years": "{good} of {total} years",
    "ps.why": "Why", "ps.benefits": "Benefits", "ps.risks": "Risks",
    "ps.check": "Please help me check (the data cannot tell us these)",
    "ps.newcrop": "Is {crop} suited to my soil and village? Good seed variety and sowing window?",
    "ps.notes": "Officer's notes",
    "ps.data": "Data {start}–{end}: {rain}{weather}; soil: {soil}{ndvi}. Weather data describes the region, not this exact field. Scores are simple, explainable rules, not a prediction.",
    "ps.support": "Field Shift supports your judgment and local advice; it does not replace them.",
    "ps.sown": "sown {m}",
    "ps.levels": ["not important", "a little", "somewhat", "important", "very important", "top priority"],

    // crop map (explore.html)
    "nav.map": "🗺 Crop map",
    "x.tagline": "Crop map: where does each crop do well?",
    "x.back": "← Compare rotations",
    "x.step.crop": "Pick a crop", "x.measure": "Colour the map by",
    "x.m.came": "Seasons it [[replay|came through]]", "x.m.fit": "Fit score (0–100)",
    "x.water.note": "Same water source assumed everywhere on the map.",
    "x.step.click": "Click a place",
    "x.step.click.note": "Click anywhere on the map to see the top 3 crops for the nearest place with NASA data.",
    "x.points.sites": "Showing our {n} study places for now. A finer grid of places across Tamil Nadu is being prepared.",
    "x.points.grid": "Showing {n} places across Tamil Nadu.",
    "x.map.eyebrow": "Crop map", "x.map.aria": "Map. Click anywhere to see the top crops for the nearest place.",
    "x.map.title": "Where {crop} does well",
    "x.legend.came": "Share of seasons it came through", "x.legend.fit": "Fit score",
    "x.came.short": "{good}/{total} yrs", "x.came.long": "[[replay|Came through]] {good} of {total} seasons",
    "x.sow": "best sown in {m}", "x.water.need": "needs ~{mm} mm water",
    "x.col.place": "Place", "x.col.crop": "Crop", "x.col.sow": "Best sowing month", "x.col.came": "Came through", "x.col.fit": "Fit", "x.col.water": "Water need",
    "x.top.eyebrow": "Top 3 crops here", "x.top.empty": "Click a place on the map",
    "x.top.meta": "Each crop is tested on its own at its best sowing month, with {water}, against every year of NASA weather. The three come from different crop families.",
    "x.nearest": "Nearest place with data, {km} km from where you clicked.",
    "x.all": "All crops at this place",
    "x.compare.link": "Build a rotation here →",
    "x.busy": "Testing every crop at {n} places…", "x.busy.one": "Testing every crop here…",
    "x.pre.title": "Try a comparison", "x.pre.rice.rain": "Rice on rain only", "x.pre.rice.canal": "Rice with canal water",
    "x.limits": "One crop at a time, on regional weather data. Soil, pests, markets and water rights still need local advice.",
  },

  ta: {
    "lang.switch": "English", "lang.switch.aria": "Switch to English",
    brand: "வயல் மாற்றம்",
    tagline: "நிச்சயமற்ற பருவமழைக்கு ஏற்ற பயிர் சுழற்சி தேர்வுகள், நாசா தரவுகளுடன் சரிபார்க்கப்பட்டவை",
    expert: "நிபுணர் விவரங்கள்",
    print: "🖨 வேளாண் அலுவலருக்கு அச்சிடுக",
    "step.place": "உங்கள் ஊர்", "step.place.select": "ஊரைத் தேர்ந்தெடுக்கவும்",
    "map.aria": "மாதிரி இடங்களின் வரைபடம். தேர்வு செய்ய புள்ளியை அழுத்தவும்.",
    "step.grow": "இப்போது நீங்கள் பயிரிடுவது",
    "step.grow.note": "ஒவ்வொரு பயிரையும் அதை விதைக்கும் மாதத்தையும் தேர்ந்தெடுக்கவும்.",
    "step.water": "வயலுக்கான நீர்",
    "step.prio": "உங்களுக்கு எது முக்கியம்",
    "step.prio.note": "ஒவ்வொன்றையும் நகர்த்துங்கள். கீழே உள்ள தேர்வுகள் உடனே மறுவரிசைப்படும்.",
    "step.climate": "காலநிலை மாறினால் என்ன?",
    "site.eyebrow": "இந்த இடத்தைப் பற்றி நாசா தரவு சொல்வது",
    loading: "ஏற்றுகிறது…",
    "loading.data": "நாசா தரவை ஏற்றுகிறது…",
    "fig.monthly": "மழை vs [[et|ஆவியுயிர்ப்பு]] (பயிரின் நீர்த் தேவை), சராசரி மாதம்",
    "fig.monthly.note": "ஆரஞ்சு கோடு நீல பட்டைகளுக்கு மேலே இருக்கும்போது, பயிர்களுக்கு மண்ணில் சேமித்த நீர் அல்லது பாசனம் தேவை.",
    "fig.monsoon": "[[ne_monsoon|வடகிழக்கு பருவமழை]], ஆண்டுவாரியாக",
    "fig.ndvi": "செயற்கைக்கோள் பசுமை ([[ndvi|NDVI]]), மாதவாரியாக",
    "fig.compare": "இரண்டு நாசா மழைத் தரவுகள், அருகருகே",
    "opts.eyebrow": "ஒப்பிடுக",
    "opts.title": "உங்கள் வயலுக்கான மூன்று தேர்வுகள்",
    "opts.support": "இந்தத் தேர்வுகள் உங்கள் சொந்த முடிவுக்கும் உள்ளூர் ஆலோசனைக்கும் துணை மட்டுமே; அவற்றுக்கு மாற்று அல்ல. வேளாண் அலுவலரிடம் எடுத்துச் செல்ல அச்சு பொத்தானைப் பயன்படுத்தவும்.",
    "engine.english": "குறிப்பு: கணிப்பு இயந்திரம் எழுதும் விளக்க வாக்கியங்கள் தற்போது ஆங்கிலத்தில் மட்டுமே உள்ளன.",
    "gloss.title": "இங்கு பயன்படுத்திய சொற்கள்",
    "limits.title": "நேர்மையான வரம்புகள்",
    "limits.1": "நாசா POWER வெப்பநிலையும் GPM IMERG மழையும் பிராந்திய அளவிலான கட்டங்கள். அவை உங்கள் கிராமத்தைச் சுற்றியுள்ள பகுதியை விவரிக்கின்றன, உங்கள் வயலை மட்டும் அல்ல. செயற்கைக்கோள் மழை மிகப் பெரிய மழைகளைச் சற்று குறைத்துக் காட்டும்.",
    "limits.2": "பயிர் நீர்த் தேவைகளும் பண்புகளும் தோராயமான சராசரிகள். மதிப்பெண்கள் விளக்கக்கூடிய எளிய விதிகள், பயிற்றுவிக்கப்பட்ட மாதிரி அல்ல.",
    "limits.3": "காலநிலை 'என்ன ஆனால்' மாற்றங்கள் ஆராய்வதற்கான தோராயக் கணக்குகள், முன்னறிவிப்பு அல்ல.",
    "limits.4": "மண் சத்து, பூச்சிகள், சந்தை, நீர் ஒதுக்கீடு ஆகியவற்றுக்கு உள்ளூர் அறிவு தேவை. அச்சுத் தாளில் சரிபார்க்க வேண்டியவை உள்ளன.",

    "meta.rain": "மழை: {rain}; வெப்பநிலை, ஆவியுயிர்ப்பு: நாசா POWER",
    "monsoon.note": "{total} வடகிழக்கு பருவமழைகளில் {n}, இந்த இடத்தின் சராசரியை விட 20% அல்லது அதற்கு மேல் குறைவு: {years}.",
    "ndvi.note": "இடைநிலை மதிப்பு {years}, {source}.",
    "ndvi.mixed": " இந்தப் பகுதியில் மரங்களும் கலந்துள்ளதால், வெற்று மாதங்கள் இன்னும் தெளிவாகத் தெரியவில்லை.",
    "src.rain": "மழை: {x}", "src.weather": "வானிலை: {x}", "src.soil": "மண்: {x}", "src.ndvi": "பசுமை: {x}",
    "cmp.year": "ஆண்டு மழை", "cmp.ne": "அக்–டிச பருவமழை", "cmp.dry": "மிக வறண்ட பருவமழை ஆண்டு",
    "cmp.agree": "{year} தான் மிக வறண்ட வடகிழக்கு பருவமழை என்பதில் இரண்டும் ஒத்துப்போகின்றன. ",
    "cmp.disagree": "மிக வறண்ட வடகிழக்கு பருவமழை ஆண்டில் இரண்டும் வேறுபடுகின்றன. ",
    "cmp.corr": "ஆண்டுதோறும் பருவமழை அளவுகள் ஒன்றாக ஏறி இறங்குகின்றன (தொடர்பு {r}). ",
    "cmp.bigdiff": "POWER ஆண்டுக்கு {pct}% {dir} மழையைக் காட்டுகிறது; அதன் பெரிய கட்டம் அருகிலுள்ள மலைகளையும் சேர்ப்பதால் இருக்கலாம். மழைக்கு நுண்ணிய செயற்கைக்கோள் பதிவான IMERG-ஐப் பயன்படுத்துகிறோம்.",
    "cmp.more": "அதிக", "cmp.less": "குறைவான",
    "cmp.close": "ஆண்டு மொத்தங்கள் {pct}%-க்குள் உள்ளன. மழைக்கு நுண்ணிய செயற்கைக்கோள் பதிவான IMERG-ஐப் பயன்படுத்துகிறோம்.",
    "busy": "மீண்டும் கணக்கிடுகிறது…", "busy.years": "{n} உண்மையான ஆண்டுகளுடன் மீண்டும் கணக்கிடுகிறது…",
    "err.score": "இந்தச் சுழற்சியைக் கணக்கிட முடியவில்லை: {msg}",
    "err.load": "தரவை ஏற்ற முடியவில்லை ({msg}). கோப்பை நேரடியாகத் திறந்திருந்தால், இயக்கவும்: python -m http.server 8000 --directory web",
    "sum.current": "இந்த முன்னுரிமைகளுக்கு உங்கள் தற்போதைய சுழற்சியே சிறந்தது ({total}/100). இது {years} ஆண்டுகளில் {good} ஆண்டுகள் தாங்கியது.",
    "sum.best": "\"{tag}\" உங்கள் முன்னுரிமைகளுக்கு மிகப் பொருத்தம்: {total}/100, இப்போது பயிரிடுவதற்கு {cur}. இது {years} ஆண்டுகளில் {good} ஆண்டுகள் தாங்கியது (உங்களுடையது: {curGood}); ஆண்டுக்கு ~{need} மி.மீ நீர் தேவை (உங்களுடையது: ~{curNeed} மி.மீ).",
    "scenario.on": "காலநிலை 'என்ன ஆனால்' இயக்கத்தில் உள்ளது: ஒவ்வொரு ஆண்டுக்கும் {dT} °C, மழை {dP}%. இது ஒரு விளக்கம் மட்டுமே, முன்னறிவிப்பு அல்ல.",

    "grp.cash": "பயிர்கள்", "grp.forage": "தீவனம் / பயறு", "grp.green_manure": "பசுந்தாள் உரம் (உழுது மண்ணில் சேர்ப்பது)",
    "rot.year": "ஆண்டு {n}", "rot.each": "ஒவ்வொரு ஆண்டும்",
    "rot.crop.aria": "ஆண்டு {y}, பயிர் {n}", "rot.sow.aria": "ஆண்டு {y}, பயிர் {n} விதைப்பு மாதம்",
    "rot.sown": "{m} மாதம் விதைப்பு", "rot.unusual": " (வழக்கமில்லை)",
    "rot.remove": "இந்தப் பயிரை நீக்கு", "rot.add": "+ இந்த ஆண்டில் ஒரு பயிரைச் சேர்",
    "rot.second": "+ இரண்டாம் ஆண்டு வேறுபட்டது", "rot.same": "ஒவ்வொரு ஆண்டும் ஒன்றே",
    "rot.reset": "இந்த ஊரின் வழக்கமானதுக்கு மாற்று",
    levels: ["முக்கியமில்லை", "சிறிது", "ஓரளவு", "முக்கியம்", "மிக முக்கியம்", "முதன்மை"],
    "clim.dt": "அதிக வெப்பம்", "clim.dp": "மழை கூடுதல் / குறைவு", "clim.rain": "மழை {x}%",
    "clim.trend": "கவனித்த போக்கை 10 ஆண்டுகள் தொடர் ({dT} °C, மழை {dP}%)",
    "clim.today": "இன்றைய காலநிலை",
    "clim.note": "போக்கு பொத்தான் இந்த இடத்தின் {start}–{end} போக்கை நீட்டிக்கிறது (வெப்பநிலை: நாசா POWER; மழை: {rain}). இவை ஆராய்வதற்கான தோராய மாற்றங்கள், முன்னறிவிப்பு அல்ல.",

    "ch.rain": "மழை ({src})", "ch.et": "ஆவியுயிர்ப்பு (நாசா POWER)", "ch.mm": "மாதத்துக்கு மி.மீ",
    "ch.ne.axis": "மி.மீ, அக்–டிச", "ch.ne.label": "அக்–டிச மழை (ஆரஞ்சு = சராசரியை விட 20%+ குறைவு, IMD 'பற்றாக்குறை')",
    "ch.ne.avg": "சராசரி {x} மி.மீ", "ch.ne.tip": "அக்–டிச மழை: {x} மி.மீ (சராசரியின் {pct}%)",
    "ch.ndvi.axis": "NDVI (0 வெற்று → 1 அடர்த்தி)",

    "cal.aria": "வயல் நாட்காட்டி: ஒவ்வொரு மாதமும் வயலில் என்ன உள்ளது",
    "band.rain": "மழை", "band.dry": "வறட்சி", "band.heat": "வெப்பம்", "band.heavy": "கனமழை",
    "tip.rain": "{x} மி.மீ மழை (சராசரி)",
    "tip.dry.neg": "நீர் சமநிலை {x} மி.மீ (ஆவியுயிர்ப்பை விட மழை குறைவு)",
    "tip.dry.pos": "நீர் சமநிலை +{x} மி.மீ (ஆவியுயிர்ப்பை விட மழை அதிகம்)",
    "tip.heat": "{t} °C-க்கு மேல் {x} நாட்கள் (சராசரி)", "tip.heavy": "{x} கனமழை நாட்கள் (சராசரி)",
    "cal.field": "வயல்", "cal.bare": "வெற்று", "cal.bare.tip": "வெற்று நிலம்", "cal.gm.tip": " (பசுந்தாள் உரம், உழுது சேர்க்கப்படும்)",
    "cal.key.crop": "பயிர்", "cal.key.cover": "பசுந்தாள் உரம்", "cal.key.bare": "வெற்று நிலம்",
    "cal.note": "பட்டைகள்: அடர் நிறம் = அதிகம், {start}–{end} சராசரி{sc}. ",
    "cal.note.sc": ", உங்கள் காலநிலை மாற்றத்துடன்",
    "cal.note.imerg": "மழையும் கனமழையும்: GPM IMERG; வெப்பமும் வறட்சியும்: நாசா POWER.",
    "cal.note.power": "மூலம்: நாசா POWER.",

    "tag.Your current rotation": "உங்கள் தற்போதைய சுழற்சி", "tag.Bigger shift": "பெரிய மாற்றம்",
    "tag.Small step": "சிறிய மாற்றம்", "tag.Alternative": "மாற்று வழி",
    "card.best": "★ உங்கள் முன்னுரிமைகளுக்கு மிகப் பொருத்தம்", "card.timing": "காலப் பொருத்தச் சிக்கல் உள்ளது",
    "card.outof": "100-க்கு", "card.fit": "உங்கள் முன்னுரிமைகளுடன் பொருத்தம்", "card.fit.aria": "பொருத்த மதிப்பெண்",
    "card.came": "தாங்கியது", "card.of": "{total} ஆண்டுகளில் {good} ஆண்டுகள்", "card.came.after": "1",
    "card.hardest": "கடினமான ஆண்டுகள்: ",
    "card.water": "நீர்: ஆண்டுக்கு ~{need} மி.மீ தேவை",
    "card.water.irr": "; அதில் ~{irr} மி.மீ {src} மூலம்",
    "card.water.rain": "; மழையும் மண் ஈரமும் மட்டும்",
    "card.why": "ஏன் இந்தத் தேர்வு", "card.evidence": "நாசா தரவுச் சான்றுகள் ",
    "card.hint": "மாதங்களைப் பார்க்க ▦ குறிப்பின் மேல் வைக்கவும்",
    "card.benefits": "நன்மைகள்", "card.risks": "உள்ளூரில் சரிபார்க்க வேண்டிய அபாயங்கள்",
    "card.gaps": "தரவால் சொல்ல முடியாதவை ({n})",
    "card.subs": "துணை மதிப்பெண்கள் (0–100)", "card.engine": "இயந்திரக் குறிப்பு: {label}. நீர் ஆதாரம்: {src}.",
    "card.chip.aria": "{text}. நாட்காட்டியில் {months} காட்டும்",
    "card.year": "ஆண்டு {n}",
    "sub.pest": "பூச்சி, நோய் சுழற்சி முறிவு",
    "replay.ok": "{year}: தாங்கியது", "replay.bad": "{year}: {reason}",

    "ps.title": "வயல் மாற்றம்: என் வேளாண் அலுவலருக்கான பயிர்த் திட்டக் குறிப்புகள்",
    "ps.printed": "அச்சிட்ட நாள் {date}",
    "ps.farm": "இன்று என் பண்ணை", "ps.grow": "நான் பயிரிடுவது: ", "ps.water": "நீர் ஆதாரம்: ",
    "ps.matters": "எனக்கு முக்கியமானவை: ", "ps.whatif": "பயன்படுத்திய காலநிலை மாற்றம்: ",
    "ps.whatif.val": "{dT} °C, மழை {dP}% (விளக்கம் மட்டுமே, முன்னறிவிப்பு அல்ல)",
    "ps.says": "இந்த இடத்தைப் பற்றி நாசா தரவு சொல்வது",
    "ps.compared": "மூன்று தேர்வுகள் ஒப்பீடு",
    "ps.cols": ["தேர்வு", "பயிர்கள்", "பொருத்தம் (0–100)", "தாங்கியது", "நீர்த் தேவை / பாசனம்", "கடினமான ஆண்டுகள்"],
    "ps.years": "{total} ஆண்டுகளில் {good}",
    "ps.why": "ஏன்", "ps.benefits": "நன்மைகள்", "ps.risks": "அபாயங்கள்",
    "ps.check": "சரிபார்க்க உதவுங்கள் (இவற்றைத் தரவால் சொல்ல முடியாது)",
    "ps.newcrop": "{crop} என் மண்ணுக்கும் ஊருக்கும் ஏற்றதா? நல்ல விதை ரகம், விதைப்புப் பருவம் எது?",
    "ps.notes": "அலுவலர் குறிப்புகள்",
    "ps.data": "தரவு {start}–{end}: {rain}{weather}; மண்: {soil}{ndvi}. வானிலைத் தரவு பகுதியை விவரிக்கிறது, இந்த வயலை மட்டும் அல்ல. மதிப்பெண்கள் விளக்கக்கூடிய எளிய விதிகள், கணிப்பு அல்ல.",
    "ps.support": "வயல் மாற்றம் உங்கள் முடிவுக்கும் உள்ளூர் ஆலோசனைக்கும் துணை; அவற்றுக்கு மாற்று அல்ல.",
    "ps.sown": "{m} விதைப்பு",
    "ps.levels": ["முக்கியமில்லை", "சிறிது", "ஓரளவு", "முக்கியம்", "மிக முக்கியம்", "முதன்மை"],

    "nav.map": "🗺 பயிர் வரைபடம்",
    "x.tagline": "பயிர் வரைபடம்: எந்தப் பயிர் எங்கே நன்றாக வளரும்?",
    "x.back": "← சுழற்சிகளை ஒப்பிடு",
    "x.step.crop": "ஒரு பயிரைத் தேர்ந்தெடுக்கவும்", "x.measure": "வரைபட நிறம் எதைக் காட்டும்",
    "x.m.came": "[[replay|தாங்கிய]] பருவங்கள்", "x.m.fit": "பொருத்த மதிப்பெண் (0–100)",
    "x.water.note": "வரைபடத்தில் எல்லா இடங்களுக்கும் ஒரே நீர் ஆதாரம் கொள்ளப்படுகிறது.",
    "x.step.click": "ஒரு இடத்தை அழுத்தவும்",
    "x.step.click.note": "நாசா தரவு உள்ள அருகிலுள்ள இடத்தின் சிறந்த 3 பயிர்களைப் பார்க்க வரைபடத்தில் எங்காவது அழுத்தவும்.",
    "x.points.sites": "இப்போதைக்கு எங்கள் {n} ஆய்வு இடங்கள் மட்டும். தமிழ்நாடு முழுவதற்குமான நுண்ணிய கட்டம் தயாராகிறது.",
    "x.points.grid": "தமிழ்நாடு முழுவதும் {n} இடங்கள்.",
    "x.map.eyebrow": "பயிர் வரைபடம்", "x.map.aria": "வரைபடம். அருகிலுள்ள இடத்தின் சிறந்த பயிர்களைப் பார்க்க எங்காவது அழுத்தவும்.",
    "x.map.title": "{crop} எங்கே நன்றாக வளரும்",
    "x.legend.came": "தாங்கிய பருவங்களின் பங்கு", "x.legend.fit": "பொருத்த மதிப்பெண்",
    "x.came.short": "{good}/{total} ஆண்டு", "x.came.long": "{total} பருவங்களில் {good} [[replay|தாங்கியது]]",
    "x.sow": "சிறந்த விதைப்பு {m}", "x.water.need": "~{mm} மி.மீ நீர் தேவை",
    "x.col.place": "இடம்", "x.col.crop": "பயிர்", "x.col.sow": "சிறந்த விதைப்பு மாதம்", "x.col.came": "தாங்கியது", "x.col.fit": "பொருத்தம்", "x.col.water": "நீர்த் தேவை",
    "x.top.eyebrow": "இங்கே சிறந்த 3 பயிர்கள்", "x.top.empty": "வரைபடத்தில் ஒரு இடத்தை அழுத்தவும்",
    "x.top.meta": "ஒவ்வொரு பயிரும் தனியாக, அதன் சிறந்த விதைப்பு மாதத்தில், {water} உடன், நாசா வானிலையின் ஒவ்வொரு ஆண்டிலும் சோதிக்கப்படுகிறது. மூன்றும் வெவ்வேறு பயிர்க் குடும்பங்கள்.",
    "x.nearest": "தரவு உள்ள அருகிலுள்ள இடம், நீங்கள் அழுத்திய இடத்திலிருந்து {km} கி.மீ.",
    "x.all": "இந்த இடத்தில் எல்லாப் பயிர்களும்",
    "x.compare.link": "இங்கே ஒரு சுழற்சியை உருவாக்கு →",
    "x.busy": "{n} இடங்களில் ஒவ்வொரு பயிரையும் சோதிக்கிறது…", "x.busy.one": "இங்கே ஒவ்வொரு பயிரையும் சோதிக்கிறது…",
    "x.pre.title": "ஒப்பிட்டுப் பாருங்கள்", "x.pre.rice.rain": "மழை மட்டும் நெல்", "x.pre.rice.canal": "கால்வாய் நீருடன் நெல்",
    "x.limits": "ஒரு நேரத்தில் ஒரு பயிர், பிராந்திய வானிலைத் தரவில். மண், பூச்சி, சந்தை, நீர் உரிமை ஆகியவற்றுக்கு உள்ளூர் ஆலோசனை தேவை.",
  },
};

// Labels for engine keys (PRIORITIES, WATER_SOURCES) and site ids, per language.
const LABELS = {
  ta: {
    prio: { water: "நீர் சேமிப்பு", income: "வருமானம்", soil_structure: "மண் வளம்", nitrogen: "இயற்கை நைட்ரஜன்",
      erosion: "மண் அரிப்புத் தடுப்பு", forage: "கால்நடைத் தீவனம்", reliability: "மோசமான ஆண்டுகளில் நம்பகத்தன்மை" },
    water: { rainfed: "மழை மட்டும் (மானாவாரி)", tank: "ஏரி / குளம்", canal: "ஆற்றுக் கால்வாய் / அணை", borewell: "ஆழ்துளைக் கிணறு / கிணறு" },
    site: { tirunelveli: "திருநெல்வேலி (தாமிரபரணி பள்ளத்தாக்கு)", madurai: "மதுரை (வைகை / பெரியாறு பாசனப் பகுதி)", thanjavur: "தஞ்சாவூர் (காவிரி டெல்டா)" },
  },
};

export const getLang = () => lang;

export function initLang() {
  let l = null;
  try { l = new URLSearchParams(location.search).get("lang") || localStorage.getItem("fs-lang"); } catch {}
  lang = l === "ta" ? "ta" : "en";
  document.documentElement.lang = lang;
  return lang;
}

export function setLang(l) {
  lang = l === "ta" ? "ta" : "en";
  document.documentElement.lang = lang;
  try { localStorage.setItem("fs-lang", lang); } catch {}
  listeners.forEach((f) => f(lang));
}
export const onLangChange = (f) => listeners.push(f);

/** t("key", {vars}) -> string (or array for list entries). Falls back to English. */
export function t(key, vars) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  if (typeof s !== "string" || !vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

export const monthName = (m) => MONTHS[lang][m - 1];          // m = 1..12
export const monthShort = (m) => MONTHS_SHORT[lang][m - 1];
export const monthInitial = (m) => MONTHS_INITIAL[lang][m - 1];

const shortName = (c) => c.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
/** Crop name in the current language only. */
export const cropName = (c) => (lang === "ta" && c?.tamil_name ? c.tamil_name : shortName(c));
/** Shortest name for tight spaces (calendar ribbon). */
export const cropShort = (c) => (lang === "ta" && c?.tamil_name ? c.tamil_name.replace(/\s*\(.*?\)\s*/g, "").trim() : shortName(c).split(",")[0]);

export const prioLabel = (k, fallback) => LABELS[lang]?.prio?.[k] ?? fallback;
export const waterLabel = (k, fallback) => LABELS[lang]?.water?.[k] ?? fallback;
export const siteName = (s) => LABELS[lang]?.site?.[s.id] ?? s.name;
export const tagLabel = (tag) => t(`tag.${tag}`);

/** Translate the short engine sentences we know the shape of; others stay as written. */
export function translateEngine(text, priorities = {}) {
  if (lang === "en") return text;
  let m;
  if ((m = /^Better on "(.+)" \((\d+) → (\d+) out of 100\)$/.exec(text))) {
    const key = Object.keys(priorities).find((k) => priorities[k] === m[1]);
    return `"${prioLabel(key, m[1])}" இல் மேம்பாடு (${m[2]} → ${m[3]}, 100-க்கு)`;
  }
  if ((m = /^Would have come through (\d+) more of the last (\d+) years$/.exec(text)))
    return `கடந்த ${m[2]} ஆண்டுகளில் மேலும் ${m[1]} ஆண்டுகள் தாங்கியிருக்கும்`;
  if ((m = /^Uses ~(\d+)% less water than your current rotation$/.exec(text)))
    return `உங்கள் தற்போதைய சுழற்சியை விட ~${m[1]}% குறைவான நீர்`;
  if (text === "This is what you grow now: the baseline to compare against")
    return "இதையே இப்போது பயிரிடுகிறீர்கள்: ஒப்பிடுவதற்கான அடிப்படை";
  if (text === "Closest alternative to your current rotation with a similar score")
    return "உங்கள் தற்போதைய சுழற்சிக்கு மிக நெருக்கமான, ஒத்த மதிப்பெண் கொண்ட மாற்று";
  return text;
}

export function fmtDate(d) {
  return d.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
}
