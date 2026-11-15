// Clearer names for the "Where is your farm?" list (Lane B).
// Each grid place has the village or town at its square's centre, its taluk and district (grid/index.json local names,
// from OpenStreetMap). The list groups places by district and names them "Minjur, Ponneri taluk (19 km from Chennai)".
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
 *  Returns { info: id -> {town, town_ta, km, dir, place, place_ta, taluk, border, border_ta}, townOf: id -> group key,
 *  townTa: group key -> Tamil name, byDistrict } for i18n.setPlaceInfo and the grouped list. */
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
    // the local name: "by the Kerala border (near Konni taluk)" for squares centred just over the state border
    const border = s.border_state ? (s.local_name ?? "").replace(/^.*? district, /, "") : null;
    const borderTa = s.border_state ? (s.local_name_ta ?? "").replace(/^.*? மாவட்டம், /, "") : null;
    // otherwise drop the district from the local name: "Sethiathoppu (Bhuvanagiri taluk, Cuddalore)" -> "Sethiathoppu,
    // Bhuvanagiri taluk"; "Gingee taluk, west (Viluppuram)" -> "Gingee taluk, west"; Tamil "சேத்தியாத்தோப்பு (கடலூர்)" -> "சேத்தியாத்தோப்பு"
    const ln = s.local_name ?? "", lnTa = s.local_name_ta ?? "";
    const mm = /^(.*) \((.*), [^,()]+\)$/.exec(ln);
    const local = border ? border.charAt(0).toUpperCase() + border.slice(1) : mm ? `${mm[1]}, ${mm[2]}` : ln.replace(/ \([^()]*\)$/, "") || null;
    const localTa = borderTa || lnTa.replace(/ \([^()]*\)$/, "") || null;
    const cap = (x) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
    const short = (x) => (x ? x.replace(/\s*\(.*\)\s*$/, "") : x);   // "Nagercoil (Kanyakumari)" -> "Nagercoil" inside brackets
    info[s.id] = { town: short(town), town_ta: short(ta), km, dir, local: cap(local), local_ta: localTa };
  }
  // group by real district (demo sites carry one too); fall back to the nearest town
  for (const s of sites) {
    const key = s.district ?? info[s.id]?.town ?? (s.name ?? "").replace(/\s*\(.*\)\s*$/, "");
    townOf[s.id] = key;
    if (s.district_ta) townTa[key] = s.district_ta;
  }
  return { info, townOf, townTa, byDistrict: sites.some((s) => s.district) };
}
