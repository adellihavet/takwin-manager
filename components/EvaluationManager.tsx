
import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Printer, Award, Calculator, Settings, BookOpen, UserCheck, Calendar } from 'lucide-react';
import { Trainee, Specialty, EvaluationDatabase, InstitutionConfig } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES, MODULES } from '../constants';
import ExamManager from './ExamManager';

const EvaluationManager: React.FC = () => {
    // Data State
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [grades, setGrades] = useState<EvaluationDatabase>({});
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    // UI State
    const [activeTab, setActiveTab] = useState<'s1' | 's2' | 's3' | 'exams' | 'final'>('s1');
    const [selectedSpec, setSelectedSpec] = useState<string>('all');
    const [selectedGroup, setSelectedGroup] = useState<number>(0); // 0 = all
    
    // PV Variables
    const [deliberationDate, setDeliberationDate] = useState<string>('');
    const [committeeMembers, setCommitteeMembers] = useState({
        president: '',
        director: '',
        trainer1: '',
        trainer2: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e) {}
        
        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) try { setSpecialties(JSON.parse(savedSpec)); } catch(e) {}

        const savedGrades = localStorage.getItem('takwin_grades_db');
        if (savedGrades) try { setGrades(JSON.parse(savedGrades)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}
        
        // Initialize committee director from institution if available
        const inst = JSON.parse(localStorage.getItem('takwin_institution_db') || '{}');
        if (inst.director) setCommitteeMembers(prev => ({ ...prev, director: inst.director }));

    }, []);

    const saveGrades = (newGrades: EvaluationDatabase) => {
        setGrades(newGrades);
        localStorage.setItem('takwin_grades_db', JSON.stringify(newGrades));
    };

    // --- COMPUTED LOGIC ---
    const getFilteredTrainees = () => {
        return trainees.filter(t => {
            const specMatch = selectedSpec === 'all' || t.specialtyId === selectedSpec;
            const groupMatch = selectedGroup === 0 || t.groupId === selectedGroup;
            return specMatch && groupMatch;
        }).sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
    };

    const calculateMCPC = (tId: string) => {
        const g = grades[tId];
        if (!g) return 0;
        const s1 = g.s1 || 0;
        const s2 = g.s2 || 0;
        const s3 = g.s3 || 0;
        return parseFloat(((s1 + s2 + s3) / 3).toFixed(2));
    };

    const calculateFinalAverage = (tId: string) => {
        const g = grades[tId];
        if (!g) return 0;
        const mcpc = calculateMCPC(tId);
        const exam = g.finalExam || 0;
        const report = g.report || 0;
        // Formula: (MCPC * 2 + Exam * 3 + Report * 1) / 6
        return parseFloat(((mcpc * 2 + exam * 3 + report * 1) / 6).toFixed(2));
    };

    // --- CSV HANDLERS ---
    const handleDownloadTemplate = () => {
        const list = getFilteredTrainees();

        if (list.length === 0) {
            alert("لا يوجد متكونين في الفئة المختارة لتصدير القائمة.");
            return;
        }

        const BOM = "\uFEFF";
        let headers: string[] = [];
        let rows: string[] = [];
        
        // Updated to include Date of Birth
        if (activeTab === 'final') {
            // Final Deliberation Template
            headers = ["ID_SYSTEM", "اللقب", "الاسم", "تاريخ_الميلاد", "التخصص", "الفوج", "معدل_المراقبة_المستمرة", "علامة_الامتحان_النهائي", "علامة_التقرير"];
            rows = list.map(t => {
                const mcpc = calculateMCPC(t.id);
                return `"${t.id}","${t.surname}","${t.name}","${t.dob}","${specialties.find(s=>s.id===t.specialtyId)?.name || ''}","${t.groupId}","${mcpc}","",""`;
            });
        } else {
            // Session Template
            const sessionName = activeTab === 's1' ? 'الدورة 1' : activeTab === 's2' ? 'الدورة 2' : 'الدورة 3';
            headers = ["ID_SYSTEM", "اللقب", "الاسم", "تاريخ_الميلاد", "التخصص", "الفوج", `علامة_${sessionName}`];
            rows = list.map(t => {
                const currentScore = grades[t.id]?.[activeTab] || '';
                return `"${t.id}","${t.surname}","${t.name}","${t.dob}","${specialties.find(s=>s.id===t.specialtyId)?.name || ''}","${t.groupId}","${currentScore}"`;
            });
        }

        const csvContent = BOM + headers.join(",") + "\n" + rows.join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Evaluation_${activeTab}_Group_${selectedGroup || 'All'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split(/\r\n|\n/);
            const newGrades = { ...grades };
            let updateCount = 0;

            // Find where the real data starts
            let headerIndex = -1;
            for(let i=0; i<lines.length; i++) {
                if (lines[i].includes("ID_SYSTEM")) {
                    headerIndex = i;
                    break;
                }
            }

            if (headerIndex === -1) {
                alert("الملف غير صالح: لم يتم العثور على ترويسة البيانات (ID_SYSTEM)");
                return;
            }

            // Process data lines
            for (let i = headerIndex + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // CSV Split logic handling quotes
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                
                const tId = cols[0];
                if (!tId) continue;

                if (!newGrades[tId]) newGrades[tId] = {};

                if (activeTab === 'final') {
                    // Cols: ID, Surname, Name, DOB, Spec, Group, MCPC, Exam, Report
                    // Index: 0, 1,       2,    3,   4,    5,     6,    7,    8
                    const exam = parseFloat(cols[7]);
                    const report = parseFloat(cols[8]);
                    if (!isNaN(exam)) newGrades[tId].finalExam = exam;
                    if (!isNaN(report)) newGrades[tId].report = report;
                    updateCount++;
                } else {
                    // Cols: ID, Surname, Name, DOB, Spec, Group, Score
                    // Index: 0, 1,       2,    3,   4,    5,     6
                    const score = parseFloat(cols[6]);
                    if (!isNaN(score)) {
                        newGrades[tId][activeTab] = score;
                        updateCount++;
                    }
                }
            }
            saveGrades(newGrades);
            alert(`تم تحديث النقاط لـ ${updateCount} متربص بنجاح.`);
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- PRINT HANDLERS ---
    const handlePrintPV = () => {
        const printContent = document.getElementById('deliberation-pv');
        
        // Ensure print section exists
        let printSection = document.getElementById('print-section');
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (printContent && printSection) {
            // Clear previous content
            printSection.innerHTML = '';
            
            // Clone the node deeply
            const contentClone = printContent.cloneNode(true) as HTMLElement;
            
            // Remove hidden classes if any on the parent container
            contentClone.classList.remove('hidden');
            
            // Append to print section
            printSection.appendChild(contentClone);
            
            // Wait for DOM update then print
            setTimeout(() => {
                window.print();
            }, 300);
        } else {
            alert("خطأ: لم يتم العثور على محتوى المحضر.");
        }
    };

    // --- STATISTICS FOR PV ---
    const getSuccessStats = () => {
        let total = 0, admitted = 0;
        trainees.forEach(t => {
            const avg = calculateFinalAverage(t.id);
            total++;
            if (avg >= 10) admitted++;
        });
        return { total, admitted, adjourned: total - admitted };
    };

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header / Tabs */}
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                        {[
                            { id: 's1', label: 'الدورة 1' },
                            { id: 's2', label: 'الدورة 2' },
                            { id: 's3', label: 'الدورة 3' },
                            { id: 'exams', label: 'تنظيم الامتحانات', icon: <Settings className="w-4 h-4"/> },
                            { id: 'final', label: 'المداولات النهائية', icon: <Award className="w-4 h-4"/> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                    activeTab === tab.id 
                                    ? (tab.id === 'final' ? 'bg-amber-600 text-white shadow' : tab.id === 'exams' ? 'bg-purple-600 text-white shadow' : 'bg-blue-600 text-white shadow')
                                    : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'exams' ? (
                <ExamManager 
                    trainees={trainees} 
                    specialties={specialties} 
                    institution={institution}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                    
                    {/* Left: Actions & Upload */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* Filter Controls for Grades */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                             <h4 className="text-white font-bold mb-3 text-sm">تصفية القوائم</h4>
                             <div className="space-y-3">
                                <select 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    value={selectedSpec}
                                    onChange={e => { setSelectedSpec(e.target.value); setSelectedGroup(0); }}
                                >
                                    <option value="all">كل التخصصات</option>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    value={selectedGroup}
                                    onChange={e => setSelectedGroup(parseInt(e.target.value))}
                                >
                                    <option value={0}>كل الأفواج</option>
                                    {selectedSpec !== 'all' && Array.from({length: specialties.find(s=>s.id === selectedSpec)?.groups || 0}).map((_, i) => (
                                        <option key={i+1} value={i+1}>فوج {i+1}</option>
                                    ))}
                                </select>
                             </div>
                        </div>

                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <FileSpreadsheet className="text-emerald-400" />
                                إدارة ملفات التنقيط
                            </h3>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handleDownloadTemplate}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {activeTab === 'final' ? 'تحميل نموذج المداولات' : 'تحميل قائمة التنقيط (CSV)'}
                                </button>
                                
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".csv"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {activeTab === 'final' ? 'استيراد النتائج النهائية' : 'رفع العلامات (CSV)'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {activeTab === 'final' && (
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-slideUp">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                    <Settings className="text-amber-400 w-5 h-5" />
                                    إعدادات المحضر (للطباعة)
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 font-bold block">تاريخ المداولات:</label>
                                        <input 
                                            type="text" placeholder="مثال: 25 جويلية 2026" 
                                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-sm"
                                            value={deliberationDate}
                                            onChange={e => setDeliberationDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 font-bold block">رئيس اللجنة (ممثل السلطة):</label>
                                        <input 
                                            type="text" placeholder="الاسم واللقب" 
                                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-sm"
                                            value={committeeMembers.president}
                                            onChange={e => setCommitteeMembers({...committeeMembers, president: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 font-bold block">عضو 1 (المدير البيداغوجي):</label>
                                        <input 
                                            type="text" placeholder="الاسم واللقب" 
                                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-sm"
                                            value={committeeMembers.director}
                                            onChange={e => setCommitteeMembers({...committeeMembers, director: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 font-bold block">عضو 2 (ممثل المكونين):</label>
                                        <input 
                                            type="text" placeholder="الاسم واللقب" 
                                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-sm"
                                            value={committeeMembers.trainer1}
                                            onChange={e => setCommitteeMembers({...committeeMembers, trainer1: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 font-bold block">عضو 3 (ممثل المكونين):</label>
                                        <input 
                                            type="text" placeholder="الاسم واللقب" 
                                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-sm"
                                            value={committeeMembers.trainer2}
                                            onChange={e => setCommitteeMembers({...committeeMembers, trainer2: e.target.value})}
                                        />
                                    </div>

                                    <button 
                                        onClick={handlePrintPV}
                                        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold transition-colors mt-4"
                                    >
                                        <Award className="w-4 h-4" />
                                        طباعة محضر المداولات (PV)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Data Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                                <h3 className="font-bold text-white">
                                    {activeTab === 'final' ? 'جدول النتائج النهائية' : `نقاط ${activeTab === 's1' ? 'الدورة الأولى' : activeTab === 's2' ? 'الدورة الثانية' : 'الدورة الثالثة'}`}
                                </h3>
                                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                                    العدد: {getFilteredTrainees().length}
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">اللقب والاسم</th>
                                            {activeTab === 'final' ? (
                                                <>
                                                    <th className="p-3 text-center">م.م.مستمرة (x2)</th>
                                                    <th className="p-3 text-center">ا.نهائي (x3)</th>
                                                    <th className="p-3 text-center">التقرير (x1)</th>
                                                    <th className="p-3 text-center bg-slate-900 text-white">المعدل العام</th>
                                                    <th className="p-3 text-center">القرار</th>
                                                </>
                                            ) : (
                                                <th className="p-3 text-center">العلامة / 20</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {getFilteredTrainees().map((t, idx) => {
                                            const record = grades[t.id] || {};
                                            
                                            if (activeTab === 'final') {
                                                const mcpc = calculateMCPC(t.id);
                                                const finalAvg = calculateFinalAverage(t.id);
                                                const isPass = finalAvg >= 10;
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-800/30">
                                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-white">
                                                            <div>{t.surname} {t.name}</div>
                                                            <div className="text-[10px] text-slate-500">{t.dob}</div>
                                                        </td>
                                                        <td className="p-3 text-center text-slate-300">{mcpc}</td>
                                                        <td className="p-3 text-center text-slate-300">{record.finalExam !== undefined ? record.finalExam : '-'}</td>
                                                        <td className="p-3 text-center text-slate-300">{record.report !== undefined ? record.report : '-'}</td>
                                                        <td className="p-3 text-center font-black text-white bg-slate-800/50">{finalAvg}</td>
                                                        <td className="p-3 text-center">
                                                            {isPass ? (
                                                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-bold">ناجح</span>
                                                            ) : (
                                                                <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold">مؤجل</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            } else {
                                                const score = record[activeTab];
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-800/30">
                                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-white">
                                                            <div>{t.surname} {t.name}</div>
                                                            <div className="text-[10px] text-slate-500">{t.dob}</div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {score !== undefined ? (
                                                                <span className={`font-bold ${score >= 10 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {score}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        })}
                                        {getFilteredTrainees().length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                                    لا توجد بيانات. تأكد من إضافة المتكونين واختيار الفوج المناسب.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PRINT TEMPLATES - Always Rendered but hidden */}
            <div className="hidden">
                {/* 2. DELIBERATION PV (Revised Layout) */}
                <div id="deliberation-pv" className="p-8 bg-white text-black font-serif text-justify" style={{ direction: 'rtl' }}>
                    
                    {/* Header: Reduced bottom margin */}
                    <div className="text-center mb-4">
                        <h3 className="font-bold text-lg">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                        <h3 className="font-bold text-lg">وزارة التربية الوطنية</h3>
                        <div className="flex justify-between mt-2 text-sm font-bold px-0 w-full border-t border-gray-300 pt-2">
                            <span>مديرية التربية لولاية: {institution.wilaya}</span>
                            <span>مركز إجراء التكوين: {institution.center}</span>
                        </div>
                    </div>

                    {/* Title: Reduced margins */}
                    <div className="text-center mb-4 border-2 border-black p-2 rounded">
                        <h1 className="text-xl font-black underline decoration-double">
                            محضر لجنة نهاية التكوين البيداغوجي التحضيري أثناء التربص التجريبي
                        </h1>
                        <h2 className="text-lg font-bold mt-1">2025 - 2026 لرتبة: أستاذ التعليم الابتدائي</h2>
                    </div>

                    {/* Body Text: Reduced Line Height */}
                    <div className="leading-relaxed text-base mb-4">
                        <p>
                            في العام <span className="font-bold">2026</span> وفي <span className="font-bold border-b border-dotted border-black px-2">{deliberationDate || '.......................'}</span> على الساعة <span className="font-bold">..............</span> انعقدت بمقر <span className="font-bold">{institution.center}</span> بولاية <span className="font-bold">{institution.wilaya}</span> لجنة مداولات النتائج النهائية للتكوين البيداغوجي التحضيري أثناء التربص التجريبي للالتحاق بسلك أساتذة التعليم الابتدائي، رتبة: أستاذ التعليم الابتدائي، وذلك طبقاً للقرار الوزاري رقم: 250 المؤرخ في 24 أوت 2015 الذي يحدد كيفيات تنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي لموظفي التعليم ومدته وكذا محتوى برامجه.
                        </p>
                    </div>

                    {/* Members: Compact List */}
                    <div className="mb-4 bg-gray-50 p-2 border border-gray-200 rounded">
                        <p className="font-bold mb-2 underline">حضر الأعضاء الآتية أسماؤهم:</p>
                        <ul className="space-y-1 list-none pr-2 text-sm">
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.president}</span> ممثل السلطة التي لها صلاحية التعيين (رئيساً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.director}</span> المدير البيداغوجي (عضواً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.trainer1}</span> ممثلاً عن المكونين (عضواً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.trainer2}</span> ممثلاً عن المكونين (عضواً)</li>
                        </ul>
                    </div>

                    {/* Committee Decision Intro */}
                    <div className="mb-2 text-sm">
                        <p className="font-bold underline mb-1">إن اللجنة وبعد:</p>
                        <ol className="list-decimal list-inside pr-4">
                            <li>الاطلاع على الكشف العام لنتائج نهاية التكوين البيداغوجي التحضيري دورة 2025/2026.</li>
                            <li>دراسة العلامات والمعدلات التي تحصل عليها المتكونون خلال دورة التكوين.</li>
                            <li>حصيلة التكوين البيداغوجي التحضيري:</li>
                        </ol>
                    </div>

                    {/* Stats Table (Page 1 OCR) - Reduced Padding */}
                    <table className="w-full border border-black text-center text-xs mb-4">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-1">المقاييس</th>
                                <th className="border border-black p-1 w-24">عدد المتكونين</th>
                                <th className="border border-black p-1 w-24">عدد الحاضرين</th>
                                <th className="border border-black p-1 w-32">الحجم الساعي المنجز</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MODULES.map(m => (
                                <tr key={m.id}>
                                    <td className="border border-black p-1 text-right px-2">{m.title}</td>
                                    <td className="border border-black p-1">{trainees.length}</td>
                                    <td className="border border-black p-1">{trainees.length}</td>
                                    <td className="border border-black p-1 font-bold">{m.totalHours} سا</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold">
                                <td className="border border-black p-1 text-right px-2">المجموع</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1">190 سا</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* FORCE PAGE BREAK - Correctly styled */}
                    <div className="page-break" style={{ pageBreakAfter: 'always', height: 0, margin: 0 }}></div>

                    {/* Page 2 Content */}
                    <div className="mt-8 pt-4">
                         <p className="mb-4 text-lg leading-relaxed">
                            تصادق بإجماع أعضائها على قبول قائمة الناجحين النهائية الذين تحصلوا على معدل يساوي 10 على 20 أو يفوق، وعددهم <span className="font-bold text-xl px-2 border-2 border-black rounded bg-gray-100">{getSuccessStats().admitted}</span> ناجحاً.
                         </p>
                         <p className="font-bold text-lg mb-4 underline">وتم إعداد قائمة المتكونين الناجحين حسب درجة الاستحقاق كالآتي:</p>
                         
                         {/* List of Successful Candidates */}
                         <table className="w-full border border-black text-center text-sm mb-8">
                             <thead className="bg-gray-100">
                                 <tr>
                                     <th className="border border-black p-2 w-12">ر.ت</th>
                                     <th className="border border-black p-2">اللقب والاسم</th>
                                     <th className="border border-black p-2 w-32">تاريخ الميلاد</th>
                                     <th className="border border-black p-2">التخصص</th>
                                     <th className="border border-black p-2 w-24">المعدل العام</th>
                                     <th className="border border-black p-2 w-24">الملاحظة</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {trainees
                                    .map(t => ({...t, avg: calculateFinalAverage(t.id)}))
                                    .filter(t => t.avg >= 10)
                                    .sort((a,b) => b.avg - a.avg) // Merit sort
                                    .map((t, idx) => (
                                     <tr key={t.id}>
                                         <td className="border border-black p-2">{idx + 1}</td>
                                         <td className="border border-black p-2 font-bold text-right px-4">{t.surname} {t.name}</td>
                                         <td className="border border-black p-2">{t.dob}</td>
                                         <td className="border border-black p-2">{specialties.find(s=>s.id===t.specialtyId)?.name}</td>
                                         <td className="border border-black p-2 font-bold">{t.avg}</td>
                                         <td className="border border-black p-2">ناجح</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         <div className="mb-12 text-base">
                             <p>وبعد استنفاذ جدول الأعمال رفعت الجلسة في يومها على الواحدة زوالاً.</p>
                             <p>حرر هذا المحضر لإثبات ما ذكر أعلاه.</p>
                         </div>

                         <div className="flex justify-between px-12 text-lg font-bold">
                             <div className="text-center">
                                 <p className="mb-12 underline">أعضاء اللجنة</p>
                             </div>
                             <div className="text-center">
                                 <p className="mb-12 underline">رئيس اللجنة (مدير التربية)</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationManager;