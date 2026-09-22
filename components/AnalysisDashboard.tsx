import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnalysisResult, FactorDefinition, ResponseDefinition, ResponseAnalysis, ExperimentalRun } from '../types';
import ReactMarkdown from 'react-markdown';
import { LayoutDashboard, Activity, Calculator, Play, Sigma, Trophy, Search, MousePointer2, Info, Maximize2, Download, Table, BarChart3 } from 'lucide-react';

declare global {
    interface Window {
        Plotly: any;
    }
}

interface AnalysisDashboardProps {
    results: AnalysisResult;
    factors: FactorDefinition[];
    responses: ResponseDefinition[];
    isMixture?: boolean;
    runs?: ExperimentalRun[];
}

interface OptResult {
    factors: Record<string, number>;
    prediction: number;
    desirability: number;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, factors, responses, isMixture = false, runs = [] }) => {
    const [predictionInputs, setPredictionInputs] = useState<Record<string, string>>({});
    const [predictedValue, setPredictedValue] = useState<number | null>(null);
    const [showDesignPoints, setShowDesignPoints] = useState<boolean>(true);
    const [plotX, setPlotX] = useState<string>('');
    const [plotY, setPlotY] = useState<string>('');
    const [plotResponse, setPlotResponse] = useState<string>('');
    const [optGoal, setOptGoal] = useState<'Maximize' | 'Minimize' | 'Target'>('Maximize');
    const [optTarget, setOptTarget] = useState<number>(0);
    const [optMin, setOptMin] = useState<number>(0);
    const [optMax, setOptMax] = useState<number>(100);
    const [topSuggestions, setTopSuggestions] = useState<OptResult[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [equationString, setEquationString] = useState<string>('');

    const containerRefs = {
        plot3d: useRef<HTMLDivElement>(null),
        plotContour: useRef<HTMLDivElement>(null),
        plotDesirability: useRef<HTMLDivElement>(null)
    };

    const getResponseUnit = (name: string) => responses.find(r => r.name === name)?.unit || '';

    const handleExportWord = async () => {
        setIsExporting(true);
        try {
            const header = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>QbD-PharmOptima Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #334155; }
                    h1 { color: #0c4a6e; border-bottom: 3px solid #0ea5e9; padding-bottom: 15px; text-transform: uppercase; }
                    h2 { color: #075985; margin-top: 40px; border-left: 15px solid #0ea5e9; padding-left: 20px; background: #f0f9ff; padding-top: 5px; padding-bottom: 5px; }
                    h3 { color: #0284c7; margin-top: 25px; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                    table { border-collapse: collapse; width: 100%; margin: 25px 0; border: 2px solid #0c4a6e; }
                    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
                    th { background-color: #f1f5f9; color: #1e293b; font-weight: 800; text-transform: uppercase; font-size: 8.5pt; }
                    .equation { font-family: 'Consolas', monospace; background: #0f172a; color: #38bdf8; padding: 25px; border-radius: 12px; font-size: 11pt; margin: 20px 0; border: 1px solid #1e293b; line-height: 1.5; }
                    .stat-box { display: inline-block; padding: 15px 25px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 15px; margin: 10px 15px 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                    .stat-label { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
                    .stat-value { font-size: 14pt; font-weight: 900; color: #0f172a; }
                    .markdown { font-size: 11pt; color: #334155; line-height: 1.7; }
                    .diagnostic-section { margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9; }
                    .plot-img { width: 100%; max-width: 600px; display: block; margin: 20px auto; border: 1px solid #e2e8f0; }
                    .footer { margin-top: 60px; font-size: 8.5pt; color: #94a3b8; border-top: 1.5px solid #e2e8f0; padding-top: 15px; text-align: center; font-style: italic; }
                </style>
                </head><body>
            `;

            const capturePlot = async (el: HTMLElement | null) => {
                if (!el) return '';
                try {
                    const dataUrl = await window.Plotly.toImage(el, { format: 'png', width: 1200, height: 800 });
                    return `<img class="plot-img" src="${dataUrl}" />`;
                } catch (e) {
                    console.error("Plot capture failed", e);
                    return '';
                }
            };

            const plot3dImg = await capturePlot(containerRefs.plot3d.current);
            const contourImg = await capturePlot(containerRefs.plotContour.current);
            const desirabilityImg = await capturePlot(containerRefs.plotDesirability.current);
            const pvaImg = await capturePlot(document.getElementById('plotPredVsActual'));
            const rvrImg = await capturePlot(document.getElementById('plotResidVsRun'));
            const bcImg = await capturePlot(document.getElementById('plotBoxCox'));

            let content = `<h1>Pharmaceutical Quality Report: DoE Analysis</h1>`;
            content += `<p>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>`;
            
            content += `<h2>1. Design Space Configuration</h2>`;
            content += `<table><thead><tr><th>Independent Variable</th><th>Unit</th><th>Low Limit (-1)</th><th>High Limit (+1)</th><th>Levels</th></tr></thead><tbody>`;
            factors.forEach(f => content += `<tr><td>${f.name}</td><td>${f.unit || '-'}</td><td>${f.low}</td><td>${f.high}</td><td>${f.levels}</td></tr>`);
            content += `</tbody></table>`;

            Object.entries(results.resultsByResponse).forEach(([name, res]) => {
                content += `<h2>2. Analytical Modeling: ${name}</h2>`;
                content += `<div class='stat-box'><div class='stat-label'>R-Squared</div><div class='stat-value'>${res.fitStatistics.rSquared.toFixed(4)}</div></div>`;
                content += `<div class='stat-box'><div class='stat-label'>Adj R²</div><div class='stat-value'>${res.fitStatistics.adjRSquared.toFixed(4)}</div></div>`;
                content += `<div class='stat-box'><div class='stat-label'>Pred R²</div><div class='stat-value'>${res.fitStatistics.predictedRSquared.toFixed(4)}</div></div>`;
                content += `<div class='stat-box'><div class='stat-label'>Adeq Prec</div><div class='stat-value'>${res.fitStatistics.adequatePrecision.toFixed(2)}</div></div>`;
                
                content += `<h3>Mathematical Coded Equation</h3><div class='equation'>${res.fitStatistics.equation}</div>`;
                
                content += `<h3>ANOVA Summary & Scientific Interpretation</h3><div class='markdown'>${res.anovaText.replace(/\n/g, '<br/>')}</div>`;
                
                content += `<h3>Model Visualizations</h3>`;
                if (name === plotResponse) {
                    content += `<h4>3D Response Surface</h4>${plot3dImg}`;
                    content += `<h4>Isopleth Contour Map</h4>${contourImg}`;
                    content += `<h4>Desirability Landscape</h4>${desirabilityImg}`;
                }

                content += `<h3>Diagnostics Analysis</h3>`;
                content += `<h4>Predicted vs. Actual</h4>${pvaImg}<div class='diagnostic-section'>${res.diagnosticInterpretations.predVsActual}</div>`;
                content += `<h4>Residuals vs. Run Order</h4>${rvrImg}<div class='diagnostic-section'>${res.diagnosticInterpretations.residualsVsRun}</div>`;
                content += `<h4>Box-Cox Transform Analysis</h4>${bcImg}<div class='diagnostic-section'>${res.diagnosticInterpretations.boxCox}</div>`;
            });

            if (topSuggestions.length > 0) {
                content += `<h2>3. Quality-by-Design Optimization Results</h2>`;
                content += `<table><thead><tr><th>Rank</th><th>Predicted Value</th><th>Desirability</th>`;
                factors.forEach(f => content += `<th>${f.name}</th>`);
                content += `</tr></thead><tbody>`;
                topSuggestions.forEach((s, i) => {
                    content += `<tr><td><b>#${i + 1}</b></td><td>${s.prediction.toFixed(4)}</td><td>${(s.desirability * 100).toFixed(1)}%</td>`;
                    factors.forEach(f => content += `<td>${s.factors[f.name].toFixed(3)}</td>`);
                    content += `</tr>`;
                });
                content += `</tbody></table>`;
            }
            
            content += `<div class='footer'>Confidential Scientific Report. Analysis structured via QbD-PharmOptima AI Engine.</div>`;

            const blob = new Blob(['\ufeff' + header + content + '</body></html>'], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QbD_Full_Pharma_Report_${plotResponse.replace(/\s+/g, '_')}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Export Error:", err);
            alert("Failed to generate Word report. Ensure all plots are fully rendered.");
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const initial: Record<string, string> = {};
        factors.forEach(f => initial[f.name] = ((parseFloat(f.low) + parseFloat(f.high)) / 2).toString());
        setPredictionInputs(initial);
        if (factors.length >= 2) { setPlotX(factors[0].name); setPlotY(factors[1].name); }
        if (responses.length > 0) setPlotResponse(responses[0].name);
    }, [factors, responses]);

    const activeResult = results.resultsByResponse[plotResponse];

    const applyInverseTransform = useCallback((y: number, transformation?: ResponseAnalysis['transformation']) => {
        if (!transformation || transformation.type === 'none') return y;
        const { type } = transformation;
        try {
            if (type === 'sqrt') return Math.pow(y, 2);
            if (type === 'log') return Math.exp(Math.min(y, 80));
            if (type === 'inverse') return Math.abs(y) < 1e-12 ? 0 : 1 / y;
            if (type === 'inverse_sqrt') return Math.abs(y) < 1e-12 ? 0 : 1 / Math.pow(y, 2);
        } catch (e) {
            return y;
        }
        return y;
    }, []);

    const getEquationString = useCallback(() => {
        if (!activeResult?.modelCoefficients) return "No model coefficients available";
        const { intercept, linear, quadratic, interactions } = activeResult.modelCoefficients;
        let eq = `${intercept.toFixed(4)}`;
        
        if (linear) {
            Object.entries(linear).forEach(([name, coeff]) => {
                eq += ` ${coeff >= 0 ? '+' : '-'} ${Math.abs(coeff).toFixed(4)}·[${name}]`;
            });
        }
        if (quadratic) {
            Object.entries(quadratic).forEach(([name, coeff]) => {
                eq += ` ${coeff >= 0 ? '+' : '-'} ${Math.abs(coeff).toFixed(4)}·[${name}]²`;
            });
        }
        if (interactions) {
            interactions.forEach(t => {
                eq += ` ${t.coefficient >= 0 ? '+' : '-'} ${Math.abs(t.coefficient).toFixed(4)}·[${t.factor1}]·[${t.factor2}]`;
            });
        }
        
        const trans = activeResult.transformation?.type;
        let prefix = "Y";
        if (trans === 'log') prefix = "Log(Y)";
        else if (trans === 'sqrt') prefix = "Sqrt(Y)";
        else if (trans === 'inverse') prefix = "1/Y";
        else if (trans === 'inverse_sqrt') prefix = "1/Sqrt(Y)";
        
        return `${prefix} = ${eq} (using coded units -1 to +1)`;
    }, [activeResult]);

    const getModelRange = useCallback((resName: string) => {
        const res = results.resultsByResponse[resName];
        if (!res?.diagnostics?.predicted?.length) return { min: 0, max: 100 };
        const data = res.diagnostics.predicted
            .filter(v => !isNaN(v))
            .map(v => applyInverseTransform(v, res.transformation));
        return { min: Math.min(...data), max: Math.max(...data) };
    }, [results, applyInverseTransform]);

    useEffect(() => {
        const range = getModelRange(plotResponse);
        // Provide a 10% buffer for optimization bounds
        const buffer = (range.max - range.min) * 0.1;
        setOptMin(range.min - buffer); 
        setOptMax(range.max + buffer); 
        setOptTarget(optGoal === 'Maximize' ? range.max : optGoal === 'Minimize' ? range.min : (range.min + range.max) / 2);
        
        const resDef = responses.find(r => r.name === plotResponse);
        if (resDef) setOptGoal(resDef.goal);
        setEquationString(getEquationString());
    }, [plotResponse, getModelRange, responses, optGoal, getEquationString]);

    const toCoded = useCallback((val: number, factorName: string) => {
        const factor = factors.find(f => f.name === factorName);
        if (!factor) return 0;
        const low = parseFloat(factor.low), high = parseFloat(factor.high);
        const mid = (high + low) / 2, halfRange = (high - low) / 2;
        if (halfRange === 0) return 0;
        const coded = (val - mid) / halfRange;
        return isNaN(coded) ? 0 : coded;
    }, [factors]);

    const calculatePredictionInternal = useCallback((inputs: Record<string, string | number>) => {
        if (!activeResult?.modelCoefficients) return 0;
        const { intercept, linear, quadratic, interactions } = activeResult.modelCoefficients;
        let y = intercept || 0;
        
        if (linear) {
            Object.entries(linear).forEach(([name, coeff]) => {
                const raw = inputs[name];
                const v = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
                if (!isNaN(v)) y += coeff * toCoded(v, name);
            });
        }
        
        if (quadratic) {
            Object.entries(quadratic).forEach(([name, coeff]) => {
                const raw = inputs[name];
                const v = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
                if (!isNaN(v)) y += coeff * Math.pow(toCoded(v, name), 2);
            });
        }
        
        if (interactions) {
            interactions.forEach(t => {
                const raw1 = inputs[t.factor1], raw2 = inputs[t.factor2];
                const v1 = typeof raw1 === 'string' ? parseFloat(raw1) : (raw1 as number);
                const v2 = typeof raw2 === 'string' ? parseFloat(raw2) : (raw2 as number);
                if (!isNaN(v1) && !isNaN(v2)) {
                    y += t.coefficient * toCoded(v1, t.factor1) * toCoded(v2, t.factor2);
                }
            });
        }

        // Handle Inverse Transformation with safety checks
        const finalY = applyInverseTransform(y, activeResult.transformation);

        // Final safety check for NaN/Infinity
        if (isNaN(finalY) || !isFinite(finalY)) return NaN;
        
        return finalY;
    }, [activeResult, factors, toCoded, applyInverseTransform]);

    const calculatePrediction = useCallback(() => setPredictedValue(calculatePredictionInternal(predictionInputs)), [calculatePredictionInternal, predictionInputs]);

    useEffect(() => {
        calculatePrediction();
    }, [predictionInputs, calculatePrediction]);

    const calculateDesirability = useCallback((val: number) => {
        if (isNaN(val)) return NaN;
        const range = optMax - optMin;
        if (range <= 0) return 0;
        if (optGoal === 'Maximize') return val <= optMin ? 0 : val >= optMax ? 1 : (val - optMin) / range;
        if (optGoal === 'Minimize') return val <= optMin ? 1 : val >= optMax ? 0 : (optMax - val) / range;
        if (val < optMin || val > optMax) return 0;
        if (val === optTarget) return 1;
        return val < optTarget ? (val - optMin) / (optTarget - optMin) : (optMax - val) / (optMax - optTarget);
    }, [optMax, optMin, optGoal, optTarget]);

    const findOptimalConditions = () => {
        if (!activeResult) return;
        const suggestions: OptResult[] = [];
        for (let i = 0; i < 25000; i++) {
            const trial: Record<string, number> = {};
            if (isMixture) {
                // Generate random mixture components that sum to 100
                let sum = 0;
                const raw: Record<string, number> = {};
                factors.forEach(f => {
                    const r = Math.random();
                    raw[f.name] = r;
                    sum += r;
                });
                factors.forEach(f => trial[f.name] = (raw[f.name] / sum) * 100);
            } else {
                factors.forEach(f => trial[f.name] = parseFloat(f.low) + Math.random() * (parseFloat(f.high) - parseFloat(f.low)));
            }
            const p = calculatePredictionInternal(trial);
            suggestions.push({ factors: trial, prediction: p, desirability: calculateDesirability(p) });
        }
        suggestions.sort((a, b) => b.desirability - a.desirability);
        const unique: OptResult[] = [];
        for (const s of suggestions) {
            if (unique.length >= 3) break;
            if (!unique.some(e => factors.every(f => Math.abs(e.factors[f.name] - s.factors[f.name]) < (Math.abs(parseFloat(f.high) - parseFloat(f.low)) * 0.1)))) unique.push(s);
        }
        setTopSuggestions(unique);
    };

    useEffect(() => {
        if (!window.Plotly || !plotX || !plotY || !activeResult) return;
        const fX = factors.find(f => f.name === plotX), fY = factors.find(f => f.name === plotY);
        if (!fX || !fY) return;
        const xMin = parseFloat(fX.low), xMax = parseFloat(fX.high), yMin = parseFloat(fY.low), yMax = parseFloat(fY.high);
        
        const responseValues = runs.map(r => parseFloat(r.results?.[plotResponse] || 'NaN')).filter(v => !isNaN(v));
        const obsMin = responseValues.length > 0 ? Math.min(...responseValues) : 0;
        const obsMax = responseValues.length > 0 ? Math.max(...responseValues) : 100;
        
        const steps = 100, xVals = [], yVals = [], zMat = [], dMat = [];
        
        for (let i = 0; i <= steps; i++) xVals.push(xMin + (i * (xMax - xMin) / steps));
        for (let i = 0; i <= steps; i++) yVals.push(yMin + (i * (yMax - yMin) / steps));
        
        for (let j = 0; j <= steps; j++) {
            const rZ = [], rD = [];
            for (let i = 0; i <= steps; i++) {
                const currentInputs = { ...predictionInputs, [plotX]: xVals[i], [plotY]: yVals[j] };
                
                let isInvalid = false;
                // If it's a mixture design, we need to adjust the other factors to maintain the sum constraint
                if (isMixture) {
                    const currentSum = xVals[i] + yVals[j];
                    if (currentSum > 100.001) {
                        isInvalid = true;
                    } else if (factors.length > 2) {
                        const remainingSum = Math.max(0, 100 - currentSum);
                        const otherFactors = factors.filter(f => f.name !== plotX && f.name !== plotY);
                        const initialOtherSum = otherFactors.reduce((acc, f) => acc + parseFloat(predictionInputs[f.name] || '0'), 0);
                        
                        if (initialOtherSum > 0) {
                            otherFactors.forEach(f => {
                                const ratio = parseFloat(predictionInputs[f.name] || '0') / initialOtherSum;
                                currentInputs[f.name] = ratio * remainingSum;
                            });
                        } else {
                            otherFactors.forEach(f => {
                                currentInputs[f.name] = remainingSum / otherFactors.length;
                            });
                        }
                    }
                }

                const p = isInvalid ? NaN : calculatePredictionInternal(currentInputs);
                rZ.push(p); rD.push(isInvalid ? NaN : calculateDesirability(p));
            }
            zMat.push(rZ); dMat.push(rD);
        }

        // Calculate plot dynamic range based strictly on grid values to highlight the model relationship
        const finalValidZ = zMat.flat().filter(v => !isNaN(v));
        const gridMin = finalValidZ.length > 0 ? Math.min(...finalValidZ) : 0;
        const gridMax = finalValidZ.length > 0 ? Math.max(...finalValidZ) : 100;
        
        // Focus plot strictly on model prediction range (with small 5% buffer for clarity)
        const zBuffer = (gridMax - gridMin) * 0.05 || 0.1;
        const plotZMin = gridMin - zBuffer;
        const plotZMax = gridMax + zBuffer;

        const topMarker = topSuggestions.length > 0 ? {
            x: topSuggestions.map(s => s.factors[plotX]),
            y: topSuggestions.map(s => s.factors[plotY]),
            mode: 'markers+text', type: 'scatter', text: ['#1', '#2', '#3'], textposition: 'top center',
            marker: { color: '#ffffff', size: 15, line: { color: '#0f172a', width: 2.5 }, symbol: 'diamond' },
            textfont: { family: 'Inter', weight: 'bold', size: 10 }, showlegend: false
        } : null;

        const commonLayout = { 
            margin: { l: 70, r: 50, t: 90, b: 70 }, 
            font: { family: 'Inter', size: 12 }, 
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)',
            autosize: true
        };

        const experimentalPoints3D = runs.length > 0 ? {
            x: runs.map(r => r.factors[plotX]),
            y: runs.map(r => r.factors[plotY]),
            z: runs.map(r => parseFloat(r.results?.[plotResponse] || 'NaN')),
            mode: 'markers',
            type: 'scatter3d',
            name: 'Observed Data',
            marker: {
                color: '#1e293b',
                size: 5,
                symbol: 'circle',
                line: { color: '#ffffff', width: 2 }
            }
        } : null;

        if (containerRefs.plot3d.current) {
            const surfaceData: any = { 
                z: zMat, x: xVals, y: yVals, 
                type: 'surface', 
                colorscale: [[0, '#ff0000'], [0.5, '#ffffff'], [1, '#0000ff']], 
                cmin: plotZMin, cmax: plotZMax,
                contours: { 
                    z: { 
                        show: true, 
                        usecolormap: true, 
                        project: { z: true }, 
                        highlightcolor: "#fff",
                        width: 2,
                        start: plotZMin,
                        end: plotZMax,
                        size: (plotZMax - plotZMin) / 20
                    } 
                },
                lighting: {
                    ambient: 0.7,
                    diffuse: 0.8,
                    fresnel: 0.2,
                    specular: 0.1,
                    roughness: 0.5
                },
                colorbar: { 
                    thickness: 20, 
                    len: 0.8, 
                    title: { text: plotResponse, font: { size: 12, weight: 'bold' } },
                    tickformat: '.2f'
                }
            };
            
            const dataToRender = [surfaceData];
            if (showDesignPoints && experimentalPoints3D) dataToRender.push(experimentalPoints3D);

            window.Plotly.react(containerRefs.plot3d.current, dataToRender, { 
                ...commonLayout, 
                title: { text: `3D Response Surface: ${plotResponse}`, font: { size: 18, weight: 'bold' } },
                scene: { 
                    xaxis: { title: plotX, backgroundcolor: "rgb(250, 250, 250)", showbackground: true, titlefont: { size: 14, weight: 'bold' } }, 
                    yaxis: { title: plotY, backgroundcolor: "rgb(245, 245, 245)", showbackground: true, titlefont: { size: 14, weight: 'bold' } }, 
                    zaxis: { 
                        title: 'Predicted Y', 
                        backgroundcolor: "rgb(240, 240, 240)", 
                        showbackground: true, 
                        titlefont: { size: 14, weight: 'bold' },
                        range: [plotZMin, plotZMax]
                    },
                    camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
                    aspectmode: 'cube'
                } 
            });
        }

        const experimentalPoints = runs.length > 0 ? {
            x: runs.map(r => r.factors[plotX]),
            y: runs.map(r => r.factors[plotY]),
            mode: 'markers',
            type: 'scatter',
            name: 'Experimental Points',
            marker: {
                color: '#000',
                size: 8,
                symbol: 'circle-open',
                line: { width: 1.5 }
            },
            showlegend: false
        } : null;

        if (containerRefs.plotContour.current) {
            const data: any[] = [{ 
                z: zMat, x: xVals, y: yVals, 
                type: 'contour', 
                colorscale: [[0, '#ff0000'], [0.5, '#ffffff'], [1, '#0000ff']], 
                zmin: plotZMin, zmax: plotZMax,
                contours: { 
                    showlabels: true, 
                    labelfont: { size: 12, color: '#1e293b', weight: 'bold' },
                    coloring: 'heatmap',
                    showlines: true,
                    start: plotZMin,
                    end: plotZMax,
                    size: (plotZMax - plotZMin) / 20,
                    labelformat: '.2f'
                },
                line: { width: 1, color: 'rgba(15, 23, 42, 0.1)' },
                colorbar: { 
                    thickness: 20, 
                    len: 0.9, 
                    title: { text: plotResponse, font: { size: 12, weight: 'bold' } },
                    tickformat: '.2f'
                }
            }];
            if (showDesignPoints && experimentalPoints) data.push(experimentalPoints);
            window.Plotly.react(containerRefs.plotContour.current, data, { 
                ...commonLayout, 
                width: 560,
                height: 560,
                autosize: false,
                title: { text: `Contour Isopleth Map`, font: { size: 18, weight: 'bold' } }, 
                xaxis: { title: plotX, gridcolor: '#f1f5f9', constrain: 'domain', zeroline: false, titlefont: { size: 14, weight: 'bold' } }, 
                yaxis: { title: plotY, gridcolor: '#f1f5f9', zeroline: false, titlefont: { size: 14, weight: 'bold' } }
            });
        }

        if (containerRefs.plotDesirability.current) {
            const data: any[] = [{ 
                z: dMat, x: xVals, y: yVals, 
                type: 'contour', 
                colorscale: [[0, '#ff0000'], [0.5, '#ffffff'], [1, '#0000ff']], 
                zmin: 0, zmax: 1, 
                contours: { 
                    showlabels: true, 
                    labelfont: { size: 11, color: '#1e293b', weight: 'bold' },
                    start: 0, 
                    end: 1, 
                    size: 0.05,
                    coloring: 'heatmap',
                    showlines: true,
                    labelformat: '.2f'
                },
                line: { width: 1, color: 'rgba(67, 56, 202, 0.15)' },
                colorbar: { 
                    thickness: 20, 
                    len: 0.9, 
                    title: { text: 'Desirability', font: { size: 12, weight: 'bold' } },
                    tickformat: '.2f'
                }
            }];
            if (topMarker) data.push(topMarker);
            if (showDesignPoints && experimentalPoints) data.push(experimentalPoints);
            window.Plotly.react(containerRefs.plotDesirability.current, data, { 
                ...commonLayout, 
                width: 560,
                height: 560,
                autosize: false,
                title: { text: `Desirability (0-1) Landscape`, font: { size: 18, weight: 'bold', color: '#4338ca' } }, 
                xaxis: { title: plotX, gridcolor: '#f1f5f9', constrain: 'domain', zeroline: false, titlefont: { size: 14, weight: 'bold' } }, 
                yaxis: { title: plotY, gridcolor: '#f1f5f9', zeroline: false, titlefont: { size: 14, weight: 'bold' } }
            });
        }
    }, [plotX, plotY, plotResponse, activeResult, predictionInputs, topSuggestions, calculatePredictionInternal, calculateDesirability, factors, showDesignPoints]);

    useEffect(() => {
        if (!window.Plotly || !activeResult?.diagnostics) return;
        const d = activeResult.diagnostics;
        const diagLayout = { margin: { t: 40, b: 40, l: 40, r: 10 }, font: { family: 'Inter', size: 9 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(255,255,255,0.4)' };
        
        const pva = document.getElementById('plotPredVsActual');
        if (pva) window.Plotly.react(pva, [
            { x: d.actual, y: d.predicted, type: 'scatter', mode: 'markers', marker: { color: '#0ea5e9', size: 9, line: { color: '#fff', width: 1.5 } }, name: 'Observed' },
            { x: [Math.min(...d.actual), Math.max(...d.actual)], y: [Math.min(...d.actual), Math.max(...d.actual)], type: 'scatter', mode: 'lines', line: { dash: 'dash', color: '#94a3b8', width: 2 }, name: 'Target' }
        ], { ...diagLayout, title: 'Predicted vs Actual', xaxis: { title: 'Observed Values' }, yaxis: { title: 'Model Estimates' }, showlegend: false });
        
        const rvr = document.getElementById('plotResidVsRun');
        if (rvr) window.Plotly.react(rvr, [
            { x: d.runOrder, y: d.residuals, type: 'scatter', mode: 'markers', marker: { color: '#f97316', size: 9, line: { color: '#fff', width: 1.5 } } }
        ], { 
            ...diagLayout, 
            title: 'Residuals vs Run Order', 
            xaxis: { title: 'Run Sequence' }, 
            yaxis: { title: 'Raw Residual' }, 
            shapes: [{ type: 'line', x0: Math.min(...d.runOrder), x1: Math.max(...d.runOrder), y0: 0, y1: 0, line: { color: '#0f172a', dash: 'dot', width: 1.5 } }] 
        });
        
        const bc = document.getElementById('plotBoxCox');
        if (bc && d.boxCox) {
            const shapes: any[] = [];
            // CI Limit line (horizontal red dashed)
            if (d.boxCox.ciLimit !== undefined) {
                shapes.push({ type: 'line', x0: Math.min(...d.boxCox.lambda), x1: Math.max(...d.boxCox.lambda), y0: d.boxCox.ciLimit, y1: d.boxCox.ciLimit, line: { color: '#ef4444', dash: 'dash', width: 2 } });
            }
            // Best Lambda (Vertical bold green)
            if (d.boxCox.lambdaBest !== undefined) {
                shapes.push({ type: 'line', x0: d.boxCox.lambdaBest, x1: d.boxCox.lambdaBest, y0: Math.min(...d.boxCox.lnRSS), y1: Math.max(...d.boxCox.lnRSS), line: { color: '#22c55e', width: 3.5 } });
            }
            // Lambda CI Low (Vertical red thin dash)
            if (d.boxCox.lambdaLow !== undefined) {
                shapes.push({ type: 'line', x0: d.boxCox.lambdaLow, x1: d.boxCox.lambdaLow, y0: Math.min(...d.boxCox.lnRSS), y1: Math.max(...d.boxCox.lnRSS), line: { color: '#ef4444', dash: 'dot', width: 1.5 } });
            }
            // Lambda CI High (Vertical red thin dash)
            if (d.boxCox.lambdaHigh !== undefined) {
                shapes.push({ type: 'line', x0: d.boxCox.lambdaHigh, x1: d.boxCox.lambdaHigh, y0: Math.min(...d.boxCox.lnRSS), y1: Math.max(...d.boxCox.lnRSS), line: { color: '#ef4444', dash: 'dot', width: 1.5 } });
            }

            window.Plotly.react(bc, [{ 
                x: d.boxCox.lambda, y: d.boxCox.lnRSS, 
                type: 'scatter', mode: 'lines', 
                line: { color: '#8b5cf6', width: 3, shape: 'spline' },
                fill: 'tozeroy', fillcolor: 'rgba(139, 92, 246, 0.05)'
            }], { ...diagLayout, title: 'Box-Cox Transform Analysis', xaxis: { title: 'Lambda (λ)' }, yaxis: { title: 'ln(RSS)' }, shapes });
        }
    }, [activeResult]);

    if (!activeResult) return <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border-4 border-dashed border-slate-100 flex flex-col items-center gap-4 animate-in fade-in"><BarChart3 size={48} className="opacity-20"/><p className="text-xl font-bold">Select a response to visualize the model.</p></div>;

    const stats = activeResult.fitStatistics;

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            {/* Model Summary Card */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 ring-1 ring-slate-200/50">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-science-100 text-science-700 text-[10px] font-black uppercase tracking-widest border border-science-200">Scientific Model Validated</span>
                            <span className="text-slate-400 text-[10px] font-medium">• Determination Factor R² &gt; 0.70</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4"><LayoutDashboard className="text-science-500" size={32} /> Analysis Report: {plotResponse}</h2>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleExportWord} 
                            disabled={isExporting}
                            className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl hover:bg-black font-black flex items-center gap-3 shadow-xl transition-all active:scale-95 group disabled:opacity-50"
                        >
                            <Download size={20} className={isExporting ? "animate-bounce" : "group-hover:translate-y-0.5 transition-transform"} /> 
                            {isExporting ? "Exporting..." : "Full Report (.doc)"}
                        </button>
                        <div className="bg-white p-5 rounded-2xl text-center min-w-[130px] border border-slate-100 shadow-lg ring-1 ring-slate-100"><span className="text-[10px] font-black text-slate-400 block uppercase mb-1 tracking-widest">R-Squared</span><span className="text-3xl font-black text-slate-900 leading-none">{stats.rSquared.toFixed(4)}</span></div>
                        <div className="bg-slate-50 p-5 rounded-2xl text-center min-w-[130px] border border-slate-200 shadow-inner"><span className="text-[10px] font-black text-slate-500 block uppercase mb-1 tracking-widest">Adj R-Squared</span><span className="text-3xl font-black text-slate-900 leading-none">{stats.adjRSquared.toFixed(4)}</span></div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 mb-10">
                    <div className="lg:col-span-8 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><Sigma size={80} className="text-white" /></div>
                        <div className="flex items-center gap-2 mb-4"><Calculator className="text-science-400" size={20} /><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Final Coded Regression Equation</h4></div>
                        <div className="font-mono text-base text-science-50 break-words leading-relaxed bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 shadow-inner ring-1 ring-white/5">{stats.equation}</div>
                    </div>
                    <div className="lg:col-span-4 space-y-5">
                        <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex justify-between items-center transition-all hover:bg-indigo-50 hover:shadow-lg"><div className="flex flex-col"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2"><Activity size={14}/> Predicted R²</span><span className="text-[10px] text-indigo-400 mt-1 font-medium">Agreement Index</span></div><span className="text-2xl font-black text-indigo-900">{stats.predictedRSquared.toFixed(4)}</span></div>
                        <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex justify-between items-center transition-all hover:bg-emerald-50 hover:shadow-lg"><div className="flex flex-col"><span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em] flex items-center gap-2"><Maximize2 size={14}/> Adeq Prec</span><span className="text-[10px] text-emerald-400 mt-1 font-medium">Signal-to-Noise</span></div><span className="text-2xl font-black text-emerald-900">{stats.adequatePrecision.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-200 ring-1 ring-white">
                    <div className="flex items-center gap-3 mb-4 text-slate-500 font-black text-xs uppercase tracking-widest"><Sigma size={16}/> ANOVA & Scientific Model Interpretation</div>
                    <div className="prose prose-sm max-w-none text-slate-600 bg-white p-8 rounded-2xl shadow-inner border border-slate-200/50 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"><ReactMarkdown>{activeResult.anovaText}</ReactMarkdown></div>
                </div>
            </div>

            {/* Diagnostics Visualization Panel */}
            <div className="space-y-6 px-4">
                <div className="flex items-center gap-3"><div className="h-1 w-12 bg-science-500 rounded-full"></div><h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Diagnostic Verification</h3></div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg transition-all hover:scale-[1.02]">
                        <div id="plotPredVsActual" className="w-full h-[280px]"></div>
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest flex items-center gap-1.5"><Info size={12}/> Scientific Interpretation</span>
                            <p className="text-[10px] leading-relaxed text-slate-600 italic font-medium">{activeResult.diagnosticInterpretations.predVsActual}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg transition-all hover:scale-[1.02]">
                        <div id="plotResidVsRun" className="w-full h-[280px]"></div>
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest flex items-center gap-1.5"><Info size={12}/> Analysis Summary</span>
                            <p className="text-[10px] leading-relaxed text-slate-600 italic font-medium">{activeResult.diagnosticInterpretations.residualsVsRun || "Points are randomly dispersed around the zero line, indicating constant variance and no trend over the experimental run sequence."}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg transition-all hover:scale-[1.02]">
                        <div id="plotBoxCox" className="w-full h-[280px]"></div>
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest flex items-center gap-1.5"><Info size={12}/> Transformation Utility</span>
                            <p className="text-[10px] leading-relaxed text-slate-600 italic font-medium">{activeResult.diagnosticInterpretations.boxCox}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls for Visualizations */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-wrap gap-8 items-center border border-slate-800 ring-1 ring-white/5">
                <div className="flex gap-6">
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 px-1 tracking-widest group-hover:text-science-400 transition-colors">Abscissa (X-Axis)</label>
                        <select className="p-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-xs font-bold text-slate-200 focus:border-science-500 outline-none transition-all shadow-lg" value={plotX} onChange={e => setPlotX(e.target.value)}>{factors.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</select>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 px-1 tracking-widest group-hover:text-science-400 transition-colors">Ordinate (Y-Axis)</label>
                        <select className="p-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-xs font-bold text-slate-200 focus:border-science-500 outline-none transition-all shadow-lg" value={plotY} onChange={e => setPlotY(e.target.value)}>{factors.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</select>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 px-1 tracking-widest group-hover:text-science-400 transition-colors">Target Quality Response Domain</label>
                    <select className="w-full p-3 rounded-2xl border-2 border-slate-800 bg-science-950/50 text-xs font-black text-science-100 focus:border-science-400 outline-none transition-all shadow-lg" value={plotResponse} onChange={e => setPlotResponse(e.target.value)}>{responses.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}</select>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none" htmlFor="toggleDesignPoints">Show Design Points</label>
                    <input 
                        id="toggleDesignPoints"
                        type="checkbox" 
                        className="w-5 h-5 rounded border-2 border-slate-700 bg-slate-900 text-science-500 focus:ring-science-500 transition-all cursor-pointer" 
                        checked={showDesignPoints} 
                        onChange={e => setShowDesignPoints(e.target.checked)}
                    />
                </div>
            </div>

            {/* Model Response Surfaces */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-200 shadow-xl mb-10 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-science-500"></div>
                <div className="flex items-center gap-3 mb-3">
                    <Sigma size={18} className="text-science-600"/>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mathematical Model Equation (Coded Units)</span>
                </div>
                <div className="font-mono text-lg font-bold text-slate-800 break-words whitespace-pre-wrap">{equationString}</div>
                <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Factor values map to [-1, +1] range. This equation is exactly what determines the surfaces and predictions below.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl relative h-[600px] transition-all hover:shadow-science-100/20 group">
                    <div ref={containerRefs.plot3d} className="w-full h-full"></div>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur p-2 rounded-xl text-[10px] font-bold text-slate-500">Interactive 3D Surface</div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl relative h-[650px] transition-all hover:shadow-science-100/20 group flex flex-col items-center">
                    <div ref={containerRefs.plotContour} className="w-full h-full flex items-center justify-center"></div>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur p-2 rounded-xl text-[10px] font-bold text-slate-500">Isopleth Model Plot</div>
                </div>
                <div className="bg-indigo-50/20 p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-2xl relative h-[650px] ring-4 ring-indigo-500/5 group flex flex-col items-center">
                    <div ref={containerRefs.plotDesirability} className="w-full h-full flex items-center justify-center"></div>
                    <div className="absolute top-6 right-6 opacity-100 bg-white/90 backdrop-blur p-2 px-3 rounded-xl text-[10px] font-black text-indigo-600 border border-indigo-100">Desirability Prob. Landscape</div>
                </div>
            </div>

            {/* Numerical Solver Interface */}
            <div className="bg-slate-950 p-12 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden border border-slate-800">
                <div className="absolute -top-16 -right-16 p-10 opacity-5 pointer-events-none rotate-12 scale-150"><Trophy size={200} /></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-yellow-400/10 text-yellow-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-yellow-400/20 shadow-xl">Quality Optimizer Suite</div>
                        <h2 className="text-5xl font-black flex items-center gap-5 tracking-tighter leading-none"><Trophy className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" size={48} /> Optimization Solver</h2>
                        <p className="text-slate-400 text-lg mt-4 max-w-2xl font-medium leading-relaxed">Estimates near-optimal trade-offs via a 25,000-point Monte Carlo exploratory search across the design space to maximize desirability.</p>
                    </div>
                    <button onClick={findOptimalConditions} className="group bg-white text-slate-950 px-14 py-6 rounded-3xl hover:bg-science-100 font-black flex items-center justify-center gap-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] transition-all active:scale-95 transform hover:-translate-y-1">
                        <Search size={24} className="group-hover:scale-125 transition-transform" /> Execute Solver
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 backdrop-blur-xl">
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase block tracking-[0.2em] px-1">Goal Strategy</label><select className="w-full p-5 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-bold focus:border-science-500 outline-none transition-all shadow-inner" value={optGoal} onChange={e => setOptGoal(e.target.value as any)}><option value="Maximize">Maximize Quality Output</option><option value="Minimize">Minimize Risk/Penalty</option><option value="Target">Reach Specific Target</option></select></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase block tracking-[0.2em] px-1">Lower Acceptance (d=0)</label><input type="number" className="w-full p-5 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-bold focus:border-science-500 outline-none shadow-inner" value={optMin} onChange={e => setOptMin(parseFloat(e.target.value))}/></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase block tracking-[0.2em] px-1">Upper Acceptance (d=1)</label><input type="number" className="w-full p-5 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-bold focus:border-science-500 outline-none shadow-inner" value={optMax} onChange={e => setOptMax(parseFloat(e.target.value))}/></div>
                    {optGoal === 'Target' && <div className="space-y-3"><label className="text-[10px] font-black text-science-400 uppercase block tracking-[0.2em] px-1">CQA Target Point</label><input type="number" className="w-full p-5 bg-slate-800 border-2 border-science-500 rounded-2xl text-sm font-black text-science-100 shadow-xl" value={optTarget} onChange={e => setOptTarget(parseFloat(e.target.value))}/></div>}
                </div>

                {topSuggestions.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-10 relative z-10">
                        {topSuggestions.map((s, idx) => (
                            <div key={idx} className={`group relative p-10 rounded-[3rem] border-2 transition-all duration-700 cursor-default ${idx === 0 ? 'border-science-500 bg-science-950/20 shadow-[0_0_80px_rgba(14,165,233,0.15)] scale-105' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}>
                                <div className={`absolute -top-6 -left-6 w-14 h-14 rounded-2xl flex items-center justify-center font-black shadow-2xl group-hover:rotate-12 transition-transform ${idx === 0 ? 'bg-science-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{idx + 1}</div>
                                <div className="flex justify-between items-center mb-8">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Optimal Predictor</span>
                                    <div className="flex flex-col items-end"><span className="text-[10px] font-black text-science-400 uppercase leading-none mb-1">Desirability</span><span className="text-xl font-black text-white">{(s.desirability * 100).toFixed(1)}%</span></div>
                                </div>
                                <div className="text-6xl font-black text-white mb-10 tracking-tighter leading-none group-hover:text-science-300 transition-colors">{s.prediction.toFixed(4)}<span className="text-base font-normal text-slate-500 ml-3 block mt-2">{getResponseUnit(plotResponse)}</span></div>
                                <div className="space-y-5 pt-8 border-t border-slate-800/60">
                                    {Object.entries(s.factors).map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-xs items-center"><span className="text-slate-400 font-bold">{k}</span><span className="font-black text-slate-100 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700/50 shadow-sm">{v.toFixed(3)}</span></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-32 text-slate-600 border-4 border-dashed border-slate-800 rounded-[4rem] bg-slate-900/20 flex flex-col items-center gap-6">
                        <MousePointer2 size={64} className="opacity-10 animate-pulse" />
                        <div className="space-y-2">
                            <p className="text-2xl font-bold tracking-tight text-slate-500">Configure thresholds and run algorithm.</p>
                            <p className="text-sm opacity-50 font-medium">PharmOptima Solver will evaluate thousands of candidate points.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Model Predictor Suite */}
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl relative group overflow-hidden transition-all hover:shadow-science-200/20">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Calculator size={200} /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><Calculator size={36} className="text-science-600" /> Interactive Model Estimation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
                        {factors.map(f => (
                            <div key={f.name} className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">{f.name} <span className="text-slate-300 normal-case ml-2">[{f.low}-{f.high}]</span></label>
                                <input 
                                    type="number" 
                                    step="any" 
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] focus:border-science-500 focus:bg-white focus:shadow-xl outline-none text-lg font-bold text-slate-800 transition-all shadow-sm" 
                                    value={predictionInputs[f.name] || ''} 
                                    onChange={e => {
                                        setPredictionInputs(prev => ({ ...prev, [f.name]: e.target.value }));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-16 pt-12 border-t border-slate-100">
                        <button onClick={calculatePrediction} className="w-full md:w-auto bg-slate-950 text-white px-16 py-6 rounded-[2rem] hover:bg-black font-black flex items-center justify-center gap-5 shadow-2xl transition-all active:scale-95 group/btn ring-offset-4 focus:ring-4 focus:ring-slate-200 outline-none">
                            <Play size={24} className="group-hover/btn:scale-125 transition-transform" /> Execute Prediction
                        </button>
                        {predictedValue !== null && (
                            <div className="flex flex-col items-center md:items-start animate-in slide-in-from-left duration-500">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 leading-none flex items-center gap-2"><Table size={14}/> Statistical Estimate</span>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-7xl font-black text-slate-900 tracking-tighter leading-none hover:scale-105 transition-transform duration-500 cursor-default">{predictedValue.toFixed(4)}</span>
                                    <span className="text-2xl font-bold text-slate-400 lowercase">{getResponseUnit(plotResponse)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-12 flex items-start gap-6 bg-science-50/70 p-8 rounded-[2.5rem] border border-science-100 shadow-sm transition-all hover:bg-white hover:border-science-200">
                        <Sigma size={24} className="text-science-500 shrink-0 mt-1.5" />
                        <div className="space-y-2">
                            <p className="text-sm text-slate-800 leading-relaxed font-black">Analytical Validity Notice:</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">This predictor utilizes deterministic 95% confidence interval coefficients calculated from the input data set. It provides a direct mathematical estimation based on the model equation for any factor combination. For maximum accuracy, inputs should remain within the experimental boundaries: <span className="text-science-600 font-bold">[{getModelRange(plotResponse).min.toFixed(3)} - {getModelRange(plotResponse).max.toFixed(3)}]</span>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisDashboard;