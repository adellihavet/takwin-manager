
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, Printer, FileText, Mic, MicOff, Download, ChevronLeft, ChevronRight, PenTool, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { ReportConfig, SummaryData, InstitutionConfig, Specialty, TrainerConfig, Trainee, AttendanceRecord, EvaluationDatabase } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS, MODULES, CORRECTED_DISTRIBUTION } from '../constants';
import { formatDate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

// --- PRINT FRIENDLY COLORS ---
const PRINT_COLORS = {
    male: '#2563eb',    // Blue
    female: '#db2777',  // Pink
    barPrimary: '#475569', // Slate 600
    barSecondary: '#94a3b8', // Slate 400
    success: '#16a34a',
    warning: '#ca8a04',
    danger: '#dc2626'
};

const DEFAULT_SUMMARY: SummaryData = {
    introduction: '',
    pedagogicalActivities: '',
    administrativeConditions: '',
    difficulties: '',
    recommendations: '',
    conclusion: ''
};

const INITIAL_REPORTS: ReportConfig = {
    s1: { ...DEFAULT_SUMMARY, introduction: 'انطلقت الدورة التكوينية الأولى يوم...' },
    s2: { ...DEFAULT_SUMMARY },
    s3: { ...DEFAULT_SUMMARY },
    final: { ...DEFAULT_SUMMARY, introduction: 'في إطار تنفيذ مخطط التكوين السنوي...' }
};

const SummaryReport: React.FC = () => {
    // Data state
    const [reports, setReports] = useState<ReportConfig>(INITIAL_REPORTS);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord>({});
    const [grades, setGrades] = useState<EvaluationDatabase>({});
    
    // UI state
    const [activeReport, setActiveReport] = useState<'s1' | 's2' | 's3' | 'final'>('s1');
    const [isListening, setIsListening] = useState<string | null>(null);
    
    // --- NEW: Analytics Toggle ---
    const [includeAnalytics, setIncludeAnalytics] = useState(false);

    // Load Data
    useEffect(() => {
        const savedRep = localStorage.getItem('takwin_reports_db');
        if (savedRep) setReports(JSON.parse(savedRep));

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) setInstitution(JSON.parse(savedInst));

        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) setSpecialties(JSON.parse(savedSpec));

        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) setTrainerConfig(JSON.parse(savedTrainers));

        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) setTrainees(JSON.parse(savedTrainees));

        const savedAtt = localStorage.getItem('takwin_attendance_db');
        if (savedAtt) setAttendance(JSON.parse(savedAtt));

        const savedGrades = localStorage.getItem('takwin_grades_db');
        if (savedGrades) setGrades(JSON.parse(savedGrades));
    }, []);

    const handleSave = () => {
        localStorage.setItem('takwin_reports_db', JSON.stringify(reports));
        alert('تم حفظ التقرير بنجاح');
    };

    const updateField = (field: keyof SummaryData, value: string) => {
        setReports(prev => ({
            ...prev,
            [activeReport]: {
                ...prev[activeReport],
                [field]: value
            }
        }));
    };

    // Voice Dictation Logic
    const toggleDictation = (field: keyof SummaryData) => {
        if (isListening) {
            setIsListening(null);
            window.speechSynthesis.cancel(); 
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("المتصفح لا يدعم ميزة الكتابة بالصوت. يرجى استخدام Google Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-DZ';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(field);
        recognition.onend = () => setIsListening(null);
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            const currentVal = reports[activeReport][field];
            updateField(field, currentVal ? currentVal + ' ' + transcript : transcript);
        };

        recognition.start();
    };

    // --- UPDATED DYNAMIC PRINT HANDLER ---
    const handlePrint = () => {
        // 1. Get the specific content for the report
        const content = document.getElementById('summary-print-template');
        // 2. Get the global print section
        let printSection = document.getElementById('print-section');
        
        // Ensure global print section exists
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (content && printSection) {
            // 3. Clear previous content
            printSection.innerHTML = '';
            
            // 4. Clone and prepare new content
            const clone = content.cloneNode(true) as HTMLElement;
            clone.classList.remove('hidden');
            
            // 5. Append and Print
            printSection.appendChild(clone);
            window.print();
        }
    };

    const handleExportWord = () => {
        const content = document.getElementById('report-content')?.innerHTML;
        if (!content) return;

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Report</title>
            <style>
                body { font-family: 'Times New Roman', serif; text-align: right; direction: rtl; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                td, th { border: 1px solid black; padding: 5px; text-align: center; }
                .header { text-align: center; font-weight: bold; margin-bottom: 30px; }
                .chart-placeholder { text-align: center; color: red; border: 1px dashed red; padding: 10px; margin: 10px 0; }
            </style>
            </head><body>`;
        const footer = "</body></html>";
        // Note: Charts (SVG/Canvas) won't export directly to Word easily via HTML. 
        // We might add a placeholder text if analytics are enabled.
        let sourceHTML = header + content + footer;
        
        if (includeAnalytics) {
            sourceHTML = sourceHTML.replace(/<div class="recharts-wrapper".*?<\/div>/g, '<div class="chart-placeholder">[رسم بياني - لا يمكن تصديره مباشرة للوورد]</div>');
        }

        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${activeReport}_${institution.wilaya}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currentSessionInfo = SESSIONS.find(s => 
        (activeReport === 's1' && s.id === 1) ||
        (activeReport === 's2' && s.id === 2) ||
        (activeReport === 's3' && s.id === 3)
    );

    const getModuleHours = (modId: number) => {
        const dist = CORRECTED_DISTRIBUTION.find(d => d.moduleId === modId);
        if (activeReport === 's1') return dist?.s1 || 0;
        if (activeReport === 's2') return dist?.s2 || 0;
        if (activeReport === 's3') return dist?.s3 || 0;
        return (dist?.s1 || 0) + (dist?.s2 || 0) + (dist?.s3 || 0); // Final
    };

    const getAttendanceStats = () => {
        if (!attendance) return null;
        const allRecords = Object.entries(attendance);
        const totalTrainees = trainees.length || 1;

        if (activeReport === 'final') {
            let finalAbsences = 0;
            const uniqueDates = new Set<string>();
            allRecords.forEach(([key, status]) => {
                const dateStr = key.substring(0, 10);
                uniqueDates.add(dateStr);
                if (status === 'A') finalAbsences++;
            });
            const daysCount = uniqueDates.size;
            const totalPossibleChecks = daysCount * totalTrainees;
            if (totalPossibleChecks === 0) return { sessionAbsences: 0, rate: 0, totalChecks: 0 };
            const actualPresence = totalPossibleChecks - finalAbsences;
            const rate = Math.round((actualPresence / totalPossibleChecks) * 100);
            return { sessionAbsences: finalAbsences, rate, totalChecks: totalPossibleChecks };
        }

        const sessionInfo = SESSIONS.find(s => 
            (activeReport === 's1' && s.id === 1) ||
            (activeReport === 's2' && s.id === 2) ||
            (activeReport === 's3' && s.id === 3)
        );

        if (!sessionInfo) return { sessionAbsences: 0, rate: 0, totalChecks: 0 };

        const start = new Date(sessionInfo.startDate);
        const end = new Date(sessionInfo.endDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        
        let sessionAbsences = 0;
        const uniqueSessionDates = new Set<string>();
        allRecords.forEach(([key, status]) => {
            const dateStr = key.substring(0, 10);
            const recordDate = new Date(dateStr);
            if (recordDate >= start && recordDate <= end) {
                 uniqueSessionDates.add(dateStr);
                 if (status === 'A') sessionAbsences++;
            }
        });

        const daysCount = uniqueSessionDates.size;
        const totalPossibleChecks = daysCount * totalTrainees;
        if (totalPossibleChecks === 0) return { sessionAbsences: 0, rate: 0, totalChecks: 0 };
        const actualPresence = totalPossibleChecks - sessionAbsences;
        const rate = Math.round((actualPresence / totalPossibleChecks) * 100);
        return { sessionAbsences, rate, totalChecks: totalPossibleChecks };
    };

    const attStats = getAttendanceStats();

    return (
        <div className="animate-fadeIn">
            {/* Controls */}
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded-2xl shadow-lg border border-slate-800/60 mb-6 flex flex-wrap gap-4 justify-between items-center print:hidden">
                <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                    {['s1', 's2', 's3', 'final'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveReport(tab as any)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                activeReport === tab 
                                ? 'bg-dzgreen-600 text-white shadow' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {tab === 'final' ? 'التقرير النهائي' : SESSIONS.find(s => s.id === parseInt(tab[1]))?.name}
                        </button>
                    ))}
                </div>

                {/* --- NEW TOGGLE FOR ANALYTICS --- */}
                {activeReport === 'final' && (
                    <button 
                        onClick={() => setIncludeAnalytics(!includeAnalytics)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                            includeAnalytics 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]' 
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="دمج الرسوم البيانية والإحصائيات في التقرير"
                    >
                        {includeAnalytics ? <BarChart2 className="w-4 h-4" /> : <PieChartIcon className="w-4 h-4" />}
                        {includeAnalytics ? 'إخفاء التحليل البياني' : 'تضمين التحليل البياني'}
                    </button>
                )}

                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm">
                        <Save className="w-4 h-4" /> حفظ
                    </button>
                    <button onClick={handleExportWord} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm">
                        <Download className="w-4 h-4" /> Word
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm">
                        <Printer className="w-4 h-4" /> طباعة
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
                {/* Inputs */}
                <div className="space-y-6">
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-white font-bold mb-4 border-b border-slate-800 pb-2">تحرير محتوى التقرير</h3>
                        
                        <InputField label="1. مقدمة التقرير" value={reports[activeReport].introduction} onChange={(v) => updateField('introduction', v)} onDictate={() => toggleDictation('introduction')} isListening={isListening === 'introduction'} />
                        <InputField label="2. النشاطات البيداغوجية" value={reports[activeReport].pedagogicalActivities} onChange={(v) => updateField('pedagogicalActivities', v)} onDictate={() => toggleDictation('pedagogicalActivities')} isListening={isListening === 'pedagogicalActivities'} />
                        <InputField label="3. الظروف الإدارية والمادية" value={reports[activeReport].administrativeConditions} onChange={(v) => updateField('administrativeConditions', v)} onDictate={() => toggleDictation('administrativeConditions')} isListening={isListening === 'administrativeConditions'} />
                        <InputField label="4. الصعوبات والنقائص" value={reports[activeReport].difficulties} onChange={(v) => updateField('difficulties', v)} onDictate={() => toggleDictation('difficulties')} isListening={isListening === 'difficulties'} />
                        <InputField label="5. الاقتراحات والتوصيات" value={reports[activeReport].recommendations} onChange={(v) => updateField('recommendations', v)} onDictate={() => toggleDictation('recommendations')} isListening={isListening === 'recommendations'} />
                        <InputField label="6. الخاتمة" value={reports[activeReport].conclusion} onChange={(v) => updateField('conclusion', v)} onDictate={() => toggleDictation('conclusion')} isListening={isListening === 'conclusion'} />
                    </div>
                </div>

                {/* Preview (Small) */}
                <div className="bg-white text-black p-8 rounded-xl shadow-xl overflow-y-auto max-h-[800px] text-sm">
                    <div className="opacity-50 text-center mb-4 font-bold border-2 border-dashed border-gray-300 p-2">
                        معاينة مصغرة (اضغط طباعة للمعاينة الكاملة)
                    </div>
                    <ReportContent 
                        activeReport={activeReport}
                        data={reports[activeReport]}
                        institution={institution}
                        specialties={specialties}
                        trainerConfig={trainerConfig}
                        sessionInfo={currentSessionInfo}
                        getModuleHours={getModuleHours}
                        attStats={attStats}
                        trainees={trainees}
                        grades={grades}
                        attendance={attendance}
                        includeAnalytics={includeAnalytics} // Pass the toggle state
                    />
                </div>
            </div>

            {/* PRINT TEMPLATE (Hidden always, cloned by handlePrint) */}
            <div id="summary-print-template" className="hidden">
                <div id="report-content" className="bg-white text-black p-[20mm] min-h-screen max-w-[210mm] mx-auto">
                     <ReportContent 
                        activeReport={activeReport}
                        data={reports[activeReport]}
                        institution={institution}
                        specialties={specialties}
                        trainerConfig={trainerConfig}
                        sessionInfo={currentSessionInfo}
                        getModuleHours={getModuleHours}
                        attStats={attStats}
                        trainees={trainees}
                        grades={grades}
                        attendance={attendance}
                        includeAnalytics={includeAnalytics} // Pass the toggle state
                    />
                </div>
            </div>
        </div>
    );
};

// --- HELPER COMPONENT: ANALYTICS CALCULATOR ---
// This logic mirrors DataAnalytics.tsx but returns pure data structures for the report
const useReportAnalytics = (trainees: Trainee[], grades: EvaluationDatabase, attendance: AttendanceRecord) => {
    return useMemo(() => {
        if (!trainees.length) return null;

        const processed = trainees.map(t => {
            // Calculate Average similar to EvaluationManager
            const tGrades = grades[t.id] || { modules: {} };
            let sumWeighted = 0, totalCoeff = 0;
            MODULES.forEach(m => {
                const mg = tGrades.modules?.[m.id];
                const avgCC = ((mg?.s1||0) + (mg?.s2||0) + (mg?.s3||0)) / 3;
                const exam = mg?.exam || 0;
                sumWeighted += (avgCC * 2 * m.coefficient) + (exam * 3 * m.coefficient);
                totalCoeff += (m.coefficient * 5);
            });
            const report = tGrades.report || 0;
            const finalAvg = totalCoeff ? parseFloat(((sumWeighted + report) / (totalCoeff + 1)).toFixed(2)) : 0;
            
            // Absences
            const absences = Object.entries(attendance).filter(([k, v]) => k.endsWith(`-${t.id}`) && v === 'A').length;
            
            // Age
            let age = 0;
            if (t.dob) {
                const y = parseInt(t.dob.split(/[-/]/)[0]);
                if (!isNaN(y)) age = 2025 - y;
            }

            return { ...t, finalAvg, absences, age };
        });

        // Gender Data
        const males = processed.filter(d => d.gender === 'M');
        const females = processed.filter(d => d.gender === 'F');
        const genderData = [
            { name: 'ذكور', value: males.length, avg: males.reduce((a,b)=>a+b.finalAvg,0)/(males.length||1) },
            { name: 'إناث', value: females.length, avg: females.reduce((a,b)=>a+b.finalAvg,0)/(females.length||1) }
        ];

        // Age Buckets
        const ageBuckets: Record<string, number> = { '<25':0, '25-30':0, '30-35':0, '>35':0 };
        processed.forEach(p => {
            if (p.age < 25) ageBuckets['<25']++;
            else if (p.age <= 30) ageBuckets['25-30']++;
            else if (p.age <= 35) ageBuckets['30-35']++;
            else ageBuckets['>35']++;
        });
        const ageData = Object.entries(ageBuckets).map(([name, count]) => ({ name, count }));

        // Module Performance
        const modulePerf = MODULES.map(m => {
            const validGrades = processed.map(p => grades[p.id]?.modules?.[m.id]?.exam || 0).filter(g => g > 0);
            const avg = validGrades.length ? validGrades.reduce((a,b)=>a+b,0)/validGrades.length : 0;
            return { name: m.shortTitle, avg: parseFloat(avg.toFixed(2)) };
        }).sort((a,b) => a.avg - b.avg);

        return { genderData, ageData, modulePerf, total: processed.length };
    }, [trainees, grades, attendance]);
};

const InputField: React.FC<{ label: string, value: string, onChange: (v: string) => void, onDictate: () => void, isListening: boolean }> = ({ label, value, onChange, onDictate, isListening }) => (
    <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
            <label className="text-slate-400 text-sm font-bold">{label}</label>
            <button onClick={onDictate} className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="الكتابة بالصوت">
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </button>
        </div>
        <textarea value={value} onChange={e => onChange(e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-dzgreen-500 focus:outline-none resize-y" placeholder="أدخل النص هنا..." />
    </div>
);

const ReportContent: React.FC<{
    activeReport: string,
    data: SummaryData,
    institution: InstitutionConfig,
    specialties: Specialty[],
    trainerConfig: TrainerConfig,
    sessionInfo?: any,
    getModuleHours: (id: number) => number,
    attStats: any,
    trainees: Trainee[],
    grades: EvaluationDatabase,
    attendance: AttendanceRecord,
    includeAnalytics: boolean
}> = ({ activeReport, data, institution, specialties, trainerConfig, sessionInfo, getModuleHours, attStats, trainees, grades, attendance, includeAnalytics }) => {
    
    // Change hardcoded 190 to 170 for Final Report (Actual Teaching Hours)
    const totalHours = activeReport === 'final' ? 170 : sessionInfo?.hoursTotal;
    const sessionName = activeReport === 'final' ? 'التقرير النهائي للتكوين' : `تقرير ${sessionInfo?.name}`;
    const dateRange = activeReport === 'final' ? 'الموسم التكويني: 2025 / 2026' : `الفترة: من ${sessionInfo?.startDate} إلى ${sessionInfo?.endDate}`;

    // Compute Analytics if enabled
    const analytics = includeAnalytics ? useReportAnalytics(trainees, grades, attendance) : null;

    return (
        <div className="font-serif leading-relaxed text-black" style={{ direction: 'rtl' }}>
            {/* Header */}
            <div className="text-center mb-8">
                <h4 className="font-bold text-lg mb-1">الجمهورية الجزائرية الديمقراطية الشعبية</h4>
                <h4 className="font-bold text-lg mb-1">وزارة التربية الوطنية</h4>
                <div className="flex justify-between items-start mt-4 text-sm font-bold">
                    <div className="text-right">
                        <p>مديرية التربية لولاية: {institution.wilaya}</p>
                        <p>مركز التكوين: {institution.center}</p>
                    </div>
                    <div className="text-left">
                        <p>مصلحة التكوين والتفتيش</p>
                        <p>إلى السيد مدير التربية</p>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="border-2 border-black p-4 text-center rounded-lg mb-8">
                <h1 className="text-2xl font-black mb-2">{sessionName}</h1>
                <h2 className="text-xl font-bold">{dateRange}</h2>
                <h3 className="text-lg mt-2">لفائدة: أساتذة التعليم الابتدائي (المدمجين)</h3>
            </div>

            {/* 1. Institution Card */}
            <div className="mb-6">
                <h3 className="text-lg font-bold underline mb-2">1. البطاقة الفنية للدورة:</h3>
                <table className="w-full border-collapse border border-black text-sm text-center">
                    <tbody>
                        <tr>
                            <td className="border border-black bg-gray-100 font-bold p-2 w-1/4">المعهد الوصي</td>
                            <td className="border border-black p-2">{institution.institute}</td>
                            <td className="border border-black bg-gray-100 font-bold p-2 w-1/4">المركز</td>
                            <td className="border border-black p-2">{institution.center}</td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-100 font-bold p-2">المدير البيداغوجي</td>
                            <td className="border border-black p-2">{institution.director}</td>
                            <td className="border border-black bg-gray-100 font-bold p-2">الحجم الساعي</td>
                            <td className="border border-black p-2">{totalHours} ساعة</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Trainees Stats */}
            <div className="mb-6">
                <h3 className="text-lg font-bold underline mb-2">2. إحصائيات المتكونين:</h3>
                <table className="w-full border-collapse border border-black text-sm text-center">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="border border-black p-2">الرقم</th>
                            <th className="border border-black p-2">التخصص</th>
                            <th className="border border-black p-2">عدد الأفواج</th>
                            <th className="border border-black p-2">عدد المتكونين</th>
                        </tr>
                    </thead>
                    <tbody>
                        {specialties.map((s, idx) => (
                            <tr key={s.id}>
                                <td className="border border-black p-1">{idx + 1}</td>
                                <td className="border border-black p-1">{s.name}</td>
                                <td className="border border-black p-1">{s.groups}</td>
                                <td className="border border-black p-1">{s.count}</td>
                            </tr>
                        ))}
                        <tr className="bg-gray-100 font-bold">
                            <td colSpan={2} className="border border-black p-1">المجموع الكلي</td>
                            <td className="border border-black p-1">{specialties.reduce((a, b) => a + b.groups, 0)}</td>
                            <td className="border border-black p-1">{specialties.reduce((a, b) => a + b.count, 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* --- INJECTED ANALYTICS: Demographics --- */}
            {includeAnalytics && analytics && (
                <div className="mb-8 border border-slate-300 p-4 rounded bg-slate-50 break-inside-avoid">
                    <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> 
                        2.1. قراءة بيانية في تركيبة المتكونين:
                    </h4>
                    <div className="flex gap-4 h-40">
                        <div className="flex-1">
                            <p className="text-xs text-center mb-1 font-bold">توزيع الجنس</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={analytics.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} label={(entry) => entry.name}>
                                        <Cell fill={PRINT_COLORS.male} />
                                        <Cell fill={PRINT_COLORS.female} />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 border-r border-slate-300 pr-4">
                            <p className="text-xs text-center mb-1 font-bold">الفئات العمرية</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.ageData}>
                                    <XAxis dataKey="name" tick={{fontSize: 9}} />
                                    <YAxis hide />
                                    <Bar dataKey="count" fill={PRINT_COLORS.barSecondary} label={{ position: 'top', fontSize: 10 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic text-center">الشكل (1): التمثيل البياني للتركيبة الديموغرافية للمتكونين</p>
                </div>
            )}

            {/* 3. Program Execution */}
            <div className="mb-6 break-inside-avoid">
                <h3 className="text-lg font-bold underline mb-2">
                    3. تنفيذ البرنامج البيداغوجي:
                    {activeReport === 'final' && <span className="font-normal text-sm mr-2">(تضاف للحجم الكلي الساعي 20 ساعة خاصة بالتقويم النهائي)</span>}
                </h3>
                <table className="w-full border-collapse border border-black text-sm text-center">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="border border-black p-2 w-10">رقم</th>
                            <th className="border border-black p-2">المقياس</th>
                            <th className="border border-black p-2 w-1/4">المؤطرون</th>
                            <th className="border border-black p-2 w-20">الحجم الساعي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MODULES.map((m) => {
                            const hours = getModuleHours(m.id);
                            if (hours === 0) return null;
                            let trainerNames = '';
                            if (m.id === 1) {
                                trainerNames = "أساتذة التعليمية (حسب التخصص)";
                            } else {
                                const names = trainerConfig[m.id]?.names || {};
                                const list = Object.values(names).filter(Boolean);
                                trainerNames = list.length > 0 ? list.join('، ') : '---';
                            }
                            return (
                                <tr key={m.id}>
                                    <td className="border border-black p-1">{m.id}</td>
                                    <td className="border border-black p-1 font-bold text-right px-4">{m.title}</td>
                                    <td className="border border-black p-1 text-xs">{trainerNames}</td>
                                    <td className="border border-black p-1 font-bold">{hours} سا</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-gray-100 font-bold">
                            <td colSpan={3} className="border border-black p-2 text-left px-4">المجموع العام</td>
                            <td className="border border-black p-2">{totalHours} سا</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* --- INJECTED ANALYTICS: Module Performance --- */}
            {includeAnalytics && analytics && (
                <div className="mb-8 border border-slate-300 p-4 rounded bg-slate-50 break-inside-avoid">
                    <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> 
                        3.1. مؤشرات الأداء البيداغوجي (تحليل الصعوبة):
                    </h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics.modulePerf} layout="vertical" margin={{left: 0, right: 20}}>
                                <XAxis type="number" domain={[0, 20]} hide />
                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                <Bar dataKey="avg" fill={PRINT_COLORS.barPrimary} barSize={15} label={{ position: 'right', fill: 'black', fontSize: 10 }} radius={[0,4,4,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic text-center">الشكل (2): ترتيب المقاييس حسب معدل تحصيل المتكونين (من الأصعب إلى الأسهل)</p>
                </div>
            )}

            {/* 4. Attendance Stats */}
            {attStats && (
                <div className="mb-6 break-inside-avoid">
                    <h3 className="text-lg font-bold underline mb-2">4. حالة المواظبة والغياب:</h3>
                    <div className="border border-black p-4 bg-gray-50">
                        <p className="mb-2">من خلال المتابعة اليومية لورقة الحضور، تم تسجيل الإحصائيات التالية خلال هذه الدورة:</p>
                        <ul className="list-disc list-inside px-4 space-y-1">
                            <li><span className="font-bold">عدد الغيابات المسجلة:</span> {attStats.sessionAbsences} غياب.</li>
                            <li><span className="font-bold">نسبة الحضور العامة:</span> {attStats.rate}%.</li>
                            <li><span className="font-bold">التقييم العام للانضباط:</span> {attStats.rate > 90 ? 'ممتاز، حيث التزم أغلب الأساتذة بالحضور في الأوقات الرسمية.' : 'متوسط، تم تسجيل تذبذب في حضور بعض المتكونين.'}</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* 5. Text Sections */}
            {data.introduction && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold underline mb-1">5. مقدمة وسيرورة الدورة:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.introduction}</p>
                </div>
            )}

            {data.pedagogicalActivities && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold underline mb-1">6. تقييم النشاطات البيداغوجية:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.pedagogicalActivities}</p>
                </div>
            )}

            {data.administrativeConditions && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold underline mb-1">7. الظروف المادية والتنظيمية:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.administrativeConditions}</p>
                </div>
            )}

            {data.difficulties && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold underline mb-1">8. الصعوبات والنقائص المسجلة:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.difficulties}</p>
                </div>
            )}

            {data.recommendations && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold underline mb-1">9. المقترحات والتوصيات:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.recommendations}</p>
                </div>
            )}

            {data.conclusion && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold underline mb-1">10. الخاتمة:</h3>
                    <p className="text-justify whitespace-pre-wrap leading-7">{data.conclusion}</p>
                </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between mt-16 px-12">
                <div className="text-center">
                    <p className="font-bold mb-16">المدير البيداغوجي</p>
                    <p>........................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold mb-16">مدير التربية</p>
                    <p>........................</p>
                </div>
            </div>
        </div>
    );
};

export default SummaryReport;
