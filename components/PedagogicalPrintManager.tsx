
import React, { useState, useEffect } from 'react';
import { Printer, BookOpen, User, Calendar, FileText, ChevronDown } from 'lucide-react';
import { SESSIONS, MODULES, MODULE_CONTENTS, SPECIALTIES, CORRECTED_DISTRIBUTION } from '../constants';
import { TrainerConfig, TrainerAssignment, InstitutionConfig, GroupSchedule } from '../types';
import { formatDate } from '../utils';

const PedagogicalPrintManager: React.FC = () => {
    // Data State
    const [schedule, setSchedule] = useState<GroupSchedule[]>([]);
    const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    // UI State
    const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
    const [selectedModuleId, setSelectedModuleId] = useState<number>(0); // 0 = Select Module
    const [selectedTrainerKey, setSelectedTrainerKey] = useState<string>(''); // Key from assignments

    useEffect(() => {
        const savedSchedule = localStorage.getItem('takwin_schedule');
        if (savedSchedule) try { setSchedule(JSON.parse(savedSchedule)); } catch(e) {}

        const savedAssignments = localStorage.getItem('takwin_assignments');
        if (savedAssignments) try { setAssignments(JSON.parse(savedAssignments)); } catch(e) {}

        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) try { setTrainerConfig(JSON.parse(savedTrainers)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}
    }, []);

    // --- HELPER: Get Unique Trainers for Dropdown ---
    const getAvailableTrainers = () => {
        if (!selectedModuleId) return [];
        // Filter assignments for this session and module
        const relevantAssignments = assignments.filter(a => 
            a.sessionId === selectedSessionId && a.moduleId === selectedModuleId
        );
        
        // Extract unique trainer keys
        const uniqueKeys = Array.from(new Set(relevantAssignments.map(a => a.trainerKey)));
        
        return uniqueKeys.map(key => {
            let name = key;
            if (selectedModuleId === 1) {
                name = trainerConfig[1]?.names?.[key] || key;
            } else {
                name = trainerConfig[selectedModuleId]?.names?.[key] || `مكون ${key}`;
            }
            return { key, name };
        });
    };

    // --- HELPER: Get Syllabus Content ---
    const getSyllabus = () => {
        const content = MODULE_CONTENTS.find(c => c.moduleId === selectedModuleId);
        if (!content) return [];
        if (selectedSessionId === 1) return content.s1Topics;
        if (selectedSessionId === 2) return content.s2Topics;
        return content.s3Topics;
    };

    // --- HELPER: Get Specific Schedule for Trainer ---
    const getTrainerSchedule = () => {
        if (!selectedModuleId || !selectedTrainerKey) return [];

        // Find all slots assigned to this trainer in this session & module
        const myAssignments = assignments.filter(a => 
            a.sessionId === selectedSessionId && 
            a.moduleId === selectedModuleId && 
            a.trainerKey === selectedTrainerKey
        );

        // Map to a render-friendly format
        // We need date, time, and group name
        const currentSession = SESSIONS.find(s => s.id === selectedSessionId);
        if (!currentSession) return [];

        const start = new Date(currentSession.startDate);
        const end = new Date(currentSession.endDate);
        
        // Sort by day index and hour index
        myAssignments.sort((a, b) => a.dayIndex - b.dayIndex || a.hourIndex - b.hourIndex);

        return myAssignments.map(assign => {
            // Reconstruct Date from dayIndex
            // Note: This relies on the assumption that dayIndex maps to working days. 
            // Better to look it up in the actual schedule if possible, or re-calculate working days.
            // For simplicity and robustness, let's try to find the matching slot in the `schedule` object first.
            
            const [specId, groupNum] = assign.groupId.split('-');
            const groupSched = schedule.find(g => g.specialtyId === specId && g.groupId === parseInt(groupNum));
            
            let dateStr = "---";
            let timeStr = `${8 + assign.hourIndex}:00 - ${9 + assign.hourIndex}:00`;

            // Try to find the exact date from the generated schedule
            // We iterate days and match the dayIndex (assuming generated schedule is ordered)
            // A safer way is if we stored the date in assignment, but we didn't.
            // Let's use the GroupSchedule to find the date.
            if (groupSched && groupSched.days[assign.dayIndex]) {
                dateStr = groupSched.days[assign.dayIndex].date;
            }

            const specName = SPECIALTIES.find(s => s.id === specId)?.name || specId;

            return {
                date: dateStr,
                time: timeStr,
                group: `${specName} (ف${groupNum})`,
                rawDate: new Date(dateStr)
            };
        }).sort((a,b) => a.rawDate.getTime() - b.rawDate.getTime());
    };

    const handlePrint = () => {
        const content = document.getElementById('pedagogical-print-template');
        let printSection = document.getElementById('print-section');
        
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (content && printSection) {
            printSection.innerHTML = '';
            const clone = content.cloneNode(true) as HTMLElement;
            clone.classList.remove('hidden');
            printSection.appendChild(clone);
            window.print();
        }
    };

    const selectedTrainerName = getAvailableTrainers().find(t => t.key === selectedTrainerKey)?.name || '';
    const moduleName = MODULES.find(m => m.id === selectedModuleId)?.title || '';
    const sessionName = SESSIONS.find(s => s.id === selectedSessionId)?.name || '';
    const syllabus = getSyllabus();
    const trainerSchedule = getTrainerSchedule();

    // Stats
    const totalVolume = syllabus.reduce((acc, curr) => acc + curr.duration, 0);
    const assignedVolume = trainerSchedule.length; // Assuming 1 hour per slot

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* FORCE LANDSCAPE FOR THIS MODULE */}
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>

            {/* CONTROLS */}
            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <FileText className="w-6 h-6 text-indigo-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">وثيقة المهام البيداغوجية</h2>
                        <p className="text-slate-400 text-sm">طباعة وثيقة شاملة (البرنامج + التوقيت) لتسليمها للمؤطر</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">1. الدورة</label>
                        <select 
                            value={selectedSessionId} 
                            onChange={(e) => { setSelectedSessionId(parseInt(e.target.value)); setSelectedModuleId(0); setSelectedTrainerKey(''); }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                        >
                            {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">2. المقياس</label>
                        <select 
                            value={selectedModuleId} 
                            onChange={(e) => { setSelectedModuleId(parseInt(e.target.value)); setSelectedTrainerKey(''); }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value={0}>-- اختر المقياس --</option>
                            {MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">3. الأستاذ (المكلف)</label>
                        <select 
                            value={selectedTrainerKey} 
                            onChange={(e) => setSelectedTrainerKey(e.target.value)}
                            disabled={!selectedModuleId}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm disabled:opacity-50"
                        >
                            <option value="">-- اختر الأستاذ --</option>
                            {getAvailableTrainers().map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <button 
                            onClick={handlePrint}
                            disabled={!selectedTrainerKey}
                            className="w-full h-[38px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            طباعة الوثيقة
                        </button>
                    </div>
                </div>
            </div>

            {/* PREVIEW (Scaled Down) */}
            {selectedTrainerKey && (
                <div className="overflow-auto bg-slate-200 p-8 rounded-xl border border-slate-400 shadow-inner print:hidden">
                    <div className="scale-[0.6] origin-top-right w-[297mm] h-[210mm] bg-white text-black shadow-2xl mx-auto">
                        {/* We use the same content for preview and print */}
                        <PrintContent 
                            institution={institution}
                            sessionName={sessionName}
                            moduleName={moduleName}
                            trainerName={selectedTrainerName}
                            syllabus={syllabus}
                            schedule={trainerSchedule}
                            totalVolume={totalVolume}
                            assignedVolume={assignedVolume}
                        />
                    </div>
                </div>
            )}

            {/* ACTUAL PRINT TEMPLATE (Hidden) */}
            <div id="pedagogical-print-template" className="hidden">
                <div className="w-[297mm] h-[210mm] bg-white text-black p-[10mm] relative">
                     <PrintContent 
                        institution={institution}
                        sessionName={sessionName}
                        moduleName={moduleName}
                        trainerName={selectedTrainerName}
                        syllabus={syllabus}
                        schedule={trainerSchedule}
                        totalVolume={totalVolume}
                        assignedVolume={assignedVolume}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component for the actual paper content ---
const PrintContent: React.FC<{
    institution: InstitutionConfig;
    sessionName: string;
    moduleName: string;
    trainerName: string;
    syllabus: any[];
    schedule: any[];
    totalVolume: number;
    assignedVolume: number;
}> = ({ institution, sessionName, moduleName, trainerName, syllabus, schedule, totalVolume, assignedVolume }) => {
    return (
        <div className="h-full flex flex-col" style={{ direction: 'rtl' }}>
            
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
                <div className="text-center w-1/4 text-xs font-bold">
                    <p>الجمهورية الجزائرية الديمقراطية الشعبية</p>
                    <p>وزارة التربية الوطنية</p>
                    <p className="mt-1">مديرية التربية لولاية {institution.wilaya}</p>
                    <p>مركز التكوين: {institution.center}</p>
                </div>
                <div className="text-center flex-1 pt-2">
                    <h1 className="text-2xl font-black bg-gray-200 border-2 border-black inline-block px-8 py-1 rounded-lg">
                        وثيقة التكليف والبرنامج البيداغوجي
                    </h1>
                    <p className="font-bold mt-1 text-sm">{sessionName} (سنة 2025/2026)</p>
                </div>
                <div className="w-1/4 text-left pl-4 pt-2">
                    <div className="border border-black p-2 text-xs font-bold bg-gray-50 text-right">
                        <p>الأستاذ(ة): <span className="text-base">{trainerName}</span></p>
                        <p>المقياس: {moduleName}</p>
                        <p>الحجم الساعي المقرر: {totalVolume} سا</p>
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="flex gap-4 flex-1 items-stretch">
                
                {/* RIGHT COLUMN: SYLLABUS (65%) */}
                <div className="w-[65%] flex flex-col">
                    <h3 className="font-bold border-b border-black mb-1 flex items-center gap-2 text-sm bg-gray-100 p-1">
                        <BookOpen className="w-4 h-4" /> المحتوى المعرفي (البرنامج التفصيلي)
                    </h3>
                    <table className="w-full border-2 border-black text-xs text-center border-collapse flex-1">
                        <thead className="bg-gray-200 h-8">
                            <tr>
                                <th className="border border-black w-8">رقم</th>
                                <th className="border border-black">عناصر الدرس / الموضوع</th>
                                <th className="border border-black w-12">المدة</th>
                                <th className="border border-black w-24">تاريخ الإنجاز</th>
                                <th className="border border-black w-24">ملاحظات / توقيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syllabus.map((topic, idx) => (
                                <tr key={idx} className="h-10">
                                    <td className="border border-black font-bold">{idx + 1}</td>
                                    <td className="border border-black text-right px-2 font-bold">{topic.topic}</td>
                                    <td className="border border-black">{topic.duration} سا</td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                </tr>
                            ))}
                            {/* Fill empty rows if syllabus is short to maintain height */}
                            {syllabus.length < 10 && Array.from({length: 10 - syllabus.length}).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-10">
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* LEFT COLUMN: SCHEDULE (35%) */}
                <div className="w-[35%] flex flex-col">
                    <h3 className="font-bold border-b border-black mb-1 flex items-center gap-2 text-sm bg-gray-100 p-1">
                        <Calendar className="w-4 h-4" /> التوطين الزمني (رزنامة التدريس)
                    </h3>
                    <div className="border-2 border-black flex-1 flex flex-col">
                        {/* Header */}
                        <div className="flex bg-gray-200 border-b border-black text-xs font-bold py-1 text-center">
                            <div className="w-1/3 border-l border-black">التاريخ</div>
                            <div className="w-1/4 border-l border-black">التوقيت</div>
                            <div className="w-1/3">الفوج التربوي</div>
                        </div>
                        {/* Rows */}
                        <div className="flex-1 overflow-hidden">
                            {schedule.map((slot, idx) => (
                                <div key={idx} className="flex border-b border-gray-300 text-xs py-1.5 items-center hover:bg-gray-50">
                                    <div className="w-1/3 text-center border-l border-gray-300 px-1">
                                        <div className="font-bold">{formatDate(slot.date).split(' ')[0]}</div>
                                        <div className="text-[10px]">{formatDate(slot.date).split(' ').slice(1).join(' ')}</div>
                                    </div>
                                    <div className="w-1/4 text-center font-bold border-l border-gray-300" dir="ltr">
                                        {slot.time.replace(' - ', '-')}
                                    </div>
                                    <div className="w-1/3 text-center font-bold bg-black text-white rounded mx-1 py-0.5">
                                        {slot.group}
                                    </div>
                                </div>
                            ))}
                            {schedule.length === 0 && (
                                <div className="p-4 text-center text-gray-500 italic text-xs">لا توجد حصص مبرمجة في هذه الدورة</div>
                            )}
                        </div>
                        {/* Schedule Footer Summary */}
                        <div className="bg-gray-100 border-t-2 border-black p-2 text-xs font-bold flex justify-between">
                            <span>عدد الحصص المبرمجة: {schedule.length}</span>
                            <span>المجموع الساعي: {assignedVolume} سا</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER SIGNATURES */}
            <div className="h-20 mt-4 flex justify-between items-end px-12 pb-2">
                <div className="text-center">
                    <p className="font-bold text-sm mb-8">إمضاء الأستاذ(ة):</p>
                    <p className="text-xs">التاريخ: ....................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-sm mb-8">المدير البيداغوجي:</p>
                    <p className="text-xs">ختم المركز</p>
                </div>
            </div>
        </div>
    );
};

export default PedagogicalPrintManager;
