
import React, { useState, useEffect, useMemo } from 'react';
import { Save, Printer, FileText, Mic, MicOff, Download, PenTool, BarChart2, AlertCircle, Sparkles, UserX, Clock, TrendingUp, FileDown, Layout, CheckCircle, Info, ShieldAlert, Users, PieChart as PieIcon, ListChecks, MessageSquarePlus, ScrollText, Landmark, BadgeAlert, FileWarning, SearchCheck, MapPin, Building, GraduationCap, FileCheck, Presentation } from 'lucide-react';
import { ReportConfig, SummaryData, InstitutionConfig, Specialty, TrainerConfig, Trainee, AttendanceRecord, TrainerAssignment, GroupSchedule } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS, MODULES, CORRECTED_DISTRIBUTION, MODULE_CONTENTS } from '../constants';
import { formatDate, getWorkingDays, formatDateKey } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg/960px-%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg.png?20230207012220";

const formatArabicDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ar-DZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

const INITIAL_REPORTS: ReportConfig = {
    s1: { introduction: 'بناءً على مقتضيات القرار الوزاري رقم 250، وتجسيداً للمخطط الوطني للتكوين، نضع بين أيديكم حصيلة الدورة الأولى التي ركزت على إرساء المعالم الكبرى للعملية التربوية وتوطيد المفاهيم البيداغوجية القاعدية لدى الأساتذة المدمجين...', pedagogicalActivities: '', administrativeConditions: '', difficulties: '', recommendations: '', conclusion: '' },
    s2: { introduction: 'استكمالاً لمسار التكوين البيداغوجي التحضيري، تم تنفيذ الدورة الثانية التي شهدت نقلة نوعية من التنظير إلى الممارسة الميدانية، حيث ركزت الورشات على نماذج المحاكاة الصفيّة وآليات التسيير الفعال للأقسام...', pedagogicalActivities: '', administrativeConditions: '', difficulties: '', recommendations: '', conclusion: '' },
    s3: { introduction: 'في ختام الموسم التكويني 2025/2026، خصصت الدورة الثالثة لتعميق الكفاءات المهنية الختامية، ومراجعة البروتوكول الجديد لتقييم المكتسبات، مع إجراء التقييمات الشاملة التي تقيس مدى جاهزية المتكونين للميدان...', pedagogicalActivities: '', administrativeConditions: '', difficulties: '', recommendations: '', conclusion: '' },
    final: { introduction: 'يعتبر هذا التقرير الوثيقة الاستراتيجية التي تلخص مسار التكوين البيداغوجي التحضيري برسم السنة الدراسية الحالية، متضمناً تحليلاً إحصائياً وبيداغوجياً دقيقاً لكافة مدخلات ومخرجات العملية التكوينية بالمركز...', pedagogicalActivities: '', administrativeConditions: '', difficulties: '', recommendations: '', conclusion: '' }
};

const STRATEGIC_SUGGESTIONS = {
    administrativeConditions: [
        "سجلنا انسيابية تامة في استغلال مرافق المركز مع توفير كافة الشروط اللوجستية الضامنة لراحة المتكونين.",
        "تم تفعيل المخطط الرقمي للمركز عبر توفير تدفق عالٍ للإنترنت في كافة القاعات البيداغوجية.",
        "استقرار الطاقم الإداري ساهم بشكل مباشر في نجاح التسيير الزمني والمادي لمختلف ورشات الدورة.",
        "توفير بيئة تكوينية محفزة تعتمد على الوسائل التفاعلية الحديثة (Data Show) في جميع الحصص.",
        "التنسيق المحكم مع مصالح الإطعام والإيواء أدى إلى رفع مؤشر الرضا والاستقرار النفسي لدى المتربصين."
    ],
    pedagogicalActivities: [
        "تنفيذ الورشات البيداغوجية وفق مقاربة المحاكاة (Micro-teaching) لرصد وتصحيح الممارسات الصفيّة.",
        "تفاعل إيجابي لافت مع مقياس 'تعليمية المادة' عبر إعداد نماذج لمذكرات نموذجية تواكب المنهاج الجديد.",
        "استغلال ناجع للحقائب البيداغوجية الرقمية لتبادل الموارد العلمية بين المكونين والمتكونين بصفة آنية.",
        "تفعيل أسلوب العمل بالأفواج المصغرة لتكريس مهارات التواصل والعمل الجماعي لدى الأساتذة المدمجين.",
        "التركيز على الجانب الوجداني والالتزام المهني من خلال ورشات أخلاقيات المهنة والتشريع المدرسي."
    ],
    difficulties: [
        "رصد تفاوت نسبي في المكتسبات القبلية للمتكونين مما تطلب جهداً إضافياً في تفريد التعليم وعلاج الفجوات.",
        "كثافة البرنامج الساعي الموزع على دورات قصيرة يتطلب مراجعة الحجم الساعي لبعض المقاييس التقنية.",
        "تحديات متعلقة بالربط التقني لبعض الموارد الرقمية نتيجة كثافة الاستخدام المتزامن للشبكة.",
        "الحاجة إلى تعزيز الرصيد الوثائقي للمركز بمراجع ورقية حديثة تواكب التعديلات الأخيرة في المناهج."
    ],
    recommendations: [
        "نقترح تمديد فترة التكوين الميداني داخل المؤسسات التربوية تحت إشراف مباشر من المفتشين والمديرين.",
        "تفعيل منصة تعليمية دائمة (E-learning) تضمن المرافقة البيداغوجية للأساتذة حتى بعد نهاية الدورة.",
        "برمجة ندوات بيداغوجية تبادلية بين مراكز التكوين المختلفة لتبادل الخبرات والنجاحات الميدانية.",
        "تخصيص ميزانية مستقلة لتطوير الموارد الرقمية والحقائب التفاعلية الموحدة لمختلف المقاييس.",
        "إدراج مقياس متخصص حول 'سيكولوجية الطفل ذي الصعوبات' لمواجهة التحديات الواقعية في القسم."
    ]
};

const SummaryReport: React.FC = () => {
    const [reports, setReports] = useState<ReportConfig>(INITIAL_REPORTS);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord>({});
    const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);
    
    const [activeReport, setActiveReport] = useState<'s1' | 's2' | 's3' | 'final'>('s1');
    const [isListening, setIsListening] = useState<string | null>(null);

    useEffect(() => {
        const load = (key: string, setter: any) => {
            const data = localStorage.getItem(key);
            if (data) try { setter(JSON.parse(data)); } catch(e){}
        };
        load('takwin_reports_db', setReports);
        load('takwin_institution_db', setInstitution);
        load('takwin_specialties_db', setSpecialties);
        load('takwin_trainers_db', setTrainerConfig);
        load('takwin_trainees_db', setTrainees);
        load('takwin_attendance_db', setAttendance);
        load('takwin_assignments', setAssignments);
    }, []);

    const reportAnalytics = useMemo(() => {
        const sessionId = activeReport === 'final' ? 1 : parseInt(activeReport[1]);
        const currentSession = SESSIONS.find(s => s.id === sessionId);
        if (!currentSession || trainees.length === 0) return null;

        const days = getWorkingDays(currentSession.startDate, currentSession.endDate);
        const attendeeRecords = trainees.map(t => {
            let missedHours = 0; let missedDays = 0;
            days.forEach((day, idx) => {
                const dateKey = formatDateKey(day);
                const record = attendance[`${dateKey}-${t.id}`];
                if (record?.status === 'A' || record?.status === 'J') {
                    missedDays++;
                    if (sessionId !== 3) missedHours += 5;
                    else missedHours += (idx < 17 ? 4 : 2);
                }
            });
            return { ...t, missedDays, missedHours };
        });

        const allAbsentees = attendeeRecords.filter(t => t.missedHours > 0).sort((a,b) => b.missedHours - a.missedHours);
        const muniStats: Record<string, number> = {};
        trainees.forEach(t => {
            const m = t.municipality || 'غير محدد';
            muniStats[m] = (muniStats[m] || 0) + 1;
        });
        const municipalityTable = Object.entries(muniStats).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
        const specStats = specialties.map(s => ({ name: s.name, value: trainees.filter(t => t.specialtyId === s.id).length }));

        const executionTable = MODULES.map(m => {
            const dist = CORRECTED_DISTRIBUTION.find(d => d.moduleId === m.id);
            const planned = (sessionId === 1 ? dist?.s1 : sessionId === 2 ? dist?.s2 : dist?.s3) || 0;
            const content = MODULE_CONTENTS.find(c => c.moduleId === m.id);
            const topics = (sessionId === 1 ? content?.s1Topics : sessionId === 2 ? content?.s2Topics : content?.s3Topics) || [];
            const trainerKeys = Array.from(new Set(assignments.filter(a => a.sessionId === sessionId && a.moduleId === m.id).map(a => a.trainerKey)));
            const trainersNames = trainerKeys.map(k => m.id === 1 ? (trainerConfig[1]?.names?.[k] || k) : (trainerConfig[m.id]?.names?.[k] || k)).join('، ');
            return { title: m.title, topics: topics.map(tp => tp.topic).join(' | '), planned, trainers: trainersNames || '---' };
        }).filter(r => r.planned > 0);

        return { currentSession, allAbsentees, executionTable, total: trainees.length, maleCount: trainees.filter(t => t.gender === 'M').length, femaleCount: trainees.filter(t => t.gender === 'F').length, municipalityTable, specStats };
    }, [activeReport, trainees, attendance, assignments, trainerConfig, specialties]);

    const handleSave = () => { localStorage.setItem('takwin_reports_db', JSON.stringify(reports)); alert('تم حفظ المسودة بنجاح.'); };
    const updateField = (field: keyof SummaryData, value: string) => { setReports(prev => ({ ...prev, [activeReport]: { ...prev[activeReport], [field]: value } })); };
    const appendSuggestion = (field: keyof SummaryData, text: string) => {
        const current = reports[activeReport][field] || '';
        updateField(field, current ? `${current}\n- ${text}` : `- ${text}`);
    };

    const handlePrint = () => {
        const content = document.getElementById('ministerial-final-doc');
        let printSection = document.getElementById('print-section');
        if (!printSection) { printSection = document.createElement('div'); printSection.id = 'print-section'; document.body.appendChild(printSection); }
        if (content && printSection) { printSection.innerHTML = ''; const clone = content.cloneNode(true) as HTMLElement; clone.classList.remove('hidden'); printSection.appendChild(clone); window.print(); }
    };

    const handleExportWord = () => {
        const content = document.getElementById('report-paper-view')?.innerHTML;
        if (!content) return;

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Report Export</title>
            <style>
                body { font-family: 'Times New Roman', serif; direction: rtl; text-align: right; padding: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                th, td { border: 1px solid black; padding: 5px; text-align: center; }
                h1, h2, h3 { text-align: center; }
                .text-justify { text-align: justify; }
                .underline { text-decoration: underline; }
                .bold { font-weight: bold; }
                .bg-gray { background-color: #f3f4f6; }
                .recharts-wrapper { display: none; } /* Word cannot render SVGs easily via this method */
            </style>
            </head><body>`;
        
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;
        
        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `تقرير_حصيلة_${SESSIONS.find(s => s.id === (activeReport === 'final' ? 1 : parseInt(activeReport[1])))?.name || 'الدورة'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleDictation = (field: keyof SummaryData) => {
        if (isListening) { setIsListening(null); return; }
        const recognition = new ((window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition)();
        recognition.lang = 'ar-DZ';
        recognition.onstart = () => setIsListening(field);
        recognition.onend = () => setIsListening(null);
        recognition.onresult = (e: any) => updateField(field, (reports[activeReport][field] || '') + ' ' + e.results[0][0].transcript);
        recognition.start();
    };

    return (
        <div className="animate-fadeIn pb-24 font-tajawal">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;700;900&display=swap');
                .font-official { font-family: 'Amiri', serif; }
                .font-title { font-family: 'Tajawal', sans-serif; font-weight: 900; }
                @media print {
                    @page { size: portrait; margin: 15mm; }
                    .watermark-overlay { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03 !important; width: 600px; pointer-events: none; z-index: -1; }
                    .text-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.015 !important; font-size: 80pt; font-weight: 900; z-index: -1; white-space: nowrap; }
                    .recharts-surface { opacity: 0.9; }
                }
            `}</style>

            <div className="bg-slate-900/95 backdrop-blur sticky top-20 z-20 p-4 rounded-2xl shadow-2xl border border-slate-800 mb-8 flex flex-wrap gap-4 justify-between items-center print:hidden">
                <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                    {['s1', 's2', 's3', 'final'].map((tab) => (
                        <button key={tab} onClick={() => setActiveReport(tab as any)} className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${activeReport === tab ? 'bg-dzgreen-600 text-white shadow-lg shadow-dzgreen-900/20' : 'text-slate-500 hover:text-white'}`}>
                            {tab === 'final' ? 'الحوصلة الختامية' : SESSIONS.find(s => s.id === parseInt(tab[1]))?.name}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95"><Save className="w-5 h-5" /> حفظ المسودة</button>
                    <button onClick={handleExportWord} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95"><FileDown className="w-5 h-5" /> تصدير Word</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-xl transition-transform active:scale-95"><Printer className="w-5 h-5" /> طباعة رسمية</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 print:hidden">
                <div className="space-y-8">
                    <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
                            <Landmark className="text-dzgreen-400 w-8 h-8" />
                            <h3 className="text-white font-black text-xl tracking-tight uppercase">وحدة تحرير التقارير الاستراتيجية</h3>
                        </div>
                        <div className="space-y-10">
                            <StrategicSection label="1. التوطئة البيداغوجية" value={reports[activeReport].introduction} onChange={v => updateField('introduction', v)} onDictate={() => toggleDictation('introduction')} isListening={isListening === 'introduction'} />
                            <StrategicSection label="2. النشاطات المنفذة" value={reports[activeReport].pedagogicalActivities} onChange={v => updateField('pedagogicalActivities', v)} onDictate={() => toggleDictation('pedagogicalActivities')} isListening={isListening === 'pedagogicalActivities'} suggestions={STRATEGIC_SUGGESTIONS.pedagogicalActivities} onSuggest={s => appendSuggestion('pedagogicalActivities', s)} />
                            <StrategicSection label="3. الظروف اللوجستية" value={reports[activeReport].administrativeConditions} onChange={v => updateField('administrativeConditions', v)} onDictate={() => toggleDictation('administrativeConditions')} isListening={isListening === 'administrativeConditions'} suggestions={STRATEGIC_SUGGESTIONS.administrativeConditions} onSuggest={s => appendSuggestion('administrativeConditions', s)} />
                            <StrategicSection label="4. العوائق المسجلة" value={reports[activeReport].difficulties} onChange={v => updateField('difficulties', v)} onDictate={() => toggleDictation('difficulties')} isListening={isListening === 'difficulties'} suggestions={STRATEGIC_SUGGESTIONS.difficulties} onSuggest={s => appendSuggestion('difficulties', s)} />
                            <StrategicSection label="5. التوصيات والمقترحات" value={reports[activeReport].recommendations} onChange={v => updateField('recommendations', v)} onDictate={() => toggleDictation('recommendations')} isListening={isListening === 'recommendations'} suggestions={STRATEGIC_SUGGESTIONS.recommendations} onSuggest={s => appendSuggestion('recommendations', s)} />
                            <StrategicSection label="6. الخاتمة" value={reports[activeReport].conclusion} onChange={v => updateField('conclusion', v)} onDictate={() => toggleDictation('conclusion')} isListening={isListening === 'conclusion'} />
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="sticky top-40 bg-white text-black p-12 rounded-lg shadow-2xl overflow-y-auto max-h-[85vh] border border-slate-300 font-official scrollbar-hide" id="report-paper-view">
                         <ProfessionalMinisterialTemplate data={reports[activeReport]} institution={institution} analytics={reportAnalytics} specialties={specialties} />
                    </div>
                </div>
            </div>

            <div id="ministerial-final-doc" className="hidden">
                 <div className="bg-white text-black p-[20mm] min-h-screen relative overflow-hidden font-official shadow-none">
                      <div className="text-watermark">وزارة التربية الوطنية</div>
                      <img src={LOGO_URL} className="watermark-overlay grayscale opacity-5" alt="logo" />
                      <ProfessionalMinisterialTemplate data={reports[activeReport]} institution={institution} analytics={reportAnalytics} specialties={specialties} isPrint={true} />
                 </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StrategicSection: React.FC<{ label: string, value: string, onChange: (v: string) => void, onDictate: () => void, isListening: boolean, suggestions?: string[], onSuggest?: (s: string) => void }> = ({ label, value, onChange, onDictate, isListening, suggestions, onSuggest }) => (
    <div className="group/section">
        <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
            <button onClick={onDictate} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
        </div>
        <textarea value={value} onChange={e => onChange(e.target.value)} className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm outline-none focus:border-dzgreen-500 transition-all resize-none font-medium leading-relaxed" placeholder="أدخل محتوى التتقرير..." />
        {suggestions && (
            <div className="flex flex-wrap gap-2 mt-3">
                {suggestions.map((s, i) => (
                    <button key={i} onClick={() => onSuggest?.(s)} className="text-[9px] bg-slate-800 hover:bg-dzgreen-900/30 hover:text-dzgreen-300 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700/50 transition-all flex items-center gap-1.5 active:scale-95">
                        <MessageSquarePlus className="w-3 h-3" /> {s}
                    </button>
                ))}
            </div>
        )}
    </div>
);

const ProfessionalMinisterialTemplate: React.FC<{ data: SummaryData, institution: InstitutionConfig, analytics: any, specialties: Specialty[], isPrint?: boolean }> = ({ data, institution, analytics, specialties, isPrint }) => {
    if (!analytics) return <div className="text-center p-20 text-gray-400 italic font-tajawal">في انتظار البيانات...</div>;
    const { currentSession, allAbsentees, executionTable, total, maleCount, femaleCount, municipalityTable, specStats } = analytics;

    return (
        <div className="leading-relaxed text-black" style={{ direction: 'rtl' }}>
            {/* HEADER */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h4 className="font-bold text-base mb-1">الجمهورية الجزائرية الديمقراطية الشعبية</h4>
                <h4 className="font-bold text-base mb-1">وزارة التربية الوطنية</h4>
                <div className="flex justify-between items-start mt-6 text-[11px] font-bold font-tajawal px-2">
                    <div className="text-right space-y-1">
                        <p>مديرية التربية لولاية {institution.wilaya || '...................'}</p>
                        <p>مصلحة المستخدمين والتكوين والتفتيش</p>
                        <p>مركز التكوين: {institution.center || '...................'}</p>
                    </div>
                </div>
            </div>

            {/* TITLE */}
            <div className="border-4 border-double border-black p-6 text-center rounded-xl mb-10 bg-gray-50/50">
                <h1 className="text-xl font-black mb-1 uppercase tracking-tight font-title">تقرير حصيلة سير {currentSession.name}</h1>
                <h2 className="text-sm font-bold text-gray-700">لفائدة أساتذة المدرسة الابتدائية (دفعة 2025/2026)</h2>
                <div className="w-full h-px bg-black/10 my-3"></div>
                <p className="text-xs font-black">
                    الفترة المرجعية: من {formatArabicDate(currentSession.startDate)} إلى {formatArabicDate(currentSession.endDate)}
                </p>
            </div>

            {/* TECHNICAL CARD */}
            <div className="mb-10 break-inside-avoid">
                <h3 className="text-sm font-black underline mb-3 flex items-center gap-2"><Layout className="w-4 h-4" /> 1. البطاقة الإحصائية والتقنية للدورة:</h3>
                <table className="w-full border-collapse border-2 border-black text-[10px] text-center font-bold font-tajawal">
                    <tbody>
                        <tr className="h-10">
                            <td className="border border-black bg-gray-100 w-1/4">إجمالي المتكونين</td><td className="border border-black w-1/4 text-sm">{total} أستاذ(ة)</td>
                            <td className="border border-black bg-gray-100 w-1/4">المعهد المشرف</td><td className="border border-black w-1/4">{institution.institute || '...................'}</td>
                        </tr>
                        <tr className="h-10">
                            <td className="border border-black bg-gray-100">توزيع (ذكور)</td><td className="border border-black">{maleCount} أستاذ</td>
                            <td className="border border-black bg-gray-100">توزيع (إناث)</td><td className="border border-black">{femaleCount} أستاذة</td>
                        </tr>
                        <tr className="h-10">
                            <td className="border border-black bg-gray-100">الحجم الساعي المنجز</td><td className="border border-black font-black text-blue-900">{currentSession.hoursTotal} سا</td>
                            <td className="border border-black bg-gray-100">المدير البيداغوجي للمركز</td><td className="border border-black font-black">{institution.director || '...................'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* VISUAL ANALYTICS - FIX FOR PRINTING */}
            <div className="grid grid-cols-2 gap-4 mb-10 h-48 break-inside-avoid">
                <div className="border border-black rounded p-2 flex flex-col items-center">
                    <span className="text-[9px] font-bold mb-2">تعداد المتكونين حسب التخصص</span>
                    {!isPrint ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={specStats} innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                                    {specStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <PieChart width={150} height={120}>
                            <Pie data={specStats} cx={75} cy={60} innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                                {specStats.map((_, index) => (
                                    <Cell key={`cell-print-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                                ))}
                            </Pie>
                        </PieChart>
                    )}
                    <div className="flex gap-2 mt-1">
                        {specStats.map((s, i) => (
                            <span key={i} className="text-[7px] font-bold">• {s.name}</span>
                        ))}
                    </div>
                </div>
                <div className="border border-black rounded p-2 flex flex-col items-center">
                    <span className="text-[9px] font-bold mb-2">مستوى المشاركة والانضباط (%)</span>
                    {!isPrint ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{n: 'الدورة', v: 98.4}]} margin={{top: 5, right: 20, left: 20, bottom: 5}}>
                                <XAxis dataKey="n" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Bar dataKey="v" fill="#000" barSize={30} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <BarChart width={150} height={120} data={[{n: 'الدورة', v: 98.4}]} margin={{top: 5, right: 20, left: 20, bottom: 5}}>
                            <XAxis dataKey="n" hide />
                            <YAxis domain={[0, 100]} hide />
                            <Bar dataKey="v" fill="#000" barSize={30} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    )}
                    <span className="text-[8px] font-black mt-2">نسبة الحضور التقديرية: 98.4%</span>
                </div>
            </div>

            {/* MUNICIPALITY TABLE */}
            <div className="mb-10 break-inside-avoid">
                <h3 className="text-sm font-black underline mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> 2. التوزيع الجغرافي للمتكونين حسب البلديات:</h3>
                <div className="grid grid-cols-2 gap-x-10">
                    <table className="w-full border-collapse border border-black text-[9px] text-center font-tajawal">
                        <thead className="bg-gray-100"><tr><th className="border border-black p-1">البلدية</th><th className="border border-black p-1">العدد</th></tr></thead>
                        <tbody>
                            {municipalityTable.slice(0, Math.ceil(municipalityTable.length/2)).map((m, i) => (
                                <tr key={i}><td className="border border-black p-1 text-right px-3 font-bold">{m.name}</td><td className="border border-black p-1 font-black">{m.count}</td></tr>
                            ))}
                        </tbody>
                    </table>
                    <table className="w-full border-collapse border border-black text-[9px] text-center font-tajawal">
                        <thead className="bg-gray-100"><tr><th className="border border-black p-1">البلدية</th><th className="border border-black p-1">العدد</th></tr></thead>
                        <tbody>
                            {municipalityTable.slice(Math.ceil(municipalityTable.length/2)).map((m, i) => (
                                <tr key={i}><td className="border border-black p-1 text-right px-3 font-bold">{m.name}</td><td className="border border-black p-1 font-black">{m.count}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EXECUTION MATRIX */}
            <div className="mb-10 break-inside-avoid">
                <h3 className="text-sm font-black underline mb-3 flex items-center gap-2"><ListChecks className="w-4 h-4" /> 3. تنفيذ المحتوى البيداغوجي:</h3>
                <table className="w-full border-collapse border-2 border-black text-[9px] text-center font-tajawal">
                    <thead className="bg-gray-100 font-bold h-10">
                        <tr>
                            <th className="border border-black p-1 w-1/5">المقياس</th>
                            <th className="border border-black p-1 w-2/5">أهم المحاور المنفذة</th>
                            <th className="border border-black p-1 w-12">الحجم</th>
                            <th className="border border-black p-1">الأساتذة المكونون</th>
                        </tr>
                    </thead>
                    <tbody>
                        {executionTable.map((r: any, idx: number) => (
                            <tr key={idx} className="h-10">
                                <td className="border border-black p-1 font-black text-right px-2 bg-gray-50/50">{r.title}</td>
                                <td className="border border-black p-1 text-right leading-relaxed px-2 font-medium">{r.topics}</td>
                                <td className="border border-black p-1 font-black">{r.planned} سا</td>
                                <td className="border border-black p-1 font-black">{r.trainers}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* NARRATIVE SECTIONS - SIMPLIFIED */}
            <div className="space-y-10 mb-10">
                {['introduction', 'pedagogicalActivities', 'administrativeConditions', 'difficulties', 'recommendations', 'conclusion'].map((field, i) => data[field as keyof SummaryData] && (
                    <div key={i} className="mb-6">
                        <h3 className="text-sm font-black underline mb-3 text-slate-900 uppercase">
                            {i + 4}. {
                                field === 'introduction' ? 'توطئة بيداغوجية عامة:' : 
                                field === 'pedagogicalActivities' ? 'تقييم النشاطات البيداغوجية والتحصيل:' :
                                field === 'administrativeConditions' ? 'الظروف المادية والتنظيمية:' :
                                field === 'difficulties' ? 'العوائق والصعوبات المسجلة ميدانياً:' :
                                field === 'recommendations' ? 'الاقتراحات والتوصيات الاستراتيجية:' : 'خاتمة التقرير:'
                            }
                        </h3>
                        <p className="text-justify whitespace-pre-wrap leading-7 text-[14px] font-official text-black">
                            {data[field as keyof SummaryData]}
                        </p>
                    </div>
                ))}
            </div>

            {/* ATTENDANCE SUMMARY */}
            <div className="mt-10 mb-10 break-inside-avoid">
                <h3 className="text-sm font-black underline mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                    <SearchCheck className="w-6 h-6 text-dzgreen-600" /> 
                    {data.conclusion ? '10' : '9'}. كشف إحصائيات الغيابات الفعلية المسجلة:
                </h3>
                {allAbsentees.length > 0 ? (
                    <table className="w-full border-collapse border-2 border-black text-[10px] text-center font-tajawal">
                        <thead className="bg-gray-100 font-black h-10">
                            <tr>
                                <th className="border border-black p-1 w-10">#</th>
                                <th className="border border-black p-1 w-1/2">اللقب والاسم الكامل</th>
                                <th className="border border-black p-1">التخصص</th>
                                <th className="border border-black p-1">أيام الغياب</th>
                                <th className="border border-black p-1 text-blue-900">الحجم الضائع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allAbsentees.map((t: any, idx: number) => (
                                <tr key={idx} className="h-10 font-bold bg-white">
                                    <td className="border border-black">{idx + 1}</td>
                                    <td className="border border-black text-right px-4">{t.surname} {t.name}</td>
                                    <td className="border border-black">{specialties.find(s=>s.id === t.specialtyId)?.name}</td>
                                    <td className="border border-black">{t.missedDays} يوم</td>
                                    <td className="border border-black font-black text-blue-900">{t.missedHours} سا</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-6 border-2 border-dashed border-dzgreen-400 rounded-xl bg-dzgreen-50 text-dzgreen-800 font-black text-center text-sm">
                        لم يتم تسجيل أي حالات غياب طيلة أيام هذه الدورة، مما يعكس انضباطاً عالياً من طرف الأساتذة المكونين والمتكونين.
                    </div>
                )}
            </div>

            {/* FINAL SIGNATURE */}
            <div className="mt-20 flex justify-end px-12 pb-10">
                <div className="text-center w-80">
                    <p className="font-black text-base underline underline-offset-8">المديـر البيداغوجي للمركز</p>
                </div>
            </div>
        </div>
    );
};

export default SummaryReport;