import React, { useState } from 'react';
import { FISHBONE_CATEGORIES } from '../constants';
import { Plus, X, ChevronRight } from 'lucide-react';

interface FishboneProps {
    onFactorsChange: (factorNames: string[]) => void;
}

const FishboneDiagram: React.FC<FishboneProps> = ({ onFactorsChange }) => {
    const [factors, setFactors] = useState<Record<string, string[]>>({
        "Material Attributes": [],
        "Process Parameters": [],
        "Environment": [],
        "Methods": [],
        "Equipment": []
    });
    const [inputs, setInputs] = useState<Record<string, string>>({});

    // Helper to emit changes
    const emitChanges = (newFactors: Record<string, string[]>) => {
        const flatList = Object.values(newFactors).flat();
        // Just pass the list of names
        onFactorsChange(flatList);
    };

    const handleAdd = (category: string) => {
        const val = inputs[category];
        if (!val || val.trim() === "") return;
        
        const newFactors = {
            ...factors,
            [category]: [...(factors[category] || []), val]
        };
        setFactors(newFactors);
        setInputs({ ...inputs, [category]: "" });
    };

    const handleRemove = (category: string, index: number) => {
        const newFactors = {
            ...factors,
            [category]: factors[category].filter((_, i) => i !== index)
        };
        setFactors(newFactors);
    };

    const hasFactors = Object.values(factors).flat().length > 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-bold text-science-900 mb-2">Ishikawa (Fishbone) Diagram Builder</h3>
            <p className="text-sm text-gray-600 mb-6 italic">
                As described in Hathout, R.M. (2022). Teaching Principles of DoE as an Element of QbD for Pharmacy Students. In: Saharan, V.A. (eds) Computer Aided Pharmaceutics and Drug Delivery. Springer, Singapore. Use the Fishbone diagram to brainstorm independent variables (Causes) that affect your formulation (Effect).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FISHBONE_CATEGORIES.map((cat) => (
                    <div key={cat} className="border border-science-100 rounded bg-science-50 p-3">
                        <h4 className="font-semibold text-science-800 text-sm mb-2">{cat}</h4>
                        <ul className="space-y-1 mb-2 min-h-[40px]">
                            {factors[cat]?.map((f, i) => (
                                <li key={i} className="flex justify-between items-center text-xs bg-white px-2 py-1 rounded shadow-sm">
                                    <span>{f}</span>
                                    <button onClick={() => handleRemove(cat, i)} className="text-red-400 hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </li>
                            ))}
                            {(!factors[cat] || factors[cat].length === 0) && (
                                <li className="text-xs text-gray-400 italic">No factors added</li>
                            )}
                        </ul>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-science-500"
                                placeholder="Add factor..."
                                value={inputs[cat] || ""}
                                onChange={(e) => setInputs({...inputs, [cat]: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd(cat)}
                            />
                            <button 
                                onClick={() => handleAdd(cat)}
                                className="bg-science-600 text-white rounded p-1 hover:bg-science-800"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 flex justify-between items-center">
                 <div className="flex-1 flex items-center justify-end pr-4">
                     <div className="h-1 bg-science-900 flex-1 relative max-w-[200px]">
                        <div className="absolute right-0 -top-2 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-science-900 border-b-[8px] border-b-transparent"></div>
                     </div>
                     <div className="ml-4 border-2 border-science-900 p-4 rounded text-center font-bold text-science-900 w-32">
                         CQA / Response
                     </div>
                 </div>

                <button 
                    onClick={() => emitChanges(factors)} 
                    disabled={!hasFactors}
                    className="bg-science-600 text-white px-6 py-3 rounded-lg hover:bg-science-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Define Levels <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default FishboneDiagram;