"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, DollarSign, MapPin, Settings2, ChevronDown, ChevronUp,
  Factory, Target, BarChart3, Layers,
} from "lucide-react";
import {
  type Assumptions, type ModelOutput, type VerticalPenetration,
  DEFAULT_ASSUMPTIONS, VERTICAL_LABELS, VERTICAL_COLORS, VERTICAL_TAM,
  VERTICAL_AVG_WASTE, runModel,
} from "@/lib/ramp-model";

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ── CRM Baseline types ──────────────────────────────────────────────────

interface CrmBaseline {
  totalWon: number;
  totalMrr: number;
  totalPipeline: number;
  pipelineMrr: number;
  wonByVertical: Record<string, { count: number; mrr: number; companies: string[] }>;
  pipelineByStage: Record<string, { count: number; mrr: number }>;
  pipelineByVertical: Record<string, { count: number; mrr: number }>;
}

// ── Components ──────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step, format: formatFn, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
  format?: (v: number) => string; suffix?: string;
}) {
  const display = formatFn ? formatFn(value) : `${value}${suffix ?? ""}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs font-semibold text-gray-900">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
      />
    </div>
  );
}

function VerticalInput({ vertical, value, tam, onChange }: {
  vertical: keyof VerticalPenetration; value: number; tam: number;
  onChange: (v: number) => void;
}) {
  const penetrationPct = tam > 0 ? (value / tam * 100).toFixed(1) : "—";
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: VERTICAL_COLORS[vertical] }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-gray-700 truncate">
            {VERTICAL_LABELS[vertical]}
          </span>
          <span className="text-xs text-gray-500 ml-2 shrink-0">
            {penetrationPct}% of {fmtNum(tam)}
          </span>
        </div>
        <input
          type="range"
          min={0} max={Math.min(tam, tam > 1000 ? 5000 : tam)}
          step={tam > 1000 ? 10 : 1}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
        />
      </div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-16 shrink-0 rounded border border-gray-300 px-2 py-0.5 text-xs text-right text-gray-900"
      />
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 md:px-6"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold uppercase text-gray-500">{title}</h2>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-4 pb-4 pt-3 md:px-6">{children}</div>}
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-900">
            {typeof p.value === "number" && p.name.toLowerCase().includes("margin")
              ? pct(p.value)
              : typeof p.value === "number" && p.value > 999
                ? fmt(p.value)
                : fmtNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function RampPage() {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [crm, setCrm] = useState<CrmBaseline | null>(null);
  const [crmLoading, setCrmLoading] = useState(true);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    fetch("/api/crm")
      .then(r => r.json())
      .then(d => { setCrm(d); setCrmLoading(false); })
      .catch(() => setCrmLoading(false));
  }, []);

  const updatePenetration = useCallback((v: keyof VerticalPenetration, val: number) => {
    setAssumptions(prev => ({
      ...prev,
      penetration: { ...prev.penetration, [v]: val },
    }));
  }, []);

  const model: ModelOutput = useMemo(() => runModel(assumptions), [assumptions]);
  const last = model.quarters[model.quarters.length - 1];
  const fy2030 = model.annuals[model.annuals.length - 1];
  const totalTarget = Object.values(assumptions.penetration).reduce((s, v) => s + v, 0);

  // Chart data
  const locationChartData = model.quarters.map(q => ({
    quarter: q.quarter,
    ...q.locations,
    total: q.totalLocations,
  }));

  const revenueChartData = model.quarters.map(q => ({
    quarter: q.quarter,
    SaaS: q.saasRev,
    Collection: q.collectionRev,
    Machine: q.machineRev,
    Other: q.otherRev,
  }));

  const plChartData = model.quarters.map(q => ({
    quarter: q.quarter,
    Revenue: q.totalRev,
    "Gross Profit": q.grossProfit,
    EBITDA: q.ebitda,
    "Gross Margin": q.grossMargin,
  }));

  const arrPieData = Object.entries(fy2030.arrByVertical).map(([k, v]) => ({
    name: VERTICAL_LABELS[k as keyof VerticalPenetration],
    value: v,
    color: VERTICAL_COLORS[k as keyof VerticalPenetration],
  })).filter(d => d.value > 0);

  const annualTableData = model.annuals;

  const verticals = Object.keys(assumptions.penetration) as (keyof VerticalPenetration)[];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">
              Series A — Customer Ramp & Pro Forma
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Interactive model linked to CRM pipeline. Adjust assumptions to see projections update in real time.
          </p>
        </div>
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Settings2 size={16} />
          {showAssumptions ? "Hide" : "Show"} Assumptions
        </button>
      </div>

      {/* CRM Baseline Banner */}
      {crm && !crmLoading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Live CRM Baseline</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-blue-700">Closed Won</p>
              <p className="text-lg font-semibold text-blue-900">{crm.totalWon} accounts</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Current MRR</p>
              <p className="text-lg font-semibold text-blue-900">{fmt(crm.totalMrr)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Active Pipeline</p>
              <p className="text-lg font-semibold text-blue-900">{crm.totalPipeline} deals</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Pipeline MRR</p>
              <p className="text-lg font-semibold text-blue-900">{fmt(crm.pipelineMrr)}</p>
            </div>
          </div>
          {Object.keys(crm.wonByVertical).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(crm.wonByVertical).map(([v, d]) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: VERTICAL_COLORS[v as keyof VerticalPenetration] ?? "#6b7280" }}
                  />
                  {VERTICAL_LABELS[v as keyof VerticalPenetration] ?? v}: {d.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard icon={MapPin} label="2030 Locations" value={fmtNum(totalTarget)} sub={`${fmtNum(last.machines)} machines`} />
        <KpiCard icon={DollarSign} label="2030 Revenue" value={fmt(fy2030.revenue)} sub={`${pct(fy2030.grossMargin)} gross margin`} />
        <KpiCard icon={Layers} label="2030 SaaS ARR" value={fmt(fy2030.saasArr)} sub={`$${assumptions.saasPerLocation}/loc/mo`} />
        <KpiCard icon={TrendingUp} label="2030 Total ARR" value={fmt(model.totalArr2030)} sub="SaaS + Machine + Other" />
        <KpiCard icon={BarChart3} label="2030 EBITDA" value={fmt(fy2030.ebitda)} sub={pct(fy2030.ebitda / fy2030.revenue) + " margin"} />
      </div>

      {/* Assumptions Panel */}
      {showAssumptions && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Section title="Pricing & Unit Economics" icon={DollarSign}>
            <div className="space-y-4">
              <SliderInput
                label="SaaS per Location" value={assumptions.saasPerLocation}
                onChange={v => setAssumptions(p => ({ ...p, saasPerLocation: v }))}
                min={200} max={2000} step={50} format={v => `$${v}/mo`}
              />
              <SliderInput
                label="Collection Rate" value={assumptions.collectionRate}
                onChange={v => setAssumptions(p => ({ ...p, collectionRate: v }))}
                min={0.04} max={0.20} step={0.01} format={v => `$${v.toFixed(2)}/lb`}
              />
              <SliderInput
                label="Avg Waste per Location" value={assumptions.avgWasteLbsPerLocation}
                onChange={v => setAssumptions(p => ({ ...p, avgWasteLbsPerLocation: v }))}
                min={1000} max={10000} step={250} format={v => `${fmtNum(v)} lbs/mo`}
              />
              <SliderInput
                label="Machine COGS" value={assumptions.machineCogs}
                onChange={v => setAssumptions(p => ({ ...p, machineCogs: v }))}
                min={500} max={3000} step={100} format={v => `$${fmtNum(v)}/mo`}
              />
              <SliderInput
                label="Contract Mfg Cost" value={assumptions.contractMfgCost}
                onChange={v => setAssumptions(p => ({ ...p, contractMfgCost: v }))}
                min={50000} max={150000} step={5000} format={v => fmt(v)}
              />
              <SliderInput
                label="NM Factory Cost" value={assumptions.factoryCost}
                onChange={v => setAssumptions(p => ({ ...p, factoryCost: v }))}
                min={30000} max={100000} step={5000} format={v => fmt(v)}
              />
              <SliderInput
                label="Machine Utilization (Y1)" value={assumptions.machineUtilY1}
                onChange={v => setAssumptions(p => ({ ...p, machineUtilY1: v }))}
                min={0.3} max={0.9} step={0.05} format={v => pct(v)}
              />
              <SliderInput
                label="Machine Utilization (Y2+)" value={assumptions.machineUtilY2}
                onChange={v => setAssumptions(p => ({ ...p, machineUtilY2: v }))}
                min={0.4} max={0.95} step={0.05} format={v => pct(v)}
              />
              <SliderInput
                label="OpEx Growth (QoQ)" value={assumptions.opexGrowthRate}
                onChange={v => setAssumptions(p => ({ ...p, opexGrowthRate: v }))}
                min={0.02} max={0.15} step={0.01} format={v => pct(v)}
              />
            </div>
          </Section>

          <Section title="2030 Target Locations by Vertical" icon={Target}>
            <div className="space-y-3">
              {verticals.map(v => (
                <VerticalInput
                  key={v}
                  vertical={v}
                  value={assumptions.penetration[v]}
                  tam={VERTICAL_TAM[v]}
                  onChange={val => updatePenetration(v, val)}
                />
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs font-semibold text-gray-700">Total 2030 Target</span>
                <span className="text-sm font-bold text-gray-900">{fmtNum(totalTarget)} locations</span>
              </div>
              <button
                onClick={() => setAssumptions(prev => ({ ...prev, penetration: DEFAULT_ASSUMPTIONS.penetration }))}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset to defaults
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* Location Ramp Chart */}
      <div className="mb-6">
        <Section title="Location Ramp by Vertical" icon={MapPin}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={locationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {verticals.map(v => (
                  <Area
                    key={v}
                    type="monotone"
                    dataKey={v}
                    name={VERTICAL_LABELS[v]}
                    stackId="1"
                    fill={VERTICAL_COLORS[v]}
                    stroke={VERTICAL_COLORS[v]}
                    fillOpacity={0.7}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Revenue by Stream */}
      <div className="mb-6">
        <Section title="Quarterly Revenue by Stream" icon={DollarSign}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="SaaS" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.7} />
                <Area type="monotone" dataKey="Collection" stackId="1" fill="#10b981" stroke="#10b981" fillOpacity={0.7} />
                <Area type="monotone" dataKey="Machine" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.7} />
                <Area type="monotone" dataKey="Other" stackId="1" fill="#6b7280" stroke="#6b7280" fillOpacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* P&L and Margin */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Section title="P&L Trajectory" icon={TrendingUp}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={plChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue" fill="#3b82f6" fillOpacity={0.3} />
                <Line type="monotone" dataKey="Gross Profit" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="EBITDA" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="2030 SaaS ARR by Vertical" icon={Layers}>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arrPieData}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${fmt(value)}`}
                  labelLine={false}
                  fontSize={10}
                >
                  {arrPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Gross Margin Bridge */}
      <div className="mb-6">
        <Section title="Gross Margin Progression" icon={Factory}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={model.quarters.map(q => ({
                quarter: q.quarter,
                "Gross Margin": q.grossMargin,
                "EBITDA Margin": q.ebitdaMargin,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => pct(v)} domain={[-1, 1]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Gross Margin" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="EBITDA Margin" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Annual Summary Table */}
      <div className="mb-6">
        <Section title="Annual Financial Summary" icon={BarChart3}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="pb-2 pr-4">Metric</th>
                  {annualTableData.map(a => (
                    <th key={a.year} className="pb-2 px-3 text-right">{a.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">Revenue</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right font-semibold">{fmt(a.revenue)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">Gross Margin</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right">{pct(a.grossMargin)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">EBITDA</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className={`py-2 px-3 text-right font-semibold ${a.ebitda >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {fmt(a.ebitda)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">Locations</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right">{fmtNum(a.locations)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">Machines</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right">{fmtNum(a.machines)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-gray-900">SaaS ARR</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right font-semibold text-blue-600">{fmt(a.saasArr)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* Vertical ARR Breakdown Table */}
      <div className="mb-6">
        <Section title="SaaS ARR by Vertical (End of Year)" icon={Target} defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="pb-2 pr-4">Vertical</th>
                  {annualTableData.map(a => (
                    <th key={a.year} className="pb-2 px-3 text-right">{a.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {verticals.map(v => (
                  <tr key={v} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VERTICAL_COLORS[v] }} />
                        <span className="font-medium">{VERTICAL_LABELS[v]}</span>
                      </div>
                    </td>
                    {annualTableData.map(a => (
                      <td key={a.year} className="py-2 px-3 text-right">{fmt(a.arrByVertical[v])}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-semibold text-gray-900">Total SaaS ARR</td>
                  {annualTableData.map(a => (
                    <td key={a.year} className="py-2 px-3 text-right font-semibold text-gray-900">{fmt(a.saasArr)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* Machine Economics */}
      <div className="mb-6">
        <Section title="Machine Deployment & Economics" icon={Factory} defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-400">
                  <th className="pb-2 pr-4">Quarter</th>
                  <th className="pb-2 px-3 text-right">Machines</th>
                  <th className="pb-2 px-3 text-right">New</th>
                  <th className="pb-2 px-3 text-right">Build Cost</th>
                  <th className="pb-2 px-3 text-right">Facilities</th>
                  <th className="pb-2 px-3 text-right">Machine Rev</th>
                  <th className="pb-2 px-3 text-right">Machine COGS</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {model.quarters.filter((_, i) => i % 2 === 0 || i === model.quarters.length - 1).map(q => (
                  <tr key={q.quarter} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 font-medium">{q.quarter}</td>
                    <td className="py-1.5 px-3 text-right">{q.machines}</td>
                    <td className="py-1.5 px-3 text-right">{q.newMachines}</td>
                    <td className="py-1.5 px-3 text-right">{fmt(q.buildCost)}</td>
                    <td className="py-1.5 px-3 text-right">{q.facilities}</td>
                    <td className="py-1.5 px-3 text-right">{fmt(q.machineRev)}</td>
                    <td className="py-1.5 px-3 text-right text-red-500">{fmt(q.machines * assumptions.machineCogs * 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* CRM Pipeline Detail */}
      {crm && Object.keys(crm.pipelineByVertical).length > 0 && (
        <div className="mb-6">
          <Section title="CRM Pipeline by Vertical (Live)" icon={Target} defaultOpen={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="pb-2 pr-4">Vertical</th>
                    <th className="pb-2 px-3 text-right">Won</th>
                    <th className="pb-2 px-3 text-right">Won MRR</th>
                    <th className="pb-2 px-3 text-right">Pipeline</th>
                    <th className="pb-2 px-3 text-right">Pipeline MRR</th>
                    <th className="pb-2 px-3 text-right">2030 Target</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {verticals.map(v => {
                    const won = crm.wonByVertical[v];
                    const pipe = crm.pipelineByVertical[v];
                    return (
                      <tr key={v} className="border-b border-gray-50">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VERTICAL_COLORS[v] }} />
                            <span className="font-medium">{VERTICAL_LABELS[v]}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">{won?.count ?? 0}</td>
                        <td className="py-2 px-3 text-right">{fmt(won?.mrr ?? 0)}</td>
                        <td className="py-2 px-3 text-right">{pipe?.count ?? 0}</td>
                        <td className="py-2 px-3 text-right">{fmt(pipe?.mrr ?? 0)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmtNum(assumptions.penetration[v])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      <p className="mb-8 text-center text-xs text-gray-400">
        Dyrt Labs, Inc. — Series A Pro Forma Model — Confidential
      </p>
    </div>
  );
}
