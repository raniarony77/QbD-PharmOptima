import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisRequest, ExperimentalRun, AnalysisResult, ResponseAnalysis } from "../types";

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
        throw new Error("API Key is missing. Please check your configuration.");
    }
    return new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });
};

export interface MixtureRow {
  [key: string]: number;
}

// 1. Helper function to validate and normalize mixture design sums programmatically
export function validateAndNormalizeMixtureDesign(
  matrix: MixtureRow[],
  lowerBounds?: Record<string, number>,
  upperBounds?: Record<string, number>,
  targetSum: number = 1.0 // Accepts 1.0 or 100
): MixtureRow[] {
  if (!Array.isArray(matrix) || matrix.length === 0) return matrix;

  return matrix.map((row) => {
    const normalizedRow: MixtureRow = { ...row };
    const keys = Object.keys(row).filter((k) => typeof row[k] === 'number');

    // Step A: Clamp non-negative values and apply boundary constraints FIRST
    keys.forEach((k) => {
      let val = Math.max(0, normalizedRow[k]); // Clamp negative values to zero
      if (lowerBounds && lowerBounds[k] !== undefined) {
        val = Math.max(val, lowerBounds[k]);
      }
      if (upperBounds && upperBounds[k] !== undefined) {
        val = Math.min(val, upperBounds[k]);
      }
      normalizedRow[k] = val;
    });

    // Step B: Compute current row sum
    let currentSum = keys.reduce((acc, k) => acc + normalizedRow[k], 0);

    // Step C: Handle zero sum edge-case (equal distribution across factors)
    if (currentSum === 0) {
      const equalShare = targetSum / keys.length;
      keys.forEach((k) => (normalizedRow[k] = equalShare));
      currentSum = targetSum;
    }

    // Step D: Normalize components proportionally to achieve exact target sum
    keys.forEach((k) => {
      normalizedRow[k] = Number(((normalizedRow[k] / currentSum) * targetSum).toFixed(4));
    });

    return normalizedRow;
  });
}

// 2. Minimum degrees of freedom / run requirements helper
export function validateMinimumRuns(
  designType: string,
  numFactors: number,
  validRunsCount: number
): { isValid: boolean; minRequired: number } {
  let minRequired = 3; // Default fallback
  const normalizedType = designType?.toLowerCase().trim() || '';

  if (normalizedType.includes('box-behnken')) {
    minRequired = 12;
  } else if (
    normalizedType.includes('central composite') ||
    normalizedType.includes('rsm d-optimal') ||
    normalizedType.includes('d-optimal')
  ) {
    minRequired = 1 + 2 * numFactors + (numFactors * (numFactors - 1)) / 2 + 1;
  } else if (
    normalizedType.includes('mixture') ||
    normalizedType.includes('simplex')
  ) {
    minRequired = numFactors + (numFactors * (numFactors - 1)) / 2;
  } else {
    minRequired = Math.max(3, numFactors + 1);
  }

  return {
    isValid: validRunsCount >= minRequired,
    minRequired
  };
}

// 3. Primary design matrix generator function
export const generateDesignMatrix = async (
  request: AnalysisRequest,
  designName: string
): Promise<ExperimentalRun[]> => {
  try {
    const ai = getClient();
    const factorDesc = request.factors
      .map((f) => `${f.name} (${f.levels} levels: ${f.low} to ${f.high})`)
      .join(', ');
    const isMixture =
      designName.toLowerCase().includes('mixture') ||
      designName.toLowerCase().includes('simplex');

    const prompt = `
Generate a professional Design of Experiments (DoE) matrix for a "${designName}".
Factors: ${factorDesc}.
STRICT CONFIGURATION:
- Design Replicates: ${request.replicates}
- Center Points: ${request.centerPoints}
${isMixture ? 'CRITICAL: Component sum must be exactly 100 for every run.' : ''}
Return STRICTLY JSON: array of {id, factors: {name: value}}.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        seed: 42
      }
    });

    const text = response.text || '[]';
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let runs = JSON.parse(jsonStr);

    // Validate minimum run count requirements
    if (Array.isArray(runs)) {
      const validation = validateMinimumRuns(
        designName,
        request.factors.length,
        runs.length
      );
      if (!validation.isValid) {
        console.warn(
          `Generated runs (${runs.length}) are less than minimum required (${validation.minRequired}) for ${designName}.`
        );
      }
    }

    // Apply Mixture Normalization & Boundary Clamping
    if (isMixture && Array.isArray(runs)) {
      const matrixRows = runs.map((r: any) => r.factors);
      const lowerBounds: Record<string, number> = {};
      const upperBounds: Record<string, number> = {};

      request.factors.forEach((f) => {
        lowerBounds[f.name] = parseFloat(f.low) || 0;
        upperBounds[f.name] = parseFloat(f.high) || 0;
      });

      const sumHigh = request.factors.reduce(
        (acc, f) => acc + (parseFloat(f.high) || 0),
        0
      );
      const targetSum = sumHigh > 2 ? 100 : 1.0;

      const normalizedRows = validateAndNormalizeMixtureDesign(
        matrixRows,
        lowerBounds,
        upperBounds,
        targetSum
      );

      runs = runs.map((r: any, idx: number) => ({
        ...r,
        factors: normalizedRows[idx] || r.factors
      }));
    }

    return runs.map((r: any) => ({
      id: r.id,
      factors: r.factors,
      results: {}
    }));
  } catch (e) {
    console.error('Design Matrix Error', e);
    return [];
  }
};

const analyzeSingleResponse = async (
    designName: string,
    responseName: string,
    factorData: any[],
    responseData: any[]
): Promise<ResponseAnalysis> => {
    const ai = getClient();
    const dataStr = JSON.stringify(factorData.map((f, i) => ({ ...f, [responseName]: responseData[i] })));

    const prompt = `
    Scientific Statistical Analysis for "${responseName}" using the ${designName} design.
    Experimental Data: ${dataStr}.

    STRICT STATISTICAL & MATHEMATICAL REQUIREMENTS:
    1. MODEL SELECTION: Calculate a Quadratic Response Surface Model. You MAY omit 1 or 2 insignificant terms (p > 0.10) if it improves the overall model fit and Predicted R-Squared.
    2. RESPONSE TRANSFORMATION: If the data shows non-constant variance or poor fit, you MAY apply a power transformation to the response (e.g., Sqrt(Y), Log(Y), 1/Y). If you do, the returned "equation" and "predicted" values MUST reflect this transformation.
    3. MATHEMATICAL INTEGRITY: The coefficients MUST be derived from the provided Experimental Data. No hallucinations.
    4. EXACT FIT & CORRELATION: The resulting equation MUST accurately correlate the factor values with their corresponding responses. Verification is mandatory: plugging factor values into your equation MUST yield the "predicted" values you return.
    5. ANALYSIS WORKFLOW:
       You are an expert Quality by Design (QbD) statistical engine. Perform a rigorous Ordinary Least Squares (OLS) regression and ANOVA analysis on the provided dataset.

       STEP 1: RAW MODEL FIT (UNCONSTRAINED)
       1. Fit the full initial model (Linear, 2FI, or Quadratic) directly to the user's raw dataset.
       2. Calculate and record the TRUE initial statistics without imposing targets:
          - Initial R², Adjusted R², Predicted R²
          - Initial Model p-value and Adequate Precision
          - ANOVA table and regression coefficients

       STEP 2: DIAGNOSTIC EVALUATION & CONDITIONAL REMEDIATION
       Evaluate the initial fit against standard QbD adequacy thresholds (p < 0.05, R² > 0.80, Adequate Precision > 4.0):

       - IF THE INITIAL FIT MEETS THRESHOLDS:
         Accept the initial model as final.

       - IF THE INITIAL FIT FALLS BELOW THRESHOLDS:
         Execute model remediation protocols in sequence and evaluate if metrics improve:
         a) Model Reduction: Perform backward elimination to remove non-significant terms (p > 0.0.5) while preserving model hierarchy. Re-evaluate ANOVA.
         b) Power Transformation: Test standard Box-Cox transformations on response Y (e.g., Log10, Square Root, Inverse). Re-evaluate ANOVA.

       STEP 3: FINAL REPORTING
       1. State clearly whether the initial raw model was adequate or required remediation.
       2. If remediation was performed, explicitly detail what changed (e.g., "Term X1*X2 removed due to p = 0.42; Log10 transformation applied").
       3. Output the final, verified ANOVA table, regression equation, and goodness-of-fit metrics.
    6. DETERMINISM: For the exact same data, always return the exact same coefficients.
    7. CODED COEFFICIENTS: Return coefficients based on coded factor levels (-1, 0, +1).
    8. DIAGNOSTICS: 
       - Generate 30 points for Box-Cox ln(RSS) curve across lambda -2 to +2.
       - Provide EXACT values for: lambda_best, lambda_low (95% CI), lambda_high (95% CI), and ci_limit.
       - Provide professional interpretations for: Predicted vs Actual, Residuals vs Run, and Box-Cox plots.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
            seed: 42,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    anova_markdown: { type: Type.STRING },
                    fit_statistics: {
                        type: Type.OBJECT,
                        properties: {
                            r_squared: { type: Type.NUMBER },
                            adj_r_squared: { type: Type.NUMBER },
                            predicted_r_squared: { type: Type.NUMBER },
                            adequate_precision: { type: Type.NUMBER },
                            equation: { type: Type.STRING },
                        }
                    },
                    diagnostic_interpretations: {
                        type: Type.OBJECT,
                        properties: {
                            pred_vs_actual: { type: Type.STRING },
                            residuals_vs_run: { type: Type.STRING },
                            box_cox: { type: Type.STRING }
                        }
                    },
                    model_coefficients: {
                        type: Type.OBJECT,
                        properties: {
                            intercept: { type: Type.NUMBER },
                            linear_terms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { factor: { type: Type.STRING }, coef: { type: Type.NUMBER } } } },
                            quadratic_terms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { factor: { type: Type.STRING }, coef: { type: Type.NUMBER } } } },
                            interaction_terms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { factor1: { type: Type.STRING }, factor2: { type: Type.STRING }, coef: { type: Type.NUMBER } } } }
                        }
                    },
                    diagnostics: {
                        type: Type.OBJECT,
                        properties: {
                            run_order: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            actual: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            predicted: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            residuals: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            box_cox: {
                                type: Type.OBJECT,
                                properties: {
                                    lambda: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                    ln_rss: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                    ci_limit: { type: Type.NUMBER },
                                    lambda_best: { type: Type.NUMBER },
                                    lambda_low: { type: Type.NUMBER },
                                    lambda_high: { type: Type.NUMBER }
                                }
                            }
                        }
                    },
                    transformation: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['none', 'sqrt', 'log', 'inverse', 'inverse_sqrt'] },
                            lambda: { type: Type.NUMBER }
                        }
                    }
                }
            }
        }
    });

    const json = JSON.parse(response.text || "{}");
    const linear: Record<string, number> = {};
    json.model_coefficients?.linear_terms?.forEach((t: any) => linear[t.factor] = t.coef);
    const quadratic: Record<string, number> = {};
    json.model_coefficients?.quadratic_terms?.forEach((t: any) => quadratic[t.factor] = t.coef);
    const interactions = json.model_coefficients?.interaction_terms?.map((t: any) => ({
        factor1: t.factor1, factor2: t.factor2, coefficient: t.coef
    })) || [];

    return {
        responseName,
        anovaText: json.anova_markdown || "",
        fitStatistics: {
            rSquared: json.fit_statistics?.r_squared || 0,
            adjRSquared: json.fit_statistics?.adj_r_squared || 0,
            predictedRSquared: json.fit_statistics?.predicted_r_squared || 0,
            adequatePrecision: json.fit_statistics?.adequate_precision || 0,
            equation: json.fit_statistics?.equation || ""
        },
        diagnosticInterpretations: {
            predVsActual: json.diagnostic_interpretations?.pred_vs_actual || "",
            residualsVsRun: json.diagnostic_interpretations?.residuals_vs_run || "",
            predVsRun: "",
            boxCox: json.diagnostic_interpretations?.box_cox || ""
        },
        modelCoefficients: {
            intercept: json.model_coefficients?.intercept || 0,
            linear, quadratic, interactions
        },
        diagnostics: {
            runOrder: json.diagnostics?.run_order || [],
            actual: json.diagnostics?.actual || [],
            predicted: json.diagnostics?.predicted || [],
            residuals: json.diagnostics?.residuals || [],
            boxCox: json.diagnostics?.box_cox ? {
                lambda: json.diagnostics.box_cox.lambda,
                lnRSS: json.diagnostics.box_cox.ln_rss,
                ciLimit: json.diagnostics.box_cox.ci_limit,
                lambdaBest: json.diagnostics.box_cox.lambda_best,
                lambdaLow: json.diagnostics.box_cox.lambda_low,
                lambdaHigh: json.diagnostics.box_cox.lambda_high
            } : undefined
        },
        transformation: json.transformation
    };
};

export const analyzeExperimentalResults = async (request: AnalysisRequest, designName: string, runs: ExperimentalRun[]): Promise<AnalysisResult> => {
    // Filter out incomplete runs
    const validRuns = runs.filter(r => 
        Object.keys(r.results).length > 0 && 
        Object.values(r.results).every(v => v !== "" && !isNaN(parseFloat(v)))
    );

    const validation = validateDoEDegreesOfFreedom(designName, request.factors.length, validRuns.length);
    if (!validation.isValid) {
        throw new Error(
            validation.errorMessage || `Insufficient experimental data: ${designName} requires a minimum of ${validation.minRequiredRuns} valid runs to satisfy model degrees of freedom, but only ${validRuns.length} were provided.`
        );
    }

    const factorData = validRuns.map(r => r.factors);
    const analysisPromises = request.responses.map(res => {
        const responseValues = validRuns.map(r => parseFloat(r.results[res.name]));
        return analyzeSingleResponse(designName, res.name, factorData, responseValues);
    });

    const results = await Promise.all(analysisPromises);
    const resultsByResponse: Record<string, ResponseAnalysis> = {};
    results.forEach(r => resultsByResponse[r.responseName] = r);
    
    return { resultsByResponse };
};







// --- PASTE THIS AT THE VERY BOTTOM OF THE FILE ---

export interface ValidationResult {
  isValid: boolean;
  minRequiredRuns: number;
  residualDoF: number;
  designType: string;
  errorMessage?: string;
}

export function validateDoEDegreesOfFreedom(
  rawDesignType: string,
  factorCount: number,
  actualRunCount: number,
  replicateCount: number = 0
): ValidationResult {
  const design = rawDesignType.toLowerCase().trim();
  const k = factorCount;
  
  let p = k + 1; 

  if (design.includes('box-behnken') || design.includes('central composite') || design.includes('quadratic')) {
    p = 1 + 2 * k + (k * (k - 1)) / 2;
  } else if (design.includes('mixture') || design.includes('simplex')) {
    p = k + (k * (k - 1)) / 2;
  } else if (design.includes('factorial') || design.includes('2fi')) {
    p = 1 + k + (k * (k - 1)) / 2;
  }

  const minRequiredRuns = p + 3;
  const residualDoF = actualRunCount - p;

  if (actualRunCount < minRequiredRuns) {
    return {
      isValid: false,
      minRequiredRuns,
      residualDoF,
      designType: rawDesignType,
      errorMessage: `Insufficient experimental runs (${actualRunCount}). For a ${rawDesignType} with ${k} factors, at least ${p} runs are required to estimate model terms, plus at least 3 residual degrees of freedom for ANOVA error estimation (Minimum required = ${minRequiredRuns} runs).`
    };
  }

  return {
    isValid: true,
    minRequiredRuns,
    residualDoF,
    designType: rawDesignType
  };
}

// ==========================================
// ZETA POTENTIAL TRANSFORM UTILITIES
// ==========================================

export interface ZetaTransformResult {
  transformedValues: number[];
  wasZeroPresent: boolean;
  epsilonUsed: number;
}

/**
 * 1. Forward Transformation: Log(|ZP| + epsilon)
 * Handles negative zeta potential values and prevents log(0) undefined errors.
 */
export function transformZetaPotential(
  rawZPValues: number[],
  epsilon: number = 0.0001
): ZetaTransformResult {
  let wasZeroPresent = false;

  const transformedValues = rawZPValues.map((zp) => {
    // Take absolute magnitude (ignores negative surface charge polarity)
    const magnitude = Math.abs(zp);

    // Track if near-zero values at isoelectric point are present
    if (magnitude < epsilon) {
      wasZeroPresent = true;
    }

    // Apply natural log with continuity offset
    return Math.log(magnitude + epsilon);
  });

  return {
    transformedValues,
    wasZeroPresent,
    epsilonUsed: epsilon
  };
}

/**
 * 2. Inverse Transformation: exp(y_pred) - epsilon
 * Restores predicted model outputs back to real-space absolute magnitude |ZP| (in mV).
 */
export function inverseTransformZetaPotential(
  predictedLogValue: number,
  epsilon: number = 0.0001
): number {
  const magnitude = Math.exp(predictedLogValue) - epsilon;
  
  // Ensure non-negative output for absolute magnitude
  return Math.max(0, Number(magnitude.toFixed(4)));
}
