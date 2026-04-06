
import React, { useState, useEffect } from 'react';
import { DesignRecommendation, AnalysisRequest, ExperimentalRun, AnalysisResult } from '../types';
import { generateDesignMatrix, analyzeExperimentalResults } from '../services/geminiService';
import { FileText, Loader2, BookOpen, AlertTriangle, Beaker, Play, Activity, Calculator } from 'lucide-react';
import DesignVisualizer from './DesignVisualizer';
import RunTable from './RunTable';
import AnalysisDashboard from './AnalysisDashboard';

interface ResultsViewProps {
  recommendation: DesignRecommendation | null;
  request: AnalysisRequest;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ recommendation, request, onReset }) => {
  const [viewState, setViewState] = useState<'PROPOSAL' | 'EXECUTION' | 'ANALYSIS'>('PROPOSAL');
  const [runs, setRuns] = useState<ExperimentalRun[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recommendation) {
        setViewState('PROPOSAL');
        setRuns([]);
        setAnalysis(null);
        setError(null);
    }
  }, [recommendation?.name]);

  if (!recommendation) return null;

  const isMixture = recommendation.name.toLowerCase().includes('mixture') || recommendation.name.toLowerCase().includes('simplex');

  const handleGenerateRuns = async () => {
    setLoading(true);
    setError(null);
    try {
        const generatedRuns = await generateDesignMatrix(request, recommendation.name);
        if (!generatedRuns || generatedRuns.length === 0) {
            setError("Failed to generate experimental runs. Please try again.");
            setLoading(false);
            return;
        }
        setRuns(generatedRuns);
        setViewState('EXECUTION');
    } catch (e) {
        console.error(e);
        setError("An unexpected error occurred while generating the design.");
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateCell = (runId: number, type: 'factor' | 'response', name: string, value: string) => {
      setRuns(prev => prev.map(r => {
          if (r.id !== runId) return r;
          if (type === 'factor') {
              const numVal = parseFloat(value);
              return !isNaN(numVal) ? { ...r, factors: { ...r.factors, [name]: numVal } } : r;
          } else {
              return { ...r, results: { ...r.results, [name]: value } };
          }
      }));
  };

  const handleBulkUpdate = (updates: { runId: number, type: 'factor' | 'response', name: string, value: string }[]) => {
      setRuns(prev => {
          const newRuns = [...prev];
          updates.forEach(u => {
              const runIndex = newRuns.findIndex(r => r.id === u.runId);
              if (runIndex !== -1) {
                  if (u.type === 'factor') {
                       const numVal = parseFloat(u.value);
                       if (!isNaN(numVal)) {
                           newRuns[runIndex] = { ...newRuns[runIndex], factors: { ...newRuns[runIndex].factors, [u.name]: numVal } };
                       }
                  } else {
                      newRuns[runIndex] = { ...newRuns[runIndex], results: { ...newRuns[runIndex].results, [u.name]: u.value } };
                  }
              }
          });
          return newRuns;
      });
  };

  const handleAnalyze = async () => {
      setLoading(true);
      setError(null);
      try {
          const hasResults = runs.some(r => Object.keys(r.results).length > 0);
          if (!hasResults) {
              setError("Please enter experimental results before analyzing.");
              setLoading(false);
              return;
          }
          const result = await analyzeExperimentalResults(request, recommendation.name, runs);
          setAnalysis(result);
          setViewState('ANALYSIS');
      } catch (e) {
          console.error(e);
          setError("Analysis failed. Please check your data and API key.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-t-4 border-science-600">
        <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-science-600 font-semibold mb-2 text-sm uppercase tracking-wide">
                    <BookOpen size={16} />
                    Scientific Recommendation
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {recommendation.name} <span className="text-gray-400 font-normal">({recommendation.acronym})</span>
                </h2>
                <div className="prose text-gray-700 text-sm">
                    <p className="font-medium">{recommendation.reasoning}</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4 flex items-center gap-3">
                        <Calculator size={18} className="text-science-600" />
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Design Point Calculation Equation</span>
                            <span className="font-mono text-xs font-bold text-science-900">{recommendation.designFormula}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 italic border-t pt-2">Source: {recommendation.sourceReference}</p>
                </div>
            </div>
            <div className="w-64 flex-shrink-0 hidden md:block">
                <DesignVisualizer acronym={recommendation.acronym} />
            </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse">
            <AlertTriangle size={20} />
            <span className="font-medium">{error}</span>
        </div>
      )}

      {viewState === 'PROPOSAL' && (
           <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
                <Beaker size={48} className="mx-auto text-science-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Experiment?</h3>
                <p className="text-gray-600 max-w-lg mx-auto mb-6">
                    Based on your <strong>{request.factors.length} factors</strong> and <strong>{request.responses.length} responses</strong>, 
                    we will generate the optimal experimental run table for the {recommendation.name}.
                </p>
                <button
                    onClick={handleGenerateRuns}
                    disabled={loading}
                    className="bg-science-600 text-white px-8 py-3 rounded-lg hover:bg-science-700 disabled:opacity-50 flex items-center gap-2 mx-auto text-lg font-bold shadow-lg shadow-science-200 transition-all"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                    {loading ? 'Designing Matrix...' : 'Generate Run Table'}
                </button>
           </div>
      )}

      {(viewState === 'EXECUTION' || viewState === 'ANALYSIS') && (
          <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-science-600" /> Experimental Protocol & Data
                 </h3>
                 {viewState === 'EXECUTION' && (
                     <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold"
                     >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Activity size={18} />}
                        {loading ? 'Analyzing...' : 'Analyze Results'}
                     </button>
                 )}
              </div>
              <RunTable runs={runs} factors={request.factors} responses={request.responses} onUpdateCell={handleUpdateCell} onBulkUpdate={handleBulkUpdate} />
              <p className="text-sm text-gray-500 italic text-right">
                  * Enter your experimental results in the yellow columns above. Use Copy/Paste to import full tables from Excel.
              </p>
          </div>
      )}

      {viewState === 'ANALYSIS' && analysis && (
          <div className="animate-fade-in border-t-2 border-gray-200 pt-8">
              <AnalysisDashboard results={analysis} factors={request.factors} responses={request.responses} isMixture={isMixture} runs={runs} />
          </div>
      )}

      <div className="flex justify-center pt-8">
        <button onClick={onReset} className="text-science-600 hover:text-science-800 font-medium underline underline-offset-4">
          Start New Analysis
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
