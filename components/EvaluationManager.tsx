
import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Printer, Award, Calculator, Settings, BookOpen, UserCheck, Calendar, Clock, Users, ChevronDown, ChevronUp, AlertCircle, Save, Eye, X, FileUp, Edit2, Lock, Unlock, FileText } from 'lucide-react';
import { Trainee, Specialty, EvaluationDatabase, InstitutionConfig, TrainerConfig, TrainerAssignment } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES, MODULES } from '../constants';
import ExamManager from './ExamManager';

const EvaluationManager: React.FC = () => {
    // Data State
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [grades, setGrades] = useState<EvaluationDatabase>({});
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    // For Smart Export (Needs Timetable Data)
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'entry' | 'exams' | 'deliberation'>('entry');
    const [selectedTraineeForDetail, setSelectedTraineeForDetail] = useState<Trainee | null>(null);
    const [editingCell, setEditingCell] = useState<string | null>(null); // Format: "traineeId-type"
    
    // Entry State
    const [selectedSpec, setSelectedSpec] = useState<string>('all');
    const [selectedGroup, setSelectedGroup] = useState<number>(0);
    const [selectedModuleId, setSelectedModuleId] = useState<number>(1);
    const [selectedTerm, setSelectedTerm] = useState<'s1' | 's2' | 's3' | 'exam'>('s1');
    const [selectedTrainerExport, setSelectedTrainerExport] = useState<string>(''); 

    // Deliberation State (Report Grading)
    const [reportGroupFilter, setReportGroupFilter] = useState<string>(''); // specId-groupNum

    // PV Variables
    const [pvConfig, setPvConfig] = useState({
        year: '2026',
        day: '',
        month: 'جويلية',
        timeStart: '09:00',
        timeEnd: '13:00',
        actualAttendees: ''
    });

    const [committeeMembers, setCommitteeMembers] = useState({
        president: '',
        director: '',
        trainer1: '',
        trainer2: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e) {}
        
        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) try { setSpecialties(JSON.parse(savedSpec)); } catch(e) {}

        const savedGrades = localStorage.getItem('takwin_grades_db');
        if (savedGrades) try { setGrades(JSON.parse(savedGrades)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}
        
        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) try { setTrainerConfig(JSON.parse(savedTrainers)); } catch(e) {}

        const savedAssignments = localStorage.getItem('takwin_assignments');
        if (savedAssignments) try { setAssignments(JSON.parse(savedAssignments)); } catch(e) {}

        const inst = JSON.parse(localStorage.getItem('takwin_institution_db') || '{}');
        if (inst.director) setCommitteeMembers(prev => ({ ...prev, director: inst.director }));

    }, []);

    const saveGrades = (newGrades: EvaluationDatabase) => {
        setGrades(newGrades);
        localStorage.setItem('takwin_grades_db', JSON.stringify(newGrades));
    };

    // --- LOGIC: UPDATE SINGLE GRADE ---
    const handleGradeChange = (traineeId: string, value: string, type: 'module' | 'report') => {
        const numValue = parseFloat(value);
        // Allow empty string for deletion, otherwise check bounds
        if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 20)) return;

        const valToSave = value === '' ? undefined : numValue;

        setGrades(prev => {
            const traineeGrades = prev[traineeId] || { modules: {} };
            
            if (type === 'module') {
                const moduleGrades = traineeGrades.modules[selectedModuleId] || {};
                return {
                    ...prev,
                    [traineeId]: {
                        ...traineeGrades,
                        modules: {
                            ...traineeGrades.modules,
                            [selectedModuleId]: {
                                ...moduleGrades,
                                [selectedTerm]: valToSave
                            }
                        }
                    }
                };
            } else {
                return {
                    ...prev,
                    [traineeId]: {
                        ...traineeGrades,
                        report: valToSave
                    }
                };
            }
        });
    };

    // --- LOGIC: CALCULATIONS (THE CORE) ---
    const calculateTraineeResults = (tId: string) => {
        const tGrades = grades[tId];
        
        let sumWeightedCC = 0;
        let sumWeightedExam = 0;
        let totalCoeff = 0;

        MODULES.forEach(m => {
            const mGrades = tGrades?.modules?.[m.id];
            const s1 = mGrades?.s1 || 0;
            const s2 = mGrades?.s2 || 0;
            const s3 = mGrades?.s3 || 0;
            const exam = mGrades?.exam || 0;

            const avgCC = (s1 + s2 + s3) / 3;
            
            sumWeightedCC += avgCC * m.coefficient;
            sumWeightedExam += exam * m.coefficient;
            totalCoeff += m.coefficient;
        });

        const globalCC = totalCoeff > 0 ? parseFloat((sumWeightedCC / totalCoeff).toFixed(2)) : 0;
        const globalExam = totalCoeff > 0 ? parseFloat((sumWeightedExam / totalCoeff).toFixed(2)) : 0;
        const report = tGrades?.report || 0;

        // Formula: (CC*2 + Exam*3 + Report*1) / 6
        const finalAvg = parseFloat(((globalCC * 2 + globalExam * 3 + report * 1) / 6).toFixed(2));

        return { globalCC, globalExam, report, finalAvg, sumWeightedCC, sumWeightedExam, totalCoeff };
    };

    const getFilteredTrainees = () => {
        return trainees.filter(t => {
            const specMatch = selectedSpec === 'all' || t.specialtyId === selectedSpec;
            const groupMatch = selectedGroup === 0 || t.groupId === selectedGroup;
            return specMatch && groupMatch;
        }).sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
    };

    const getSuccessStats = () => {
        let total = 0, admitted = 0;
        trainees.forEach(t => {
            const { finalAvg } = calculateTraineeResults(t.id);
            total++;
            if (finalAvg >= 10) admitted++;
        });
        return { total, admitted, adjourned: total - admitted };
    };

    // --- SMART IMPORT/EXPORT LOGIC ---

    const getGroupsForTrainer = (moduleId: number, trainerKey: string) => {
        const trainerAssignments = assignments.filter(a => a.moduleId === moduleId && a.trainerKey === trainerKey);
        const groupIds = Array.from(new Set(trainerAssignments.map(a => a.groupId))); 
        return groupIds;
    };

    const handleSmartExport = () => {
        const modName = MODULES.find(m=>m.id===selectedModuleId)?.shortTitle || 'Mod';
        const termName = selectedTerm === 'exam' ? 'Exam' : selectedTerm.toUpperCase();
        
        let list = getFilteredTrainees();
        let filename = `Grades_${modName}_${termName}_All.csv`;

        if (selectedTrainerExport) {
            const [modIdStr, trainerKey] = selectedTrainerExport.split('|');
            const modId = parseInt(modIdStr);
            const assignedGroupIds = getGroupsForTrainer(modId, trainerKey);

            if (assignedGroupIds.length > 0) {
                list = trainees.filter(t => assignedGroupIds.includes(`${t.specialtyId}-${t.groupId}`))
                               .sort((a,b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
                const trainerName = trainerConfig[modId]?.names?.[trainerKey] || 'Trainer';
                filename = `Grades_${modName}_${termName}_${trainerName.replace(/\s/g, '_')}.csv`;
            }
        }

        handleDownloadTemplate(list, filename, selectedTerm);
    };

    const handleReportExport = () => {
        let list = trainees;
        let suffix = "All";
        if (reportGroupFilter) {
            const [specId, gNum] = reportGroupFilter.split('-');
            list = trainees.filter(t => t.specialtyId === specId && t.groupId === parseInt(gNum));
            suffix = `${specialties.find(s=>s.id===specId)?.name}_G${gNum}`;
        }
        list = list.sort((a,b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
        handleDownloadTemplate(list, `Report_Grades_${suffix}.csv`, 'report');
    };

    const handleDownloadTemplate = (list: Trainee[], filename: string, typeName: string) => {
        // We use a specific header to identify the file type if needed, but mainly we rely on column position
        const colName = typeName === 'report' ? 'علامة_التقرير' : 
                        typeName === 'exam' ? 'علامة_الامتحان' : 
                        `علامة_${typeName}`; // S1, S2, S3

        const headers = ["ID_SYSTEM", "اللقب", "الاسم", "التخصص_والفوج", colName];
        const rows = list.map(t => `"${t.id}","${t.surname}","${t.name}","${specialties.find(s=>s.id===t.specialtyId)?.name} ${t.groupId}",""`);
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>, importType: 'module' | 'report') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            // Robust splitting for lines (CRLF or LF)
            const lines = text.split(/\r\n|\n|\r/); 
            let updatedCount = 0;
            
            const newGrades = { ...grades };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Robust splitting for CSV columns (handle quoted strings containing commas if any, though our export uses quotes)
                // Regex: Split by comma ONLY if not inside quotes
                const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                
                if (!parts || parts.length < 1) continue;

                // Remove quotes from ID and Value
                const id = parts[0].replace(/^"|"$/g, '').trim(); 
                // Mark is usually the last column (index 4 in our template)
                // We search for the last non-empty part or specifically index 4
                let gradeStr = '';
                if (parts.length >= 5) {
                    gradeStr = parts[parts.length - 1].replace(/^"|"$/g, '').trim();
                }

                // If grade is empty, skip
                if (!gradeStr) continue;

                const grade = parseFloat(gradeStr.replace(',', '.')); // Handle decimal comma

                if (id && !isNaN(grade)) {
                    if (grade >= 0 && grade <= 20) {
                        if (!newGrades[id]) newGrades[id] = { modules: {} };
                        
                        if (importType === 'module') {
                            if (!newGrades[id].modules[selectedModuleId]) newGrades[id].modules[selectedModuleId] = {};
                            newGrades[id].modules[selectedModuleId][selectedTerm] = grade;
                        } else {
                            newGrades[id].report = grade;
                        }
                        updatedCount++;
                    }
                }
            }

            saveGrades(newGrades);
            const context = importType === 'module' 
                ? `المقياس: ${MODULES.find(m=>m.id===selectedModuleId)?.title} (${selectedTerm === 'exam' ? 'امتحان' : selectedTerm})`
                : `تقييم التقرير النهائي`;
            
            alert(`تم استيراد النقاط بنجاح!\n----------------\nالنوع: ${context}\nعدد العلامات المحجوزة: ${updatedCount}`);
        };
        reader.readAsText(file);
        
        // Reset inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (reportInputRef.current) reportInputRef.current.value = '';
    };

    const getTrainersForDropdown = () => {
        const options: { value: string, label: string }[] = [];
        const conf = trainerConfig[selectedModuleId];
        if (conf && conf.names) {
            Object.entries(conf.names).forEach(([key, name]) => {
                if (name) options.push({ value: `${selectedModuleId}|${key}`, label: `${name} (${MODULES.find(m=>m.id===selectedModuleId)?.shortTitle})` });
            });
        }
        return options;
    };

    const getAllGroupsList = () => {
        const list: {value: string, label: string}[] = [];
        specialties.forEach(s => {
            for(let i=1; i<=s.groups; i++) list.push({ value: `${s.id}-${i}`, label: `${s.name} - فوج ${i}` });
        });
        return list;
    };

    // --- PRINT HANDLERS ---
    const handlePrintPV = () => {
        const printContent = document.getElementById('deliberation-pv');
        let printSection = document.getElementById('print-section');
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        if (printContent && printSection) {
            printSection.innerHTML = '';
            const contentClone = printContent.cloneNode(true) as HTMLElement;
            contentClone.classList.remove('hidden');
            printSection.appendChild(contentClone);
            setTimeout(() => window.print(), 300);
        }
    };

    const handlePrintGradeSheet = () => {
        const modalContent = document.getElementById('grade-sheet-modal-content');
        let printSection = document.getElementById('print-section');
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        if (modalContent && printSection) {
            printSection.innerHTML = '';
            const contentClone = modalContent.cloneNode(true) as HTMLElement;
            printSection.appendChild(contentClone);
            setTimeout(() => window.print(), 300);
        }
    };

    // --- DETAILED GRADE SHEET MODAL ---
    const GradeDetailModal = () => {
        if (!selectedTraineeForDetail) return null;
        
        const t = selectedTraineeForDetail;
        const tGrades = grades[t.id] || { modules: {} };
        const { globalCC, globalExam, report, finalAvg, sumWeightedCC, sumWeightedExam, totalCoeff } = calculateTraineeResults(t.id);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white text-black w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg">كشف النقاط التفصيلي</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePrintGradeSheet} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
                                <Printer className="w-4 h-4" /> طباعة البطاقة
                            </button>
                            <button onClick={() => setSelectedTraineeForDetail(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto" id="grade-sheet-modal-content">
                        {/* Header for Print */}
                        <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-black">
                            <h3 className="text-lg font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                            <h3 className="text-lg font-bold">وزارة التربية الوطنية</h3>
                            <h2 className="text-2xl font-black mt-2 underline">بطاقة التنقيط والمتابعة البيداغوجية</h2>
                        </div>

                        <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-4" style={{ direction: 'rtl' }}>
                            <div>
                                <p className="text-sm font-bold text-gray-500">الاسم واللقب:</p>
                                <p className="text-2xl font-black">{t.surname} {t.name}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-500">التخصص / الفوج:</p>
                                <p className="text-lg font-bold">{specialties.find(s=>s.id===t.specialtyId)?.name} / ف{t.groupId}</p>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-500">تاريخ الميلاد:</p>
                                <p className="text-lg font-bold" dir="ltr">{t.dob}</p>
                            </div>
                        </div>

                        <table className="w-full text-center border-collapse border border-black text-sm" style={{ direction: 'rtl' }}>
                            <thead className="bg-gray-100 font-bold">
                                <tr>
                                    <th className="border border-black p-2 bg-gray-200" rowSpan={2}>المقياس</th>
                                    <th className="border border-black p-2 w-12" rowSpan={2}>المعامل</th>
                                    <th className="border border-black p-1" colSpan={3}>نقاط الدورات</th>
                                    <th className="border border-black p-1 bg-blue-50" colSpan={2}>المراقبة المستمرة</th>
                                    <th className="border border-black p-1 bg-purple-50" colSpan={2}>الامتحان النهائي</th>
                                </tr>
                                <tr>
                                    <th className="border border-black p-1 text-xs">د 1</th>
                                    <th className="border border-black p-1 text-xs">د 2</th>
                                    <th className="border border-black p-1 text-xs">د 3</th>
                                    <th className="border border-black p-1 text-xs bg-blue-50">المعدل</th>
                                    <th className="border border-black p-1 text-xs bg-blue-50">المجموع (xم)</th>
                                    <th className="border border-black p-1 text-xs bg-purple-50">العلامة</th>
                                    <th className="border border-black p-1 text-xs bg-purple-50">المجموع (xم)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(m => {
                                    const mg = tGrades.modules[m.id] || {};
                                    const s1 = mg.s1 || 0;
                                    const s2 = mg.s2 || 0;
                                    const s3 = mg.s3 || 0;
                                    const exam = mg.exam || 0;
                                    const avgCC = parseFloat(((s1+s2+s3)/3).toFixed(2));
                                    const weightedCC = parseFloat((avgCC * m.coefficient).toFixed(2));
                                    const weightedExam = parseFloat((exam * m.coefficient).toFixed(2));

                                    return (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="border border-black p-2 text-right px-3 font-bold">{m.title}</td>
                                            <td className="border border-black p-2 font-bold">{m.coefficient}</td>
                                            <td className="border border-black p-2 text-gray-600">{mg.s1 ?? '-'}</td>
                                            <td className="border border-black p-2 text-gray-600">{mg.s2 ?? '-'}</td>
                                            <td className="border border-black p-2 text-gray-600">{mg.s3 ?? '-'}</td>
                                            <td className="border border-black p-2 font-bold bg-blue-50/50">{avgCC}</td>
                                            <td className="border border-black p-2 text-blue-800 bg-blue-50/50 font-bold">{weightedCC}</td>
                                            <td className="border border-black p-2 font-bold bg-purple-50/50">{mg.exam ?? '-'}</td>
                                            <td className="border border-black p-2 text-purple-800 bg-purple-50/50 font-bold">{weightedExam}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-gray-200 font-bold text-base border-t-2 border-black">
                                    <td className="border border-black p-3 text-right px-3">المجاميع العامة</td>
                                    <td className="border border-black p-3">{totalCoeff}</td>
                                    <td colSpan={3} className="border border-black bg-gray-300"></td>
                                    <td className="border border-black p-3">{globalCC}</td>
                                    <td className="border border-black p-3">{sumWeightedCC.toFixed(2)}</td>
                                    <td className="border border-black p-3">{globalExam}</td>
                                    <td className="border border-black p-3">{sumWeightedExam.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mt-8 grid grid-cols-2 gap-8" style={{ direction: 'rtl' }}>
                            <div className="border-2 border-black rounded p-4 bg-gray-50">
                                <h4 className="font-bold underline mb-2 text-sm">تفصيل حساب المعدل النهائي:</h4>
                                <div className="space-y-2 text-sm font-medium" dir="ltr">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-600 text-xs">(معدل المراقبة المستمرة x 2)</span>
                                        <span>{globalCC} x 2 = {(globalCC * 2).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-600 text-xs">(معدل الامتحان الشامل x 3)</span>
                                        <span>{globalExam} x 3 = {(globalExam * 3).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-600 text-xs">(نقطة التقرير/المذكرة x 1)</span>
                                        <span>{report} x 1 = {report}</span>
                                    </div>
                                    <div className="border-t border-black my-1"></div>
                                    <div className="flex justify-between font-bold">
                                        <span>المجموع / 6</span>
                                        <span>{((globalCC*2 + globalExam*3 + report)/6).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center items-center border-2 border-black rounded p-4 bg-gray-900 text-white print:bg-white print:text-black print:border-4">
                                <span className="text-gray-400 mb-2 print:text-black print:font-bold">المعدل العام النهائي</span>
                                <span className="text-5xl font-black text-amber-400 print:text-black">{finalAvg}</span>
                                <span className={`mt-2 px-3 py-1 rounded font-bold text-sm ${finalAvg >= 10 ? 'bg-green-600 print:bg-transparent print:border print:border-black' : 'bg-red-600 print:bg-transparent print:border print:border-black'}`}>
                                    {finalAvg >= 10 ? 'ناجح (Admis)' : 'مؤجل (Ajourné)'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="hidden print:flex justify-between mt-12 px-8 font-bold text-lg">
                            <div>إمضاء الأستاذ المنسق</div>
                            <div>إمضاء مدير التكوين</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            {/* Modal */}
            {selectedTraineeForDetail && <GradeDetailModal />}

            {/* Header Tabs */}
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('entry')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'entry' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Calculator className="w-4 h-4"/> حجز النقاط
                        </button>
                        <button
                            onClick={() => setActiveTab('exams')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'exams' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Settings className="w-4 h-4"/> تنظيم الامتحانات
                        </button>
                        <button
                            onClick={() => setActiveTab('deliberation')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'deliberation' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Award className="w-4 h-4"/> المداولات النهائية
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB 1: ENTRY */}
            {activeTab === 'entry' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
                    {/* Filters Panel */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <Settings className="text-blue-400 w-4 h-4" /> إعدادات القوائم
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">1. اختر المقياس</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedModuleId}
                                        onChange={e => { setSelectedModuleId(parseInt(e.target.value)); setSelectedTrainerExport(''); }}
                                    >
                                        {MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">2. نوع النقطة (للحجز)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['s1', 's2', 's3'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setSelectedTerm(s as any)}
                                                className={`py-2 rounded text-xs font-bold border ${selectedTerm === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                دورة {s.replace('s','')}
                                            </button>
                                        ))}
                                        <button 
                                            onClick={() => setSelectedTerm('exam')}
                                            className={`py-2 rounded text-xs font-bold border ${selectedTerm === 'exam' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            الامتحان
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4 mt-2 bg-slate-800/80 p-3 rounded-lg border">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                        <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                                        نظام الاستيراد (موصى به)
                                    </h4>
                                    
                                    <label className="text-[10px] text-slate-400 block mb-1">تحديد الأستاذ (اختياري - للطباعة)</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs mb-2"
                                        value={selectedTrainerExport}
                                        onChange={e => setSelectedTrainerExport(e.target.value)}
                                    >
                                        <option value="">-- تصدير القائمة العامة --</option>
                                        {getTrainersForDropdown().map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={handleSmartExport}
                                            className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold transition-colors border border-slate-600"
                                        >
                                            <Download className="w-3 h-3" /> تحميل القائمة
                                        </button>
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-xs font-bold transition-colors shadow-md"
                                        >
                                            <FileUp className="w-3 h-3" /> رفع النقاط
                                        </button>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleImportCSV(e, 'module')} className="hidden" accept=".csv" />
                                </div>

                                <div className="border-t border-slate-700 pt-4 mt-2">
                                    <label className="text-xs text-slate-400 block mb-1">تصفية العرض في الجدول</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm mb-2"
                                        value={selectedSpec}
                                        onChange={e => { setSelectedSpec(e.target.value); setSelectedGroup(0); }}
                                    >
                                        <option value="all">كل التخصصات</option>
                                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
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
                        </div>
                    </div>

                    {/* Input Table */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-white">جدول النقاط: {MODULES.find(m=>m.id===selectedModuleId)?.title}</h3>
                                    <p className="text-xs text-blue-400 font-bold mt-1">
                                        {selectedTerm === 'exam' ? 'علامة الامتحان النهائي' : `علامة المراقبة المستمرة - الدورة ${selectedTerm.replace('s','')}`}
                                    </p>
                                </div>
                                <span className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-300">العدد: {getFilteredTrainees().length}</span>
                            </div>
                            
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 w-16">#</th>
                                            <th className="p-3">اللقب والاسم</th>
                                            <th className="p-3 w-32">الفوج</th>
                                            <th className="p-3 w-40 text-center bg-slate-900 text-white border-b-2 border-blue-500">
                                                العلامة / 20
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {getFilteredTrainees().map((t, idx) => {
                                            const val = grades[t.id]?.modules?.[selectedModuleId]?.[selectedTerm];
                                            const cellKey = `${t.id}-module`;
                                            const isEditing = editingCell === cellKey;

                                            return (
                                                <tr key={t.id} className="hover:bg-slate-800/30 group">
                                                    <td className="p-3 text-slate-500">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-white group-hover:text-blue-200 transition-colors">
                                                        {t.surname} {t.name}
                                                    </td>
                                                    <td className="p-3 text-slate-400">
                                                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">فوج {t.groupId}</span>
                                                    </td>
                                                    <td className="p-3 text-center flex justify-center items-center gap-2">
                                                        {isEditing ? (
                                                            <input 
                                                                type="number" 
                                                                min="0" max="20" step="0.5"
                                                                autoFocus
                                                                onBlur={() => setEditingCell(null)}
                                                                className={`w-20 text-center font-bold text-black rounded p-1 focus:ring-2 focus:ring-blue-500 outline-none ${
                                                                    val === undefined ? 'bg-white' : (val < 10 ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-800')
                                                                }`}
                                                                value={val === undefined ? '' : val}
                                                                onChange={e => handleGradeChange(t.id, e.target.value, 'module')}
                                                                placeholder="-"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-16 text-center font-bold text-lg ${
                                                                    val === undefined ? 'text-slate-600' : (val < 10 ? 'text-red-400' : 'text-emerald-400')
                                                                }`}>
                                                                    {val ?? '-'}
                                                                </span>
                                                                <button 
                                                                    onClick={() => setEditingCell(cellKey)}
                                                                    className="text-slate-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="تعديل يدوي"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {getFilteredTrainees().length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">لا توجد بيانات</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: EXAMS */}
            {activeTab === 'exams' && (
                <ExamManager trainees={trainees} specialties={specialties} institution={institution} />
            )}

            {/* TAB 3: DELIBERATION */}
            {activeTab === 'deliberation' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
                    {/* Settings Panel */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-white mb-4 border-b border-slate-700 pb-2">إعدادات المداولات</h3>
                            
                            <div className="space-y-4">
                                {/* REPORT IMPORT SECTION */}
                                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-600">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-amber-400" />
                                        تقييم التقرير النهائي (المذكرة)
                                    </h4>
                                    
                                    <label className="text-[10px] text-slate-400 block mb-1">اختر الفوج لاستخراج القائمة</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs mb-2"
                                        value={reportGroupFilter}
                                        onChange={e => setReportGroupFilter(e.target.value)}
                                    >
                                        <option value="">-- كل الأفواج --</option>
                                        {getAllGroupsList().map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={handleReportExport}
                                            className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold transition-colors border border-slate-600"
                                        >
                                            <Download className="w-3 h-3" /> قائمة التنقيط
                                        </button>
                                        <button 
                                            onClick={() => reportInputRef.current?.click()}
                                            className="flex items-center justify-center gap-1 bg-amber-700 hover:bg-amber-600 text-white py-2 rounded text-xs font-bold transition-colors"
                                        >
                                            <FileUp className="w-3 h-3" /> رفع العلامات
                                        </button>
                                    </div>
                                    <input type="file" ref={reportInputRef} onChange={(e) => handleImportCSV(e, 'report')} className="hidden" accept=".csv" />
                                </div>

                                <div className="pt-2 border-t border-slate-700">
                                    <label className="text-xs text-slate-400 block mb-1">تصفية العرض حسب التخصص</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedSpec}
                                        onChange={e => { setSelectedSpec(e.target.value); setSelectedGroup(0); }}
                                    >
                                        <option value="all">الكل</option>
                                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {/* PV Details (Collapsed slightly) */}
                                <details className="group">
                                    <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900 p-2 text-xs font-bold text-white hover:bg-slate-800">
                                        <span>تفاصيل المحضر (للطباعة)</span>
                                        <span className="transition group-open:rotate-180"><ChevronDown className="w-4 h-4"/></span>
                                    </summary>
                                    <div className="mt-2 space-y-2 p-2 border-l-2 border-slate-700">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="السنة" className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-xs" value={pvConfig.year} onChange={e=>setPvConfig({...pvConfig, year:e.target.value})} />
                                            <input type="text" placeholder="الشهر" className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-xs" value={pvConfig.month} onChange={e=>setPvConfig({...pvConfig, month:e.target.value})} />
                                        </div>
                                        <input type="text" placeholder="اليوم" className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-xs" value={pvConfig.day} onChange={e=>setPvConfig({...pvConfig, day:e.target.value})} />
                                        <input type="number" placeholder="عدد الحاضرين" className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-xs" value={pvConfig.actualAttendees} onChange={e=>setPvConfig({...pvConfig, actualAttendees:e.target.value})} />
                                    </div>
                                </details>

                                <button onClick={handlePrintPV} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm mt-4 flex items-center justify-center gap-2">
                                    <Printer className="w-4 h-4" /> طباعة المحضر
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Table with Report Input */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                                <h3 className="font-bold text-white">النتائج النهائية التفصيلية</h3>
                                <p className="text-xs text-slate-400 mt-1">اضغط على أيقونة العين 👁️ لعرض كشف النقاط التفصيلي وحساب المعدلات.</p>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 w-10">#</th>
                                            <th className="p-3">الاسم واللقب</th>
                                            <th className="p-3 text-center text-blue-300">معدل المراقبة (x2)</th>
                                            <th className="p-3 text-center text-purple-300">معدل الامتحان (x3)</th>
                                            <th className="p-3 text-center text-amber-300 bg-slate-900">نقطة التقرير (x1)</th>
                                            <th className="p-3 text-center text-white bg-slate-800">المعدل العام</th>
                                            <th className="p-3 text-center">القرار</th>
                                            <th className="p-3 text-center w-12">تفاصيل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {getFilteredTrainees().map((t, idx) => {
                                            const { globalCC, globalExam, report, finalAvg } = calculateTraineeResults(t.id);
                                            const isPass = finalAvg >= 10;
                                            const cellKey = `${t.id}-report`;
                                            const isEditing = editingCell === cellKey;
                                            
                                            return (
                                                <tr key={t.id} className="hover:bg-slate-800/30 group">
                                                    <td className="p-3 text-slate-500">{idx+1}</td>
                                                    <td className="p-3 font-bold text-white">{t.surname} {t.name}</td>
                                                    <td className="p-3 text-center text-blue-200">{globalCC}</td>
                                                    <td className="p-3 text-center text-purple-200">{globalExam}</td>
                                                    <td className="p-3 text-center bg-slate-900/50">
                                                        {isEditing ? (
                                                            <input 
                                                                type="number" min="0" max="20"
                                                                autoFocus
                                                                onBlur={() => setEditingCell(null)}
                                                                className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-amber-400 font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                                                                value={grades[t.id]?.report ?? ''}
                                                                onChange={e => handleGradeChange(t.id, e.target.value, 'report')}
                                                                placeholder="-"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className="font-bold text-amber-400">{report}</span>
                                                                <button 
                                                                    onClick={() => setEditingCell(cellKey)}
                                                                    className="text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Edit2 className="w-3 h-3"/>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center bg-slate-800 font-black text-white text-lg">{finalAvg}</td>
                                                    <td className="p-3 text-center">
                                                        {isPass ? <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold">ناجح</span> 
                                                                : <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded text-xs font-bold">مؤجل</span>}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button 
                                                            onClick={() => setSelectedTraineeForDetail(t)}
                                                            className="p-1.5 hover:bg-slate-700 rounded text-blue-400 transition-colors"
                                                            title="عرض كشف النقاط التفصيلي"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PRINT TEMPLATE - PV (Ensured Hidden) */}
            <div className="hidden">
                <div id="deliberation-pv" className="p-8 bg-white text-black font-serif text-justify" style={{ direction: 'rtl' }}>
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h3 className="font-bold text-lg">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                        <h3 className="font-bold text-lg">وزارة التربية الوطنية</h3>
                        <div className="flex justify-between mt-2 text-sm font-bold px-0 w-full border-t border-gray-300 pt-2">
                            <span>مديرية التربية لولاية: {institution.wilaya}</span>
                            <span>مركز إجراء التكوين: {institution.center}</span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-4 border-2 border-black p-2 rounded">
                        <h1 className="text-xl font-black underline decoration-double">
                            محضر لجنة نهاية التكوين البيداغوجي التحضيري أثناء التربص التجريبي
                        </h1>
                        <h2 className="text-lg font-bold mt-1">2025 - 2026 لرتبة: أستاذ التعليم الابتدائي</h2>
                    </div>

                    {/* Body Text */}
                    <div className="leading-relaxed text-base mb-4">
                        <p>
                            في العام <span className="font-bold">{pvConfig.year}</span> و في يوم <span className="font-bold px-1">{pvConfig.day || '........'}</span> من شهر <span className="font-bold px-1">{pvConfig.month}</span> على الساعة <span className="font-bold px-1">{pvConfig.timeStart}</span> انعقدت بمقر <span className="font-bold">{institution.center}</span> بولاية <span className="font-bold">{institution.wilaya}</span> لجنة مداولات النتائج النهائية للتكوين البيداغوجي التحضيري أثناء التربص التجريبي للالتحاق بسلك أساتذة التعليم الابتدائي، رتبة: أستاذ التعليم الابتدائي، وذلك طبقاً للقرار الوزاري رقم: 250 المؤرخ في 24 أوت 2015 الذي يحدد كيفيات تنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي لموظفي التعليم ومدته وكذا محتوى برامجه.
                        </p>
                    </div>

                    {/* Members */}
                    <div className="mb-4 bg-gray-50 p-2 border border-gray-200 rounded">
                        <p className="font-bold mb-2 underline">حضر الأعضاء الآتية أسماؤهم:</p>
                        <ul className="space-y-1 list-none pr-2 text-sm">
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.president}</span> ممثل السلطة التي لها صلاحية التعيين (رئيساً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.director}</span> المدير البيداغوجي (عضواً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.trainer1}</span> ممثلاً عن المكونين (عضواً)</li>
                            <li className="flex gap-2">- السيد(ة): <span className="font-bold border-b border-dotted border-black min-w-[200px]">{committeeMembers.trainer2}</span> ممثلاً عن المكونين (عضواً)</li>
                        </ul>
                    </div>

                    {/* Stats Table */}
                    <table className="w-full border border-black text-center text-xs mb-4">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-1">المقاييس</th>
                                <th className="border border-black p-1 w-12">المعامل</th>
                                <th className="border border-black p-1 w-24">عدد المسجلين</th>
                                <th className="border border-black p-1 w-24">عدد الحاضرين</th>
                                <th className="border border-black p-1 w-32">الحجم الساعي المنجز</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MODULES.map(m => (
                                <tr key={m.id}>
                                    <td className="border border-black p-1 text-right px-2">{m.title}</td>
                                    <td className="border border-black p-1 font-bold">{m.coefficient}</td>
                                    <td className="border border-black p-1">{trainees.length}</td>
                                    <td className="border border-black p-1 font-bold">{pvConfig.actualAttendees || '...'}</td>
                                    <td className="border border-black p-1 font-bold">{m.totalHours} سا</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold">
                                <td className="border border-black p-1 text-right px-2">المجموع</td>
                                <td className="border border-black p-1">12</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1">190 سا</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="page-break" style={{ pageBreakAfter: 'always', height: 0, margin: 0 }}></div>

                    {/* Page 2 */}
                    <div className="mt-8 pt-4">
                         <p className="mb-4 text-lg leading-relaxed">
                            تصادق بإجماع أعضائها على قبول قائمة الناجحين النهائية الذين تحصلوا على معدل يساوي 10 على 20 أو يفوق، وعددهم <span className="font-bold text-xl px-2 border-2 border-black rounded bg-gray-100">{getSuccessStats().admitted}</span> ناجحاً.
                         </p>
                         <p className="font-bold text-lg mb-4 underline">وتم إعداد قائمة المتكونين الناجحين حسب درجة الاستحقاق كالآتي:</p>
                         
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
                                    .map(t => ({...t, avg: calculateTraineeResults(t.id).finalAvg}))
                                    .filter(t => t.avg >= 10)
                                    .sort((a,b) => b.avg - a.avg)
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

                         <div className="mb-8 text-base">
                             <p>وبعد استنفاذ جدول الأعمال رفعت الجلسة في يومها على الساعة <span className="font-bold">{pvConfig.timeEnd}</span>.</p>
                             <p>حرر هذا المحضر لإثبات ما ذكر أعلاه.</p>
                         </div>

                         {/* Signatures */}
                         <div className="grid grid-cols-2 mt-12 gap-8">
                             <div className="text-center border-l-2 border-gray-300">
                                 <p className="mb-6 underline font-bold text-lg">أعضاء اللجنة:</p>
                                 <div className="flex flex-col gap-12 items-center">
                                     <div className="flex items-center gap-4 w-full justify-center">
                                         <span className="text-sm font-bold w-1/3 text-left">المدير البيداغوجي:</span>
                                         <span className="border-b border-dotted border-black w-1/2 h-6"></span>
                                     </div>
                                     <div className="flex items-center gap-4 w-full justify-center">
                                         <span className="text-sm font-bold w-1/3 text-left">ممثل المكونين 1:</span>
                                         <span className="border-b border-dotted border-black w-1/2 h-6"></span>
                                     </div>
                                     <div className="flex items-center gap-4 w-full justify-center">
                                         <span className="text-sm font-bold w-1/3 text-left">ممثل المكونين 2:</span>
                                         <span className="border-b border-dotted border-black w-1/2 h-6"></span>
                                     </div>
                                 </div>
                             </div>

                             <div className="text-center flex flex-col justify-end pb-8">
                                 <p className="mb-16 underline font-bold text-lg">رئيس اللجنة (مدير التربية)</p>
                                 <p className="text-sm text-gray-500">(الختم والتوقيع)</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationManager;