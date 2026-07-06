/**
 * Dependency-free prayer time calculation (praytimes.org algorithm).
 * Method: University of Islamic Sciences, Karachi (Fajr/Isha 18°),
 * Hanafi Asr (shadow factor 2) — the common convention in Pakistan.
 * Accuracy is within a minute or two; always defer to the local masjid.
 */
const DEG = Math.PI / 180;

const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

function julianDate(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

/** Sun declination + equation of time for a julian date. */
function sunPosition(jd: number): { decl: number; eqt: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG));
  const e = 23.439 - 0.00000036 * D;
  const decl = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) / DEG;
  const ra = fixHour(Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) / DEG / 15);
  return { decl, eqt: q / 15 - ra };
}

/** Hours (± from midday) the sun takes to reach `angle` below the horizon. */
function sunAngleHours(angle: number, lat: number, decl: number): number {
  const cosH =
    (-Math.sin(angle * DEG) - Math.sin(lat * DEG) * Math.sin(decl * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(decl * DEG));
  return Math.acos(Math.min(1, Math.max(-1, cosH))) / DEG / 15;
}

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export function prayerTimesFor(date: Date, lat: number, lng: number): PrayerTimes {
  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  const { decl, eqt } = sunPosition(jd);
  const tz = -date.getTimezoneOffset() / 60;
  const dhuhr = fixHour(12 + tz - lng / 15 - eqt);

  // Hanafi Asr: shadow factor 2.
  const asrAngle = -Math.atan(1 / (2 + Math.tan(Math.abs(lat - decl) * DEG))) / DEG;

  const toDate = (hours: number) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setMinutes(Math.round(hours * 60));
    return d;
  };

  return {
    fajr: toDate(dhuhr - sunAngleHours(18, lat, decl)),
    sunrise: toDate(dhuhr - sunAngleHours(0.833, lat, decl)),
    dhuhr: toDate(dhuhr),
    asr: toDate(dhuhr + sunAngleHours(asrAngle, lat, decl)),
    maghrib: toDate(dhuhr + sunAngleHours(0.833, lat, decl)),
    isha: toDate(dhuhr + sunAngleHours(18, lat, decl)),
  };
}
