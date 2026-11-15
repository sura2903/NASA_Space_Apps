// Clearer names for the "Where is your farm?" list (Lane B).
// Grid places arrive named "near Chennai (19 km)": the nearest district town (pipeline/build_grid.py TOWNS) and the
// distance from it to the centre of the place's data square. Here each place also gets a compass direction from that
// town, using the district HQ positions in data/districts.json, so the list reads "Chennai, 19 km north-west".
// A direction is only added when the HQ distance agrees with the name's distance (within DIST_TOL km).
const HQ_ALIAS = {   // town name in the grid file -> district name in districts.json
  "Nagercoil (Kanyakumari)": "Kanniyakumari", "Udhagamandalam (Nilgiris)": "The Nilgiris", Thoothukudi: "Thoothukkudi",
  Tiruvarur: "Thiruvarur", Tiruvallur: "Thiruvallur", Villupuram: "Viluppuram", Kanchipuram: "Kancheepuram",
};
const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const DIST_TOL = 3;            // km
const KM_PER_DEG = 111;        // unit conversion, not data

/** sites: the place list (demo sites + grid points); districts: data/districts.json `districts` (or null).
 *  Returns { info: id -> {town, town_ta, km, dir}, townOf: id -> town } for i18n.setPlaceInfo and grouping. */
export function describePlaces(sites, districts) {
  const hq = Object.fromEntries((districts ?? []).map((d) => [d.name, d.hq]));
  const info = {}, townOf = {}, townTa = {};
  for (const s of sites) {
    const m = /^near (.*) \((\d+) km\)$/.exec(s.name ?? "");
    if (!m) continue;
    const town = m[1], km = Number(m[2]);
    const ta = /^(.*) அருகில் \(/.exec(s.name_ta ?? "")?.[1] ?? null;
    if (ta) townTa[town] = ta;
    let dir = null;
    const c = hq[HQ_ALIAS[town] ?? town];
    if (c) {
      const north = s.lat - c[0], east = (s.lon - c[1]) * Math.cos((s.lat * Math.PI) / 180);
      const d = KM_PER_DEG * Math.hypot(north, east);
      if (Math.abs(d - km) <= DIST_TOL) dir = DIRS[Math.round((((Math.atan2(east, north) * 180) / Math.PI + 360) % 360) / 45) % 8];
    }
    info[s.id] = { town, town_ta: ta, km, dir };
    townOf[s.id] = town;
  }
  // demo sites ("Thanjavur (Cauvery delta)") join the group of their town
  for (const s of sites) if (!info[s.id]) townOf[s.id] = (s.name ?? "").replace(/\s*\(.*\)\s*$/, "");
  return { info, townOf, townTa };
}
