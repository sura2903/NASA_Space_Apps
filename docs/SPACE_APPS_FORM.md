# Space Apps project page: copy-paste blocks

These follow the official form fields in the 2026 Project Submission Guide, in the same order. Copy the text inside
each box into the matching field. Every number here matches `docs/SUBMISSION.md` and the live site as checked on
15 Nov 2026.

**Before you submit:**
- **Demo link:** paste Nimalan's video link in field 3. It must be public: no login, permission or registration.
  Test it in a private window.
- **Final project link:** use the live site. The GitHub repo is now **public**
  (https://github.com/sura2903/NASA_Space_Apps), so it can also be linked, for example in the project details or
  references; every page's footer already links to it.
- **Save often:** use "Save Progress", and turn on the edit Lock so Nimalan doesn't overwrite your changes. Submit
  before 11:59 PM local time. You can keep resubmitting until then; only the last save counts.
- **Rules check:**
  - Video demo: 30 seconds or less. If any speech isn't in English, it needs English subtitles. The guide suggests
    opening with your names and team name.
  - Anything AI-generated must be labelled: images and videos need a visible watermark, and code needs a note.
    This is done for our part: a footer label on every page (PR #31), `AI_USE.md`, and a visible label on every
    `docs/video` chart. Nimalan has the rules for the video (issue #20).

---

## 1. Project Name

```text
SowSmart (ஸ்மார்ட் விதைப்பு): crop choices for an uncertain monsoon, checked against NASA data
```

---

## 2. Summary (50–200 words; this one is 185)

```text
SowSmart is a free website, in English and Tamil, built for phones, that helps Tamil Nadu farmers choose crop rotations that protect their fields, save water and stand up to erratic monsoons, heatwaves, droughts, floods and falling groundwater. Farmers often judge risk by the few seasons they remember. SowSmart replays each rotation through every season from 2001 to 2024 using NASA data (GPM IMERG rainfall, NASA POWER heat, soil wetness and wind, SMAP soil moisture, MODIS vegetation, GRACE-based groundwater and NEX-GDDP-CMIP6 projections to 2060), with local soil, crop traits and farmer priorities.

A farmer enters their place, sowing time, water and crops, and sees their current rotation beside two alternatives, each with its evidence, benefits and risks to check locally.

Policy makers get the same engine statewide, district by district: maps of drought, cyclones, heat by 2060 and falling groundwater, and crops that suit a district but are rarely grown there, revealing untapped potential.

SowSmart turns NASA Earth observations into a choice a farmer can make before sowing, and equips government officials with data-driven tools to plan support before a severe season, not after it.
```

---

## 3. Link to Project Demo

```text
<PASTE NIMALAN'S PUBLIC VIDEO LINK HERE: 30 seconds or less, English captions>
```

---

## 4. Link to Final Project

```text
https://sura2903.github.io/NASA_Space_Apps/
```
*(Opens the scrolling overview page; its buttons lead to the Farmers and Policy makers views.)*
*Mirror with the same content, if the form or judges prefer a second address: https://sowsmart-nasa.vercel.app/*

---

## 5. Detailed Project Description

```text
WHAT IT DOES

A home page gives a scrolling overview: the problem, the data, both views, the evidence and the team. Then:

A "Take a tour" button on each page walks a first-time visitor through the features step by step, in English or Tamil.

For farmers (Farmers tab):
1. Where is your farm? Choose your district, then one of about five places in it. Each place is named after the village or town at its centre and its taluk, for example "Malayarnatham, Papanasam taluk (13 km east of Thanjavur)". You can also use your location or pick on a map. The page opens on an example place, so it works straight away.
2. When do you sow? Pick a traditional sowing season (pattam) or a month first.
3. Your water and crops. Tick every water source you can use: rain only, lake or pond, river canal or dam, borewell. A Cauvery delta farmer on canal water is also asked whether Mettur dam has opened this year (not known yet, on time, late, very late or not opened), and the advice changes with the answer. Then tick your crops ("Best here" shows the crops that did best at this place and time). Each crop gets a tile with its chance of coming through when sown then, marked good choice, risky or not advised. The last 10 seasons count twice because the climate is changing. The raw counts ("came through 22 of 24") are one tap away.
4. Three options for your field. Your current rotation, a small step and a bigger shift, side by side. Each has 24 squares, one per real year, and shows the water the plan needs and why. One tap further shows how the plan fares with the 2041–2060 climate in 5 NASA climate models (NEX-GDDP-CMIP6), as a range: for example, at Thanjavur today's rice-rice plan drops from 9 to 6–8 of 24 future-like years.
5. Print a one-page summary for the farmer's agriculture officer.
A detail view adds how the climate has changed at the place, extreme events, the latest NASA SMAP soil-moisture reading ("Sow now or wait?") and the NASA data behind every number.

For policy makers (Policy makers tab):
- Colour the state map by 12 layers, either as 185 squares about 28 km wide (trimmed to the state outline, with the 38 district boundaries drawn on top) or by district (each district coloured by the average of its places). The layers are: an exposure score; crop mix vs rain; 1-in-100-year rain and drought (checked against 124 years of rain gauges); cyclones passing within 100 km (NOAA tracks); storm days; very hot days today and by 2041–2060; groundwater trend (NASA GRACE-assimilated GLDAS); northeast-monsoon change by 2041–2060; lake-fed long rice reliability today; and rain-fed long rice by 2041–2060.
- Click a place to see its worst drought on record, what to avoid and what is safer in a drought year, what came through 2016, and how much irrigation water a crop switch would save in its district.
- District by district: crops that suit each district's rain but are rarely grown there today, for example sesame in 22 districts and cowpea in 15.
- A crop map shows where each crop does well across the state.

HOW IT WORKS

- Data: for each of the 185 places, 24 years (2001–2024) of real daily weather from NASA. Rain comes from GPM IMERG; temperature, crop water demand, wind and soil wetness from NASA POWER. Each place also has soil texture (SoilGrids), groundwater trends (GRACE-assimilated GLDAS) and 2041–2060 climate projections (NASA NEX-GDDP-CMIP6, 5 models).
- Crops: 21 crops with sowing months, season length, water need and heat, flood and wind tolerance, from the Tamil Nadu Agriculture Department Crop Production Guides and TNAU.
- Replay: each crop plan runs through each real season with a soil-water balance. A season counts as "came through" if there was enough water (rain, stored soil water and the chosen irrigation) and no killing heat or waterlogging.
- Water sources behave like the real thing. Lake and pond water depends on that year's monsoon. Delta canal water follows what Mettur dam actually did each year: opening date, closing date and release.
- Results are counts and chances over real seasons, never a single forecast.

DOES IT WORK?

- Backtest against real yields: 212 district-by-crop series from Government of India crop statistics, harvests 2001–2022. When the engine predicts a failure, a bad-yield year followed 33% of the time, versus 24% otherwise (lift 1.37, p < 0.001). Predicted and actual bad years correlate at r = 0.71 across years. In the 2016 drought the engine flagged 84% of series; 70% really had bad yields.
- The delta canal model matches history: short Kuruvai rice on canal water came through 22 of 24 seasons when Mettur opened on time and none when it opened late. This matches the roughly 40% drop in real Kuruvai area in late-opening years.
- Known cyclones appear in the right places: Gaja (2018) at Thanjavur, Thane (2011) across the delta, Vardah (2016) at Chennai.
- We corrected ourselves. A 124-year rain-gauge check (IMD, 1901–2024) showed that 2016 was the 2nd–4th driest northeast monsoon since 1901, not "rarer than 1-in-100" as satellite data alone suggested. The site shows the corrected figures.

KEY FINDINGS

- A farmer we interviewed told us not to plant rice in a drought year and to grow crops such as black gram and sesame instead. The data agrees: in drought-type seasons, lake-fed long rice at Tirunelveli failed 7 times out of 7, while black gram, sesame and millets came through.
- Memory misleads. A farmer remembering 2005–2014 saw Thanjavur's lake-fed rice come through 9 of 10 seasons; over 24 years it was 16 of 23, and the 2016 drought came right after.
- By 2041–2060, daytime highs rise about 0.9 °C everywhere, with up to about 22 more very hot days a year in the north. The climate models disagree on whether the northeast monsoon gets wetter or drier, so the site says so instead of picking one.

BENEFITS AND WHAT WE HOPE TO ACHIEVE

Farmers get odds, not promises, based on real seasons at their own place, in Tamil, on a phone, for free. Agriculture officers and state planners get the same evidence statewide: where farming is most exposed, which crops to support ahead of a severe season, and how much water a crop switch could save. Next we want to add:
- crop prices and costs;
- pest and disease risk from NASA humidity and temperature;
- groundwater limits in borewell plans;
- the southern dams (Papanasam, Vaigai), whose openings we found are often months late;
- soil types detected from data (SoilGrids plus how fast SMAP soil moisture dries, satellite soil colour and the farmer's Soil Health Card);
- how much water to give each crop and when;
- which fertiliser to use and what it contains (for example urea 46% N, DAP 18-46-0);
- improved and approved GM varieties (in India, only Bt cotton is widely approved for commercial cultivation);
- links to order the seed, fertiliser and materials a plan needs from trusted, clearly labelled sellers, keeping the advice independent.

TOOLS

Python (pandas, NumPy, SciPy, requests) for the data pipeline and statistics. Plain JavaScript (ES modules), HTML and CSS for the website, with Leaflet and OpenStreetMap for maps. Hosted on GitHub Pages. Data came through NASA GES DISC Giovanni, NASA POWER, NASA AppEEARS and the NASA NCCS THREDDS server.

HONEST LIMITS

These are odds from past seasons, not forecasts. Satellite rain under-reads very local extremes, so our 1-in-100-year rain levels are conservative. Water politics and local groundwater over-pumping are not modelled. The southern canals have no public year-by-year release record. The tool supports a farmer's judgement and the agriculture officer's advice; it does not replace them.
```

---

## 6. Use of Super Intelligence (SI)

*(Not shown to judges; for data collection only.)*

```text
Yes. We used Anthropic's Claude (Claude Code) as a coding and analysis assistant.

How we used it: under our direction it wrote most of the data pipeline code (Python) and the website code (JavaScript, HTML, CSS), ran the statistical checks (backtest, extreme-value fits, before/after comparisons), helped review each other's code, and drafted documentation, including this text. Commits made with its help are marked "Co-Authored-By: Claude" in the repository history.

The 30-second demo video and its music were also made with Claude: code that draws each animated scene from our real data and screenshots of the live site, the captions, and code that synthesises the music (no samples or third-party audio). No AI image or video generation model was used.

What we did ourselves: we chose the problem, region and audience; talked with farmers and people who work with them; decided every modelling choice; reviewed every result against sanity checks; chose the story of the video and reviewed every version; and kept a log of every change of direction (docs/RESEARCH_LOG.md).

No AI-generated data is presented as data. Every number on the site comes from the NASA and other data sources listed. The charts are drawn by our code from that data.

How it is labelled:
- every page of the site has a footer line, "Built with AI assistance (Claude)", linking to a "Use of AI" section, plus an "ai-assistance" metadata tag;
- the demo video carries a visible "SI-generated" watermark on every frame, naming the graphics, captions and music, and says the same in its file metadata and description;
- the chart images made for the video carry a visible label, "Chart drawn by AI-assisted code (Claude) from real data", with the same text in their file metadata;
- AI-assisted commits are marked "Co-Authored-By: Claude";
- the full statement is in AI_USE.md in the repository;
- no NASA logos or insignia are used anywhere.
```

---

## 7. NASA Data

```text
1. GPM IMERG Final Precipitation, daily, V07 (NASA GES DISC, via the Giovanni time-series service). Daily rain 2001–2024 at all 185 places: monthly rain, dry spells after sowing, monsoon onset, 1-in-100-year rain (extreme-value fits), and the season-by-season replay of every crop plan.

2. NASA POWER daily data (MERRA-2 based). Temperature and very hot days, crop water demand (reference evapotranspiration), root-zone soil wetness, wind speed and storm days, and 1981–2024 climate trends.

3. NASA NEX-GDDP-CMIP6 downscaled climate projections (NASA NCCS THREDDS). 5 climate models, SSP2-4.5 and SSP5-8.5, 2041–2060 compared with 1995–2014, at all 185 places. Every plan is also replayed under the future climate.

4. GLDAS-2.2 with GRACE data assimilation (NASA GES DISC, via Giovanni). Groundwater storage trend 2003–2024 at every place, on the Policy map. For example, the Cauvery delta is falling (Thanjavur about −0.2 cm a year).

5. MODIS MOD13Q1 NDVI vegetation index (via NASA AppEEARS). 2015–2024 greenness by month, matched to each place's crop calendar.

6. SMAP L3 Enhanced soil moisture, SPL3SMP_E (via NASA AppEEARS). The latest surface soil moisture compared with normal, in "Sow now or wait?". We checked it against rainfall (r = 0.60–0.73).

7. SRTM elevation (via NASA AppEEARS). Elevation of the demo places.

NASA tools used: Giovanni, AppEEARS, the POWER API, the NCCS THREDDS data server and Earthdata Login.
```

---

## 8. Space Agency Partner Data and Other References

```text
Space Agency Partner data: none used directly. Our long-record rainfall check uses the India Meteorological Department (IMD) gridded rainfall, not ISRO data.

Other data:
- India Meteorological Department (IMD): 1901–2024 gridded daily rainfall (1°), used to check 1-in-100-year droughts against a 124-year record.
- NOAA IBTrACS: tropical cyclone tracks (North Indian Ocean), for cyclone passes within 100 km.
- NOAA Climate Prediction Center ONI, and NOAA PSL Indian Ocean Dipole index: El Niño and IOD odds.
- ISRIC SoilGrids: soil texture, organic carbon and water holding.
- Government of India, Directorate of Economics and Statistics: district-wise crop area, production and yield (backtest and district crop areas).
- Tamil Nadu Agriculture Department: Crop Production Guides (crop traits) and Season and Crop Report tables (Mettur reservoir opening and closing dates, releases and paddy area).
- Tamil Nadu Agricultural University (TNAU) and FAO: crop water needs and crop references.
- OpenStreetMap contributors (ODbL): base map, and village, taluk and district names via the Nominatim service.
- News reports and TNAU daily news archive: Papanasam and Vaigai dam opening dates (research only; sources listed in the repository).

Software and tools: Python (pandas, NumPy, SciPy, requests, pypdf), Leaflet (BSD-2), GitHub Pages, and Anthropic Claude (Claude Code) as a coding assistant.

Interview: a Tamil Nadu farmer, who shared how farmers judge risk and what they plant in drought years.

All code and text are our own, written with the AI assistance described above. No copyrighted images are used.
```
