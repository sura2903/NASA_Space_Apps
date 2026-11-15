# SowSmart (ஸ்மார்ட் விதைப்பு)

Formerly Field Shift.

NASA Space Apps 2026: a crop-rotation decision-support tool built on NASA Earth observations.

## Quick start
```bash
pip install -r pipeline/requirements.txt
python pipeline/fetch_power.py --id iowa_ames --name "Ames, Iowa" --lat 42.03 --lon -93.62
python -m http.server 8000 --directory web
```
Then open http://localhost:8000.

## Layout
- `pipeline/`: Python scripts that pull NASA data and write `web/data/`
- `web/`: static site (GitHub Pages-ready)
- `docs/data_contract.md`: JSON formats shared between the two halves
- `CLAUDE.md`: plan, lanes, and rules for Claude Code sessions

## Data sources and references

Every number in the app comes from `web/data/*.json`, built by the scripts in `pipeline/` from the datasets below. The same list, in English and Tamil, is on the app's [references page](web/references.html) (linked at the foot of every page).

### NASA datasets

1. **NASA POWER (Prediction Of Worldwide Energy Resources), daily agroclimatology, 1981–2024**. Temperature and very hot days, crop water demand (evapotranspiration), root-zone soil wetness, wind and storm days, and the 1981–2024 climate trends.  
   NASA Langley Research Center (LaRC) POWER Project, funded through the NASA Earth Science / Applied Science Program. Daily data, community AG, based on the MERRA-2 reanalysis (Gelaro et al., 2017, J. Climate 30, 5419–5454). [doi:10.1175/JCLI-D-16-0758.1](https://doi.org/10.1175/JCLI-D-16-0758.1)  
   https://power.larc.nasa.gov/
2. **GPM IMERG Final Run, daily, 0.1°, Version 07 (2001–2024)**. Rain in every season and year, heavy-rain days, the biggest one-day rains and 1-in-100-year rain levels, and a cross-check of POWER's rain trends.  
   Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., Tan, J. (2023). GPM IMERG Final Precipitation L3 1 day 0.1° x 0.1° V07. Goddard Earth Sciences Data and Information Services Center (GES DISC). Accessed through NASA Giovanni. [doi:10.5067/GPM/IMERGDF/DAY/07](https://doi.org/10.5067/GPM/IMERGDF/DAY/07)  
   https://giovanni.gsfc.nasa.gov/giovanni/
3. **MODIS Terra Vegetation Indices (MOD13Q1), 16-day, 250 m, Version 6.1**. The greenness (NDVI) calendar: when fields are green or bare through the year.  
   Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA EOSDIS Land Processes DAAC. Point samples through NASA AppEEARS and the ORNL DAAC MODIS subset service. [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061)  
   https://lpdaac.usgs.gov/products/mod13q1v061/
4. **SMAP Enhanced L3 Radiometer Global Daily 9 km Soil Moisture (SPL3SMP_E), Version 6 (2015–2024)**. The latest satellite reading of surface soil moisture in the "Sow now or wait?" panel, compared with the usual for that month.  
   O'Neill, P. E., Chan, S., Njoku, E. G., Jackson, T., Bindlish, R., Chaubell, J., Colliander, A. SMAP Enhanced L3 Radiometer Global and Polar Grid Daily 9 km EASE-Grid Soil Moisture, Version 6. NASA National Snow and Ice Data Center DAAC. Point samples through NASA AppEEARS.  
   https://nsidc.org/data/spl3smp_e
5. **NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6), 0.25°**. Climate ranges for 2041–2060 (SSP2-4.5 and SSP5-8.5) from 5 climate models, applied to the observed years.  
   Thrasher, B., Wang, W., Michaelis, A., Melton, F., Lee, T., Nemani, R. (2022). NASA Global Daily Downscaled Projections, CMIP6. Scientific Data 9, 262. Data from the NASA Center for Climate Simulation (NCCS) THREDDS server. [doi:10.1038/s41597-022-01393-4](https://doi.org/10.1038/s41597-022-01393-4)  
   https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6
6. **GLDAS-2.2 Catchment Land Surface Model with GRACE data assimilation (GLDAS_CLSM025_DA1_D.2.2), daily, 0.25° (2003–2024)**. The groundwater trend in the Policy view: whether stored groundwater has been rising or falling since 2003. GRACE sees regions about 300 km across, so this is a regional signal, not one village's wells.  
   Li, B., Beaudoing, H., Rodell, M. (2020). GLDAS Catchment Land Surface Model L4 daily 0.25 x 0.25 degree GRACE-DA1 V2.2. Goddard Earth Sciences Data and Information Services Center (GES DISC). Method: Li, B., et al. (2019). Global GRACE data assimilation for groundwater and drought monitoring. Water Resources Research 55, 7564–7586. Accessed through NASA Giovanni. [doi:10.5067/TXBMLX370XX8](https://doi.org/10.5067/TXBMLX370XX8)  
   https://disc.gsfc.nasa.gov/datasets/GLDAS_CLSM025_DA1_D_2.2/summary
7. **NASA AppEEARS (Application for Extracting and Exploring Analysis Ready Samples)**. The tool we used to extract the MODIS and SMAP point samples around each place.  
   AppEEARS Team. Application for Extracting and Exploring Analysis Ready Samples (AppEEARS). NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC), USGS EROS Center, Sioux Falls, South Dakota, USA.  
   https://appeears.earthdatacloud.nasa.gov/

### Other data

1. **ISRIC SoilGrids 2.0 (250 m)**. Soil texture, organic carbon and pH, which set how much water the soil holds for a crop.  
   Poggio, L., de Sousa, L. M., Batjes, N. H., et al. (2021). SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty. SOIL 7, 217–240. [doi:10.5194/soil-7-217-2021](https://doi.org/10.5194/soil-7-217-2021)  
   https://soilgrids.org/
2. **India Meteorological Department (IMD), 1.0° daily gridded rainfall, 1901–2024**. A 124-year check on how rare the worst northeast-monsoon droughts and the wettest days really are.  
   Rajeevan, M., Bhate, J., Jaswal, A. K. (2008). Analysis of variability and trends of extreme rainfall events over India using 104 years of gridded daily rainfall data. Geophysical Research Letters 35, L18707. Data from IMD Pune. [doi:10.1029/2008GL035143](https://doi.org/10.1029/2008GL035143)  
   https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_1_NetCDF.html
3. **NOAA IBTrACS v04r01 (International Best Track Archive for Climate Stewardship), North Indian basin**. Cyclones that passed within 100 km of each place, 1981–2024, and which crops were in the field at the time.  
   Knapp, K. R., Kruk, M. C., Levinson, D. H., Diamond, H. J., Neumann, C. J. (2010). The International Best Track Archive for Climate Stewardship (IBTrACS). Bulletin of the American Meteorological Society 91, 363–376. Data: NOAA NCEI, doi:10.25921/82ty-9e16. [doi:10.1175/2009BAMS2755.1](https://doi.org/10.1175/2009BAMS2755.1)  
   https://www.ncei.noaa.gov/products/international-best-track-archive
4. **NOAA Oceanic Niño Index (ONI) and Dipole Mode Index (DMI)**. Whether each season was El Niño, La Niña or neutral, and a positive or negative Indian Ocean Dipole.  
   NOAA Climate Prediction Center, ONI (ERSSTv5); NOAA Physical Sciences Laboratory, Dipole Mode Index from HadISST.  
   https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
5. **Government of India, Directorate of Economics and Statistics (DES): district crop Area-Production-Yield**. District crop areas for the Policy view's water-saving estimate, and the check of our model against real district yields (2001–2022).  
   Ministry of Agriculture & Farmers Welfare, Crop Statistics (APY), accessed through the India Data Portal.  
   https://indiadataportal.com/
6. **Tamil Nadu Department of Agriculture: Season and crop statistics (Mettur dam opening and closing dates)**. When Cauvery delta canals actually ran each year, for canal-fed places.  
   Tamil Nadu Department of Agriculture, Season & Crop Statistics, tables VII.10 and VII.12.  
   http://tnagriculture.in/dashboard/report/
7. **Tamil Nadu Crop Production Guides (TN Agriculture Department / TNAU) and TNAU lecture notes on crop water needs**. Each crop's sowing seasons, duration and approximate water need.  
   Tamil Nadu Agricultural University (TNAU) Agritech Portal and Crop Production Guides; TNAU eagri course notes (AGRO 103).  
   https://agritech.tnau.ac.in/

### Climate-change assessments (used to label trends)

1. **IPCC AR6 Working Group I, Regional Fact Sheet: Asia (2021)**. Whether a local trend matches what climate change is expected to do.  
   IPCC (2021). Climate Change 2021: The Physical Science Basis. Regional Fact Sheet: Asia.  
   https://www.ipcc.ch/report/ar6/wg1/downloads/factsheets/IPCC_AR6_WGI_Regional_Fact_Sheet_Asia.pdf
2. **IPCC AR6 Working Group II, Chapter 10: Asia (2022)**. Expected changes in heat, rain and their effects on farming in South Asia.  
   Shaw, R., Luo, Y., Cheong, T. S., et al. (2022). Asia. In: Climate Change 2022: Impacts, Adaptation and Vulnerability. Cambridge University Press.  
   https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-10/
3. **Assessment of Climate Change over the Indian Region (Ministry of Earth Sciences, 2020)**. India-specific expectations for warming, monsoon rain and extremes.  
   Krishnan, R., Sanjay, J., Gnanaseelan, C., et al. (eds.) (2020). Assessment of Climate Change over the Indian Region. Springer, Singapore. [doi:10.1007/978-981-15-4327-2](https://doi.org/10.1007/978-981-15-4327-2)  
   https://link.springer.com/book/10.1007/978-981-15-4327-2
4. **IMD Met Monograph: Northeast Monsoon of South Asia**. How variable the northeast monsoon is and what is known about long-term changes.  
   India Meteorological Department, Met Monograph: Northeast Monsoon of South Asia.  
   https://mausam.imd.gov.in/imd_latest/contents/met_monograph.pdf

### Software and maps

1. **Leaflet 1.9.4**. Interactive maps.  
   Leaflet, open-source JavaScript library (BSD-2-Clause).  
   https://leafletjs.com/
2. **Chart.js 4.4.1**. Charts.  
   Chart.js, open-source JavaScript charting library (MIT).  
   https://www.chartjs.org/
3. **OpenStreetMap**. Background map tiles.  
   © OpenStreetMap contributors, data under the Open Database License (ODbL).  
   https://www.openstreetmap.org/copyright

Crop values (seasons, durations, water needs, storage) are approximate; each crop's own sources are in `web/data/crops.json`.

## Future work

1. **Crop economics.** Add cultivation costs, local market prices and minimum support prices, so each option shows the likely profit and the chance of losing money, not only whether the crop came through.
2. **Planning for severe seasons.** When forecasts or climate projections point to a severe drought or flood season ahead, warn early which food crops Tamil Nadu is likely to fall short of, and suggest buying them in from other states or countries in time, so prices and food supply stay steady.
3. **Equipment and labour needs for each crop,** so a farmer's own limits can be scored directly instead of ruled out by hand ("Not for me" in the app today).
4. **Pest and disease resistance.** Score each crop's risk from weather that favours its main pests and diseases (for example humid, warm spells for rice blast; cloudy, humid flowering for pod borer in pulses) using NASA humidity, temperature and rain, and point farmers to resistant varieties listed in the Tamil Nadu crop guides.

The tool supports farmer judgment and local agricultural expertise. It does not replace them.
