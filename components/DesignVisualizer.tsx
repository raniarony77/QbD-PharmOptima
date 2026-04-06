import React from 'react';

interface VisualizerProps {
    acronym: string;
}

const DesignVisualizer: React.FC<VisualizerProps> = ({ acronym }) => {
    // Helper for dots
    const Dot = ({ cx, cy, color = "#0284c7", r = 6 }: any) => (
        <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth="2" />
    );

    const renderDiagram = () => {
        const isMixture = ['SLD', 'D-Opt Mix'].includes(acronym);
        const isBBD = acronym === 'BBD';
        const isCCD = acronym === 'CCD';
        const isFFD = acronym === 'FFD';
        const isTaguchi = ['Taguchi', 'PBD'].includes(acronym);

        if (isMixture) {
            return (
                <svg viewBox="0 0 300 260" className="w-full h-64 drop-shadow-md">
                    {/* Triangle */}
                    <path d="M30,230 L150,30 L270,230 Z" fill="#f0f9ff" stroke="#94a3b8" strokeWidth="3" />
                    <text x="150" y="20" textAnchor="middle" className="text-xs font-bold fill-slate-600">Component A</text>
                    <text x="20" y="250" textAnchor="middle" className="text-xs font-bold fill-slate-600">B</text>
                    <text x="280" y="250" textAnchor="middle" className="text-xs font-bold fill-slate-600">C</text>
                    
                    {/* Lattice Points (Simplex) */}
                    <Dot cx="150" cy="30" /> {/* Top */}
                    <Dot cx="30" cy="230" /> {/* Left */}
                    <Dot cx="270" cy="230" /> {/* Right */}
                    <Dot cx="90" cy="130" /> {/* Mid Left */}
                    <Dot cx="210" cy="130" /> {/* Mid Right */}
                    <Dot cx="150" cy="230" /> {/* Bottom Mid */}
                    <Dot cx="150" cy="150" color="#ef4444" r={7} /> {/* Center (Centroid) */}
                </svg>
            );
        }

        // 3D Cube Representation for Surface/Screening
        return (
            <svg viewBox="0 0 300 300" className="w-full h-64 drop-shadow-md">
                {/* Back Face */}
                <path d="M100,100 L220,100 L220,220 L100,220 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="5" />
                {/* Connecting Lines */}
                <line x1="60" y1="60" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="3" />
                <line x1="180" y1="60" x2="220" y2="100" stroke="#cbd5e1" strokeWidth="3" />
                <line x1="60" y1="180" x2="100" y2="220" stroke="#cbd5e1" strokeWidth="3" />
                <line x1="180" y1="180" x2="220" y2="220" stroke="#cbd5e1" strokeWidth="3" />
                {/* Front Face */}
                <path d="M60,60 L180,60 L180,180 L60,180 Z" fill="none" stroke="#94a3b8" strokeWidth="3" />
                
                {/* Points Logic */}
                {/* FFD: Corners only */}
                {(isFFD || isCCD) && (
                    <>
                        {/* Front Corners */}
                        <Dot cx="60" cy="60" /> <Dot cx="180" cy="60" />
                        <Dot cx="60" cy="180" /> <Dot cx="180" cy="180" />
                        {/* Back Corners */}
                        <Dot cx="100" cy="100" color="#94a3b8" /> <Dot cx="220" cy="100" color="#94a3b8" />
                        <Dot cx="100" cy="220" color="#94a3b8" /> <Dot cx="220" cy="220" color="#94a3b8" />
                    </>
                )}

                {/* BBD: Mid-edges only */}
                {isBBD && (
                    <>
                         {/* Front Face Mids */}
                         <Dot cx="120" cy="60" /> <Dot cx="120" cy="180" /> 
                         <Dot cx="60" cy="120" /> <Dot cx="180" cy="120" />
                         {/* Connecting Mids */}
                         <Dot cx="80" cy="80" /> <Dot cx="200" cy="80" />
                         <Dot cx="80" cy="200" /> <Dot cx="200" cy="200" />
                         {/* Back Face Mids */}
                         <Dot cx="160" cy="100" color="#94a3b8" /> <Dot cx="160" cy="220" color="#94a3b8" />
                         <Dot cx="100" cy="160" color="#94a3b8" /> <Dot cx="220" cy="160" color="#94a3b8" />
                    </>
                )}

                {/* Center Point (Common for Opt) */}
                {(!isTaguchi) && <Dot cx="140" cy="140" color="#ef4444" r={7} />}

                {/* CCD: Star Points (Outside faces) */}
                {isCCD && (
                    <>
                         <Dot cx="120" cy="30" color="#eab308" /> {/* Top Alpha */}
                         <Dot cx="120" cy="210" color="#eab308" /> {/* Bottom Alpha */}
                         <Dot cx="20" cy="120" color="#eab308" /> {/* Left Alpha */}
                         <Dot cx="240" cy="120" color="#eab308" /> {/* Right Alpha */}
                    </>
                )}
            </svg>
        );
    };

    return (
        <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-300 shadow-sm w-full">
            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-6">Design Geometry (Conceptual)</h4>
            {renderDiagram()}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-science-600 border border-white shadow-sm"></span> Factorial</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></span> Center</div>
                {acronym === 'CCD' && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 border border-white shadow-sm"></span> Axial</div>}
            </div>
        </div>
    );
};

export default DesignVisualizer;