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
  "#2563eb", "#16a34a", "#dc2626", "#ea580c", "#9333ea",
  "#0891b2", "#ca8a04", "#be185d", "#4f46e5", "#059669",
  "#d97706", "#7c3aed", "#0d9488",
];

const TABS = ["Summary", "CAPEX", "Operations", "Break-Even", "Projections", "Sensitivity"] as const;
type Tab = (typeof TABS)[number];

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Inputs */}
      <aside className="w-96 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 print:hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <h1 className="text-xl font-bold text-gray-900">Dyrt Facility Pro Forma</h1>
          <p className="text-sm text-gray-500 mt-1">Adjust variables below</p>
        </div>
        <div className="px-4 py-3 space-y-1">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group);
            const groupConfigs = inputConfigs.filter((c) => c.group === group);
            return (
              <div key={group} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-gray-700">{group}</span>
                  <span className="text-gray-400 text-xs">{isExpanded ? "−" : "+"}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 py-3 space-y-4">
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
        {/* Tab Navigation */}
        <nav className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="px-8 flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-600">{config.label}</label>
        <span className="text-xs font-mono font-medium text-gray-900">{displayValue}</span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}

// --- KPI Card ---
function KPI({ label, value, sub, color = "blue" }: { label: string; value: string; sub?: string; color?: string }) {
  const borderColor: Record<string, string> = {
    blue: "border-l-blue-600",
    green: "border-l-green-600",
    red: "border-l-red-600",
    orange: "border-l-orange-500",
    purple: "border-l-purple-600",
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor[color] || borderColor.blue} p-4`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// --- Summary Tab ---
function SummaryTab({ result, inputs }: { result: ReturnType<typeof calculateProForma>; inputs: FacilityInputs }) {
  const steadyMonth = result.monthlyProjections.find((p) => p.utilization >= 1.0);
  const year3 = result.monthlyProjections[35];
  const year5 = result.monthlyProjections[Math.min(59, result.monthlyProjections.length - 1)];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Facility Pro Forma Summary</h2>
        <p className="text-gray-500 mt-1">
          {inputs.numComposters} composters | {fmtTons(result.maxDailyCapacityTons)} max daily capacity | Dewaterer at {fmtPercent(inputs.dewateringReduction)} reduction
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total CAPEX" value={fmtCurrency(result.totalCapex)} color="blue" />
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

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs. Operating Costs</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" label={{ value: "Month", position: "bottom", offset: -5 }} />
            <YAxis tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip formatter={fmt(fmtCurrencyFull)} />
            <Legend />
            <Area type="monotone" dataKey="totalRevenue" name="Revenue" fill="#dbeafe" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="totalOpex" name="Operating Costs" stroke="#dc2626" strokeWidth={2} dot={false} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Net Margin Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" label={{ value: "Month", position: "bottom", offset: -5 }} />
            <YAxis tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip formatter={fmt(fmtPercent)} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="netMargin" name="Net Margin" fill="#dcfce7" stroke="#16a34a" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steadyMonth && (
            <div>
              <p className="text-sm font-medium text-gray-500">At Full Capacity (Month {steadyMonth.month})</p>
              <p className="text-lg font-bold">{fmtCurrencyFull(steadyMonth.totalRevenue)}/mo revenue</p>
              <p className="text-sm text-gray-600">{fmtCurrencyFull(steadyMonth.netProfit)}/mo net profit</p>
              <p className="text-sm text-gray-600">{fmtPercent(steadyMonth.netMargin)} margin</p>
            </div>
          )}
          {year3 && (
            <div>
              <p className="text-sm font-medium text-gray-500">Year 3 (Month 36)</p>
              <p className="text-lg font-bold">{fmtCurrencyFull(year3.totalRevenue)}/mo revenue</p>
              <p className="text-sm text-gray-600">{fmtCurrencyFull(year3.netProfit)}/mo net profit</p>
              <p className="text-sm text-gray-600">{fmtCurrencyFull(year3.cumulativeProfit)} cumulative</p>
            </div>
          )}
          {year5 && (
            <div>
              <p className="text-sm font-medium text-gray-500">Year 5 (Month {year5.month})</p>
              <p className="text-lg font-bold">{fmtCurrencyFull(year5.totalRevenue)}/mo revenue</p>
              <p className="text-sm text-gray-600">{fmtCurrencyFull(year5.netProfit)}/mo net profit</p>
              <p className="text-sm text-gray-600">{fmtCurrencyFull(year5.cumulativeProfit)} cumulative</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- CAPEX Tab ---
function CapexTab({ result }: { result: ReturnType<typeof calculateProForma> }) {
  const pieData = Object.entries(result.capexBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Capital Expenditure Breakdown</h2>

      <div className="grid grid-cols-2 gap-4">
        <KPI label="Total CAPEX" value={fmtCurrency(result.totalCapex)} color="blue" />
        <KPI label="Max Daily Capacity" value={fmtTons(result.maxDailyCapacityTons)} sub={`${fmtNumber(result.maxDailyCapacityLbs)} lbs/day`} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CAPEX Distribution</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={140}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmt(fmtCurrencyFull)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500">Item</th>
                <th className="text-right py-2 text-gray-500">Cost</th>
                <th className="text-right py-2 text-gray-500">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.capexBreakdown).map(([name, value]) => (
                <tr key={name} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{name}</td>
                  <td className="py-2 text-right font-mono">{fmtCurrencyFull(value)}</td>
                  <td className="py-2 text-right text-gray-500">{((value / result.totalCapex) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-gray-300">
                <td className="py-2">Total</td>
                <td className="py-2 text-right font-mono">{fmtCurrencyFull(result.totalCapex)}</td>
                <td className="py-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
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
        { name: "Water Removed (Dewaterer)", lbs: steadyMonth.sludgeToDigesterLbs },
        { name: "Dewatered to Composters", lbs: steadyMonth.dewateredLbs },
        { name: "Sawdust Added", lbs: steadyMonth.sawdustNeededLbs },
        { name: "Finished Compost", lbs: steadyMonth.compostProducedLbs },
      ]
    : [];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Operations at Steady State</h2>

      {steadyMonth && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Daily Intake" value={fmtTons(steadyMonth.dailyTonsIn)} sub={`${fmtNumber(steadyMonth.dailyTonsIn * 2000)} lbs/day`} color="blue" />
            <KPI label="Sludge to Digester" value={`${fmtNumber(steadyMonth.sludgeToDigesterLbs / 26)} lbs/day`} sub={fmtPercent(inputs.dewateringReduction) + " of input"} color="orange" />
            <KPI label="Sawdust / Month" value={`${steadyMonth.sawdustNeededCY.toFixed(0)} CY`} sub={fmtCurrencyFull(steadyMonth.sawdustCost) + "/mo"} color="purple" />
            <KPI label="Compost Out" value={`${steadyMonth.compostProducedCY.toFixed(0)} CY/mo`} sub={`${steadyMonth.truckloadsCompost} truckloads`} color="green" />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Material Flow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flowData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K lbs`} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                <Tooltip formatter={fmt((v) => `${fmtNumber(v)} lbs`)} />
                <Bar dataKey="lbs" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cost Breakdown (Steady State)</h3>
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
                        { name: "Truck Operations", value: steadyMonth.truckCost },
                        { name: "Shipping (Compost)", value: steadyMonth.shippingCost },
                        { name: "Other OpEx", value: steadyMonth.otherOpex },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {COLORS.slice(0, 7).map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip formatter={fmt(fmtCurrencyFull)} />
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
                      <tr key={label as string} className="border-b border-gray-100">
                        <td className="py-2">{label as string}</td>
                        <td className="py-2 text-right font-mono">{fmtCurrencyFull(val as number)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold border-t-2 border-gray-300">
                      <td className="py-2">Total Monthly Costs</td>
                      <td className="py-2 text-right font-mono">{fmtCurrencyFull(steadyMonth.totalOpex + steadyMonth.debtService)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Flow</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <FlowBox label="Food Waste In" value={`${fmtNumber(steadyMonth.dailyTonsIn * 2000)} lbs/day`} color="bg-blue-100 border-blue-300" />
              <Arrow />
              <FlowBox label="Dewaterer" value={`${fmtPercent(inputs.dewateringReduction)} reduction`} color="bg-orange-100 border-orange-300" />
              <Arrow />
              <div className="flex flex-col gap-2">
                <FlowBox label="Sludge to Digester" value={`${fmtNumber(steadyMonth.sludgeToDigesterLbs / 26)} lbs/day`} color="bg-red-100 border-red-300" />
                <FlowBox label="Dewatered Solids" value={`${fmtNumber(steadyMonth.dewateredLbs / 26)} lbs/day`} color="bg-green-100 border-green-300" />
              </div>
              <Arrow />
              <FlowBox label={`${inputs.numComposters} Composters`} value={`+ ${fmtNumber(steadyMonth.sawdustNeededLbs / 26)} lbs sawdust/day`} color="bg-amber-100 border-amber-300" />
              <Arrow />
              <FlowBox label="Finished Compost" value={`${(steadyMonth.compostProducedCY / 26).toFixed(0)} CY/day`} color="bg-emerald-100 border-emerald-300" />
              <Arrow />
              <FlowBox label="53' Trailers" value={`${steadyMonth.truckloadsCompost} loads/mo`} color="bg-purple-100 border-purple-300" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlowBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${color} border rounded-lg px-4 py-3 text-center min-w-[140px]`}>
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-600 mt-1">{value}</p>
    </div>
  );
}

function Arrow() {
  return <span className="text-gray-400 text-2xl font-light">&rarr;</span>;
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
    const profit = totalRev - totalCost;

    tonnageSteps.push({
      tonsPerDay: parseFloat(t.toFixed(1)),
      revenue: totalRev,
      totalCost,
      fixedCost: be.monthlyFixedCosts,
      profit,
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Break-Even Analysis</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Break-Even Tonnage"
          value={`${be.breakEvenTonsPerDay.toFixed(1)} tons/day`}
          sub={`${(be.breakEvenTonsPerDay * 26).toFixed(0)} tons/month`}
          color="blue"
        />
        <KPI
          label="Break-Even Utilization"
          value={fmtPercent(be.breakEvenUtilization)}
          sub={`of ${fmtTons(result.maxDailyCapacityTons)} capacity`}
          color={be.breakEvenUtilization <= 1 ? "green" : "red"}
        />
        <KPI label="Revenue per Ton" value={fmtCurrencyFull(be.revenuePerTon)} sub="tipping + compost" color="green" />
        <KPI label="Contribution Margin" value={fmtCurrencyFull(be.contributionMarginPerTon)} sub="per ton" color="purple" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs. Cost by Daily Tonnage</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={tonnageSteps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="tonsPerDay" label={{ value: "Tons / Day", position: "bottom", offset: -5 }} />
            <YAxis tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip formatter={fmt(fmtCurrencyFull)} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="fixedCost" name="Fixed Costs" fill="#fef2f2" stroke="#fca5a5" strokeWidth={1} />
            {be.breakEvenTonsPerDay <= result.maxDailyCapacityTons * 1.2 && (
              <ReferenceLine x={parseFloat(be.breakEvenTonsPerDay.toFixed(1))} stroke="#16a34a" strokeDasharray="5 5" label={{ value: "Break-Even", fill: "#16a34a" }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Unit Economics</h3>
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
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{label}</td>
                <td className="py-2 text-right font-mono font-medium">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Projections Tab ---
function ProjectionsTab({ result }: { result: ReturnType<typeof calculateProForma> }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Monthly Projections</h2>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Profit / Loss (incl. CAPEX)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" label={{ value: "Month", position: "bottom", offset: -5 }} />
            <YAxis tickFormatter={(v: number) => fmtCurrency(v)} />
            <Tooltip formatter={fmt(fmtCurrencyFull)} />
            <ReferenceLine y={0} stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" />
            <Area
              type="monotone"
              dataKey="cumulativeProfit"
              name="Cumulative P&L"
              stroke="#7c3aed"
              fill="#ede9fe"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization & Daily Tonnage Ramp</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={result.monthlyProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => `${v.toFixed(0)}t`} />
            <Tooltip />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="utilization" name="Utilization %" fill="#dbeafe" stroke="#2563eb" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="dailyTonsIn" name="Daily Tons" stroke="#ea580c" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Detail</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 text-left">Month</th>
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
              <tr key={p.month} className={`border-b border-gray-50 ${p.netProfit >= 0 ? "" : "text-red-600"}`}>
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
      </div>
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
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Sensitivity Analysis</h2>
      <p className="text-gray-500">How steady-state net margin changes with +/- 30% swings in key variables.</p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin Impact (percentage points)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={tornadoData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}pp`} />
            <YAxis dataKey="variable" type="category" width={160} tick={{ fontSize: 12 }} />
            <Tooltip formatter={fmt((v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}pp`)} />
            <Legend />
            <Bar dataKey="lowDelta" name="Low Scenario (-30%)" fill="#ef4444" />
            <Bar dataKey="highDelta" name="High Scenario (+30%)" fill="#22c55e" />
            <ReferenceLine x={0} stroke="#374151" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Detail</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
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
              <tr key={s.variable} className="border-b border-gray-100">
                <td className="py-2 font-medium">{s.variable}</td>
                <td className="py-2 text-right font-mono text-sm">{s.lowStr}</td>
                <td className="py-2 text-right font-mono text-sm">{s.baseStr}</td>
                <td className="py-2 text-right font-mono text-sm">{s.highStr}</td>
                <td className={`py-2 text-right font-mono ${s.lowMargin < 0 ? "text-red-600" : "text-green-600"}`}>{fmtPercent(s.lowMargin)}</td>
                <td className={`py-2 text-right font-mono ${s.baseMargin < 0 ? "text-red-600" : "text-green-600"}`}>{fmtPercent(s.baseMargin)}</td>
                <td className={`py-2 text-right font-mono ${s.highMargin < 0 ? "text-red-600" : "text-green-600"}`}>{fmtPercent(s.highMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
