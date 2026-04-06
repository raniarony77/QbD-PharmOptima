export enum ExperimentGoal {
  SCREENING = 'Screening',
  OPTIMIZATION = 'Optimization',
}

export enum FormFactor {
  PROCESS_OR_INDEPENDENT = 'Process/Independent Factors',
  MIXTURE = 'Mixture (Sum to 100%)',
}

export enum DeliverySystem {
  LIPOSOMES = 'Liposomes / Delicate Structures',
  LIPID_NANOCAPSULES = 'Lipid Nanocapsules (LNC)',
  EMULSIONS = 'Emulsions',
  MICROEMULSIONS = 'Microemulsions',
  TABLETS_SOLIDS = 'Tablets / Solid Dosage Forms',
  GENERIC_ROBUST = 'Generic / Robust System',
  GENERIC_IRREGULAR = 'Irregular Experimental Domain',
}

export interface DesignRecommendation {
  name: string;
  acronym: string;
  reasoning: string;
  sourceReference: string;
  suitability: string[];
  caveats: string[];
  designFormula: string; // Equation used for calculating runs
}

export interface FactorDefinition {
  name: string;
  unit?: string;
  low: string;
  high: string;
  levels: number; // Number of levels
}

export interface ResponseDefinition {
  name: string;
  unit: string;
  goal: 'Maximize' | 'Minimize' | 'Target';
}

export interface AnalysisRequest {
  system: DeliverySystem;
  goal: ExperimentGoal;
  factors: FactorDefinition[]; 
  responses: ResponseDefinition[];
  replicates: number;
  centerPoints: number;
}

export interface ExperimentalRun {
    id: number;
    factors: Record<string, number>; // Factor Name -> Value
    results: Record<string, string>; // Response Name -> Value (String to handle input state)
}

export interface ModelCoefficients {
    intercept: number;
    linear: Record<string, number>;
    quadratic: Record<string, number>;
    interactions: Array<{ factor1: string; factor2: string; coefficient: number }>;
}

export interface FitStatistics {
    rSquared: number;
    adjRSquared: number;
    predictedRSquared: number; // k-fold / PRESS based
    adequatePrecision: number;
    equation: string; // Clean text string
}

export interface Diagnostics {
    runOrder: number[];
    actual: number[];
    predicted: number[];
    residuals: number[];
    boxCox?: {
        lambda: number[];
        lnRSS: number[]; 
        ciLimit?: number; // Threshold line for 95% Confidence Interval
        lambdaBest?: number;
        lambdaLow?: number; // Lower 95% CI limit
        lambdaHigh?: number; // Upper 95% CI limit
    };
}

export interface DiagnosticInterpretations {
    predVsActual: string;
    residualsVsRun: string;
    predVsRun: string;
    boxCox: string;
}

// Single Response Analysis
export interface ResponseAnalysis {
    responseName: string;
    anovaText: string;
    fitStatistics: FitStatistics;
    modelCoefficients: ModelCoefficients;
    diagnostics: Diagnostics;
    diagnosticInterpretations: DiagnosticInterpretations;
    transformation?: {
        type: 'none' | 'sqrt' | 'log' | 'inverse' | 'inverse_sqrt';
        lambda: number;
    };
}

// Aggregated Result
export interface AnalysisResult {
    resultsByResponse: Record<string, ResponseAnalysis>;
}