import React, { useState } from 'react';
import { ResponseDefinition } from '../types';
import { ChevronRight, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface CQASettingsProps {
    responses: ResponseDefinition[];
    onUpdate: (updated: ResponseDefinition[]) => void;
    onNext: () => void;
    onBack: () => void;
}

const CQASettings: React.FC<CQASettingsProps> = ({ responses, onUpdate, onNext, onBack }) => {
    const [newCQA, setNewCQA] = useState<ResponseDefinition>({
        name: '',
        unit: '',
        goal: 'Maximize'
    });

    const addCQA = () => {
        if (!newCQA.name) return;
        onUpdate([...responses, newCQA]);
        setNewCQA({ name: '', unit: '', goal: 'Maximize' });
    };

    const removeCQA = (index: number) => {
        const updated = responses.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-science-900">Define Critical Quality Attributes (CQAs)</h2>
            <p className="text-sm text-gray-600 mb-6">
                What are you measuring? Define the responses (dependent variables) for your experiment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end bg-science-50 p-4 rounded-lg border border-science-100">
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Response Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Particle Size"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newCQA.name}
                        onChange={(e) => setNewCQA({...newCQA, name: e.target.value})}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Unit</label>
                    <input 
                        type="text" 
                        placeholder="e.g. nm"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newCQA.unit}
                        onChange={(e) => setNewCQA({...newCQA, unit: e.target.value})}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Goal</label>
                    <select 
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newCQA.goal}
                        onChange={(e) => setNewCQA({...newCQA, goal: e.target.value as any})}
                    >
                        <option value="Maximize">Maximize</option>
                        <option value="Minimize">Minimize</option>
                        <option value="Target">Target Value</option>
                    </select>
                </div>
                <div className="md:col-span-1">
                    <button 
                        onClick={addCQA}
                        disabled={!newCQA.name}
                        className="w-full bg-science-600 text-white p-2 rounded hover:bg-science-700 disabled:opacity-50 text-sm font-bold flex justify-center items-center gap-2"
                    >
                        <Plus size={16} /> Add CQA
                    </button>
                </div>
            </div>

            <div className="space-y-2 mb-8">
                {responses.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-science-100 text-science-700 flex items-center justify-center font-bold text-sm">
                                Y{idx + 1}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{res.name}</p>
                                <p className="text-xs text-gray-500">{res.unit} • {res.goal}</p>
                            </div>
                        </div>
                        <button onClick={() => removeCQA(idx)} className="text-red-400 hover:text-red-600 p-2">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {responses.length === 0 && (
                    <p className="text-center text-gray-400 italic py-4">No responses defined yet.</p>
                )}
            </div>

            <div className="flex justify-between">
                <button 
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Back
                </button>
               <button 
                onClick={onNext} 
                disabled={responses.length === 0}
                className="bg-science-600 text-white px-6 py-3 rounded-lg hover:bg-science-700 disabled:opacity-50 font-medium flex items-center gap-2"
               >
                 Next Step <ChevronRight size={18} />
               </button>
            </div>
        </div>
    );
};

export default CQASettings;