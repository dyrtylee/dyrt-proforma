// ── Dyrt Labs Series A — Pro Forma Ramp Model ──────────────────────────────
// All financial projections are driven by the assumptions object.
// The model outputs quarterly data from Q2 2026 through Q4 2030.

export interface Assumptions {
  // SaaS
  saasPerLocation: number;        // $/month blended avg
  // Collection
  collectionRate: number;          // $/lb
  avgWasteLbsPerLocation: number;  // monthly avg across verticals
  // Machines
  machineCapacityLbs: number;      // monthly capacity per machine
  machineUtilY1: number;           // 0-1
  machineUtilY2: number;           // 0-1
  machineCogs: number;             // $/month per machine
  contractMfgCost: number;         // $ per unit
  factoryCost: number;             // $ per unit (NM factory)
  compostRevPerLb: number;         // $/lb
  // Penetration rates per vertical (2030 target locations)
  penetration: VerticalPenetration;
  // OpEx
  opexBaseQuarterly: number;       // Q2 2026 quarterly OpEx
  opexGrowthRate: number;          // QoQ growth rate for OpEx
}

export interface VerticalPenetration {
  hospitality: number;
  grocery: number;
  venues: number;
  golf: number;
  institutional: number;
  qsr: number;
  smb: number;
}

export const VERTICAL_LABELS: Record<keyof VerticalPenetration, string> = {
  hospitality: "Hospitality",
  grocery: "Grocery & Food Retail",
  venues: "Venues & Entertainment",
  golf: "Golf Courses",
  institutional: "Institutional",
  qsr: "QSR & Restaurants",
  smb: "SMB + Muni + New Logos",
};

export const VERTICAL_COLORS: Record<keyof VerticalPenetration, string> = {
  hospitality: "#3b82f6",
  grocery: "#10b981",
  venues: "#f59e0b",
  golf: "#06b6d4",
  institutional: "#8b5cf6",
  qsr: "#ef4444",
  smb: "#6b7280",
};

export const VERTICAL_TAM: Record<keyof VerticalPenetration, number> = {
  hospitality: 24400,
  grocery: 40000,
  venues: 510,
  golf: 16000,
  institutional: 25100,
  qsr: 200000,
  smb: 100000,
};

export const VERTICAL_AVG_WASTE: Record<keyof VerticalPenetration, number> = {
  hospitality: 4500,
  grocery: 6000,
  venues: 25000,
  golf: 3000,
  institutional: 12000,
  qsr: 2500,
  smb: 2000,
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  saasPerLocation: 750,
  collectionRate: 0.10,
  avgWasteLbsPerLocation: 4000,
  machineCapacityLbs: 60000,
  machineUtilY1: 0.60,
  machineUtilY2: 0.75,
  machineCogs: 1200,
  contractMfgCost: 85000,
  factoryCost: 60000,
  compostRevPerLb: 0.01,
  penetration: {
    hospitality: 945,
    grocery: 540,
    venues: 120,
    golf: 120,
    institutional: 150,
    qsr: 210,
    smb: 415,
  },
  opexBaseQuarterly: 430000,
  opexGrowthRate: 0.07,
};

export const QUARTERS = [
  "Q2'26","Q3'26","Q4'26",
  "Q1'27","Q2'27","Q3'27","Q4'27",
  "Q1'28","Q2'28","Q3'28","Q4'28",
  "Q1'29","Q2'29","Q3'29","Q4'29",
  "Q1'30","Q2'30","Q3'30","Q4'30",
];

// Ramp curve: S-curve from today's count to target by Q4 2030
// Returns array of 19 quarterly values
function rampCurve(today: number, target: number, startQ: number = 0): number[] {
  const n = 19; // total quarters
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < startQ) {
      result.push(today);
      continue;
    }
    const t = (i - startQ) / (n - 1 - startQ);
    // S-curve: slow start, accelerate, slow finish
    const s = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    result.push(Math.round(today + (target - today) * s));
  }
  return result;
}

// Starting locations by vertical (Q2 2026 actuals from CRM)
const BASELINE: Record<keyof VerticalPenetration, number> = {
  hospitality: 7,
  grocery: 4,
  venues: 8,
  golf: 0,
  institutional: 0,
  qsr: 0,
  smb: 22,
};

// Delay quarters before ramp starts (for new verticals)
const START_DELAY: Record<keyof VerticalPenetration, number> = {
  hospitality: 0,
  grocery: 0,
  venues: 0,
  golf: 3, // Q1 2027
  institutional: 2, // Q4 2026
  qsr: 2,
  smb: 0,
};

// Machine deployment schedule
function machineSchedule(totalTarget: number): number[] {
  const base = [0, 4, 8, 14, 20, 28, 35, 45, 58, 72, 90, 110, 130, 155, 180, 210, 240, 270, 300];
  const scale = totalTarget / 300;
  return base.map(v => Math.round(v * scale));
}

export interface QuarterData {
  quarter: string;
  yearIndex: number; // 0 = 2026, 1 = 2027, etc.
  locations: Record<keyof VerticalPenetration, number>;
  totalLocations: number;
  netNew: number;
  machines: number;
  newMachines: number;
  buildCost: number;
  facilities: number;
  // Revenue
  saasRev: number;
  collectionRev: number;
  machineRev: number;
  otherRev: number;
  totalRev: number;
  // P&L
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  opex: number;
  ebitda: number;
  ebitdaMargin: number;
  // SaaS ARR
  saasArr: number;
}

export interface AnnualSummary {
  year: string;
  revenue: number;
  grossMargin: number;
  ebitda: number;
  locations: number;
  machines: number;
  saasArr: number;
  arrByVertical: Record<keyof VerticalPenetration, number>;
}

export interface ModelOutput {
  quarters: QuarterData[];
  annuals: AnnualSummary[];
  totalArr2030: number;
  totalRev2030: number;
}

export function runModel(a: Assumptions): ModelOutput {
  const verticals = Object.keys(a.penetration) as (keyof VerticalPenetration)[];

  // Generate location ramps per vertical
  const ramps: Record<keyof VerticalPenetration, number[]> = {} as never;
  for (const v of verticals) {
    ramps[v] = rampCurve(BASELINE[v], a.penetration[v], START_DELAY[v]);
  }

  // Machine schedule — scale with total locations
  const totalTarget = Object.values(a.penetration).reduce((s, v) => s + v, 0);
  const machineScale = Math.max(1, totalTarget / 2500);
  const machines = machineSchedule(Math.round(300 * machineScale));

  const quarters: QuarterData[] = [];
  let prevTotal = 41;
  let prevOpex = a.opexBaseQuarterly;

  for (let qi = 0; qi < 19; qi++) {
    const locs: Record<keyof VerticalPenetration, number> = {} as never;
    let totalLoc = 0;
    for (const v of verticals) {
      locs[v] = ramps[v][qi];
      totalLoc += ramps[v][qi];
    }

    const yearIndex = qi < 3 ? 0 : qi < 7 ? 1 : qi < 11 ? 2 : qi < 15 ? 3 : 4;
    const isY1Machine = qi < 7;
    const util = isY1Machine ? a.machineUtilY1 : a.machineUtilY2;

    const machineCount = machines[qi];
    const newMachines = qi === 0 ? 0 : machineCount - machines[qi - 1];
    const isContractMfg = qi < 4; // Q2'26 through Q1'27
    const buildCost = isContractMfg ? a.contractMfgCost : a.factoryCost;

    // Facilities: ~1 per 10 machines, min 1 if machines > 0
    const facilities = machineCount > 0 ? Math.max(1, Math.round(machineCount / 10)) : 0;

    // Revenue
    const saasRev = totalLoc * a.saasPerLocation * 3; // quarterly
    const collectionRev = totalLoc * a.avgWasteLbsPerLocation * a.collectionRate * 3;
    const effectiveLbs = machineCount * a.machineCapacityLbs * util;
    const machineRev = effectiveLbs * (a.collectionRate + a.compostRevPerLb) * 3;

    // Other revenue ramps with scale
    const otherPct = 0.02 + (qi / 19) * 0.10;
    const otherRev = (saasRev + collectionRev) * otherPct;

    const totalRev = saasRev + collectionRev + machineRev + otherRev;

    // COGS: composting labor declines as machines replace manual
    const laborShare = Math.max(0.02, 0.72 - (qi / 19) * 0.70);
    const machineCogsTotal = machineCount * a.machineCogs * 3;
    const manualCogs = (collectionRev + machineRev) * laborShare;
    const saasDeliveryCogs = saasRev * 0.08;
    const otherCogs = totalRev * 0.05;
    const cogs = -(machineCogsTotal + manualCogs + saasDeliveryCogs + otherCogs);

    const grossProfit = totalRev + cogs;
    const grossMargin = totalRev > 0 ? grossProfit / totalRev : 0;

    // OpEx grows each quarter
    const opex = -prevOpex;
    prevOpex = prevOpex * (1 + a.opexGrowthRate);

    const ebitda = grossProfit + opex;
    const ebitdaMargin = totalRev > 0 ? ebitda / totalRev : 0;

    const saasArr = totalLoc * a.saasPerLocation * 12;

    quarters.push({
      quarter: QUARTERS[qi],
      yearIndex,
      locations: locs,
      totalLocations: totalLoc,
      netNew: totalLoc - prevTotal,
      machines: machineCount,
      newMachines,
      buildCost,
      facilities,
      saasRev,
      collectionRev,
      machineRev,
      otherRev,
      totalRev,
      cogs,
      grossProfit,
      grossMargin,
      opex,
      ebitda,
      ebitdaMargin,
      saasArr,
    });

    prevTotal = totalLoc;
  }

  // Annual summaries
  const yearRanges = [
    { year: "FY 2026", start: 0, end: 3 },
    { year: "FY 2027", start: 3, end: 7 },
    { year: "FY 2028", start: 7, end: 11 },
    { year: "FY 2029", start: 11, end: 15 },
    { year: "FY 2030", start: 15, end: 19 },
  ];

  const annuals: AnnualSummary[] = yearRanges.map(({ year, start, end }) => {
    const qs = quarters.slice(start, end);
    const revenue = qs.reduce((s, q) => s + q.totalRev, 0);
    const gp = qs.reduce((s, q) => s + q.grossProfit, 0);
    const ebitda = qs.reduce((s, q) => s + q.ebitda, 0);
    const lastQ = qs[qs.length - 1];

    const arrByVertical: Record<keyof VerticalPenetration, number> = {} as never;
    for (const v of verticals) {
      arrByVertical[v] = lastQ.locations[v] * a.saasPerLocation * 12;
    }

    return {
      year,
      revenue,
      grossMargin: revenue > 0 ? gp / revenue : 0,
      ebitda,
      locations: lastQ.totalLocations,
      machines: lastQ.machines,
      saasArr: lastQ.saasArr,
      arrByVertical,
    };
  });

  const lastQ = quarters[quarters.length - 1];

  return {
    quarters,
    annuals,
    totalArr2030: lastQ.saasArr + (lastQ.machineRev * 4) + (lastQ.otherRev * 4),
    totalRev2030: annuals[annuals.length - 1].revenue,
  };
}
