import React, { useState } from 'react';
import { Activity, FlaskConical, Settings, CheckCircle2, ChevronRight, Sliders, Target, ArrowLeft } from 'lucide-react';
import FishboneDiagram from './components/FishboneDiagram';
import FactorSettings from './components/FactorSettings';
import CQASettings from './components/CQASettings';
import ResultsView from './components/ResultsView';
import { AnalysisRequest, DeliverySystem, DesignRecommendation, ExperimentGoal, FormFactor, FactorDefinition } from './types';
import { RECOMMENDATIONS } from './constants';

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex justify-center mb-8">
    {[1, 2, 3, 4, 5, 6].map((step) => (
      <div key={step} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 
          ${step <= currentStep ? 'bg-science-600 border-science-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
          {step < currentStep ? <CheckCircle2 size={16} /> : step}
        </div>
        {step < 6 && (
          <div className={`w-6 md:w-10 h-1 
            ${step < currentStep ? 'bg-science-600' : 'bg-gray-200'}`} 
          />
        )}
      </div>
    ))}
  </div>
);

const Logo3DPlot = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" className="fill-white stroke-slate-200" strokeWidth="1"/>

        {/* Base Wireframe */}
        <path d="M6 30 L20 36 L34 30" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 36 V 15" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round"/>

        {/* Surface Mesh - Hill Shape */}
        <path 
            d="M6 24 C 14 10, 26 10, 34 24 L 34 30 C 26 16, 14 16, 6 30 Z"
            fill="url(#surface_grad)" 
            stroke="#991b1b"
            strokeWidth="0.5"
            opacity="0.95"
        />

        {/* Grid Lines on Surface */}
        <path d="M13 21 C 18 14, 22 14, 27 21" stroke="black" strokeOpacity="0.2" fill="none" strokeWidth="0.5"/>
        <path d="M20 13 V 28" stroke="black" strokeOpacity="0.2" fill="none" strokeWidth="0.5"/>
        <path d="M10 25 C 16 16, 24 16, 30 25" stroke="black" strokeOpacity="0.2" fill="none" strokeWidth="0.5"/>

        <defs>
            <radialGradient id="surface_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 20) rotate(90) scale(14 20)">
                <stop offset="0" stopColor="#ef4444" /> {/* Red Peak */}
                <stop offset="0.5" stopColor="#facc15" /> {/* Yellow Mid */}
                <stop offset="1" stopColor="#16a34a" /> {/* Green Base */}
            </radialGradient>
        </defs>
    </svg>
);

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState<AnalysisRequest>({
    goal: ExperimentGoal.OPTIMIZATION,
    system: DeliverySystem.GENERIC_ROBUST,
    factors: [],
    responses: [],
    replicates: 1,
    centerPoints: 3
  });
  
  const [formFactor, setFormFactor] = useState<FormFactor>(FormFactor.PROCESS_OR_INDEPENDENT);
  const [isConstraintIrregular, setIsConstraintIrregular] = useState(false);
  const [recommendation, setRecommendation] = useState<DesignRecommendation | null>(null);

  const handleFishboneComplete = (factorNames: string[]) => {
      const newFactors: FactorDefinition[] = factorNames.map(name => {
          const existing = request.factors.find(f => f.name === name);
          return existing || { name, unit: '', low: '', high: '', levels: 2 };
      });
      setRequest({ ...request, factors: newFactors });
      setStep(3);
  };

  const determineDesign = () => {
    let rec: DesignRecommendation;

    if (request.goal === ExperimentGoal.SCREENING) {
       if (request.factors.length > 5) { 
         rec = RECOMMENDATIONS.PLACKETT_BURMAN;
       } else {
         rec = RECOMMENDATIONS.FULL_FACTORIAL; 
       }
    } else {
      if (formFactor === FormFactor.MIXTURE) {
        if (request.system === DeliverySystem.LIPID_NANOCAPSULES || isConstraintIrregular) {
          rec = RECOMMENDATIONS.D_OPTIMAL_MIXTURE; 
        } else {
          rec = RECOMMENDATIONS.SIMPLEX_LATTICE; 
        }
      } else {
        if (isConstraintIrregular || request.system === DeliverySystem.GENERIC_IRREGULAR) {
          rec = RECOMMENDATIONS.D_OPTIMAL_SURFACE;
        } else if (
          request.system === DeliverySystem.LIPOSOMES || 
          request.system === DeliverySystem.MICROEMULSIONS 
        ) {
          rec = RECOMMENDATIONS.BOX_BEHNKEN; 
        } else if (request.system === DeliverySystem.EMULSIONS) {
             rec = RECOMMENDATIONS.D_OPTIMAL_SURFACE; 
        } else {
          rec = RECOMMENDATIONS.CENTRAL_COMPOSITE; 
        }
      }
    }
    setRecommendation(rec);
    setStep(6);
  };

  const overrideDesign = (designKey: string) => {
      if (RECOMMENDATIONS[designKey]) {
          setRecommendation(RECOMMENDATIONS[designKey]);
      }
  };

  const reset = () => {
    setStep(1);
    setRecommendation(null);
    setIsConstraintIrregular(false);
    setRequest({
      goal: ExperimentGoal.OPTIMIZATION,
      system: DeliverySystem.GENERIC_ROBUST,
      factors: [],
      responses: [],
      replicates: 1,
      centerPoints: 3
    });
  };

  return (
    <div className="min-h-screen bg-science-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-gray-200 py-4 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Logo3DPlot />
          <div>
            <h1 className="text-xl font-bold text-science-900 tracking-tight">QbD-PharmOptima</h1>
            <p className="text-xs text-gray-500">Computer-Aided Formulation Development</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <StepIndicator currentStep={step} />

        {step === 1 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Activity className="text-science-500" />
                1. Define Objectives
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <button 
                  onClick={() => { setRequest({...request, goal: ExperimentGoal.SCREENING}); setStep(2); }}
                  className="group p-6 border-2 border-gray-100 rounded-xl hover:border-science-500 hover:bg-science-50 transition-all text-left"
                >
                  <span className="block text-lg font-bold text-gray-800 mb-2 group-hover:text-science-700">Screening</span>
                  <p className="text-sm text-gray-600">Identify influential factors from a large pool.</p>
                </button>
                <button 
                  onClick={() => { setRequest({...request, goal: ExperimentGoal.OPTIMIZATION}); setStep(2); }}
                  className="group p-6 border-2 border-gray-100 rounded-xl hover:border-science-500 hover:bg-science-50 transition-all text-left"
                >
                  <span className="block text-lg font-bold text-gray-800 mb-2 group-hover:text-science-700">Optimization</span>
                  <p className="text-sm text-gray-600">Find best settings using Response Surface.</p>
                </button>
              </div>
            </div>

            <div id="citation-box" className="p-5 bg-science-50 rounded-xl border border-science-200 text-base md:text-lg text-slate-800 leading-relaxed font-bold shadow-sm text-center">
              Please cite: Hathout RM, Ibrahim SS, El-Housseiny GS. QbD-PharmOptima: A New Research and Educational Generative Platform for AI-Assisted Design and Optimization of Drug Delivery Systems and Pharmaceutical Operations. BioChem. 2026; 6(3):22. <a href="https://doi.org/10.3390/biochem6030022" target="_blank" rel="noopener noreferrer" className="text-science-700 underline hover:text-science-900 font-bold">https://doi.org/10.3390/biochem6030022</a>, in any work or study in which this application will be utilized
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="text-science-500" />
              2. Identify Factors (Inputs)
            </h2>
            <FishboneDiagram onFactorsChange={handleFishboneComplete} />
             <div className="mt-4 flex justify-start">
                 <button onClick={() => setStep(1)} className="text-gray-500 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
             </div>
          </div>
        )}

        {step === 3 && (
            <FactorSettings 
                factors={request.factors}
                onUpdate={(updated) => setRequest({ ...request, factors: updated })}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
            />
        )}

        {step === 4 && (
            <CQASettings 
                responses={request.responses}
                onUpdate={(updated) => setRequest({ ...request, responses: updated })}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
            />
        )}

        {step === 5 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
             <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FlaskConical className="text-science-500" />
              5. System & Design Selection
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Drug Delivery System Type</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-science-500 outline-none"
                  value={request.system}
                  onChange={(e) => setRequest({...request, system: e.target.value as DeliverySystem})}
                >
                  {Object.values(DeliverySystem).map((ds) => (
                    <option key={ds} value={ds}>{ds}</option>
                  ))}
                </select>
              </div>

              {request.goal === ExperimentGoal.OPTIMIZATION && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Variables Nature</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="formFactor" 
                          checked={formFactor === FormFactor.PROCESS_OR_INDEPENDENT} 
                          onChange={() => setFormFactor(FormFactor.PROCESS_OR_INDEPENDENT)}
                          className="text-science-600 focus:ring-science-500"
                        />
                        <span className="text-sm">Process/Independent</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="formFactor" 
                          checked={formFactor === FormFactor.MIXTURE} 
                          onChange={() => setFormFactor(FormFactor.MIXTURE)}
                          className="text-science-600 focus:ring-science-500"
                        />
                        <span className="text-sm">Mixture Components</span>
                      </label>
                    </div>
                  </div>
                  <div>
                     <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input 
                          type="checkbox" 
                          checked={isConstraintIrregular}
                          onChange={(e) => setIsConstraintIrregular(e.target.checked)}
                          className="w-5 h-5 text-science-600 rounded focus:ring-science-500"
                        />
                        <div>
                          <span className="block font-bold text-gray-800">Irregular Feasibility Domain?</span>
                        </div>
                     </label>
                  </div>
                </>
              )}

              {/* Design Configuration: Replicates & Center Points */}
              <div className="bg-science-50 p-4 rounded-lg border border-science-100 space-y-4">
                  <h3 className="font-bold text-science-800 flex items-center gap-2 text-sm">
                      <Sliders size={16} /> Experimental Design Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Replicates (Per Design Point)</label>
                          <input 
                              type="number" 
                              min="1" 
                              max="10" 
                              value={request.replicates}
                              onChange={(e) => setRequest({...request, replicates: Math.max(1, parseInt(e.target.value) || 1)})}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-science-500 outline-none"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Number of times each base design run is repeated.</p>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Center Points (Total)</label>
                          <input 
                              type="number" 
                              min="0" 
                              max="20" 
                              value={request.centerPoints}
                              onChange={(e) => setRequest({...request, centerPoints: Math.max(0, parseInt(e.target.value) || 0)})}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-science-500 outline-none"
                          />
                           <p className="text-[10px] text-gray-500 mt-1">Additional runs at the center/centroid to estimate curvature/error.</p>
                      </div>
                  </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
               <button 
                  onClick={() => setStep(4)} 
                  className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"
               >
                   <ArrowLeft size={18} /> Back
               </button>
               <button 
                onClick={determineDesign} 
                className="bg-science-600 text-white px-6 py-3 rounded-lg hover:bg-science-700 font-bold shadow-lg shadow-science-200"
               >
                 Review & Execute Experiment
               </button>
            </div>
          </div>
        )}

        {step === 6 && recommendation && (
            <div className="animate-fade-in">
                {/* Override Design Selection */}
                <div className="bg-science-50 border-b border-science-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4 mb-4 rounded-lg">
                    <div className="flex items-center gap-2 text-science-800">
                        <Sliders size={18} />
                        <span className="font-bold text-sm">Selected Design:</span>
                    </div>
                    <select 
                        className="flex-1 max-w-md p-2 border border-science-300 rounded text-sm bg-white"
                        value={Object.keys(RECOMMENDATIONS).find(key => RECOMMENDATIONS[key].name === recommendation.name) || ''}
                        onChange={(e) => overrideDesign(e.target.value)}
                    >
                        {Object.entries(RECOMMENDATIONS).map(([key, rec]) => (
                            <option key={key} value={key}>{rec.name} ({rec.acronym})</option>
                        ))}
                    </select>
                     <button 
                        onClick={() => setStep(5)} 
                        className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 text-sm"
                     >
                         <ArrowLeft size={16} /> Back to Design
                     </button>
                </div>

                <ResultsView 
                    recommendation={recommendation} 
                    request={request}
                    onReset={reset}
                />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;