/**
 * 飞行记录合规校验
 *
 * 检查项：
 * - GPS信号质量（卫星数 < 6 警告）
 * - 电池过低（< 15% 警告）
 * - 飞行高度超标（> 500m AGL 警告）
 * - 速度异常（> 20 m/s 警告）
 * - 飞行覆盖范围（距离 < 100m 标记"疑似未起飞"）
 */
import { FlightRecordRow, ParseResult } from "./parse-csv.ts";

export interface Anomaly {
  type: "gps_weak" | "battery_low" | "altitude_high" | "speed_high" | "no_takeoff" | "gps_gap";
  severity: "warning" | "critical";
  message: string;
  row_index?: number;
  value?: string;
}

export interface ComplianceResult {
  passed: boolean;
  anomalies: Anomaly[];
  summary: string;
}

const SATELLITE_MIN = 6;
const BATTERY_MIN_PCT = 15;
const ALTITUDE_MAX_M = 500;
const SPEED_MAX_MS = 20;
const MIN_FLIGHT_DISTANCE_M = 100;

export function validateCompliance(parseResult: ParseResult, expectedOrderType?: string): ComplianceResult {
  const anomalies: Anomaly[] = [];
  const { records, stats } = parseResult;

  // GPS弱信号
  const weakGpsRows = records
    .map((r, i) => ({ i, sats: r.satellites }))
    .filter(x => x.sats > 0 && x.sats < SATELLITE_MIN);

  if (weakGpsRows.length > records.length * 0.1) {
    anomalies.push({
      type: "gps_weak",
      severity: "warning",
      message: `${weakGpsRows.length}/${records.length} 行GPS卫星数不足${SATELLITE_MIN}颗`,
    });
  }

  // 电池过低
  const lowBattery = records.filter(r => r.battery_pct < BATTERY_MIN_PCT);
  if (lowBattery.length > 0) {
    anomalies.push({
      type: "battery_low",
      severity: "warning",
      message: `${lowBattery.length} 行电量低于${BATTERY_MIN_PCT}%`,
      row_index: records.indexOf(lowBattery[0]),
      value: `${lowBattery[0].battery_pct}%`,
    });
  }

  // 高度超标
  const highAlt = records.filter(r => r.altitude_m > ALTITUDE_MAX_M);
  if (highAlt.length > 0) {
    anomalies.push({
      type: "altitude_high",
      severity: "critical",
      message: `飞行高度最高${stats.max_altitude}m，超过${ALTITUDE_MAX_M}m限制`,
      value: `${stats.max_altitude}m`,
    });
  }

  // 速度异常
  if (stats.max_speed > SPEED_MAX_MS) {
    anomalies.push({
      type: "speed_high",
      severity: "warning",
      message: `最大速度${stats.max_speed}m/s，超过${SPEED_MAX_MS}m/s`,
      value: `${stats.max_speed} m/s`,
    });
  }

  // 疑似未起飞
  if (records.length >= 2) {
    const dist = haversineM(
      records[0].latitude, records[0].longitude,
      records[records.length - 1].latitude, records[records.length - 1].longitude
    );
    if (dist < MIN_FLIGHT_DISTANCE_M) {
      anomalies.push({
        type: "no_takeoff",
        severity: "warning",
        message: `首尾点距离仅${Math.round(dist)}m，疑似未起飞`,
        value: `${Math.round(dist)}m`,
      });
    }
  }

  // GPS跳变
  if (stats.gps_gaps > 0) {
    anomalies.push({
      type: "gps_gap",
      severity: "warning",
      message: `${stats.gps_gaps} 处GPS信号跳变（相邻点>500m）`,
    });
  }

  const criticals = anomalies.filter(a => a.severity === "critical");
  const passed = criticals.length === 0;

  return {
    passed,
    anomalies,
    summary: passed
      ? `合规检查通过${anomalies.length > 0 ? `（${anomalies.length}个警告）` : ""}`
      : `合规检查不通过：${criticals.map(a => a.message).join("; ")}`,
  };
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
