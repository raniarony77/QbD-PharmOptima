import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisRequest, ExperimentalRun, AnalysisResult, ResponseAnalysis } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        throw new Error("API Key is missing. Please check your configuration.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateDesignMatrix = async (request: AnalysisRequest, designName: string): Promise<ExperimentalRun[]> => {
    try {
        const ai = getClient();
        const factorDesc = request.factors.map(f => `${f.name} (${f.levels} levels: ${f.low} to ${f.high})`).join(', ');
        const isMixture = designName.toLowerCase().includes('mixture') || designName.toLowerCase().includes('simplex');
        
        const prompt = `
        Generate a professional Design of Experiments (DoE) matrix for a "${designName}".
        Factors: ${factorDesc}.
        STRICT CONFIGURATION:
        - Design Replicates: ${request.replicates}
        - Center Points: ${request.centerPoints}
        ${isMixture ? "CRITICAL: Component sum must be exactly 100 for every run." : ""}
        Return STRICTLY JSON: array of {id, factors: {name: value}}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        const text = response.text || "[]";
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let runs = JSON.parse(jsonStr);
        
        return runs.map((r: any) => ({
            id: r.id,
            factors: r.factors,
            results: {} 
        }));
    } catch (e) {
        console.error("Design Matrix Error", e);
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
    5. QUALITY TARGETS:
       - R-Squared and Adjusted R-Squared MUST be ABOVE 0.90.
       - Predicted R-Squared MUST be ABOVE 0.80.
       - Adequate Precision MUST be ABOVE 4.0.
       - The model p-value MUST be < 0.05.
    6. DETERMINISM: For the exact same data, always return the exact same coefficients.
    7. CODED COEFFICIENTS: Return coefficients based on coded factor levels (-1, 0, +1).
    8. DIAGNOSTICS: 
       - Generate 30 points for Box-Cox ln(RSS) curve across lambda -2 to +2.
       - Provide EXACT values for: lambda_best, lambda_low (95% CI), lambda_high (95% CI), and ci_limit.
       - Provide professional interpretations for: Predicted vs Actual, Residuals vs Run, and Box-Cox plots.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Use pro for higher mathematical precision
        contents: prompt,
        config: {
            seed: 42, // Enforce deterministic output
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

    if (validRuns.length < 3) {
        throw new Error("Insufficient data points. Please provide at least 3 completed experimental runs.");
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