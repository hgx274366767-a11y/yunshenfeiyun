/**
 * CSV 飞行记录解析 — 大疆无人机导出日志格式
 *
 * 支持的列：timestamp, latitude, longitude, altitude(m), speed(m/s),
 *   battery(%), satellites, heading(deg), flight_mode, error_flags
 */
export interface FlightRecordRow {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  speed_ms: number;
  battery_pct: number;
  satellites: number;
  heading_deg: number;
  flight_mode: string;
  error_flags: string;
}

export interface ParseResult {
  records: FlightRecordRow[];
  stats: {
    total_rows: number;
    valid_rows: number;
    duration_sec: number;
    max_altitude: number;
    max_speed: number;
    avg_satellites: number;
    min_battery: number;
    gps_gaps: number;
  };
}

export function parseFlightCsv(csvContent: string): ParseResult {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV文件为空或只有表头");

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const idx = {
    timestamp: headers.findIndex(h => h.includes("time") || h.includes("date")),
    latitude: headers.findIndex(h => h.includes("lat")),
    longitude: headers.findIndex(h => h.includes("lng") || h.includes("lon")),
    altitude: headers.findIndex(h => h.includes("alt") || h.includes("height")),
    speed: headers.findIndex(h => h.includes("speed") || h.includes("vel")),
    battery: headers.findIndex(h => h.includes("batt") || h.includes("power")),
    satellites: headers.findIndex(h => h.includes("sat") || h.includes("gps")),
    heading: headers.findIndex(h => h.includes("head") || h.includes("yaw")),
    flight_mode: headers.findIndex(h => h.includes("mode") || h.includes("flight")),
    error_flags: headers.findIndex(h => h.includes("error") || h.includes("flag")),
  };

  const required = ["latitude", "longitude", "altitude"];
  for (const f of required) {
    if (idx[f as keyof typeof idx] < 0) {
      throw new Error(`CSV缺少必需列: ${f}`);
    }
  }

  const records: FlightRecordRow[] = [];
  let prevLat = 0;
  let prevLng = 0;
  let gpsGaps = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
    try {
      const lat = parseFloat(cols[idx.latitude]);
      const lng = parseFloat(cols[idx.longitude]);
      const alt = parseFloat(cols[idx.altitude]);

      if (isNaN(lat) || isNaN(lng) || isNaN(alt)) continue;

      const record: FlightRecordRow = {
        timestamp: cols[idx.timestamp] || new Date().toISOString(),
        latitude: lat,
        longitude: lng,
        altitude_m: alt,
        speed_ms: parseFloat(cols[idx.speed]) || 0,
        battery_pct: parseFloat(cols[idx.battery]) || 100,
        satellites: parseInt(cols[idx.satellites]) || 0,
        heading_deg: parseFloat(cols[idx.heading]) || 0,
        flight_mode: cols[idx.flight_mode] || "unknown",
        error_flags: cols[idx.error_flags] || "",
      };

      // 检测GPS跳变
      if (records.length > 0) {
        const dist = haversineM(prevLat, prevLng, lat, lng);
        if (dist > 500) gpsGaps++;
      }
      prevLat = lat;
      prevLng = lng;

      records.push(record);
    } catch {
      continue;
    }
  }

  const stats = {
    total_rows: lines.length - 1,
    valid_rows: records.length,
    duration_sec: records.length >= 2
      ? (new Date(records[records.length - 1].timestamp).getTime() -
         new Date(records[0].timestamp).getTime()) / 1000
      : 0,
    max_altitude: Math.max(...records.map(r => r.altitude_m)),
    max_speed: Math.max(...records.map(r => r.speed_ms)),
    avg_satellites: Math.round(records.reduce((s, r) => s + r.satellites, 0) / Math.max(records.length, 1)),
    min_battery: Math.min(...records.map(r => r.battery_pct)),
    gps_gaps: gpsGaps,
  };

  return { records, stats };
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
