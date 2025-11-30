
import React, { useState, useEffect } from 'react';
import { Download, Printer, Save, FileText } from 'lucide-react';
import { TrainerAssignment, TrainerConfig, Specialty, InstitutionConfig } from '../types';
import { MODULES, CORRECTED_DISTRIBUTION, SESSIONS } from '../constants';

interface TrainerAttributionProps {
    sessionId: number;
    assignments: TrainerAssignment[];
    trainerConfig: TrainerConfig;
    specialties: Specialty[];
    institution: InstitutionConfig;
}

const TrainerAttribution: React.FC<TrainerAttributionProps> = ({ 
    sessionId, 
    assignments, 
    trainerConfig, 
    specialties,
    institution 
}) => {
    // State for Ranks (stored locally as they are not in main DB)
    const [ranks, setRanks] = useState<Record<string, string>>({});
    const [currentSessionId, setCurrentSessionId] = useState(sessionId);

    // Sync prop changes
    useEffect(() => {
        setCurrentSessionId(sessionId);
    }, [sessionId]);

    // Load ranks
    useEffect(() => {
        const savedRanks = localStorage.getItem('takwin_trainer_ranks');
        if (savedRanks) {
            try { setRanks(JSON.parse(savedRanks)); } catch(e) {}
        }
    }, []);

    const handleRankChange = (trainerKey: string, val: string) => {
        const newRanks = { ...ranks, [trainerKey]: val };
        setRanks(newRanks);
        localStorage.setItem('takwin_trainer_ranks', JSON.stringify(newRanks));
    };

    // --- DATA AGGREGATION LOGIC ---
    const getAttributionData = () => {
        // 1. Filter assignments for current session
        const sessionAssignments = assignments.filter(a => a.sessionId === currentSessionId);

        // 2. Identify unique (Trainer, Module) pairs
        const groupingMap = new Map<string, {
            moduleId: number;
            trainerKey: string;
            trainerName: string;
            groups: Set<string>; // Set of group IDs (e.g., "pe-1")
        }>();

        sessionAssignments.forEach(a => {
            // Skip supervisor placeholders if any
            if (a.moduleId === 999) return;

            const key = `${a.moduleId}-${a.trainerKey}`;
            if (!groupingMap.has(key)) {
                let tName = "";
                if (a.moduleId === 1) {
                    tName = trainerConfig[1]?.names?.[a.trainerKey] || a.trainerKey;
                } else {
                    tName = trainerConfig[a.moduleId]?.names?.[a.trainerKey] || `مكون ${a.trainerKey}`;
                }

                groupingMap.set(key, {
                    moduleId: a.moduleId,
                    trainerKey: a.trainerKey,
                    trainerName: tName,
                    groups: new Set()
                });
            }
            groupingMap.get(key)?.groups.add(a.groupId);
        });

        // 3. Convert to Array and Calculate Hours
        const rows = Array.from(groupingMap.values()).map(item => {
            const groupList = Array.from(item.groups);
            
            // Get hourly volume for this module in this session
            const dist = CORRECTED_DISTRIBUTION.find(d => d.moduleId === item.moduleId);
            let hoursPerGroup = 0;
            if (dist) {
                if (currentSessionId === 1) hoursPerGroup = dist.s1;
                else if (currentSessionId === 2) hoursPerGroup = dist.s2;
                else if (currentSessionId === 3) hoursPerGroup = Math.max(0, dist.s3 - 2); 
            }

            const totalHours = groupList.length * hoursPerGroup;

            return {
                ...item,
                groupList: groupList.sort(), // Sort groups
                hoursPerGroup,
                totalHours
            };
        });

        // Sort by Module ID then Trainer Name
        return rows.sort((a, b) => a.moduleId - b.moduleId || a.trainerName.localeCompare(b.trainerName));
    };

    const attributionRows = getAttributionData();
    const currentSessionName = SESSIONS.find(s => s.id === currentSessionId)?.name || '';
    const currentSessionYear = "2025/2026"; 

    // --- FIXED PRINT HANDLER ---
    const handlePrint = () => {
        const content = document.getElementById('attribution-table-content');
        let printSection = document.getElementById('print-section');
        
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (content && printSection) {
            printSection.innerHTML = '';
            // We need to clone the node to avoid moving it from the main view
            const clone = content.cloneNode(true) as HTMLElement;
            
            // Ensure inputs in the clone reflect current values
            const originalInputs = content.querySelectorAll('input');
            const clonedInputs = clone.querySelectorAll('input');
            originalInputs.forEach((input, index) => {
                if (clonedInputs[index]) clonedInputs[index].value = input.value;
            });

            printSection.appendChild(clone);
            window.print();
        }
    };

    const handleExportWord = () => {
        const content = document.getElementById('attribution-table-content')?.innerHTML;
        if (!content) return;

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Attribution Table</title>
            <style>
                @page { size: landscape; margin: 1cm; }
                body { font-family: 'Times New Roman', serif; text-align: right; direction: rtl; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 12pt; }
                td, th { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; }
                .header { text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 14pt; }
                .text-content { text-align: justify; margin-bottom: 15px; font-size: 12pt; line-height: 1.5; }
                .bold { font-weight: bold; }
                .bg-gray { background-color: #f0f0f0; }
            </style>
            </head><body>`;
        
        let cleanContent = content.replace(/<input.*?value="(.*?)".*?>/g, "$1");
        cleanContent = cleanContent.replace(/<button.*?<\/button>/g, "");

        const sourceHTML = header + cleanContent + "</body></html>";
        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `جدول_الاسناد_${currentSessionName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* FORCE LANDSCAPE CSS FOR THIS COMPONENT */}
            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Ensure table fits */
                    #attribution-table-content {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>

            {/* Controls */}
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded-2xl shadow-lg border border-slate-800/60 print:hidden flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <label className="text-slate-300 font-bold">اختر الدورة:</label>
                    <select 
                        value={currentSessionId} 
                        onChange={(e) => setCurrentSessionId(parseInt(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-4 py-2 text-white outline-none focus:border-blue-500"
                    >
                        {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportWord} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                        <FileText className="w-4 h-4" /> تصدير Word
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                        <Printer className="w-4 h-4" /> طباعة
                    </button>
                </div>
            </div>

            {/* Preview / Print Area */}
            <div className="bg-white text-black p-8 rounded-xl shadow-xl overflow-x-auto print:shadow-none print:p-0">
                <div id="attribution-table-content" className="w-full mx-auto" style={{ direction: 'rtl' }}>
                    
                    {/* Header - Improved Layout */}
                    <div className="mb-8">
                        <div className="text-center mb-6">
                            <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                            <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                        </div>
                        
                        <div className="flex justify-between items-start text-sm font-bold px-2 relative">
                            {/* Right Side */}
                            <div className="text-right leading-relaxed w-1/3">
                                <p>مديرية التربية لولاية {institution.wilaya || '...................'}</p>
                                <p>مصلحة المستخدمين والتكوين والتفتيش</p>
                                <p>مركز التكوين: {institution.center || '...................'}</p>
                            </div>

                            {/* Left Side - Adjusted Alignment */}
                            <div className="text-left w-1/3 pl-16">
                                <div className="inline-block text-right">
                                    <p className="mb-1">إلى السيد</p>
                                    <p className="mb-1">مديـر التـربـيـة</p>
                                    <p className="text-xs font-normal">(مكتب التكوين والتفتيش)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="text-center mb-6 px-4">
                        <p className="font-bold text-lg underline mb-2">
                            الموضوع: جدول توضيحي للحجم الساعي لدورة التكوين البيداغوجي التحضيري ({currentSessionYear}).
                        </p>
                        <p className="text-justify leading-relaxed indent-8 max-w-5xl mx-auto">
                            يشرفني أن أضع بين أيديكم جدول توضيحي للحجم الساعي لدورة التكوين البيداغوجي التحضيري لفائدة أساتذة المدرسة الابتدائية المدمجين - {currentSessionName}.
                        </p>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-black text-center text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-2 w-12">الرقم</th>
                                <th className="border border-black p-2 w-1/4">المقياس</th>
                                <th className="border border-black p-2 w-1/4">أستاذ الدورة</th>
                                <th className="border border-black p-2 w-32">الرتبة</th>
                                <th className="border border-black p-2 w-32">الفوج</th>
                                <th className="border border-black p-2 w-20">الحجم الساعي</th>
                                <th className="border border-black p-2 w-20">الحجم الساعي للمؤطر</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attributionRows.map((row, idx) => (
                                <tr key={`${row.moduleId}-${row.trainerKey}`}>
                                    <td className="border border-black p-2 font-bold">{idx + 1}</td>
                                    <td className="border border-black p-2 font-bold text-right px-3">{MODULES.find(m => m.id === row.moduleId)?.title}</td>
                                    <td className="border border-black p-2 font-bold">{row.trainerName}</td>
                                    <td className="border border-black p-1">
                                        <input 
                                            type="text" 
                                            className="w-full text-center outline-none bg-transparent placeholder-gray-400 print:placeholder-transparent font-bold text-gray-800"
                                            placeholder="ادخل الرتبة..."
                                            value={ranks[`${row.moduleId}-${row.trainerKey}`] || ''}
                                            onChange={(e) => handleRankChange(`${row.moduleId}-${row.trainerKey}`, e.target.value)}
                                        />
                                    </td>
                                    <td className="border border-black p-1 text-xs">
                                        {row.groupList.map((grpId, i) => {
                                            const [sId, gNum] = grpId.split('-');
                                            const specName = specialties.find(s => s.id === sId)?.name;
                                            return (
                                                <div key={grpId} className={`py-1 ${i < row.groupList.length - 1 ? 'border-b border-gray-300' : ''}`}>
                                                    {specName} - ف{gNum}
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="border border-black p-1 text-xs font-bold">
                                        {row.groupList.map((grpId, i) => (
                                            <div key={grpId} className={`py-1 ${i < row.groupList.length - 1 ? 'border-b border-gray-300' : ''}`}>
                                                {String(row.hoursPerGroup).padStart(2, '0')} ساعات
                                            </div>
                                        ))}
                                    </td>
                                    <td className="border border-black p-2 font-black text-lg bg-gray-50">
                                        {row.totalHours}
                                    </td>
                                </tr>
                            ))}
                            {attributionRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">لا توجد بيانات توزيع لهذه الدورة بعد. يرجى توليد الجدول أولاً.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-12 flex justify-end px-16">
                        <div className="text-center font-bold">
                            <p className="mb-12">المدير البيداغوجي</p>
                            <p>........................</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TrainerAttribution;