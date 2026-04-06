import React from 'react';
import { FactorDefinition } from '../types';
import { ChevronRight, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface FactorSettingsProps {
    factors: FactorDefinition[];
    onUpdate: (updatedFactors: FactorDefinition[]) => void;
    onNext: () => void;
    onBack: () => void;
}

const FactorSettings: React.FC<FactorSettingsProps> = ({ factors, onUpdate, onNext, onBack }) => {

    const handleChange = (index: number, field: keyof FactorDefinition, value: string | number) => {
        const updated = [...factors];
        updated[index] = { ...updated[index], [field]: value };
        onUpdate(updated);
    };

    const addFactor = () => {
        onUpdate([...factors, { name: `Factor ${factors.length + 1}`, unit: '', low: '', high: '', levels: 2 }]);
    };

    const removeFactor = (index: number) => {
        const updated = factors.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    // Removed check for f.unit to make it optional
    const isComplete = factors.length > 0 && factors.every(f => f.name && f.low && f.high && f.levels);

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-science-900">Define Factor Levels</h2>
            <p className="text-sm text-gray-600 mb-6">
                Specify the experimental range and number of levels for each factor.
            </p>

            <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-science-50 border-b border-science-100">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Factor Name</th>
                            <th className="px-4 py-3">Unit (Optional)</th>
                            <th className="px-4 py-3 w-20"># Levels</th>
                            <th className="px-4 py-3">Low Level (-1)</th>
                            <th className="px-4 py-3">High Level (+1)</th>
                            <th className="px-4 py-3 rounded-tr-lg w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {factors.map((factor, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-gray-300 rounded focus:border-science-500 focus:outline-none font-medium text-science-800"
                                        value={factor.name}
                                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        placeholder="mg, ml" 
                                        className="w-full p-2 border border-gray-300 rounded focus:border-science-500 focus:outline-none"
                                        value={factor.unit || ''}
                                        onChange={(e) => handleChange(idx, 'unit', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                     <input 
                                        type="number" 
                                        min="2"
                                        max="10"
                                        className="w-full p-2 border border-gray-300 rounded focus:border-science-500 focus:outline-none"
                                        value={factor.levels || 2}
                                        onChange={(e) => handleChange(idx, 'levels', parseInt(e.target.value))}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 100" 
                                        className="w-full p-2 border border-gray-300 rounded focus:border-science-500 focus:outline-none"
                                        value={factor.low}
                                        onChange={(e) => handleChange(idx, 'low', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 500" 
                                        className="w-full p-2 border border-gray-300 rounded focus:border-science-500 focus:outline-none"
                                        value={factor.high}
                                        onChange={(e) => handleChange(idx, 'high', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button 
                                        onClick={() => removeFactor(idx)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <button 
                    onClick={addFactor}
                    className="flex items-center gap-2 text-science-600 font-bold text-sm hover:bg-science-50 px-4 py-2 rounded transition-colors"
                >
                    <Plus size={16} /> Add Factor
                </button>
            </div>

            <div className="mt-8 flex justify-between">
                <button 
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Back
                </button>
               <button 
                onClick={onNext} 
                disabled={!isComplete}
                className="bg-science-600 text-white px-6 py-3 rounded-lg hover:bg-science-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
               >
                 Next <ChevronRight size={18} />
               </button>
            </div>
        </div>
    );
};

export default FactorSettings;