# SowSmart (ஸ்மார்ட் விதைப்பு): submission draft

Challenge: **Field Shift: Adapting Farms with NASA Data** (NASA Space Apps 2026)
Live demo: https://sura2903.github.io/NASA_Space_Apps/ (English and Tamil, works on a phone)
Team: Siddarth (data, models) and Nimalan (web app, story)

> Draft for the Space Apps project page. Paste section by section. Every number below comes from
> `docs/RESEARCH_LOG.md` (iteration numbers in brackets) and can be re-run from `pipeline/`.

---

## 1. One line
SowSmart replays a Tamil Nadu farmer's crop plan through every real season in the NASA record. It shows which crops
held up when the monsoon failed, flooded or arrived late, and gives policy makers the same answer for the whole state.

## 2. The problem
- **The monsoon decides most farming in Tamil Nadu.** Most of the state's rain falls in the October–December
  northeast monsoon, and it swings hard from year to year. The 2016 monsoon brought less than half the usual rain in
  much of the state; the December 2023 Tirunelveli flood was the wettest day there in 124 years.
- **Memory is short.** A farmer we interviewed said people judge risk by about the last ten seasons [FN-1]. A farmer
  remembering 2005–2014 saw Thanjavur's tank-fed rice come through 9 of 10 seasons. Over 24 years it came through 16
  of 23, and the 2016 drought came right after [I-25].
- **What to avoid matters as much as what to plant**, and farmers want odds, not promises [FN-1].

## 3. What SowSmart does
**For a farmer (Farm tab)**
1. **Choose your place:** any of 50 places in Tamil Nadu, or "use my location". It opens with an example, so it works
   straight away.
2. **Say what you grow and your water** (rain only, lake / pond, river canal, borewell).
3. **Get three plans side by side:** your current rotation, a small step and a bigger shift. Each plan shows how many
   of the 24 real seasons it came through, the water it needs and why.
4. **One tap away:**
   - *Which of your crops suit this season?*
   - *Sow now or wait?*: dry-spell risk after sowing, monsoon onset, the latest NASA SMAP soil-moisture reading.
   - *What NASA data says about this place*.
   - *How the climate here has changed*.

**For a policy maker (Policy tab)**
- **Colour the state map by any risk:**
  - crop mix vs rain (mismatch);
  - 1-in-100-year rain and drought;
  - cyclone passes and storm days;
  - very hot days today and by 2041–2060;
  - northeast-monsoon change;
  - tank rice reliability.
- **Click a place:** what to avoid in a drought year, what came through 2016, wind-exposed crops, and how much
  irrigation water a crop switch would save in its district.
- **Crop map:** where each crop does well across the state.

## 4. How it works (the engine)
- **Data in:** for every place, 24 years (2001–2024) of real daily weather from NASA. Rain comes from GPM IMERG;
  temperature, crop water demand, wind and soil wetness from NASA POWER.
- **Crops:** 21 crops with sowing months, season length, water need and heat, flood and wind tolerance, taken from the
  Tamil Nadu Agriculture Department Crop Production Guides and TNAU.
- **Replay:** each crop plan runs through each real season. A season counts as "came through" if there was enough
  water (rain, soil and the chosen irrigation), and no killing heat or waterlogging.
- **Water sources behave like the real thing:**
  - Lake / pond water depends on that year's monsoon.
  - Cauvery delta canal water follows what Mettur dam actually did each year: opening date, closing date and release.
    A farmer can ask "the dam is late this year, what now?" [I-29].
- **Honest ranges:** results are counts out of 24 real seasons, never a single forecast.

## 5. Does it work? (validation)
- **Backtest against real yields** (Government of India district crop statistics, 212 district × crop series,
  harvests 2001–2022, the years our weather record covers) [I-14, I-17]:
  - When the engine predicts a crop failure, a bad-yield year followed **33%** of the time vs **24%** otherwise
    (**lift 1.37**, p < 0.001).
  - Across years, predicted and actual bad years correlate at **r = 0.71**. In **2016** the engine flagged 84% of series;
    70% really had bad yields.
  - Rice: area lift **2.19×**, production **2.32×**.
- **Known storms appear in the right places:** NOAA cyclone tracks place Gaja (2018) at Thanjavur, Thane (2011) across
  the delta and Vardah (2016) at Chennai [I-35].
- **The delta's canal model matches history:** Kuruvai rice on canal water alone came through every season Mettur
  opened on time and none when it opened late, matching the ~40% drop in real Kuruvai area in late years [I-29].
- **A 124-year check** (IMD rain gauges, 1901–2024) corrected our own claim that 2016 was "rarer than 1-in-100". It
  ranks 2nd–4th driest since 1901 [I-36]. We show the corrected figures.

## 6. Key findings worth showing
- **The farmer's own advice holds up:** in drought-type seasons, tank-fed long rice failed (Tirunelveli 0 of 7), while
  black gram, sesame and millets came through [I-23].
- **Which decade you remember changes the answer:** Madurai tank rice came through anywhere from 20% to 60% of seasons,
  depending on the decade [I-25].
- **Kuruvai depends on the dam or a borewell:** if Mettur opens in August, Kuruvai on canal water came through 0 of 24
  replayed seasons. Samba still came through 24 of 24 [I-29].
- **Cyclones:** Samba rice in the delta was hit near harvest in 8 of 44 seasons since 1981 (Nisha, Thane, Gaja) [I-35].
- **2041–2060 (NASA NEX-GDDP-CMIP6, 5 models):**
  - Daytime highs rise about 0.9 °C everywhere.
  - Up to 21 more very hot days a year in the north.
  - The models disagree on whether the northeast monsoon gets wetter or drier at all 47 places, so we say so [I-33].

## 7. NASA data used
| NASA dataset | How we used it |
|---|---|
| **GPM IMERG Final daily V07** (via NASA GES DISC **Giovanni** Time Series API) | Daily rain 2001–2024 at 50 places: monthly rain, dry spells after sowing, monsoon onset, 1-in-100-year rain (GEV) |
| **NASA POWER** daily (MERRA-2) | Temperature, very hot days, crop water demand (Hargreaves ET0), root-zone soil wetness, wind and storm days, 1981–2024 climate trends |
| **NASA NEX-GDDP-CMIP6** (NCCS THREDDS) | 5 climate models, SSP2-4.5 and SSP5-8.5, 2041–2060 vs 1995–2014, all 50 places; future replay of every plan |
| **MODIS MOD13Q1 NDVI** (via **AppEEARS**) | 2015–2024 greenness by month, matching each place's crop calendar |
| **SMAP L3 enhanced soil moisture** (via **AppEEARS**) | Latest soil moisture vs normal in "Sow now or wait?"; checked against rainfall (r = 0.60–0.73) |
| **SRTM elevation** (via **AppEEARS**) | Elevation of the demo sites |

**Other data:**
- NOAA ONI and PSL IOD indices: El Niño and Indian Ocean Dipole odds.
- NOAA IBTrACS cyclone tracks.
- IMD 1901–2024 gridded rainfall: the long-record check.
- ISRIC SoilGrids: soil texture.
- Government of India DES district crop statistics: backtest and district crop areas.
- Tamil Nadu Agriculture Department Crop Production Guides and Mettur reservoir tables.
- TNAU and FAO crop references.
- OpenStreetMap: base map.

## 8. Honest limits
- **Odds, not forecasts:**
  - We count what happened in real seasons.
  - El Niño only tilts the odds for rice and groundnut, and that link has not been stable over decades [I-22].
  - Mettur's opening date cannot be predicted in June, so the farmer chooses it [I-18].
- **Satellite rain under-reads local extremes:** it put the Dec 2023 Tirunelveli flood at about 1-in-50. Our
  1-in-100 rain levels are therefore conservative.
- **Water politics and groundwater are not modelled.** Interstate releases are covered only through Mettur's actual
  record, and groundwater depletion is not covered at all.
- **Crop traits:** some (for example the small millets' water needs) are approximate. We checked the ones that drive
  the top recommendations and record every source in `crops.json` [I-28, I-30, I-34].
- **The tool supports a farmer's judgement and the agriculture officer's advice; it does not replace them.**

## 8b. Future work
1. **Crop economics:** costs, market prices and minimum support prices, so each plan shows likely profit and the
   chance of loss. Storage life per crop is already in the data.
2. **Planning for severe seasons:** early warning of food-crop shortfalls, so the state can buy in from elsewhere in
   time.
3. **Equipment and labour needs** per crop.
4. **Pest and disease resistance:** weather-driven pest risk per crop from NASA humidity and temperature, and
   resistant varieties from the Tamil Nadu crop guides.
5. **NASA GRACE groundwater:** add groundwater trends, so borewell plans account for falling water tables (today a
   stated limit).

## 9. Use of AI
- **Code and analysis:** we used Anthropic's Claude (Claude Code) as a coding and analysis assistant. It wrote most of
  the data pipeline and engine code under our direction, ran the statistical checks and drafted documentation.
- **Human role:**
  - The team chose the problem, region and audience.
  - We interviewed a farmer.
  - We decided every modelling choice.
  - We reviewed each result against sanity checks, and kept a log of every pivot (`docs/RESEARCH_LOG.md`).
- **Everything shown is real data:** every number in the app comes from the data sources above. No AI-generated data
  is shown as data.

---

## Demo script (2–3 minutes)
*Screen: the live site. Speak slowly; each beat is about 20 seconds.*

1. **Hook (Farm tab, example place).** "In Tamil Nadu, the monsoon decides the harvest, and farmers judge risk by the
   last ten seasons. SowSmart gives them twenty-four, from NASA satellites."
2. **Choose a place.** Pick Thanjavur. "Any of 50 places, or use your location."
3. **Three plans.** "Your current rice-rice rotation came through 9 of 24 real seasons on canal water. The bigger shift
   came through 16." Point at the 24 squares. "Each square is a real year; red ones failed. Hover shows why."
4. **The memory trap.** Switch water to *Lake / pond*. "On lake water, a farmer remembering 2005–2014 saw long rice
   come through 9 of 10 seasons. Over 24 years it's 16 of 23, and 2016 came right after."
5. **Has the dam opened?** (if the dam control is in the UI; otherwise say it.) "If Mettur opens in August, Kuruvai on
   canal water never made it in 24 seasons. Our replay matches the real drop in Kuruvai area."
6. **Sow now or wait?** Open the fold. "Dry-spell risk after sowing, and the latest NASA SMAP soil moisture."
7. **Policy tab.** "Now the same engine for the whole state." Colour by *cyclones (NOAA tracks)*, then the
   *1-in-100-year drought*. "The north coast and north interior carry the most risk."
8. **Click a delta square.** "In a drought year avoid long rice. Crops that came through 2016: pulses and millets."
9. **Does it work?** "Backtested on 22 years of government crop statistics: when we warn, a bad year follows a third
   of the time, versus a quarter otherwise. We also corrected ourselves: 2016 was the fourth driest since 1901, not
   once in a century."
10. **Close.** "Free, in English and Tamil, on a phone. It supports the farmer's judgement; it doesn't replace it."

*Before recording:* clear the site's saved place (or use a private window) so it opens on the example; set the screen
to about 1280 px wide; and check that the Thanjavur numbers in beat 3 still match what the app shows.
