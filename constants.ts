
import { DeliverySystem, DesignRecommendation, ExperimentGoal, FormFactor } from './types';

const SOURCE_CITATION = "Hathout, R.M. (2022). Teaching Principles of DoE as an Element of QbD for Pharmacy Students. In: Saharan, V.A. (eds) Computer Aided Pharmaceutics and Drug Delivery. Springer, Singapore. https://doi.org/10.1007/978-981-16-5180-9_5 AND Hathout, R.M., Saharan, V.A. (2022). Computer-Aided Formulation Development. In: Saharan, V.A. (eds) Computer Aided Pharmaceutics and Drug Delivery. Springer, Singapore. https://doi.org/10.1007/978-981-16-5180-9_3";

export const RECOMMENDATIONS: Record<string, DesignRecommendation> = {
  // Screening Designs
  TAGUCHI: {
    name: "Taguchi Design",
    acronym: "Taguchi",
    reasoning: "Used for screening main effects with minimum experiments. Derived from Japanese engineering principles for robust design.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Screening phase", "Minimizing experimental runs"],
    caveats: ["Low resolution", "Ignores interactions", "Criticized for being inefficient"],
    designFormula: "N = L^k (Typically using L-arrays like L8, L9, L12 depending on factor count)"
  },
  PLACKETT_BURMAN: {
    name: "Plackett-Burman Design",
    acronym: "PBD",
    reasoning: "Efficient for identifying most influential factors out of a large number (saturated design). Identifies main effects only.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Screening huge number of factors", "Initial stages of QbD"],
    caveats: ["confounding effects", "No center points typically"],
    designFormula: "N = k + 1 (where N is a multiple of 4, typically N=12, 20, 24)"
  },
  FULL_FACTORIAL: {
    name: "Full Factorial Design",
    acronym: "FFD",
    reasoning: "Considers all possible combinations. Best for detailed understanding when factor count is low (2-3).",
    sourceReference: SOURCE_CITATION,
    suitability: ["Screening small number of factors", "Studying interactions detailedly", "Emulsion Stability"],
    caveats: ["Run number increases exponentially with factors"],
    designFormula: "N = 2^k + Cp (for 2-level designs)"
  },

  // Optimization - Surface
  CENTRAL_COMPOSITE: {
    name: "Central Composite Design",
    acronym: "CCD",
    reasoning: "Highly accurate and robust. Good for stable systems where widening the experimental space (alpha points) is acceptable.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Robust formulations (Tablets)", "Nanoemulsions"],
    caveats: ["Unsuitable for delicate systems (Liposomes) due to extreme conditions (alpha points)"],
    designFormula: "N = 2^k + 2k + Cp (where 2^k = factorial points, 2k = axial/star points, Cp = center points)"
  },
  BOX_BEHNKEN: {
    name: "Box-Behnken Design",
    acronym: "BBD",
    reasoning: "Avoids corner points and extreme conditions. Specifically recommended for delicate structures like liposomes or proteins that might denature/degrade at extremes.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Liposomes", "Proteins", "Delicate systems", "SMEDDS"],
    caveats: ["Less coverage of the corners of design space"],
    designFormula: "N = 2k(k-1) + Cp"
  },
  D_OPTIMAL_SURFACE: {
    name: "D-Optimal Design",
    acronym: "DOD",
    reasoning: "Computer-generated design for irregular domains or when constraints exist. Maximizes the information matrix determinant.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Irregular experimental regions", "Qualitative factors", "Emulsion Viscosity/Conductivity"],
    caveats: ["Requires computer algorithm", "Asymmetrical"],
    designFormula: "N = Computer-optimized to maximize |X'X| (det. of info matrix)"
  },

  // Optimization - Mixture
  SIMPLEX_LATTICE: {
    name: "Simplex Lattice Design",
    acronym: "SLD",
    reasoning: "Standard design for mixture problems where components sum to 100% and domain is a regular triangle/simplex.",
    sourceReference: SOURCE_CITATION,
    suitability: ["Microemulsions (Triangular domain)", "Simple mixtures"],
    caveats: ["Not for irregular domains"],
    designFormula: "N = (k+m-1)! / [m!(k-1)!] (where m is the degree, usually m=2 or 3)"
  },
  D_OPTIMAL_MIXTURE: {
    name: "D-Optimal Mixture Design",
    acronym: "D-Opt Mix",
    reasoning: "Essential when constraints on components create an irregular feasibility domain (not a perfect triangle).",
    sourceReference: SOURCE_CITATION,
    suitability: ["Lipid Nanocapsules (LNC)", "Constrained mixtures"],
    caveats: ["Requires software generation"],
    designFormula: "N = Optimized to maximize D-efficiency over the constrained mixture domain"
  }
};

export const FISHBONE_CATEGORIES = [
  "Material Attributes",
  "Process Parameters"
];
