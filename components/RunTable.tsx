import React, { useState } from 'react';
import { ExperimentalRun, FactorDefinition, ResponseDefinition } from '../types';
import { ClipboardCopy, ClipboardPaste, Check, Table, X } from 'lucide-react';

interface RunTableProps {
    runs: ExperimentalRun[];
    factors: FactorDefinition[];
    responses: ResponseDefinition[];
    onUpdateCell: (runId: number, type: 'factor' | 'response', name: string, value: string) => void;
    onBulkUpdate: (updates: { runId: number, type: 'factor' | 'response', name: string, value: string }[]) => void;
}

const RunTable: React.FC<RunTableProps> = ({ runs, factors, responses, onUpdateCell, onBulkUpdate }) => {
    const [copied, setCopied] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [manualPasteData, setManualPasteData] = useState('');

    const handleCopy = () => {
        // Header
        const headers = ['Run #', ...factors.map(f => f.name), ...responses.map(r => r.name)].join('\t');
        // Rows
        const rows = runs.map(r => {
            const fVals = factors.map(f => r.factors[f.name]);
            const rVals = responses.map(res => r.results[res.name] || '');
            return [r.id, ...fVals, ...rVals].join('\t');
        }).join('\n');
        
        navigator.clipboard.writeText(`${headers}\n${rows}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePaste = async () => {
        try {
            if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
            const text = await navigator.clipboard.readText();
            processPaste(text);
        } catch (err) {
            console.warn("Clipboard API blocked, falling back to manual paste.", err);
            setShowPasteModal(true);
        }
    };

    const handleManualPasteSubmit = () => {
        if (manualPasteData.trim()) {
            processPaste(manualPasteData);
        }
        setShowPasteModal(false);
        setManualPasteData('');
    };

    const normalize = (s: string) => s.trim().toLowerCase();

    const processPaste = (text: string) => {
        const rows = text.trim().split(/\r\n|\n|\r/).filter(r => r.trim() !== '');
        if (rows.length === 0) return;

        const firstRowCols = rows[0].split('\t');
        const headerMap: Record<string, number> = {};
        firstRowCols.forEach((col, i) => headerMap[normalize(col)] = i);

        // Check for headers matching schema
        const responseNames = responses.map(r => normalize(r.name));
        const factorNames = factors.map(f => normalize(f.name));
        
        const hasKnownHeaders = responseNames.some(r => headerMap[r] !== undefined) || 
                                factorNames.some(f => headerMap[f] !== undefined) ||
                                headerMap['run #'] !== undefined || headerMap['id'] !== undefined;

        const updates: { runId: number, type: 'factor' | 'response', name: string, value: string }[] = [];

        // SCENARIO 1: Structured Paste (Headers Detected)
        if (hasKnownHeaders) {
            const dataRows = rows.slice(1);
            const idColIdx = headerMap['run #'] !== undefined ? headerMap['run #'] : headerMap['id'];

            dataRows.forEach((row, idx) => {
                const cols = row.split('\t');
                let runId = -1;

                // Match by ID
                if (idColIdx !== undefined && cols[idColIdx]) {
                    const parsedId = parseInt(cols[idColIdx]);
                    if (!isNaN(parsedId)) runId = parsedId;
                } 
                
                // Fallback to sequential
                if (runId === -1 && idx < runs.length) {
                    runId = runs[idx].id;
                }

                if (runId !== -1) {
                    // Update Factors
                    factors.forEach(f => {
                        const key = normalize(f.name);
                        const colIdx = headerMap[key];
                        if (colIdx !== undefined && cols[colIdx] !== undefined) {
                             const val = cols[colIdx].trim();
                             if (val !== '') updates.push({ runId, type: 'factor', name: f.name, value: val });
                        }
                    });

                    // Update Responses
                    responses.forEach(res => {
                        const key = normalize(res.name);
                        const colIdx = headerMap[key];
                        if (colIdx !== undefined && cols[colIdx] !== undefined) {
                            const val = cols[colIdx].trim();
                            if (val !== '') updates.push({ runId, type: 'response', name: res.name, value: val });
                        }
                    });
                }
            });
        } 
        // SCENARIO 2: Unstructured Data Paste (Assuming just responses, or try to infer)
        else {
             // For safety in unstructured paste, we prioritize just pasting RESULTS if headers aren't clear
             // Or if column count matches exactly.
             const totalExpected = 1 + factors.length + responses.length;
             
             rows.forEach((row, i) => {
                 if (i >= runs.length) return;
                 const runId = runs[i].id;
                 const cols = row.split('\t');
                 
                 // If columns roughly match full table
                 if (cols.length >= totalExpected - 1) {
                     // Assume order: ID, Factor1...FactorN, Response1...ResponseM
                     // factors start at index 1 (after ID)
                     factors.forEach((f, fIdx) => {
                         const val = cols[fIdx + 1]; // +1 for ID skip
                         if (val) updates.push({ runId, type: 'factor', name: f.name, value: val.trim() });
                     });
                     
                     // responses start after factors
                     const resStart = 1 + factors.length;
                     responses.forEach((r, rIdx) => {
                         const val = cols[resStart + rIdx];
                         if (val) updates.push({ runId, type: 'response', name: r.name, value: val.trim() });
                     });
                 } else {
                     // Assume just responses
                     responses.forEach((r, rIdx) => {
                         const val = cols[rIdx];
                         if (val) updates.push({ runId, type: 'response', name: r.name, value: val.trim() });
                     });
                 }
             });
        }

        if (updates.length > 0) {
            onBulkUpdate(updates);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center bg-science-50 p-2 rounded-lg border border-science-100">
                <div className="text-xs text-science-800 flex items-center gap-2 px-2">
                    <Table size={16}/>
                    <span className="font-semibold">Results Data Entry</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-science-700 bg-white border border-science-200 rounded hover:bg-science-50 transition-colors shadow-sm"
                        title="Copy table to clipboard for Excel"
                    >
                        {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                        {copied ? 'Copied!' : 'Copy Table'}
                    </button>
                    <button 
                        onClick={handlePaste}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors shadow-sm"
                        title="Paste data from Excel"
                    >
                        <ClipboardPaste size={14} />
                        Paste Data
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 border-r w-16">Run #</th>
                            {/* Factors */}
                            {factors.map((f, i) => (
                                <th key={`f-${i}`} className="px-2 py-3 bg-slate-50 text-slate-700 border-r min-w-[100px]">
                                    {f.name} <span className="text-slate-400 normal-case">{f.unit ? `(${f.unit})` : ''}</span>
                                </th>
                            ))}
                            {/* Responses */}
                            {responses.map((r, i) => (
                                <th key={`r-${i}`} className="px-2 py-3 bg-yellow-50 text-yellow-800 border-r border-yellow-100 min-w-[100px]">
                                    <div className="flex flex-col">
                                        <span>{r.name}</span>
                                        <span className="text-[10px] lowercase font-normal text-yellow-600">{r.unit || 'value'}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map((run) => (
                            <tr key={run.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-bold border-r text-gray-500 bg-gray-50/50">{run.id}</td>
                                
                                {/* Factor Inputs */}
                                {factors.map((f) => (
                                    <td key={`fv-${f.name}`} className="px-0 py-0 border-r bg-slate-50/30">
                                        <input 
                                            type="number" 
                                            step="any"
                                            className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-slate-400 outline-none transition-all text-slate-700"
                                            value={run.factors[f.name]}
                                            onChange={(e) => onUpdateCell(run.id, 'factor', f.name, e.target.value)}
                                        />
                                    </td>
                                ))}

                                {/* Response Inputs */}
                                {responses.map((r) => (
                                    <td key={`rv-${r.name}`} className="px-0 py-0 border-r bg-yellow-50/30">
                                        <input 
                                            type="number" 
                                            step="any"
                                            className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-science-500 outline-none transition-all"
                                            placeholder="-"
                                            value={run.results[r.name] || ''}
                                            onChange={(e) => onUpdateCell(run.id, 'response', r.name, e.target.value)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-xs text-gray-400 text-right mt-1">
                Tip: You can edit both Factor and Result values. Copy/Paste Full tables from Excel is supported.
            </div>

            {/* Fallback Paste Modal */}
            {showPasteModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 m-4">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ClipboardPaste size={18} className="text-science-600"/>
                                Import Data
                            </h3>
                            <button 
                                onClick={() => setShowPasteModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4 flex items-start gap-2">
                                <div className="mt-0.5"><Table size={16}/></div>
                                <p>
                                    Your browser security settings prevented automatic access. 
                                    Please <strong>Press Ctrl+V (or Cmd+V)</strong> in the box below to paste your Excel data, then click Import.
                                </p>
                            </div>
                            <textarea
                                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-science-500 focus:border-science-500 outline-none resize-none"
                                placeholder={`Run #\tFactor A\tFactor B\tResponse 1\n1\t10\t5\t98.5\n...`}
                                value={manualPasteData}
                                onChange={(e) => setManualPasteData(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowPasteModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleManualPasteSubmit}
                                className="px-6 py-2 text-sm font-bold text-white bg-science-600 hover:bg-science-700 rounded-lg shadow-sm transition-all"
                            >
                                Import Data
                            </button>
                        </div>
                    </div>
                 </div>
             )}
        </div>
    );
};

export default RunTable;