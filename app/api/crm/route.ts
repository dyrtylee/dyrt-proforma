import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Read-only: pulls baseline data from the CRM Supabase
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      totalWon: 0, totalMrr: 0, totalPipeline: 0, pipelineMrr: 0,
      wonByVertical: {}, pipelineByStage: {}, pipelineByVertical: {},
      error: "CRM not connected — set CRM_SUPABASE_URL and CRM_SUPABASE_ANON_KEY",
    });
  }

  const { data: wonDeals } = await supabase
    .from("sales_pipeline")
    .select("id, company_name, mrr, types, location, avg_units_per_week, metadata")
    .eq("stage", "closed_won")
    .is("deleted_at", null);

  const { data: pipelineDeals } = await supabase
    .from("sales_pipeline")
    .select("id, company_name, mrr, types, stage, lead_score, metadata")
    .not("stage", "in", '("closed_won","closed_lost","churned")')
    .is("deleted_at", null);

  function classifyVertical(deal: { company_name: string; types: string[] | null }): string {
    const name = deal.company_name.toLowerCase();

    if (name.includes("marriott") || name.includes("hilton") || name.includes("ihg") ||
        name.includes("hotel") || name.includes("westin") || name.includes("indigo") ||
        name.includes("resort")) return "hospitality";
    if (name.includes("sprouts") || name.includes("costco") || name.includes("kroger") ||
        name.includes("grocery") || name.includes("whole foods") || name.includes("trader") ||
        name.includes("albertson") || name.includes("market")) return "grocery";
    if (name.includes("arena") || name.includes("stadium") || name.includes("aeg") ||
        name.includes("intuit dome") || name.includes("honda center") || name.includes("crypto.com") ||
        name.includes("theater") || name.includes("la live") || name.includes("convention")) return "venues";
    if (name.includes("golf") || name.includes("country club") || name.includes("troon")) return "golf";
    if (name.includes("university") || name.includes("college") || name.includes("hospital") ||
        name.includes("medical") || name.includes("campus")) return "institutional";
    if (name.includes("chipotle") || name.includes("starbucks") || name.includes("panera") ||
        name.includes("kitchen")) return "qsr";
    if (name.includes("disney") || name.includes("hbo") || name.includes("studio")) return "venues";
    return "smb";
  }

  const wonByVertical: Record<string, { count: number; mrr: number; companies: string[] }> = {};
  for (const deal of wonDeals ?? []) {
    const v = classifyVertical(deal);
    if (!wonByVertical[v]) wonByVertical[v] = { count: 0, mrr: 0, companies: [] };
    wonByVertical[v].count++;
    wonByVertical[v].mrr += deal.mrr ?? 0;
    wonByVertical[v].companies.push(deal.company_name);
  }

  const pipelineByStage: Record<string, { count: number; mrr: number }> = {};
  for (const deal of pipelineDeals ?? []) {
    if (!pipelineByStage[deal.stage]) pipelineByStage[deal.stage] = { count: 0, mrr: 0 };
    pipelineByStage[deal.stage].count++;
    pipelineByStage[deal.stage].mrr += deal.mrr ?? 0;
  }

  const pipelineByVertical: Record<string, { count: number; mrr: number }> = {};
  for (const deal of pipelineDeals ?? []) {
    const v = classifyVertical(deal);
    if (!pipelineByVertical[v]) pipelineByVertical[v] = { count: 0, mrr: 0 };
    pipelineByVertical[v].count++;
    pipelineByVertical[v].mrr += deal.mrr ?? 0;
  }

  return NextResponse.json({
    totalWon: wonDeals?.length ?? 0,
    totalMrr: wonDeals?.reduce((s, d) => s + (d.mrr ?? 0), 0) ?? 0,
    totalPipeline: pipelineDeals?.length ?? 0,
    pipelineMrr: pipelineDeals?.reduce((s, d) => s + (d.mrr ?? 0), 0) ?? 0,
    wonByVertical,
    pipelineByStage,
    pipelineByVertical,
  });
}
