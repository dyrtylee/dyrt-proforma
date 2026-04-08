import XLSX from "xlsx-js-style";
import { FacilityInputs, ProFormaResult, MonthlyProjection } from "./types";
import { inputConfigs, groupOrder } from "./defaults";

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTMENT BANKING MODEL — STANDARD FORMAT
// Blue font = hardcoded input | Black = formula | Green = cross-sheet link
// ═══════════════════════════════════════════════════════════════════════════════

// ── Colors ──────────────────────────────────────────────────────────────────
const BLK = "000000";
const WHT = "FFFFFF";
const BLUE_INPUT = "0000CC";
const GREEN_LINK = "006100";
const RED_NEG = "CC0000";
const GRAY_BG = "F2F2F2";
const HEADER_BG = "D6DCE4";
const TOTAL_BG = "E2EFDA";
const INPUT_BG = "FFF2CC";

// ── Border presets ──────────────────────────────────────────────────────────
const thin = { style: "thin", color: { rgb: "BFBFBF" } };
const med = { style: "medium", color: { rgb: BLK } };
const bAll = { top: thin, bottom: thin, left: thin, right: thin };
const bBot = { ...bAll, bottom: med };
const bDbl = { ...bAll, bottom: { style: "double", color: { rgb: BLK } } };

// ── Font presets ────────────────────────────────────────────────────────────
const fBlk = (opts = {}) => ({ name: "Calibri", sz: 10, color: { rgb: BLK }, ...opts });
const fBold = (opts = {}) => ({ name: "Calibri", sz: 10, bold: true, color: { rgb: BLK }, ...opts });
const fBlue = (opts = {}) => ({ name: "Calibri", sz: 10, color: { rgb: BLUE_INPUT }, ...opts });
const fGreen = (opts = {}) => ({ name: "Calibri", sz: 10, color: { rgb: GREEN_LINK }, ...opts });
const fRed = (opts = {}) => ({ name: "Calibri", sz: 10, color: { rgb: RED_NEG }, ...opts });
const fHdr = () => ({ name: "Calibri", sz: 10, bold: true, color: { rgb: WHT } });

// ── Number formats ──────────────────────────────────────────────────────────
const FMT_ACCT = '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)';
const FMT_ACCT_DEC = '_($* #,##0.0000_);_($* (#,##0.0000);_($* "-"_);_(@_)';
const FMT_PCT = "0.0%";
const FMT_NUM = "#,##0";

// ── Style objects ───────────────────────────────────────────────────────────
const sSection = { font: fHdr(), fill: { fgColor: { rgb: "4472C4" } }, border: bAll, alignment: { horizontal: "left" } };
const sSectionR = { ...sSection, alignment: { horizontal: "center" } };

const sColHdr = { font: fBold(), fill: { fgColor: { rgb: HEADER_BG } }, border: bBot, alignment: { horizontal: "center" } };
const sColHdrL = { ...sColHdr, alignment: { horizontal: "left" } };

const sLabel = { font: fBlk(), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "left" } };
const sLabelIndent = { ...sLabel, alignment: { horizontal: "left", indent: 1 } };
const sLabelBold = { font: fBold(), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "left" } };

const sFormula = { font: fBlk(), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };
const sFormulaNum = { ...sFormula, numFmt: FMT_NUM };
const sFormulaPct = { ...sFormula, numFmt: FMT_PCT };
const sFormulaNeg = { font: fRed(), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };

const sInput = { font: fBlue(), fill: { fgColor: { rgb: INPUT_BG } }, border: bAll, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };
const sInputNum = { ...sInput, numFmt: FMT_NUM };
const sInputPct = { ...sInput, numFmt: FMT_PCT };
const sInputDec = { ...sInput, numFmt: FMT_ACCT_DEC };

const sLink = { font: fGreen(), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };
const sLinkNum = { ...sLink, numFmt: FMT_NUM };
const sLinkPct = { ...sLink, numFmt: FMT_PCT };

const sSub = { font: fBold(), fill: { fgColor: { rgb: GRAY_BG } }, border: bBot, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };
const sSubLabel = { ...sSub, alignment: { horizontal: "left" } };
const sSubPct = { ...sSub, numFmt: FMT_PCT };
const sSubNum = { ...sSub, numFmt: FMT_NUM };

const sTotal = { font: fBold({ color: { rgb: "1F4E79" } }), fill: { fgColor: { rgb: TOTAL_BG } }, border: bDbl, alignment: { horizontal: "right" }, numFmt: FMT_ACCT };
const sTotalLabel = { ...sTotal, alignment: { horizontal: "left" } };
const sTotalPct = { ...sTotal, numFmt: FMT_PCT };

const sTitle = { font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "1F3864" } }, fill: { fgColor: { rgb: WHT } } };
const sSubtitle = { font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "666666" } }, fill: { fgColor: { rgb: WHT } } };
const sUnit = { font: fBlk({ italic: true, color: { rgb: "888888" } }), fill: { fgColor: { rgb: WHT } }, border: bAll, alignment: { horizontal: "center" } };

// ── Cell writer helpers ─────────────────────────────────────────────────────
type WS = XLSX.WorkSheet;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Style = Record<string, any>;

function cv(ws: WS, r: number, c: number, v: string | number, s: Style) {
  const a = XLSX.utils.encode_cell({ r, c });
  ws[a] = { v, t: typeof v === "number" ? "n" : "s", s };
}

function setRange(ws: WS, rEnd: number, cEnd: number) {
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rEnd, c: cEnd } });
}

// ── Annual aggregation ──────────────────────────────────────────────────────
interface AnnualPeriod { label: string; start: number; end: number }

function getAnnuals(totalMonths: number): AnnualPeriod[] {
  const p: AnnualPeriod[] = [];
  for (let y = 0; y * 12 < totalMonths; y++) {
    p.push({ label: `Year ${y + 1}`, start: y * 12, end: Math.min((y + 1) * 12, totalMonths) });
  }
  return p;
}

function annualSum(proj: MonthlyProjection[], per: AnnualPeriod, fn: (p: MonthlyProjection, i: number) => number): number {
  let s = 0;
  for (let m = per.start; m < per.end; m++) s += fn(proj[m], m);
  return s;
}

function annualEnd(proj: MonthlyProjection[], per: AnnualPeriod, fn: (p: MonthlyProjection, i: number) => number): number {
  return fn(proj[per.end - 1], per.end - 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function exportToExcel(inputs: FacilityInputs, result: ProFormaResult) {
  const wb = XLSX.utils.book_new();
  const proj = result.monthlyProjections;
  const periods = getAnnuals(inputs.projectionMonths);
  const nY = periods.length;
  const dataCol0 = 3; // D column

  // Loan schedule
  const principal = result.totalCapex * (1 - inputs.equityPercentage);
  const annualRate = inputs.loanInterestRate;
  const monthlyRate = annualRate / 12;
  const numPayments = inputs.loanTermYears * 12;
  const loanSched: { interest: number; principalPay: number; balance: number }[] = [];
  if (principal > 0 && annualRate > 0) {
    const mp = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    let bal = principal;
    for (let m = 0; m < Math.max(numPayments, inputs.projectionMonths); m++) {
      if (bal <= 0) { loanSched.push({ interest: 0, principalPay: 0, balance: 0 }); }
      else { const i = bal * monthlyRate; const p = Math.min(mp - i, bal); bal = Math.max(0, bal - p); loanSched.push({ interest: i, principalPay: p, balance: bal }); }
    }
  } else {
    for (let m = 0; m < inputs.projectionMonths; m++) loanSched.push({ interest: 0, principalPay: 0, balance: 0 });
  }

  const depYears = 7;
  const monthlyDep = result.totalCapex / (depYears * 12);
  const equityInvested = result.totalCapex * inputs.equityPercentage;

  // Monthly net income
  const monthlyNI = proj.map((p, i) => {
    const gp = p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost;
    const opex = p.laborCost + p.facilityCost + p.truckCost + p.otherOpex;
    return gp - opex - monthlyDep - (loanSched[i]?.interest ?? 0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 1: ASSUMPTIONS
  // ═════════════════════════════════════════════════════════════════════════
  const wsA: WS = {};
  wsA["!cols"] = [{ wch: 35 }, { wch: 8 }, { wch: 18 }];

  let r = 0;
  cv(wsA, r, 0, "Dyrt Labs, Inc.", sTitle); r++;
  cv(wsA, r, 0, "Facility Pro Forma — Assumptions", sSubtitle); r++;
  cv(wsA, r, 0, `Blue = Hardcoded Input  |  Generated ${new Date().toLocaleDateString()}`, sSubtitle); r++;
  r++;

  function writeSection(label: string) {
    cv(wsA, r, 0, label, sSection); cv(wsA, r, 1, "", sSection); cv(wsA, r, 2, "", sSectionR); r++;
  }

  function writeInput(label: string, unit: string, value: number, style: Style) {
    cv(wsA, r, 0, label, sLabel); cv(wsA, r, 1, unit, sUnit); cv(wsA, r, 2, value, style); r++;
  }

  for (const group of groupOrder) {
    const configs = inputConfigs.filter((c) => c.group === group);
    if (configs.length === 0) continue;
    writeSection(group.toUpperCase());
    for (const c of configs) {
      const val = inputs[c.key] as number;
      const unit = c.format === "percent" ? "%" : c.format === "currency" || c.format === "currency-large" ? "$" : "#";
      const style = c.format === "percent" ? sInputPct : c.format === "currency" ? (val < 1 ? sInputDec : sInput) : c.format === "currency-large" ? sInput : sInputNum;
      writeInput(c.label, unit, val, style);
    }
  }

  r++;
  writeSection("USES OF FUNDS");
  for (const [name, value] of Object.entries(result.capexBreakdown)) {
    cv(wsA, r, 0, `  ${name}`, sLabelIndent); cv(wsA, r, 1, "$", sUnit); cv(wsA, r, 2, value, sFormula); r++;
  }
  cv(wsA, r, 0, "Total Capital Expenditures", sSubLabel); cv(wsA, r, 1, "$", sUnit); cv(wsA, r, 2, result.totalCapex, sSub); r++;

  r++;
  writeSection("SOURCES OF FUNDS");
  cv(wsA, r, 0, `  Owner Equity (${(inputs.equityPercentage * 100).toFixed(0)}%)`, sLabelIndent); cv(wsA, r, 1, "$", sUnit); cv(wsA, r, 2, equityInvested, sFormula); r++;
  cv(wsA, r, 0, `  Term Loan (${((1 - inputs.equityPercentage) * 100).toFixed(0)}%)`, sLabelIndent); cv(wsA, r, 1, "$", sUnit); cv(wsA, r, 2, principal, sFormula); r++;
  cv(wsA, r, 0, "Total Sources", sSubLabel); cv(wsA, r, 1, "$", sUnit); cv(wsA, r, 2, result.totalCapex, sSub); r++;

  if (principal > 0) {
    r++;
    writeSection("DEBT TERMS");
    const mp = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    writeInput("Loan Amount", "$", principal, sInput);
    writeInput("Interest Rate", "%", annualRate, sInputPct);
    writeInput("Term", "yrs", inputs.loanTermYears, sInputNum);
    writeInput("Monthly Payment", "$", Math.round(mp), sFormula);
    writeInput("Total Interest", "$", Math.round(loanSched.reduce((s, l) => s + l.interest, 0)), sFormula);
  }

  r++;
  writeSection("KEY METRICS");
  writeInput("Break-Even Month", "#", result.breakEven.breakEvenMonth ?? 0, sFormulaNum);
  writeInput("Break-Even (tons/day)", "#", Math.round(result.breakEven.breakEvenTonsPerDay * 10) / 10, sFormulaNum);
  writeInput("Steady-State Net Margin", "%", result.steadyStateMargin, sFormulaPct);
  writeInput("CAPEX Payback (months)", "#", result.paybackMonths ?? 0, sFormulaNum);

  setRange(wsA, r, 2);
  XLSX.utils.book_append_sheet(wb, wsA, "Assumptions");

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 2: INCOME STATEMENT (Annual)
  // ═════════════════════════════════════════════════════════════════════════
  const wsIS: WS = {};
  wsIS["!cols"] = [{ wch: 35 }, { wch: 6 }, { wch: 2 }, ...Array(nY).fill({ wch: 14 })];

  r = 0;
  cv(wsIS, r, 0, "Dyrt Labs, Inc.", sTitle); r++;
  cv(wsIS, r, 0, "Pro Forma Income Statement", sSubtitle); r++;
  cv(wsIS, r, 0, "($ in whole dollars)", sSubtitle); r++;

  // Column headers
  cv(wsIS, r, 0, "", sColHdrL); cv(wsIS, r, 1, "", sColHdr); cv(wsIS, r, 2, "", sColHdr);
  for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, periods[y].label, sColHdr);
  r++;

  function isRow(label: string, fn: (p: MonthlyProjection, i: number) => number, style: Style, labelStyle: Style = sLabelIndent) {
    cv(wsIS, r, 0, label, labelStyle);
    for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, Math.round(annualSum(proj, periods[y], fn)), style);
    r++;
  }

  function isEndRow(label: string, fn: (p: MonthlyProjection, i: number) => number, style: Style, labelStyle: Style = sLabelIndent) {
    cv(wsIS, r, 0, label, labelStyle);
    for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, annualEnd(proj, periods[y], fn) !== 0 ? annualSum(proj, periods[y], fn) / annualSum(proj, periods[y], (p) => p.totalRevenue) : 0, style);
    r++;
  }

  function isSectionHdr(label: string) {
    cv(wsIS, r, 0, label, sSection); cv(wsIS, r, 1, "", sSection); cv(wsIS, r, 2, "", sSectionR);
    for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, "", sSectionR);
    r++;
  }

  function isSubtotal(label: string, fn: (p: MonthlyProjection, i: number) => number, style = sSub, lStyle = sSubLabel) {
    cv(wsIS, r, 0, label, lStyle);
    for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, Math.round(annualSum(proj, periods[y], fn)), style);
    r++;
  }

  function isMarginRow(label: string, numFn: (p: MonthlyProjection, i: number) => number) {
    cv(wsIS, r, 0, label, sLabelIndent);
    for (let y = 0; y < nY; y++) {
      const num = annualSum(proj, periods[y], numFn);
      const den = annualSum(proj, periods[y], (p) => p.totalRevenue);
      cv(wsIS, r, dataCol0 + y, den !== 0 ? num / den : 0, sFormulaPct);
    }
    r++;
  }

  function isTotalRow(label: string, fn: (p: MonthlyProjection, i: number) => number) {
    cv(wsIS, r, 0, label, sTotalLabel);
    for (let y = 0; y < nY; y++) cv(wsIS, r, dataCol0 + y, Math.round(annualSum(proj, periods[y], fn)), sTotal);
    r++;
  }

  function isTotalMargin(label: string, numFn: (p: MonthlyProjection, i: number) => number) {
    cv(wsIS, r, 0, label, { ...sTotalLabel, alignment: { horizontal: "left", indent: 1 } });
    for (let y = 0; y < nY; y++) {
      const num = annualSum(proj, periods[y], numFn);
      const den = annualSum(proj, periods[y], (p) => p.totalRevenue);
      cv(wsIS, r, dataCol0 + y, den !== 0 ? num / den : 0, sTotalPct);
    }
    r++;
  }

  // Revenue
  isSectionHdr("REVENUE");
  isRow("Tipping Fees", (p) => p.tippingRevenue, sLink);
  isRow("Compost Sales", (p) => p.compostRevenue, sLink);
  isSubtotal("Total Revenue", (p) => p.totalRevenue);
  r++;

  // COGS
  isSectionHdr("COST OF GOODS SOLD");
  isRow("Sawdust & Carbon", (p) => -p.sawdustCost, sFormulaNeg);
  isRow("Digester Disposal & Hauling", (p) => -(p.digesterDisposalCost + p.digesterHaulingCost), sFormulaNeg);
  isRow("Compost Shipping", (p) => -p.shippingCost, sFormulaNeg);
  isSubtotal("Total COGS", (p) => -(p.sawdustCost + p.digesterDisposalCost + p.digesterHaulingCost + p.shippingCost));
  r++;

  // Gross Profit
  const gpFn = (p: MonthlyProjection) => p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost;
  isTotalRow("GROSS PROFIT", gpFn);
  isTotalMargin("Gross Margin", gpFn);
  r++;

  // OpEx
  isSectionHdr("OPERATING EXPENSES");
  isRow("Salaries & Wages", (p) => -p.laborCost, sFormulaNeg);
  isRow("Rent & Occupancy", (p) => -p.facilityCost, sFormulaNeg);
  isRow("Fleet Operations", (p) => -p.truckCost, sFormulaNeg);
  isRow("General & Administrative", (p) => -p.otherOpex, sFormulaNeg);
  isSubtotal("Total Operating Expenses", (p) => -(p.laborCost + p.facilityCost + p.truckCost + p.otherOpex));
  r++;

  // EBITDA
  const ebitdaFn = (p: MonthlyProjection) => gpFn(p) - p.laborCost - p.facilityCost - p.truckCost - p.otherOpex;
  isTotalRow("EBITDA", ebitdaFn);
  isTotalMargin("EBITDA Margin", ebitdaFn);
  r++;

  // D&A and Interest
  isSectionHdr("NON-OPERATING");
  isRow("Depreciation & Amortization", () => -monthlyDep, sFormulaNeg);
  isRow("Interest Expense", (_, i) => -(loanSched[i]?.interest ?? 0), sFormulaNeg);
  r++;

  // Net Income
  isTotalRow("NET INCOME (LOSS)", (_, i) => monthlyNI[i]);
  isTotalMargin("Net Margin", (_, i) => monthlyNI[i]);

  setRange(wsIS, r, dataCol0 + nY - 1);
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 3: CASH FLOWS (Annual)
  // ═════════════════════════════════════════════════════════════════════════
  const wsCF: WS = {};
  wsCF["!cols"] = [{ wch: 35 }, { wch: 6 }, { wch: 2 }, ...Array(nY).fill({ wch: 14 })];

  r = 0;
  cv(wsCF, r, 0, "Dyrt Labs, Inc.", sTitle); r++;
  cv(wsCF, r, 0, "Pro Forma Statement of Cash Flows", sSubtitle); r++;
  r++;
  cv(wsCF, r, 0, "", sColHdrL); cv(wsCF, r, 1, "", sColHdr); cv(wsCF, r, 2, "", sColHdr);
  for (let y = 0; y < nY; y++) cv(wsCF, r, dataCol0 + y, periods[y].label, sColHdr);
  r++;

  function cfRow(label: string, fn: (i: number) => number, style: Style, lStyle = sLabelIndent) {
    cv(wsCF, r, 0, label, lStyle);
    for (let y = 0; y < nY; y++) {
      let s = 0;
      for (let m = periods[y].start; m < periods[y].end; m++) s += fn(m);
      cv(wsCF, r, dataCol0 + y, Math.round(s), style);
    }
    r++;
  }

  function cfSubtotal(label: string, fn: (i: number) => number) {
    cv(wsCF, r, 0, label, sSubLabel);
    for (let y = 0; y < nY; y++) {
      let s = 0; for (let m = periods[y].start; m < periods[y].end; m++) s += fn(m);
      cv(wsCF, r, dataCol0 + y, Math.round(s), sSub);
    }
    r++;
  }

  function cfTotal(label: string, fn: (i: number) => number) {
    cv(wsCF, r, 0, label, sTotalLabel);
    for (let y = 0; y < nY; y++) {
      let s = 0; for (let m = periods[y].start; m < periods[y].end; m++) s += fn(m);
      cv(wsCF, r, dataCol0 + y, Math.round(s), sTotal);
    }
    r++;
  }

  function cfEndBal(label: string, vals: number[]) {
    cv(wsCF, r, 0, label, sTotalLabel);
    for (let y = 0; y < nY; y++) cv(wsCF, r, dataCol0 + y, Math.round(vals[periods[y].end - 1]), sTotal);
    r++;
  }

  // Operating
  cv(wsCF, r, 0, "CASH FLOWS FROM OPERATIONS", sSection);
  for (let c = 1; c < dataCol0 + nY; c++) cv(wsCF, r, c, "", c < dataCol0 ? sSection : sSectionR);
  r++;

  cfRow("Net Income (Loss)", (i) => monthlyNI[i], sLink);
  cfRow("Add: Depreciation & Amortization", () => monthlyDep, sFormula);
  cfSubtotal("Net Cash from Operations", (i) => monthlyNI[i] + monthlyDep);
  r++;

  // Investing
  cv(wsCF, r, 0, "CASH FLOWS FROM INVESTING", sSection);
  for (let c = 1; c < dataCol0 + nY; c++) cv(wsCF, r, c, "", c < dataCol0 ? sSection : sSectionR);
  r++;
  cfRow("Capital Expenditures", (i) => i === 0 ? -result.totalCapex : 0, sFormulaNeg);
  cfSubtotal("Net Cash from Investing", (i) => i === 0 ? -result.totalCapex : 0);
  r++;

  // Financing
  cv(wsCF, r, 0, "CASH FLOWS FROM FINANCING", sSection);
  for (let c = 1; c < dataCol0 + nY; c++) cv(wsCF, r, c, "", c < dataCol0 ? sSection : sSectionR);
  r++;
  cfRow("Owner Equity Contributions", (i) => i === 0 ? equityInvested : 0, sFormula);
  cfRow("Loan Proceeds", (i) => i === 0 ? principal : 0, sFormula);
  cfRow("Loan Principal Repayments", (i) => -(loanSched[i]?.principalPay ?? 0), sFormulaNeg);
  cfSubtotal("Net Cash from Financing", (i) => {
    const eq = i === 0 ? equityInvested : 0;
    const lp = i === 0 ? principal : 0;
    return eq + lp - (loanSched[i]?.principalPay ?? 0);
  });
  r++;

  // Net change
  const cfNet = proj.map((_, i) => {
    const ops = monthlyNI[i] + monthlyDep;
    const inv = i === 0 ? -result.totalCapex : 0;
    const fin = (i === 0 ? equityInvested + principal : 0) - (loanSched[i]?.principalPay ?? 0);
    return ops + inv + fin;
  });
  const cumCash: number[] = [];
  let rc = 0; for (const c of cfNet) { rc += c; cumCash.push(rc); }

  cfTotal("NET CHANGE IN CASH", (i) => cfNet[i]);
  r++;
  cfEndBal("CASH — END OF PERIOD", cumCash);

  setRange(wsCF, r, dataCol0 + nY - 1);
  XLSX.utils.book_append_sheet(wb, wsCF, "Cash Flows");

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 4: BALANCE SHEET (Annual, end-of-period)
  // ═════════════════════════════════════════════════════════════════════════
  const wsBS: WS = {};
  wsBS["!cols"] = [{ wch: 35 }, { wch: 6 }, { wch: 2 }, ...Array(nY).fill({ wch: 14 })];

  r = 0;
  cv(wsBS, r, 0, "Dyrt Labs, Inc.", sTitle); r++;
  cv(wsBS, r, 0, "Pro Forma Balance Sheet", sSubtitle); r++;
  r++;
  cv(wsBS, r, 0, "", sColHdrL);
  for (let y = 0; y < nY; y++) cv(wsBS, r, dataCol0 + y, periods[y].label, sColHdr);
  r++;

  function bsRow(label: string, fn: (i: number) => number, style: Style, lStyle = sLabelIndent) {
    cv(wsBS, r, 0, label, lStyle);
    for (let y = 0; y < nY; y++) cv(wsBS, r, dataCol0 + y, Math.round(fn(periods[y].end - 1)), style);
    r++;
  }

  function bsSubtotal(label: string, fn: (i: number) => number) {
    cv(wsBS, r, 0, label, sSubLabel);
    for (let y = 0; y < nY; y++) cv(wsBS, r, dataCol0 + y, Math.round(fn(periods[y].end - 1)), sSub);
    r++;
  }

  function bsTotal(label: string, fn: (i: number) => number) {
    cv(wsBS, r, 0, label, sTotalLabel);
    for (let y = 0; y < nY; y++) cv(wsBS, r, dataCol0 + y, Math.round(fn(periods[y].end - 1)), sTotal);
    r++;
  }

  // Retained earnings
  const retEarnings: number[] = [];
  let cumNI = 0;
  for (let i = 0; i < proj.length; i++) { cumNI += monthlyNI[i]; retEarnings.push(cumNI); }

  // Assets
  cv(wsBS, r, 0, "ASSETS", sSection);
  for (let c = 1; c < dataCol0 + nY; c++) cv(wsBS, r, c, "", c < dataCol0 ? sSection : sSectionR);
  r++;

  bsRow("Cash & Cash Equivalents", (i) => cumCash[i], sLink);
  bsSubtotal("Total Current Assets", (i) => cumCash[i]);
  r++;

  bsRow("Property, Plant & Equipment", () => result.totalCapex, sFormula);
  bsRow("Less: Accumulated Depreciation", (i) => -(i + 1) * monthlyDep, sFormulaNeg);
  bsRow("Net PP&E", (i) => result.totalCapex - (i + 1) * monthlyDep, sFormula);
  bsSubtotal("Total Non-Current Assets", (i) => result.totalCapex - (i + 1) * monthlyDep);
  r++;

  bsTotal("TOTAL ASSETS", (i) => cumCash[i] + result.totalCapex - (i + 1) * monthlyDep);
  r++;

  // Liabilities & Equity
  cv(wsBS, r, 0, "LIABILITIES & STOCKHOLDERS' EQUITY", sSection);
  for (let c = 1; c < dataCol0 + nY; c++) cv(wsBS, r, c, "", c < dataCol0 ? sSection : sSectionR);
  r++;

  bsRow("Term Loan Payable", (i) => loanSched[i]?.balance ?? 0, sFormula);
  bsSubtotal("Total Liabilities", (i) => loanSched[i]?.balance ?? 0);
  r++;

  bsRow("Contributed Capital", () => equityInvested, sFormula);
  bsRow("Retained Earnings (Deficit)", (i) => retEarnings[i], sFormula);
  bsSubtotal("Total Stockholders' Equity", (i) => equityInvested + retEarnings[i]);
  r++;

  bsTotal("TOTAL LIABILITIES & EQUITY", (i) => (loanSched[i]?.balance ?? 0) + equityInvested + retEarnings[i]);

  setRange(wsBS, r, dataCol0 + nY - 1);
  XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 5: MONTHLY DETAIL
  // ═════════════════════════════════════════════════════════════════════════
  const wsMo: WS = {};
  const mCol0 = 2; // data starts col C
  wsMo["!cols"] = [{ wch: 28 }, { wch: 6 }, ...Array(proj.length).fill({ wch: 11 })];

  r = 0;
  cv(wsMo, r, 0, "Monthly Operating Detail", sTitle); r++;
  r++;

  // Headers
  cv(wsMo, r, 0, "", sColHdrL); cv(wsMo, r, 1, "", sColHdr);
  for (let m = 0; m < proj.length; m++) cv(wsMo, r, mCol0 + m, `Mo ${m + 1}`, sColHdr);
  r++;

  function moRow(label: string, fn: (p: MonthlyProjection, i: number) => number, style: Style, lStyle: Style = sLabelIndent) {
    cv(wsMo, r, 0, label, lStyle);
    for (let m = 0; m < proj.length; m++) cv(wsMo, r, mCol0 + m, Math.round(fn(proj[m], m)), style);
    r++;
  }

  function moSection(label: string) {
    cv(wsMo, r, 0, label, sSection);
    for (let c = 1; c < mCol0 + proj.length; c++) cv(wsMo, r, c, "", c < mCol0 ? sSection : sSectionR);
    r++;
  }

  function moPctRow(label: string, fn: (p: MonthlyProjection) => number) {
    cv(wsMo, r, 0, label, sLabelIndent);
    for (let m = 0; m < proj.length; m++) cv(wsMo, r, mCol0 + m, fn(proj[m]), sFormulaPct);
    r++;
  }

  moSection("OPERATIONAL METRICS");
  moPctRow("Utilization", (p) => p.utilization);
  moRow("Daily Tons", (p) => p.dailyTonsIn * 10, { ...sFormulaNum, numFmt: "#,##0.0" }); // hack for 1 decimal
  moRow("Monthly Tons", (p) => p.monthlyTonsIn, sFormulaNum);

  moSection("REVENUE");
  moRow("Tipping Fees", (p) => p.tippingRevenue, sLink);
  moRow("Compost Sales", (p) => p.compostRevenue, sLink);
  moRow("Total Revenue", (p) => p.totalRevenue, sSub, sSubLabel);

  moSection("VARIABLE COSTS");
  moRow("Sawdust", (p) => p.sawdustCost, sFormula);
  moRow("Digester Disposal", (p) => p.digesterDisposalCost, sFormula);
  moRow("Digester Hauling", (p) => p.digesterHaulingCost, sFormula);
  moRow("Compost Shipping", (p) => p.shippingCost, sFormula);

  moSection("FIXED COSTS");
  moRow("Labor", (p) => p.laborCost, sFormula);
  moRow("Rent", (p) => p.facilityCost, sFormula);
  moRow("Fleet", (p) => p.truckCost, sFormula);
  moRow("Other", (p) => p.otherOpex, sFormula);
  moRow("Total OpEx", (p) => p.totalOpex, sSub, sSubLabel);

  moSection("PROFITABILITY");
  moRow("Debt Service", (p) => p.debtService, sFormula);
  moRow("Net Profit (Loss)", (p) => p.netProfit, sTotal, sTotalLabel);
  moRow("Cumulative P&L", (p) => p.cumulativeProfit, sFormula);

  moSection("BALANCE");
  moRow("Loan Balance", (_, i) => loanSched[i]?.balance ?? 0, sFormula);
  moRow("Cash Balance", (_, i) => cumCash[i], sLink);

  setRange(wsMo, r, mCol0 + proj.length - 1);
  XLSX.utils.book_append_sheet(wb, wsMo, "Monthly Detail");

  // ── Write ─────────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `Dyrt_Labs_Facility_ProForma_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
