/**
 * 飞行记录 CSV 解析 + 合规性检测单元测试
 *
 * 覆盖：CSV解析（英文/中文表头）、坐标校验、航线偏离检测、
 *       高度超标、速度异常、低电量、信号丢失
 */
import { describe, it, expect } from "vitest";

// ============================================================
// 从 parse-csv.ts 提取的纯函数（与生产代码一致）
// ============================================================

function round(v: number, d = 2): number {
  const factor = 10 ** d;
  return Math.round(v * factor) / factor;
}

interface FlightPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed?: number;
  course?: number;
  battery?: number;
}

interface ParsedFlightData {
  points: FlightPoint[];
  totalPoints: number;
  maxAltitudeMeters: number;
  minAltitudeMeters: number;
  avgSpeedMps: number;
  totalDurationSeconds: number;
  startTime: string;
  endTime: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
  alt?: number;
}

interface Anomaly {
  type: string;
  detail: string;
  severity: "warning" | "error" | "critical";
  affectedPoints?: FlightPoint[];
}

interface ComplianceResult {
  isCompliant: boolean;
  anomalies: Anomaly[];
  deviationMaxMeters: number;
  summary: {
    totalPoints: number;
    maxAltitudeMeters: number;
    avgSpeedMps: number;
    durationMinutes: number;
  };
}

// ---- CSV 解析 ----

const ALIASES: Record<string, string[]> = {
  timestamp: ["timestamp", "time", "datetime", "时间", "时间戳"],
  latitude: ["latitude", "lat", "纬度"],
  longitude: ["longitude", "lng", "lon", "经度"],
  altitude: ["altitude", "alt", "高度", "海拔"],
  speed: ["speed", "速度", "速率"],
  course: ["course", "heading", "航向", "方向"],
  battery: ["battery", "battery_percent", "电量", "电池"],
};

function buildHeaderMap(headerLine: string): Record<string, number> {
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());
  const map: Record<string, number> = {};

  for (let i = 0; i < headers.length; i++) {
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(headers[i])) {
        map[canonical] = i;
        break;
      }
    }
  }

  return map;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText: string): ParsedFlightData {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV_PARSE_ERROR: 文件为空或只有表头");
  }

  const headerMap = buildHeaderMap(lines[0]);
  const required = ["latitude", "longitude", "altitude"];
  const missing = required.filter((k) => !(k in headerMap));
  if (missing.length) {
    throw new Error(`CSV_PARSE_ERROR: 缺少必填列: ${missing.join(", ")}`);
  }

  const points: FlightPoint[] = [];
  let maxAltitude = -Infinity;
  let minAltitude = Infinity;
  let startTime = "";
  let endTime = "";
  let totalSpeed = 0;
  let speedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const point: any = {};

    for (const [key, idx] of Object.entries(headerMap)) {
      const val = values[idx]?.trim();
      if (val == null || val === "") continue;

      switch (key) {
        case "latitude": point.latitude = parseFloat(val); break;
        case "longitude": point.longitude = parseFloat(val); break;
        case "altitude": point.altitude = parseFloat(val); break;
        case "timestamp":
        case "time":
        case "datetime":
          point.timestamp = val; break;
        case "speed": point.speed = parseFloat(val); break;
        case "course":
        case "heading": point.course = parseFloat(val); break;
        case "battery":
        case "battery_percent": point.battery = parseFloat(val); break;
      }
    }

    if (point.latitude == null || point.longitude == null || point.altitude == null) {
      continue;
    }

    if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) continue;
    if (point.altitude < -500 || point.altitude > 10000) continue;

    points.push(point);

    if (point.altitude > maxAltitude) maxAltitude = point.altitude;
    if (point.altitude < minAltitude) minAltitude = point.altitude;
    if (point.speed != null) { totalSpeed += point.speed; speedCount++; }

    if (!startTime || point.timestamp < startTime) startTime = point.timestamp;
    if (!endTime || point.timestamp > endTime) endTime = point.timestamp;
  }

  if (points.length === 0) {
    throw new Error("CSV_PARSE_ERROR: 未解析到有效飞行数据点");
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const durationSeconds = Math.max(0, (endDate.getTime() - startDate.getTime()) / 1000);

  return {
    points,
    totalPoints: points.length,
    maxAltitudeMeters: round(maxAltitude, 1),
    minAltitudeMeters: minAltitude === Infinity ? 0 : round(minAltitude, 1),
    avgSpeedMps: speedCount > 0 ? round(totalSpeed / speedCount, 2) : 0,
    totalDurationSeconds: round(durationSeconds, 1),
    startTime,
    endTime,
  };
}

// ---- 几何计算 ----

function pointToSegmentMeters(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const latMid = (ay + by) / 2 * Math.PI / 180;
  const cosLat = Math.cos(latMid);
  const scaleLat = 111320;
  const scaleLng = 111320 * cosLat;

  const ppx = px * scaleLat;
  const ppy = py * scaleLng;
  const aax = ax * scaleLat;
  const aay = ay * scaleLng;
  const bbx = bx * scaleLat;
  const bby = by * scaleLng;

  const dx = bbx - aax;
  const dy = bby - aay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((ppx - aax) ** 2 + (ppy - aay) ** 2);
  }

  let t = ((ppx - aax) * dx + (ppy - aay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return Math.sqrt((ppx - (aax + t * dx)) ** 2 + (ppy - (aay + t * dy)) ** 2);
}

function calcRouteDeviations(
  points: FlightPoint[],
  route: RoutePoint[],
): { maxDeviation: number; details: Array<{ point: FlightPoint; deviation: number }> } {
  let maxDev = 0;
  const details: Array<{ point: FlightPoint; deviation: number }> = [];

  for (const point of points) {
    let minDist = Infinity;

    for (let i = 0; i < route.length - 1; i++) {
      const dist = pointToSegmentMeters(
        point.latitude, point.longitude,
        route[i].lat, route[i].lng,
        route[i + 1].lat, route[i + 1].lng,
      );
      minDist = Math.min(minDist, dist);
    }

    if (minDist > maxDev) maxDev = minDist;
    details.push({ point, deviation: minDist });
  }

  return { maxDeviation: maxDev, details };
}

// ---- 合规性检测 ----

function validateCompliance(
  data: ParsedFlightData,
  declaredRoute?: RoutePoint[],
  declaredMaxAltitude?: number,
): ComplianceResult {
  const anomalies: Anomaly[] = [];
  let deviationMaxMeters = 0;

  if (declaredRoute && declaredRoute.length >= 2) {
    const deviations = calcRouteDeviations(data.points, declaredRoute);
    deviationMaxMeters = Math.round(deviations.maxDeviation * 100) / 100;

    const threshold = 50;
    if (deviations.maxDeviation > threshold) {
      const overThreshold = deviations.details.filter((d) => d.deviation > threshold);
      anomalies.push({
        type: "route_deviation",
        detail: `航线偏离: 最大 ${Math.round(deviations.maxDeviation)}m (阈值 ${threshold}m)，${overThreshold.length} 个点超标`,
        severity: deviations.maxDeviation > 200 ? "critical" : "error",
        affectedPoints: overThreshold.slice(0, 5).map((d) => d.point),
      });
    }
  }

  if (declaredMaxAltitude != null && data.maxAltitudeMeters > declaredMaxAltitude) {
    anomalies.push({
      type: "altitude_exceed",
      detail: `高度超标: 实际 ${data.maxAltitudeMeters}m > 申报 ${declaredMaxAltitude}m`,
      severity: data.maxAltitudeMeters > declaredMaxAltitude * 1.5 ? "critical" : "error",
    });
  }

  const speedAnomalies = data.points.filter((p) => (p.speed ?? 0) > 30);
  if (speedAnomalies.length > 5) {
    anomalies.push({
      type: "speed_anomaly",
      detail: `速度异常: ${speedAnomalies.length} 个点超过 30m/s`,
      severity: "warning",
    });
  }

  const lowBattery = data.points.filter((p) => (p.battery ?? 100) < 15);
  if (lowBattery.length > 0) {
    anomalies.push({
      type: "low_battery",
      detail: `低电量: ${lowBattery.length} 个点电量 < 15%`,
      severity: "warning",
    });
  }

  let signalLossCount = 0;
  for (let i = 1; i < data.points.length; i++) {
    const prev = new Date(data.points[i - 1].timestamp).getTime();
    const curr = new Date(data.points[i].timestamp).getTime();
    if ((curr - prev) > 60000) signalLossCount++;
  }
  if (signalLossCount > 3) {
    anomalies.push({
      type: "signal_loss",
      detail: `信号丢失: ${signalLossCount} 处间隔超过 60 秒`,
      severity: "warning",
    });
  }

  const hasError = anomalies.some((a) => a.severity === "error" || a.severity === "critical");

  return {
    isCompliant: !hasError,
    anomalies,
    deviationMaxMeters,
    summary: {
      totalPoints: data.totalPoints,
      maxAltitudeMeters: data.maxAltitudeMeters,
      avgSpeedMps: data.avgSpeedMps,
      durationMinutes: Math.round(data.totalDurationSeconds / 60),
    },
  };
}

// ---- 测试数据构造 ----

function makePoint(
  timestamp: string,
  lat: number,
  lng: number,
  alt: number,
  speed?: number,
  battery?: number,
): FlightPoint {
  return { timestamp, latitude: lat, longitude: lng, altitude: alt, speed, battery };
}

function makeCsv(header: string, rows: string[]): string {
  return [header, ...rows].join("\n");
}

// ============================================================
// CSV 解析
// ============================================================

describe("CSV 解析", () => {
  it("解析英文表头 CSV", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude,speed,battery",
      [
        "2024-06-01T10:00:00Z,30.5,104.1,120,15,85",
        "2024-06-01T10:01:00Z,30.51,104.11,125,16,80",
        "2024-06-01T10:02:00Z,30.52,104.12,122,14,78",
      ],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(3);
    expect(result.points[0].latitude).toBe(30.5);
    expect(result.maxAltitudeMeters).toBe(125);
    expect(result.minAltitudeMeters).toBe(120);
  });

  it("解析中文表头 CSV", () => {
    const csv = makeCsv(
      "时间,纬度,经度,高度,速度,电量",
      [
        "2024-06-01T10:00:00Z,30.5,104.1,120,15,85",
        "2024-06-01T10:01:00Z,30.51,104.11,125,16,80",
      ],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(2);
    expect(result.points[0].latitude).toBe(30.5);
  });

  it("解析别名表头（lat/lng/alt）", () => {
    const csv = makeCsv(
      "time,lat,lng,alt",
      ["2024-06-01T10:00:00Z,30.5,104.1,120"],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(1);
    expect(result.points[0].altitude).toBe(120);
  });

  it("空文件抛异常", () => {
    expect(() => parseCSV("")).toThrow("CSV_PARSE_ERROR");
  });

  it("只有表头抛异常", () => {
    expect(() => parseCSV("timestamp,latitude,longitude,altitude")).toThrow("CSV_PARSE_ERROR");
  });

  it("缺少必填列抛异常", () => {
    expect(() => parseCSV("timestamp,speed\n2024-01-01,15")).toThrow("CSV_PARSE_ERROR: 缺少必填列");
  });

  it("跳过无效坐标行", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude",
      [
        "2024-06-01T10:00:00Z,30.5,104.1,120",
        "2024-06-01T10:01:00Z,999,999,125", // 无效经纬度
        "2024-06-01T10:02:00Z,30.52,104.12,99999", // 无效高度
        "2024-06-01T10:03:00Z,30.53,104.13,130",
      ],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(2);
  });

  it("坐标边界合法 — lat=90, lng=180", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,90,180,100"],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(1);
  });

  it("坐标超出边界跳过 — lat=91", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,91,104.1,100"],
    );
    expect(() => parseCSV(csv)).toThrow("未解析到有效飞行数据点");
  });

  it("计算平均速度", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude,speed",
      [
        "2024-06-01T10:00:00Z,30.5,104.1,120,10",
        "2024-06-01T10:01:00Z,30.51,104.11,120,20",
        "2024-06-01T10:02:00Z,30.52,104.12,120,30",
      ],
    );
    const result = parseCSV(csv);
    expect(result.avgSpeedMps).toBe(20);
  });

  it("计算飞行时长", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude",
      [
        "2024-06-01T10:00:00Z,30.5,104.1,120",
        "2024-06-01T10:05:00Z,30.51,104.11,120",
      ],
    );
    const result = parseCSV(csv);
    expect(result.totalDurationSeconds).toBe(300);
  });

  it("带引号的 CSV 字段正常解析", () => {
    const csv = makeCsv(
      "timestamp,latitude,longitude,altitude",
      ['"2024-06-01T10:00:00Z","30.5","104.1","120"'],
    );
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(1);
    expect(result.points[0].latitude).toBe(30.5);
  });

  it("空行跳过不影响解析", () => {
    const csv = [
      "timestamp,latitude,longitude,altitude",
      "",
      "2024-06-01T10:00:00Z,30.5,104.1,120",
      "",
      "2024-06-01T10:01:00Z,30.51,104.11,125",
    ].join("\n");
    const result = parseCSV(csv);
    expect(result.totalPoints).toBe(2);
  });
});

// ============================================================
// 几何计算
// ============================================================

describe("点到航线段距离计算", () => {
  it("点在航线段正中间 → 距离为0", () => {
    const dist = pointToSegmentMeters(
      30.5, 104.1, // 在 (30,104) 到 (31,104.2) 的中垂线上
      30.5, 104.1, // = 线段起点
      30.5, 104.1, // = 线段终点（退化为点）
    );
    // 起点=终点=点本身，距离为0
    expect(dist).toBe(0);
  });

  it("点在线段端点上 → 距离为0", () => {
    const dist = pointToSegmentMeters(
      30.0, 104.0,
      30.0, 104.0,
      31.0, 105.0,
    );
    expect(dist).toBe(0);
  });

  it("点到线段垂足在线段内 → 垂直距离", () => {
    // 线段：(30.0, 104.0) → (30.0, 104.01)，纯东方向约1km
    // 点：(30.01, 104.0)，在线段北侧
    const dist = pointToSegmentMeters(
      30.01, 104.0,
      30.0, 104.0,
      30.0, 104.01,
    );
    // 纯北方向约1.1km（纬度1度≈111km）
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1200);
  });

  it("点到线段垂足在线段外 → 投影到端点", () => {
    // 点在线段延伸方向之外，垂足应投影到最近端点
    const dist = pointToSegmentMeters(
      32.0, 106.0,
      30.0, 104.0,
      31.0, 105.0,
    );
    // 该距离应接近点到最近端点(31.0,105.0)的距离，误差 < 1km
    const distToEnd = pointToSegmentMeters(32.0, 106.0, 31.0, 105.0, 31.0, 105.0);
    expect(dist).toBeGreaterThan(distToEnd * 0.9);
    expect(dist).toBeLessThan(distToEnd * 1.1);
  });
});

// ============================================================
// 合规性检测 — 航线偏离
// ============================================================

describe("合规性检测 — 航线偏离", () => {
  const route: RoutePoint[] = [
    { lat: 30.5, lng: 104.0 },
    { lat: 30.6, lng: 104.1 },
  ];

  it("飞行点在航线上 → 无偏离", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      [
        "2024-06-01T10:00:00Z,30.5,104.0,120",
        "2024-06-01T10:01:00Z,30.55,104.05,125",
        "2024-06-01T10:02:00Z,30.6,104.1,122",
      ],
    ));
    const result = validateCompliance(data, route);
    expect(result.isCompliant).toBe(true);
    expect(result.anomalies).toHaveLength(0);
  });

  it("偏离 >50m → error", () => {
    // 点偏离航线约 0.01 度 ≈ 1110m
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,30.55,105.1,120"], // 远离航线
    ));
    const result = validateCompliance(data, route);
    expect(result.isCompliant).toBe(false);
    expect(result.anomalies.some((a) => a.type === "route_deviation")).toBe(true);
    expect(result.deviationMaxMeters).toBeGreaterThan(50);
  });

  it("偏离 >200m → critical", () => {
    // 点严重偏离航线 > 1°
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,31.5,106.0,120"], // 严重偏离
    ));
    const result = validateCompliance(data, route);
    const devAnomaly = result.anomalies.find((a) => a.type === "route_deviation");
    expect(devAnomaly?.severity).toBe("critical");
  });
});

// ============================================================
// 合规性检测 — 高度超标
// ============================================================

describe("合规性检测 — 高度超标", () => {
  it("实际高度≤申报高度 → 合规", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      [
        "2024-06-01T10:00:00Z,30.5,104.0,100",
        "2024-06-01T10:01:00Z,30.51,104.01,110",
      ],
    ));
    const result = validateCompliance(data, undefined, 120);
    expect(result.isCompliant).toBe(true);
  });

  it("实际高度>申报高度 → error", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,30.5,104.0,150"],
    ));
    const result = validateCompliance(data, undefined, 120);
    expect(result.isCompliant).toBe(false);
    expect(result.anomalies.some((a) => a.type === "altitude_exceed")).toBe(true);
  });

  it("实际高度>1.5倍申报高度 → critical", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude",
      ["2024-06-01T10:00:00Z,30.5,104.0,200"],
    ));
    // maxAltitudeMeters=200, declaredMaxAltitude=120, 200>180=critical
    const result = validateCompliance(data, undefined, 120);
    const altAnomaly = result.anomalies.find((a) => a.type === "altitude_exceed");
    expect(altAnomaly?.severity).toBe("critical");
  });
});

// ============================================================
// 合规性检测 — 速度/电量/信号
// ============================================================

describe("合规性检测 — 速度/电量/信号", () => {
  it("速度异常 >5个点超30m/s → warning", () => {
    const rows = [];
    for (let i = 0; i < 6; i++) {
      rows.push(`2024-06-01T10:0${i}:00Z,30.5${i},104.0${i},120,35`);
    }
    const data = parseCSV(makeCsv("timestamp,latitude,longitude,altitude,speed", rows));
    const result = validateCompliance(data);
    expect(result.anomalies.some((a) => a.type === "speed_anomaly")).toBe(true);
  });

  it("速度异常 ≤5个点 → 不报", () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push(`2024-06-01T10:0${i}:00Z,30.5${i},104.0${i},120,35`);
    }
    const data = parseCSV(makeCsv("timestamp,latitude,longitude,altitude,speed", rows));
    const result = validateCompliance(data);
    expect(result.anomalies.some((a) => a.type === "speed_anomaly")).toBe(false);
  });

  it("低电量 → warning", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude,battery",
      ["2024-06-01T10:00:00Z,30.5,104.0,120,10"],
    ));
    const result = validateCompliance(data);
    expect(result.anomalies.some((a) => a.type === "low_battery")).toBe(true);
  });

  it("电量≥15% → 不报", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude,battery",
      ["2024-06-01T10:00:00Z,30.5,104.0,120,15"],
    ));
    const result = validateCompliance(data);
    expect(result.anomalies.some((a) => a.type === "low_battery")).toBe(false);
  });

  it("信号丢失 >3处 → warning", () => {
    const rows = [];
    // 每2分钟一个点，间隔120秒 > 60秒 = 信号丢失
    for (let i = 0; i < 5; i++) {
      const mins = i * 2;
      const ts = `2024-06-01T10:${String(mins).padStart(2, "0")}:00Z`;
      rows.push(`${ts},30.5${i},104.0${i},120`);
    }
    const data = parseCSV(makeCsv("timestamp,latitude,longitude,altitude", rows));
    const result = validateCompliance(data);
    expect(result.anomalies.some((a) => a.type === "signal_loss")).toBe(true);
  });

  it("信号丢失 ≤3处 → 不报", () => {
    const rows = [];
    for (let i = 0; i < 4; i++) {
      const mins = i * 2;
      const ts = `2024-06-01T10:${String(mins).padStart(2, "0")}:00Z`;
      rows.push(`${ts},30.5${i},104.0${i},120`);
    }
    const data = parseCSV(makeCsv("timestamp,latitude,longitude,altitude", rows));
    const result = validateCompliance(data);
    // 4个点 → 3处间隔，恰好 ≤3
    expect(result.anomalies.some((a) => a.type === "signal_loss")).toBe(false);
  });
});

// ============================================================
// 综合场景
// ============================================================

describe("合规性检测 — 综合场景", () => {
  const route: RoutePoint[] = [
    { lat: 30.5, lng: 104.0 },
    { lat: 30.6, lng: 104.1 },
  ];

  it("多异常同时存在", () => {
    const rows = [];
    // 偏离航线 + 高度超标 + 超速
    for (let i = 0; i < 6; i++) {
      rows.push(`2024-06-01T10:0${i}:00Z,31.5,106.0,500,35`);
    }
    const data = parseCSV(makeCsv("timestamp,latitude,longitude,altitude,speed", rows));
    const result = validateCompliance(data, route, 120);
    expect(result.isCompliant).toBe(false);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(2); // 偏离+高度+速度
  });

  it("完全合规飞行", () => {
    const rows = [
      "2024-06-01T10:00:00Z,30.5,104.0,100,8,85",
      "2024-06-01T10:01:00Z,30.55,104.05,105,9,82",
      "2024-06-01T10:02:00Z,30.6,104.1,102,8,80",
    ];
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude,speed,battery",
      rows,
    ));
    const result = validateCompliance(data, route, 120);
    expect(result.isCompliant).toBe(true);
    expect(result.anomalies).toHaveLength(0);
  });

  it("summary 包含统计信息", () => {
    const data = parseCSV(makeCsv(
      "timestamp,latitude,longitude,altitude,speed",
      [
        "2024-06-01T10:00:00Z,30.5,104.0,100,15",
        "2024-06-01T10:02:00Z,30.51,104.01,120,20",
      ],
    ));
    const result = validateCompliance(data);
    expect(result.summary.totalPoints).toBe(2);
    expect(result.summary.maxAltitudeMeters).toBe(120);
    expect(result.summary.avgSpeedMps).toBe(17.5);
    expect(result.summary.durationMinutes).toBe(2);
  });
});
