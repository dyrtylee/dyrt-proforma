"use client";

import { useState, useMemo } from "react";
import { defaultInputs, inputConfigs } from "@/lib/defaults";
import { calculateProForma } from "@/lib/calculations";
import { FacilityInputs } from "@/lib/types";
import { fmtCurrency, fmtCurrencyFull, fmtPercent, fmtNumber, fmtTons } from "@/lib/format";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell,
  ComposedChart,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (formatter: (v: number) => string) => (v: any) => (typeof v === "number" ? formatter(v) : String(v ?? ""));

const COLORS = [
  "#06b6d4", "#10b981", "#f97316", "#8b5cf6", "#f43f5e",
  "#3b82f6", "#eab308", "#ec4899", "#6366f1", "#14b8a6",
  "#f59e0b", "#a855f7", "#0ea5e9",
];

const TABS = ["Summary", "CAPEX", "Operations", "Break-Even", "Projections", "Sensitivity"] as const;
type Tab = (typeof TABS)[number];

const CHART_GRID = "#1e293b";
const CHART_TEXT = "#94a3b8";

export default function ProFormaPage() {
  const [inputs, setInputs] = useState<FacilityInputs>({ ...defaultInputs });
  const [activeTab, setActiveTab] = useState<Tab>("Summary");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Equipment CAPEX"]));

  const result = useMemo(() => calculateProForma(inputs), [inputs]);

  function updateInput(key: keyof FacilityInputs, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  const groups = [...new Set(inputConfigs.map((c) => c.group))];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-96 bg-navy border-r border-border overflow-y-auto flex-shrink-0 print:hidden">
        <div className="sticky top-0 bg-navy border-b border-border px-6 py-5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">DYRT LABS</h1>
              <p className="text-xs text-muted">Facility Pro Forma</p>
            </div>
          </div>
        </div>
        <div className="px-3 py-3 space-y-1">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group);
            const groupConfigs = inputConfigs.filter((c) => c.group === group);
            return (
              <div key={group} className="rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left rounded-xl"
                >
                  <span className="font-semibold text-sm text-foreground">{group}</span>
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-4">
                    {groupConfigs.map((config) => (
                      <InputControl
                        key={config.key}
                        config={config}
                        value={inputs[config.key] as number}
                        onChange={(v) => updateInput(config.key, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <nav className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-10">
          <div className="px-8 flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-8">
          {activeTab === "Summary" && <SummaryTab result={result} inputs={inputs} />}
          {activeTab === "CAPEX" && <CapexTab result={result} />}
          {activeTab === "Operations" && <OperationsTab result={result} inputs={inputs} />}
          {activeTab === "Break-Even" && <BreakEvenTab result={result} inputs={inputs} />}
          {activeTab === "Projections" && <ProjectionsTab result={result} />}
          {activeTab === "Sensitivity" && <SensitivityTab inputs={inputs} />}
        </div>
      </main>
    </div>
  );
}

// --- Input Control ---
function InputControl({
  config,
  value,
  onChange,
}: {
  config: (typeof inputConfigs)[0];
  value: number;
  onChange: (v: number) => void;
}) {
  const displayValue =
    config.format === "percent"
      ? `${(value * 100).toFixed(0)}%`
      : config.format === "currency" || config.format === "currency-large"
        ? fmtCurrencyFull(value)
        : fmtNumber(value);

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs text-muted">{config.label}</label>
        <span className="text-xs font-mono font-medium text-accent">{displayValue}</span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

// --- Card wrapper ---
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mb-4">{children}</h3>;
}

// --- KPI Card ---
function KPI({ label, value, sub, color = "accent" }: { label: string; value: string; sub?: string; color?: string }) {
  const styles: Record<string, { border: string; glow: string }> = {
    accent: { border: "border-l-accent", glow: "bg-accent-dim" },
    green: { border: "border-l-d-green", glow: "bg-d-green-dim" },
    red: { border: "border-l-d-red", glow: "bg-d-red-dim" },
    orange: { border: "border-l-d-orange", glow: "bg-d-orange-dim" },
    purple: { border: "border-l-d-purple", glow: "bg-d-purple-dim" },
  };
  const s = styles[color] || styles.accent;

  return (
    <div className={`bg-card rounded-xl border border-border border-l-4 ${s.border} p-4 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-20 h-20 ${s.glow} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl`} />
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

// --- Tooltip style ---
const tooltipStyle = {
  backgroundColor: "#1a2332",
  border: "1px solid #2d3a4f",
  borderRadius: "10px",
  color: "#e2e8f0",
  fontSize: "12px",
};

// --- Summary Tab ---
function SummaryTab({ result, inputs }: { result: ReturnType<typeof calculateProForma>; inputs: FacilityInputs }) {
  const steadyMonth = result.monthlyProjections.find((p) => p.utilization >= 1.0);
  const year3 = result.monthlyProjections[35];
  const year5 = result.monthlyProjections[Math.min(59, result.monthlyProjections.length - 1)];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Facility Pro Forma Summary</h2>
        <p className="text-muted mt-1 text-sm">
          {inputs.numComposters} composters &middot; {fmtTons(result.maxDailyCapacityTons)} max daily capacity &middot; Dewaterer at {fmtPercent(inputs.dewateringReduction)} reduction
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total CAPEX" value={fmtCurrency(result.totalCapex)} color="accent" />
        <KPI
          label="Break-Even"
          value={result.breakEven.breakEvenMonth ? `Month ${result.breakEven.breakEvenMonth}` : "N/A"}
          sub={`${result.breakEven.breakEvenTonsPerDay.toFixed(1)} tons/day`}
          color={result.breakEven.breakEvenMonth ? "green" : "red"}
        />
        <KPI
          label="Steady-State Margin"
          value={fmtPercent(result.steadyStateMargin)}
          sub={steadyMonth ? fmtCurrencyFull(steadyMonth.netProfit) + "/mo" : ""}
          color={result.steadyStateMargin > 0 ? "green" : "red"}
        />
        <KPI
          label="CAPEX Payback"
          value={result.paybackMonths ? `${result.paybackMonths} months` : "N/A"}
          sub={result.paybackMonths ? `~${(result.paybackMonths / 12).toFixed(1)} years` : "Beyond projection"}
          color={result.paybackMonths ? "purple" : "orange"}
        />
      </div>

      <Card>
        <CardTitle>Revenue vs. Operating Costs</CardTitle>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} label={{ value: "Month", position: "bottom", offset: -5, fill: CHART_TEXT }} />
            <YAxis stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtCurrencyFull)} />
            <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
            <Area type="monotone" dataKey="totalRevenue" name="Revenue" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth={2} />
            <Line type="monotone" dataKey="totalOpex" name="Operating Costs" stroke="#f43f5e" strokeWidth={2} dot={false} />
            <ReferenceLine y={0} stroke="#2d3a4f" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Net Margin Growth Over Time</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtPercent)} />
            <ReferenceLine y={0} stroke="#2d3a4f" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="netMargin" name="Net Margin" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Key Milestones</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steadyMonth && (
            <div className="bg-navy/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-medium text-accent">At Full Capacity (Month {steadyMonth.month})</p>
              <p className="text-lg font-bold text-foreground mt-2">{fmtCurrencyFull(steadyMonth.totalRevenue)}/mo</p>
              <p className="text-sm text-muted">{fmtCurrencyFull(steadyMonth.netProfit)}/mo net profit</p>
              <p className="text-sm text-muted">{fmtPercent(steadyMonth.netMargin)} margin</p>
            </div>
          )}
          {year3 && (
            <div className="bg-navy/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-medium text-d-green">Year 3 (Month 36)</p>
              <p className="text-lg font-bold text-foreground mt-2">{fmtCurrencyFull(year3.totalRevenue)}/mo</p>
              <p className="text-sm text-muted">{fmtCurrencyFull(year3.netProfit)}/mo net profit</p>
              <p className="text-sm text-muted">{fmtCurrencyFull(year3.cumulativeProfit)} cumulative</p>
            </div>
          )}
          {year5 && (
            <div className="bg-navy/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-medium text-d-purple">Year 5 (Month {year5.month})</p>
              <p className="text-lg font-bold text-foreground mt-2">{fmtCurrencyFull(year5.totalRevenue)}/mo</p>
              <p className="text-sm text-muted">{fmtCurrencyFull(year5.netProfit)}/mo net profit</p>
              <p className="text-sm text-muted">{fmtCurrencyFull(year5.cumulativeProfit)} cumulative</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// --- CAPEX Tab ---
function CapexTab({ result }: { result: ReturnType<typeof calculateProForma> }) {
  const pieData = Object.entries(result.capexBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Capital Expenditure Breakdown</h2>

      <div className="grid grid-cols-2 gap-4">
        <KPI label="Total CAPEX" value={fmtCurrency(result.totalCapex)} color="accent" />
        <KPI label="Max Daily Capacity" value={fmtTons(result.maxDailyCapacityTons)} sub={`${fmtNumber(result.maxDailyCapacityLbs)} lbs/day`} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>CAPEX Distribution</CardTitle>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={140}
                dataKey="value"
                stroke="#0a0e1a"
                strokeWidth={2}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtCurrencyFull)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Line Items</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted text-xs uppercase tracking-wider">Item</th>
                <th className="text-right py-2 text-muted text-xs uppercase tracking-wider">Cost</th>
                <th className="text-right py-2 text-muted text-xs uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.capexBreakdown).map(([name, value]) => (
                <tr key={name} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-2.5 text-foreground">{name}</td>
                  <td className="py-2.5 text-right font-mono text-foreground">{fmtCurrencyFull(value)}</td>
                  <td className="py-2.5 text-right text-muted">{((value / result.totalCapex) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-accent/30">
                <td className="py-2.5 text-accent">Total</td>
                <td className="py-2.5 text-right font-mono text-accent">{fmtCurrencyFull(result.totalCapex)}</td>
                <td className="py-2.5 text-right text-accent">100%</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// --- Operations Tab ---
function OperationsTab({ result, inputs }: { result: ReturnType<typeof calculateProForma>; inputs: FacilityInputs }) {
  const steadyMonth = result.monthlyProjections.find((p) => p.utilization >= 1.0);

  const flowData = steadyMonth
    ? [
        { name: "Raw Food Waste In", lbs: steadyMonth.monthlyLbsIn },
        { name: "Water Removed", lbs: steadyMonth.sludgeToDigesterLbs },
        { name: "Dewatered to Composters", lbs: steadyMonth.dewateredLbs },
        { name: "Sawdust Added", lbs: steadyMonth.sawdustNeededLbs },
        { name: "Finished Compost", lbs: steadyMonth.compostProducedLbs },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Operations at Steady State</h2>

      {steadyMonth && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Daily Intake" value={fmtTons(steadyMonth.dailyTonsIn)} sub={`${fmtNumber(steadyMonth.dailyTonsIn * 2000)} lbs/day`} color="accent" />
            <KPI label="Sludge to Digester" value={`${fmtNumber(steadyMonth.sludgeToDigesterLbs / 26)} lbs/day`} sub={fmtPercent(inputs.dewateringReduction) + " of input"} color="orange" />
            <KPI label="Sawdust / Month" value={`${steadyMonth.sawdustNeededCY.toFixed(0)} CY`} sub={fmtCurrencyFull(steadyMonth.sawdustCost) + "/mo"} color="purple" />
            <KPI label="Compost Out" value={`${steadyMonth.compostProducedCY.toFixed(0)} CY/mo`} sub={`${steadyMonth.truckloadsCompost} truckloads`} color="green" />
          </div>

          <Card>
            <CardTitle>Monthly Material Flow</CardTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flowData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K lbs`} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fill: CHART_TEXT, fontSize: 12 }} stroke={CHART_GRID} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmt((v) => `${fmtNumber(v)} lbs`)} />
                <Bar dataKey="lbs" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>Monthly Cost Breakdown (Steady State)</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Labor", value: steadyMonth.laborCost },
                        { name: "Machine COGS", value: steadyMonth.machineCogs },
                        { name: "Facility Lease", value: steadyMonth.facilityCost },
                        { name: "Sawdust", value: steadyMonth.sawdustCost },
                        { name: "Truck Ops", value: steadyMonth.truckCost },
                        { name: "Shipping", value: steadyMonth.shippingCost },
                        { name: "Other", value: steadyMonth.otherOpex },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      dataKey="value"
                      stroke="#0a0e1a"
                      strokeWidth={2}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {COLORS.slice(0, 7).map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtCurrencyFull)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["Labor (incl. payroll tax)", steadyMonth.laborCost],
                      ["Machine COGS", steadyMonth.machineCogs],
                      ["Facility Lease", steadyMonth.facilityCost],
                      ["Sawdust / Carbon", steadyMonth.sawdustCost],
                      ["Truck Operations", steadyMonth.truckCost],
                      ["Compost Shipping", steadyMonth.shippingCost],
                      ["Other OpEx", steadyMonth.otherOpex],
                      ["Debt Service", steadyMonth.debtService],
                    ].map(([label, val]) => (
                      <tr key={label as string} className="border-b border-border/50">
                        <td className="py-2.5 text-muted">{label as string}</td>
                        <td className="py-2.5 text-right font-mono text-foreground">{fmtCurrencyFull(val as number)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold border-t-2 border-accent/30">
                      <td className="py-2.5 text-accent">Total Monthly Costs</td>
                      <td className="py-2.5 text-right font-mono text-accent">{fmtCurrencyFull(steadyMonth.totalOpex + steadyMonth.debtService)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Process Flow</CardTitle>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <FlowBox label="Food Waste In" value={`${fmtNumber(steadyMonth.dailyTonsIn * 2000)} lbs/day`} color="accent" />
              <Arrow />
              <FlowBox label="Dewaterer" value={`${fmtPercent(inputs.dewateringReduction)} reduction`} color="orange" />
              <Arrow />
              <div className="flex flex-col gap-2">
                <FlowBox label="Sludge to Digester" value={`${fmtNumber(steadyMonth.sludgeToDigesterLbs / 26)} lbs/day`} color="red" />
                <FlowBox label="Dewatered Solids" value={`${fmtNumber(steadyMonth.dewateredLbs / 26)} lbs/day`} color="green" />
              </div>
              <Arrow />
              <FlowBox label={`${inputs.numComposters} Composters`} value={`+ ${fmtNumber(steadyMonth.sawdustNeededLbs / 26)} lbs sawdust/day`} color="purple" />
              <Arrow />
              <FlowBox label="Finished Compost" value={`${(steadyMonth.compostProducedCY / 26).toFixed(0)} CY/day`} color="green" />
              <Arrow />
              <FlowBox label="53' Trailers" value={`${steadyMonth.truckloadsCompost} loads/mo`} color="accent" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function FlowBox({ label, value, color }: { label: string; value: string; color: string }) {
  const styles: Record<string, string> = {
    accent: "border-accent/40 bg-accent-dim",
    green: "border-d-green/40 bg-d-green-dim",
    red: "border-d-red/40 bg-d-red-dim",
    orange: "border-d-orange/40 bg-d-orange-dim",
    purple: "border-d-purple/40 bg-d-purple-dim",
  };

  return (
    <div className={`${styles[color] || styles.accent} border rounded-xl px-4 py-3 text-center min-w-[140px]`}>
      <p className="font-semibold text-foreground text-sm">{label}</p>
      <p className="text-xs text-muted mt-1">{value}</p>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// --- Break-Even Tab ---
function BreakEvenTab({ result, inputs }: { result: ReturnType<typeof calculateProForma>; inputs: FacilityInputs }) {
  const be = result.breakEven;

  const tonnageSteps = [];
  for (let t = 0; t <= result.maxDailyCapacityTons * 1.2; t += result.maxDailyCapacityTons / 20) {
    const monthlyTons = t * 26;
    const monthlyLbs = monthlyTons * 2000;
    const revenue = monthlyLbs * inputs.tippingFeePerLb;
    const dewateredLbs = monthlyLbs * (1 - inputs.dewateringReduction);
    const sawdustRatio = (inputs.cnRatio - inputs.foodWasteCN) / (inputs.sawdustCN - inputs.cnRatio);
    const sawdustLbs = dewateredLbs * sawdustRatio;
    const compostLbs = (dewateredLbs + sawdustLbs) * (1 - inputs.compostShrinkage);
    const compostCY = compostLbs / inputs.compostDensityLbsPerCY;
    const compostRev = compostCY * inputs.compostPricePerCY;
    const totalRev = revenue + compostRev;
    const varCost = monthlyTons * be.variableCostPerTon;
    const totalCost = be.monthlyFixedCosts + varCost;

    tonnageSteps.push({
      tonsPerDay: parseFloat(t.toFixed(1)),
      revenue: totalRev,
      totalCost,
      fixedCost: be.monthlyFixedCosts,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Break-Even Analysis</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Break-Even Tonnage" value={`${be.breakEvenTonsPerDay.toFixed(1)} tons/day`} sub={`${(be.breakEvenTonsPerDay * 26).toFixed(0)} tons/month`} color="accent" />
        <KPI label="Break-Even Utilization" value={fmtPercent(be.breakEvenUtilization)} sub={`of ${fmtTons(result.maxDailyCapacityTons)} capacity`} color={be.breakEvenUtilization <= 1 ? "green" : "red"} />
        <KPI label="Revenue per Ton" value={fmtCurrencyFull(be.revenuePerTon)} sub="tipping + compost" color="green" />
        <KPI label="Contribution Margin" value={fmtCurrencyFull(be.contributionMarginPerTon)} sub="per ton" color="purple" />
      </div>

      <Card>
        <CardTitle>Revenue vs. Cost by Daily Tonnage</CardTitle>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={tonnageSteps}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="tonsPerDay" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} label={{ value: "Tons / Day", position: "bottom", offset: -5, fill: CHART_TEXT }} />
            <YAxis stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtCurrencyFull)} />
            <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#06b6d4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="#f43f5e" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="fixedCost" name="Fixed Costs" fill="rgba(244, 63, 94, 0.08)" stroke="rgba(244, 63, 94, 0.3)" strokeWidth={1} />
            {be.breakEvenTonsPerDay <= result.maxDailyCapacityTons * 1.2 && (
              <ReferenceLine x={parseFloat(be.breakEvenTonsPerDay.toFixed(1))} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Break-Even", fill: "#10b981", fontSize: 12 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Unit Economics</CardTitle>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Monthly Fixed Costs", fmtCurrencyFull(be.monthlyFixedCosts)],
              ["Variable Cost per Ton", fmtCurrencyFull(be.variableCostPerTon)],
              ["Revenue per Ton (blended)", fmtCurrencyFull(be.revenuePerTon)],
              ["Contribution Margin per Ton", fmtCurrencyFull(be.contributionMarginPerTon)],
              ["Break-Even Monthly Tons", fmtNumber(be.breakEvenTonsPerDay * 26)],
              ["Break-Even Daily Tons", be.breakEvenTonsPerDay.toFixed(1)],
              ["Max Capacity (tons/day)", result.maxDailyCapacityTons.toFixed(1)],
              ["Capacity Headroom", fmtPercent(1 - be.breakEvenUtilization)],
            ].map(([label, val]) => (
              <tr key={label} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                <td className="py-2.5 text-muted">{label}</td>
                <td className="py-2.5 text-right font-mono font-medium text-foreground">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Projections Tab ---
function ProjectionsTab({ result }: { result: ReturnType<typeof calculateProForma> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Monthly Projections</h2>

      <Card>
        <CardTitle>Cumulative Profit / Loss (incl. CAPEX)</CardTitle>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt(fmtCurrencyFull)} />
            <ReferenceLine y={0} stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
            <Area type="monotone" dataKey="cumulativeProfit" name="Cumulative P&L" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.15)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Utilization & Daily Tonnage Ramp</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
            <YAxis yAxisId="left" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <YAxis yAxisId="right" orientation="right" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}t`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="utilization" name="Utilization %" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="dailyTonsIn" name="Daily Tons" stroke="#f97316" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-x-auto">
        <CardTitle>Monthly Detail</CardTitle>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted uppercase tracking-wider">
              <th className="py-2 text-left">Mo</th>
              <th className="py-2 text-right">Util.</th>
              <th className="py-2 text-right">Tons/Day</th>
              <th className="py-2 text-right">Revenue</th>
              <th className="py-2 text-right">OpEx</th>
              <th className="py-2 text-right">Net Profit</th>
              <th className="py-2 text-right">Margin</th>
              <th className="py-2 text-right">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {result.monthlyProjections.map((p) => (
              <tr key={p.month} className={`border-b border-border/30 hover:bg-card-hover transition-colors ${p.netProfit >= 0 ? "text-foreground" : "text-d-red"}`}>
                <td className="py-1.5">{p.month}</td>
                <td className="py-1.5 text-right">{fmtPercent(p.utilization)}</td>
                <td className="py-1.5 text-right">{p.dailyTonsIn.toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono">{fmtCurrencyFull(p.totalRevenue)}</td>
                <td className="py-1.5 text-right font-mono">{fmtCurrencyFull(p.totalOpex)}</td>
                <td className="py-1.5 text-right font-mono">{fmtCurrencyFull(p.netProfit)}</td>
                <td className="py-1.5 text-right">{fmtPercent(p.netMargin)}</td>
                <td className="py-1.5 text-right font-mono">{fmtCurrencyFull(p.cumulativeProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Sensitivity Tab ---
function SensitivityTab({ inputs }: { inputs: FacilityInputs }) {
  const scenarios = useMemo(() => {
    const results: { variable: string; lowStr: string; baseStr: string; highStr: string; lowMargin: number; baseMargin: number; highMargin: number }[] = [];

    const baseResult = calculateProForma(inputs);
    const baseSteady = baseResult.monthlyProjections.find((p) => p.utilization >= 1.0);
    const baseMargin = baseSteady?.netMargin ?? 0;

    const scenariosConfig: { variable: string; key: keyof FacilityInputs; low: number; high: number; fmt: "currency" | "currency-sm" | "percent" | "number" }[] = [
      { variable: "Tipping Fee ($/lb)", key: "tippingFeePerLb", low: inputs.tippingFeePerLb * 0.7, high: inputs.tippingFeePerLb * 1.3, fmt: "currency-sm" },
      { variable: "# Composters", key: "numComposters", low: Math.max(6, inputs.numComposters - 8), high: inputs.numComposters + 12, fmt: "number" },
      { variable: "Facility Lease", key: "facilityLease", low: inputs.facilityLease * 0.7, high: inputs.facilityLease * 1.3, fmt: "currency" },
      { variable: "Composter Cost", key: "composterCost", low: inputs.composterCost * 0.7, high: inputs.composterCost * 1.3, fmt: "currency" },
      { variable: "Labor Costs", key: "laborQCSorting", low: inputs.laborQCSorting * 0.7, high: inputs.laborQCSorting * 1.3, fmt: "currency" },
      { variable: "Compost Price ($/CY)", key: "compostPricePerCY", low: inputs.compostPricePerCY * 0.5, high: inputs.compostPricePerCY * 1.5, fmt: "currency" },
      { variable: "Dewatering %", key: "dewateringReduction", low: 0.65, high: 0.90, fmt: "percent" },
    ];

    const fmtVal = (v: number, f: string) => {
      if (f === "percent") return fmtPercent(v);
      if (f === "currency-sm") return `$${v.toFixed(3)}`;
      if (f === "currency") return fmtCurrency(v);
      return fmtNumber(v);
    };

    for (const sc of scenariosConfig) {
      const lowResult = calculateProForma({ ...inputs, [sc.key]: sc.low });
      const highResult = calculateProForma({ ...inputs, [sc.key]: sc.high });
      const lowSteady = lowResult.monthlyProjections.find((p) => p.utilization >= 1.0);
      const highSteady = highResult.monthlyProjections.find((p) => p.utilization >= 1.0);

      results.push({
        variable: sc.variable,
        lowStr: fmtVal(sc.low, sc.fmt),
        baseStr: fmtVal(inputs[sc.key] as number, sc.fmt),
        highStr: fmtVal(sc.high, sc.fmt),
        lowMargin: lowSteady?.netMargin ?? 0,
        baseMargin,
        highMargin: highSteady?.netMargin ?? 0,
      });
    }
    return results;
  }, [inputs]);

  const tornadoData = scenarios.map((s) => ({
    variable: s.variable,
    lowDelta: (s.lowMargin - s.baseMargin) * 100,
    highDelta: (s.highMargin - s.baseMargin) * 100,
  })).sort((a, b) => Math.abs(b.highDelta - b.lowDelta) - Math.abs(a.highDelta - a.lowDelta));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Sensitivity Analysis</h2>
      <p className="text-muted text-sm">How steady-state net margin changes with +/- 30% swings in key variables.</p>

      <Card>
        <CardTitle>Margin Impact (percentage points)</CardTitle>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={tornadoData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis type="number" stroke={CHART_TEXT} tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}pp`} />
            <YAxis dataKey="variable" type="category" width={160} tick={{ fill: CHART_TEXT, fontSize: 12 }} stroke={CHART_GRID} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt((v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}pp`)} />
            <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
            <Bar dataKey="lowDelta" name="Low (-30%)" fill="#f43f5e" radius={[4, 4, 4, 4]} />
            <Bar dataKey="highDelta" name="High (+30%)" fill="#10b981" radius={[4, 4, 4, 4]} />
            <ReferenceLine x={0} stroke="#94a3b8" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Scenario Detail</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
              <th className="py-2 text-left">Variable</th>
              <th className="py-2 text-right">Low</th>
              <th className="py-2 text-right">Base</th>
              <th className="py-2 text-right">High</th>
              <th className="py-2 text-right">Low Margin</th>
              <th className="py-2 text-right">Base Margin</th>
              <th className="py-2 text-right">High Margin</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.variable} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                <td className="py-2.5 font-medium text-foreground">{s.variable}</td>
                <td className="py-2.5 text-right font-mono text-sm text-muted">{s.lowStr}</td>
                <td className="py-2.5 text-right font-mono text-sm text-accent">{s.baseStr}</td>
                <td className="py-2.5 text-right font-mono text-sm text-muted">{s.highStr}</td>
                <td className={`py-2.5 text-right font-mono ${s.lowMargin < 0 ? "text-d-red" : "text-d-green"}`}>{fmtPercent(s.lowMargin)}</td>
                <td className={`py-2.5 text-right font-mono ${s.baseMargin < 0 ? "text-d-red" : "text-d-green"}`}>{fmtPercent(s.baseMargin)}</td>
                <td className={`py-2.5 text-right font-mono ${s.highMargin < 0 ? "text-d-red" : "text-d-green"}`}>{fmtPercent(s.highMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
