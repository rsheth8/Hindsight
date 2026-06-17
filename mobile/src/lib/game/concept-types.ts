export type ConceptId = "momentum" | "volatility" | "drawdown" | "reversal" | "sizing";

export interface ConceptDef {
  id: ConceptId;
  label: string;
  icon: string;
  blurb: string;
}

export const CONCEPTS: ConceptDef[] = [
  { id: "momentum", label: "Momentum", icon: "📈", blurb: "Reading trend continuation vs. exhaustion." },
  { id: "volatility", label: "Volatility", icon: "⚡", blurb: "Sizing confidence when outcomes swing wide." },
  { id: "drawdown", label: "Drawdowns", icon: "📉", blurb: "Calls after pain — recovery vs. falling knife." },
  { id: "reversal", label: "Reversals", icon: "🔄", blurb: "When the chart and the outcome disagree." },
  { id: "sizing", label: "Conviction sizing", icon: "🎯", blurb: "Matching how sure you are to the evidence." },
];

export type MasteryLevel = "learning" | "building" | "sharp";

export interface ConceptMastery {
  id: ConceptId;
  label: string;
  icon: string;
  blurb: string;
  calls: number;
  score: number;
  level: MasteryLevel;
}
