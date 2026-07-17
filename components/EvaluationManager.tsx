
import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Printer, Award, Calculator, Settings, BookOpen, UserCheck, Calendar, Clock, Users, ChevronDown, ChevronUp, AlertCircle, Save, Eye, X, FileUp, Edit2, Lock, Unlock, FileText, ClipboardList } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'entry' | 'exams' | 'deliberation' | 'receipt'>('entry');
    const [selectedTraineeForDetail, setSelectedTraineeForDetail] = useState<Trainee | null>(null);
    const [editingCell, setEditingCell] = useState<string | null>(null); // Format: "traineeId-type"
    
    // State for manual paper lists
    const [manualPrintData, setManualPrintData] = useState<{
        groupName: string;
        specialtyName: string;
        moduleTitle: string;
        teacherName: string;
        term: string;
        termLabel: string;
        list: Trainee[];
    }[]>([]);

    const [reportPrintData, setReportPrintData] = useState<{
        groupName: string;
        specialtyName: string;
        teacherName: string;
        list: Trainee[];
    }[]>([]);

    // Receipts Database State
    const [receipts, setReceipts] = useState<Record<string, { status: 'pending' | 'received', receivedDate?: string, notes?: string }>>({});

    // Receipts Filters State
    const [receiptFilterSpec, setReceiptFilterSpec] = useState<string>('all');
    const [receiptFilterModule, setReceiptFilterModule] = useState<string>('all');
    const [receiptFilterType, setReceiptFilterType] = useState<string>('all');
    const [receiptFilterStatus, setReceiptFilterStatus] = useState<string>('all');
    
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
        if (savedSpec) {
            try {
                const parsed: Specialty[] = JSON.parse(savedSpec);
                const updated = parsed.map(s => {
                    const def = DEFAULT_SPECIALTIES.find(d => d.id === s.id);
                    return def ? { ...s, name: def.name, color: def.color || s.color } : s;
                });
                setSpecialties(updated);
                localStorage.setItem('takwin_specialties_db', JSON.stringify(updated));
            } catch(e) {}
        }

        const savedGrades = localStorage.getItem('takwin_grades_db');
        if (savedGrades) try { setGrades(JSON.parse(savedGrades)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}
        
        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) try { setTrainerConfig(JSON.parse(savedTrainers)); } catch(e) {}

        const savedAssignments = localStorage.getItem('takwin_assignments');
        if (savedAssignments) try { setAssignments(JSON.parse(savedAssignments)); } catch(e) {}

        const savedReceipts = localStorage.getItem('takwin_marks_receipts_db');
        if (savedReceipts) try { setReceipts(JSON.parse(savedReceipts)); } catch(e) {}

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
            const modulesObj = traineeGrades.modules || {};
            
            let updated: EvaluationDatabase;
            if (type === 'module') {
                const moduleGrades = modulesObj[selectedModuleId] || {};
                updated = {
                    ...prev,
                    [traineeId]: {
                        ...traineeGrades,
                        modules: {
                            ...modulesObj,
                            [selectedModuleId]: {
                                ...moduleGrades,
                                [selectedTerm]: valToSave
                            }
                        }
                    }
                };
            } else {
                updated = {
                    ...prev,
                    [traineeId]: {
                        ...traineeGrades,
                        modules: modulesObj,
                        report: valToSave
                    }
                };
            }
            localStorage.setItem('takwin_grades_db', JSON.stringify(updated));
            return updated;
        });
    };

    // --- LOGIC: CALCULATIONS (THE CORE) ---
    const calculateTraineeResults = (tId: string) => {
        const tGrades = grades[tId];
        
        let sumWeightedCC = 0;
        let sumWeightedExam = 0;
        let totalCoeff = 0;
        let activeCoeffCC = 0;
        let activeCoeffExam = 0;

        MODULES.forEach(m => {
            const mGrades = tGrades?.modules?.[m.id];
            
            const hasS1 = mGrades?.s1 !== undefined;
            const hasS2 = mGrades?.s2 !== undefined;
            const hasS3 = mGrades?.s3 !== undefined;
            const hasExam = mGrades?.exam !== undefined;

            let avgCC = 0;
            let ccCount = 0;
            let ccSum = 0;
            if (hasS1) { ccSum += mGrades!.s1!; ccCount++; }
            if (hasS2) { ccSum += mGrades!.s2!; ccCount++; }
            if (hasS3) { ccSum += mGrades!.s3!; ccCount++; }
            
            if (ccCount > 0) {
                avgCC = ccSum / ccCount;
                sumWeightedCC += avgCC * m.coefficient;
                activeCoeffCC += m.coefficient;
            }

            if (hasExam) {
                sumWeightedExam += mGrades!.exam! * m.coefficient;
                activeCoeffExam += m.coefficient;
            }

            totalCoeff += m.coefficient;
        });

        const globalCC = activeCoeffCC > 0 ? parseFloat((sumWeightedCC / activeCoeffCC).toFixed(2)) : 0;
        const globalExam = activeCoeffExam > 0 ? parseFloat((sumWeightedExam / activeCoeffExam).toFixed(2)) : 0;
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
                        if (!newGrades[id]) {
                            newGrades[id] = { modules: {} };
                        }
                        if (!newGrades[id].modules) {
                            newGrades[id].modules = {};
                        }
                        
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

    const saveReceipts = (newReceipts: Record<string, { status: 'pending' | 'received', receivedDate?: string, notes?: string }>) => {
        setReceipts(newReceipts);
        localStorage.setItem('takwin_marks_receipts_db', JSON.stringify(newReceipts));
    };

    const getAssignedTrainerName = (moduleId: number, specId: string, groupId: number) => {
        const groupKey = `${specId}-${groupId}`;
        const assignment = assignments.find(a => a.moduleId === moduleId && a.groupId === groupKey);
        if (assignment) {
            const conf = trainerConfig[moduleId];
            if (conf && conf.names) {
                return conf.names[assignment.trainerKey] || 'غير معين';
            }
        }
        return 'غير معين';
    };

    const getDynamicReceiptRows = () => {
        const rows: {
            id: string;
            specId: string;
            specName: string;
            groupId: number;
            moduleId?: number;
            moduleTitle?: string;
            docType: 'cc' | 'exam' | 'report';
            docTypeLabel: string;
            trainerName: string;
            status: 'pending' | 'received';
            receivedDate: string;
            notes: string;
        }[] = [];

        specialties.forEach(spec => {
            for (let g = 1; g <= spec.groups; g++) {
                // Modules
                MODULES.forEach(m => {
                    const trainerName = getAssignedTrainerName(m.id, spec.id, g);

                    // 1. Continuous Assessment
                    const ccKey = `${spec.id}-${g}-${m.id}-cc`;
                    const ccData = receipts[ccKey] || { status: 'pending', receivedDate: '', notes: '' };
                    rows.push({
                        id: ccKey,
                        specId: spec.id,
                        specName: spec.name,
                        groupId: g,
                        moduleId: m.id,
                        moduleTitle: m.title,
                        docType: 'cc',
                        docTypeLabel: 'تقويم مستمر',
                        trainerName,
                        status: ccData.status,
                        receivedDate: ccData.receivedDate || '',
                        notes: ccData.notes || ''
                    });

                    // 2. Exam
                    const examKey = `${spec.id}-${g}-${m.id}-exam`;
                    const examData = receipts[examKey] || { status: 'pending', receivedDate: '', notes: '' };
                    rows.push({
                        id: examKey,
                        specId: spec.id,
                        specName: spec.name,
                        groupId: g,
                        moduleId: m.id,
                        moduleTitle: m.title,
                        docType: 'exam',
                        docTypeLabel: 'امتحان نهائي',
                        trainerName,
                        status: examData.status,
                        receivedDate: examData.receivedDate || '',
                        notes: examData.notes || ''
                    });
                });

                // 3. Final Report
                const reportKey = `${spec.id}-${g}-report`;
                const reportData = receipts[reportKey] || { status: 'pending', receivedDate: '', notes: '' };
                rows.push({
                    id: reportKey,
                    specId: spec.id,
                    specName: spec.name,
                    groupId: g,
                    docType: 'report',
                    docTypeLabel: 'تقرير نهاية التربص',
                    trainerName: 'لجنة التقييم',
                    status: reportData.status,
                    receivedDate: reportData.receivedDate || '',
                    notes: reportData.notes || ''
                });
            }
        });

        return rows;
    };

    const getFilteredReceiptRows = () => {
        return getDynamicReceiptRows().filter(row => {
            const specMatch = receiptFilterSpec === 'all' || row.specId === receiptFilterSpec;
            const moduleMatch = receiptFilterModule === 'all' || (row.moduleId !== undefined && String(row.moduleId) === receiptFilterModule);
            const typeMatch = receiptFilterType === 'all' || row.docType === receiptFilterType;
            const statusMatch = receiptFilterStatus === 'all' || row.status === receiptFilterStatus;
            return specMatch && moduleMatch && typeMatch && statusMatch;
        });
    };

    const handlePrintManualSheet = (scope: 'current' | 'all') => {
        let sheetsToPrint: typeof manualPrintData = [];

        const getSheetObject = (specId: string, g: number, traineesList: Trainee[]) => {
            const specName = specialties.find(s => s.id === specId)?.name || '';
            const mod = MODULES.find(m => m.id === selectedModuleId);
            const trainer = getAssignedTrainerName(selectedModuleId, specId, g);
            const termLabel = selectedTerm === 's1' ? 'الدورة الأولى' :
                              selectedTerm === 's2' ? 'الدورة الثانية' :
                              selectedTerm === 's3' ? 'الدورة الثالثة' : 'الامتحان النهائي';
            return {
                groupName: `فوج ${g}`,
                specialtyName: specName,
                moduleTitle: mod?.title || '',
                teacherName: trainer || 'غير معين',
                term: selectedTerm,
                termLabel: termLabel,
                list: traineesList
            };
        };

        if (scope === 'current') {
            if (selectedSpec === 'all' || selectedGroup === 0) {
                alert("يرجى تحديد التخصص والفوج الحالي أولاً للطباعة الفردية.");
                return;
            }
            const filtered = getFilteredTrainees();
            sheetsToPrint.push(getSheetObject(selectedSpec, selectedGroup, filtered));
        } else {
            specialties.forEach(spec => {
                for (let g = 1; g <= spec.groups; g++) {
                    const groupTrainees = trainees.filter(t => t.specialtyId === spec.id && t.groupId === g)
                        .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
                    
                    if (groupTrainees.length > 0) {
                        sheetsToPrint.push(getSheetObject(spec.id, g, groupTrainees));
                    }
                }
            });
        }

        if (sheetsToPrint.length === 0) {
            alert("لا توجد بيانات طباعة متوفرة.");
            return;
        }

        setManualPrintData(sheetsToPrint);

        setTimeout(() => {
            const printContent = document.getElementById('manual-print-sheet');
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
        }, 150);
    };

    const handlePrintReportSheet = (scope: 'current' | 'all') => {
        let sheetsToPrint: typeof reportPrintData = [];

        const getReportSheetObject = (specId: string, g: number, traineesList: Trainee[]) => {
            const specName = specialties.find(s => s.id === specId)?.name || '';
            return {
                groupName: `فوج ${g}`,
                specialtyName: specName,
                teacherName: 'الأستاذ المشرف / المكون المرافق',
                list: traineesList
            };
        };

        if (scope === 'current') {
            if (!reportGroupFilter) {
                alert("يرجى تحديد الفوج أولاً للطباعة الفردية.");
                return;
            }
            const [specId, gNum] = reportGroupFilter.split('-');
            const g = parseInt(gNum);
            const filtered = trainees.filter(t => t.specialtyId === specId && t.groupId === g)
                .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
            sheetsToPrint.push(getReportSheetObject(specId, g, filtered));
        } else {
            specialties.forEach(spec => {
                for (let g = 1; g <= spec.groups; g++) {
                    const groupTrainees = trainees.filter(t => t.specialtyId === spec.id && t.groupId === g)
                        .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
                    
                    if (groupTrainees.length > 0) {
                        sheetsToPrint.push(getReportSheetObject(spec.id, g, groupTrainees));
                    }
                }
            });
        }

        if (sheetsToPrint.length === 0) {
            alert("لا توجد بيانات طباعة متوفرة.");
            return;
        }

        setReportPrintData(sheetsToPrint);

        setTimeout(() => {
            const printContent = document.getElementById('report-print-sheet');
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
        }, 150);
    };

    const handlePrintReceiptSheet = () => {
        const printContent = document.getElementById('receipt-print-sheet');
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
                                    const mg = (tGrades.modules || {})[m.id] || {};
                                    const s1 = mg.s1;
                                    const s2 = mg.s2;
                                    const s3 = mg.s3;
                                    const exam = mg.exam || 0;

                                    let ccSum = 0;
                                    let ccCount = 0;
                                    if (s1 !== undefined) { ccSum += s1; ccCount++; }
                                    if (s2 !== undefined) { ccSum += s2; ccCount++; }
                                    if (s3 !== undefined) { ccSum += s3; ccCount++; }

                                    const avgCC = ccCount > 0 ? parseFloat((ccSum / ccCount).toFixed(2)) : 0;
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
                            <div></div>
                            <div>إمضاء المدير البيداغوجي</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            {/* CSS to hide ghost print section on screen (Added Fix) */}
            <style>{`
                @media screen {
                    #print-section { display: none !important; }
                }
                @media print {
                    #print-section { display: block !important; }
                }
            `}</style>

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
                        <button
                            onClick={() => setActiveTab('receipt')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'receipt' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ClipboardList className="w-4 h-4"/> وثيقة استلام النقاط
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
                                <Settings className="text-blue-400 w-4 h-4" /> إعدادات الحجز والتصفية
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-300 block mb-1 font-bold">1. اختر التخصص الحالي</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedSpec}
                                        onChange={e => { setSelectedSpec(e.target.value); setSelectedGroup(0); }}
                                    >
                                        <option value="all">كل التخصصات</option>
                                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-300 block mb-1 font-bold">2. اختر الفوج الحالي</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedGroup}
                                        onChange={e => setSelectedGroup(parseInt(e.target.value))}
                                    >
                                        <option value={0}>كل الأفواج (عرض الكل)</option>
                                        {selectedSpec !== 'all' && Array.from({length: specialties.find(s=>s.id === selectedSpec)?.groups || 0}).map((_, i) => (
                                            <option key={i+1} value={i+1}>فوج {i+1}</option>
                                        ))}
                                    </select>
                                    {selectedSpec === 'all' && (
                                        <p className="text-[10px] text-amber-400 mt-1">⚠️ حدد تخصصاً معيناً لتمكين اختيار الأفواج الفردية</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs text-slate-300 block mb-1 font-bold">3. اختر المقياس</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedModuleId}
                                        onChange={e => { setSelectedModuleId(parseInt(e.target.value)); setSelectedTrainerExport(''); }}
                                    >
                                        {MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-300 block mb-1 font-bold">4. نوع العلامة (للحجز)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['s1', 's2', 's3'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setSelectedTerm(s as any)}
                                                className={`py-2 rounded text-xs font-bold border transition-all ${selectedTerm === s ? 'bg-blue-600 border-blue-500 text-white shadow' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                                            >
                                                دورة {s.replace('s','')}
                                            </button>
                                        ))}
                                        <button 
                                            onClick={() => setSelectedTerm('exam')}
                                            className={`py-2 rounded text-xs font-bold border transition-all ${selectedTerm === 'exam' ? 'bg-purple-600 border-purple-500 text-white shadow' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                                        >
                                            الامتحان النهائي
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4 mt-2 bg-slate-800/80 p-3 rounded-lg border border-blue-500/30">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                        <Printer className="w-3 h-3 text-blue-400" />
                                        طباعة قوائم التنقيط الورقية (PDF)
                                    </h4>
                                    
                                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                        قم بطباعة قائمة رسمية فارغة لتسليمها للأستاذ قصد ملئها يدوياً وعرضها في الجدول لتسهيل الحجز المباشر.
                                    </p>
 
                                    <div className="space-y-2">
                                        <button 
                                            onClick={() => handlePrintManualSheet('current')}
                                            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold transition-all shadow-md ${
                                                selectedSpec === 'all' || selectedGroup === 0 
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' 
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                            }`}
                                            disabled={selectedSpec === 'all' || selectedGroup === 0}
                                        >
                                            <Printer className="w-3.5 h-3.5" /> طباعة للفوج المحدد
                                        </button>
                                        <button 
                                            onClick={() => handlePrintManualSheet('all')}
                                            className="w-full flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold transition-all border border-slate-600"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> طباعة لجميع التخصصات والأفواج
                                        </button>
                                    </div>
                                    {(selectedSpec === 'all' || selectedGroup === 0) && (
                                        <p className="text-[10px] text-amber-500 mt-2 text-center leading-relaxed">
                                            💡 اختر تخصصاً وفوجاً بالأعلى لتمكين طباعة الفوج المحدد.
                                        </p>
                                    )}
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
                                                    <td className="p-3 text-center flex justify-center items-center">
                                                        <input 
                                                            type="number" 
                                                            min="0" max="20" step="0.1"
                                                            className={`w-24 text-center font-bold text-black rounded-lg p-1.5 border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                                                                val === undefined ? 'bg-slate-100' : (val < 10 ? 'bg-red-100 text-red-800 border-red-400' : 'bg-emerald-50 text-emerald-900 border-emerald-400')
                                                            }`}
                                                            value={val === undefined ? '' : val}
                                                            onChange={e => handleGradeChange(t.id, e.target.value, 'module')}
                                                            placeholder="-"
                                                        />
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
                                <div className="bg-slate-800/80 p-3 rounded-lg border border-amber-500/30">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                        <Printer className="text-amber-400 w-3 h-3" />
                                        طباعة وثيقة تقييم التقارير الرسمية
                                    </h4>
                                    
                                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                        قم بطباعة وثيقة رسمية لتقييم المذكرة/التقرير النهائي من طرف لجنة التقييم يدوياً ثم حجز العلامات بالجدول.
                                    </p>

                                    <label className="text-[10px] text-slate-400 block mb-1">تحديد الفوج للطباعة الفردية</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs mb-3"
                                        value={reportGroupFilter}
                                        onChange={e => setReportGroupFilter(e.target.value)}
                                    >
                                        <option value="">-- اختر الفوج --</option>
                                        {getAllGroupsList().map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>

                                    <div className="space-y-2">
                                        <button 
                                            onClick={() => handlePrintReportSheet('current')}
                                            className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded text-xs font-bold transition-colors shadow-md"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> طباعة للفوج المحدد
                                        </button>
                                        <button 
                                            onClick={() => handlePrintReportSheet('all')}
                                            className="w-full flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold transition-colors border border-slate-600"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> طباعة لجميع التخصصات والأفواج
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-700">
                                    <label className="text-xs text-slate-400 block mb-1 font-bold">تصفية العرض حسب التخصص</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedSpec}
                                        onChange={e => { setSelectedSpec(e.target.value); setSelectedGroup(0); }}
                                    >
                                        <option value="all">كل التخصصات</option>
                                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="pt-2">
                                    <label className="text-xs text-slate-400 block mb-1 font-bold">الفوج الحالي</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                        value={selectedGroup}
                                        onChange={e => setSelectedGroup(parseInt(e.target.value))}
                                    >
                                        <option value={0}>كل الأفواج (عرض الكل)</option>
                                        {selectedSpec !== 'all' && Array.from({length: specialties.find(s=>s.id === selectedSpec)?.groups || 0}).map((_, i) => (
                                            <option key={i+1} value={i+1}>فوج {i+1}</option>
                                        ))}
                                    </select>
                                    {selectedSpec === 'all' && (
                                        <p className="text-[10px] text-amber-400 mt-1">⚠️ حدد تخصصاً معيناً لتفعيل تصفية الفوج</p>
                                    )}
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
                                                    <td className="p-3 text-center bg-slate-900/50 flex justify-center items-center">
                                                        <input 
                                                            type="number" min="0" max="20" step="0.1"
                                                            className={`w-20 text-center font-bold text-black rounded-lg p-1.5 border border-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                                                                report === 0 ? 'bg-slate-100' : (report < 10 ? 'bg-red-100 text-red-800 border-red-400' : 'bg-amber-50 text-amber-900 border-amber-400')
                                                            }`}
                                                            value={grades[t.id]?.report ?? ''}
                                                            onChange={e => handleGradeChange(t.id, e.target.value, 'report')}
                                                            placeholder="-"
                                                        />
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

            {/* TAB 4: RECEIPT */}
            {activeTab === 'receipt' && (
                <div className="space-y-6 print:hidden">
                    {/* Filters block */}
                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <ClipboardList className="text-teal-400 w-5 h-5" />
                                وثيقة متابعة استلام قوائم الحجز والنقاط
                            </h3>
                            <button 
                                onClick={handlePrintReceiptSheet} 
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg"
                            >
                                <Printer className="w-4 h-4" /> طباعة جدول الاستلام الحالي
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">تصفية التخصص</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs" value={receiptFilterSpec} onChange={e=>setReceiptFilterSpec(e.target.value)}>
                                    <option value="all">كل التخصصات</option>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">تصفية المقياس</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs" value={receiptFilterModule} onChange={e=>setReceiptFilterModule(e.target.value)}>
                                    <option value="all">كل المقاييس</option>
                                    {MODULES.map(m => <option key={m.id} value={String(m.id)}>{m.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">نوع الوثيقة</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs" value={receiptFilterType} onChange={e=>setReceiptFilterType(e.target.value)}>
                                    <option value="all">كل الأنواع</option>
                                    <option value="cc">تقويم مستمر</option>
                                    <option value="exam">امتحان نهائي</option>
                                    <option value="report">تقرير نهاية التربص</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">حالة الاستلام</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs" value={receiptFilterStatus} onChange={e=>setReceiptFilterStatus(e.target.value)}>
                                    <option value="all">الكل</option>
                                    <option value="pending">لم يتم الاستلام</option>
                                    <option value="received">تم الاستلام</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table block */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="p-4 bg-slate-950/20 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-400">العدد المصفى: {getFilteredReceiptRows().length} وثيقة</span>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-12">#</th>
                                        <th className="p-3">التخصص / الفوج</th>
                                        <th className="p-3">المقياس / المادة</th>
                                        <th className="p-3 w-36">الأستاذ</th>
                                        <th className="p-3 w-40">نوع الوثيقة</th>
                                        <th className="p-3 w-32 text-center">حالة الاستلام</th>
                                        <th className="p-3 w-40 text-center">تاريخ التسليم</th>
                                        <th className="p-3">ملاحظات التدوين</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {getFilteredReceiptRows().map((row, idx) => {
                                        const isReceived = row.status === 'received';
                                        return (
                                            <tr key={row.id} className="hover:bg-slate-800/30">
                                                <td className="p-3 text-slate-500">{idx+1}</td>
                                                <td className="p-3 font-bold text-white">
                                                    {row.specName} <span className="text-teal-400 text-xs px-1.5 py-0.5 rounded bg-slate-800">ف{row.groupId}</span>
                                                </td>
                                                <td className="p-3 text-slate-300">{row.moduleTitle || '-'}</td>
                                                <td className="p-3 text-slate-400 font-medium">{row.trainerName}</td>
                                                <td className="p-3 text-teal-300 font-bold">{row.docTypeLabel}</td>
                                                <td className="p-3 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            const newReceipts = { ...receipts };
                                                            const current = newReceipts[row.id] || { status: 'pending', receivedDate: '', notes: '' };
                                                            const targetStatus = current.status === 'received' ? 'pending' : 'received';
                                                            const targetDate = targetStatus === 'received' ? new Date().toLocaleDateString('fr-FR') : '';
                                                            newReceipts[row.id] = {
                                                                ...current,
                                                                status: targetStatus,
                                                                receivedDate: targetDate
                                                            };
                                                            saveReceipts(newReceipts);
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                                            isReceived 
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                                                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                        }`}
                                                    >
                                                        {isReceived ? '✓ تم الاستلام' : '✗ معلق'}
                                                    </button>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input 
                                                        type="text" 
                                                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white text-center w-28 outline-none focus:border-teal-500"
                                                        value={row.receivedDate}
                                                        onChange={e => {
                                                            const newReceipts = { ...receipts };
                                                            const current = newReceipts[row.id] || { status: 'pending', receivedDate: '', notes: '' };
                                                            newReceipts[row.id] = {
                                                                ...current,
                                                                receivedDate: e.target.value
                                                            };
                                                            saveReceipts(newReceipts);
                                                        }}
                                                        placeholder="--/--/----"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="text" 
                                                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white w-full outline-none focus:border-teal-500 text-right"
                                                        value={row.notes}
                                                        onChange={e => {
                                                            const newReceipts = { ...receipts };
                                                            const current = newReceipts[row.id] || { status: 'pending', receivedDate: '', notes: '' };
                                                            newReceipts[row.id] = {
                                                                ...current,
                                                                notes: e.target.value
                                                            };
                                                            saveReceipts(newReceipts);
                                                        }}
                                                        placeholder="اكتب ملاحظة..."
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {getFilteredReceiptRows().length === 0 && (
                                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">لا توجد بيانات تطابق الفلاتر</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PRINT TEMPLATE - PV (Ensured Hidden) */}
            <div className="hidden">
                <div id="deliberation-pv" className="p-8 bg-white text-black font-sans text-justify" style={{ direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
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

                {/* 1. MANUAL MARKS SHEETS (CA/EXAMS) */}
                <div id="manual-print-sheet" className="p-8 bg-white text-black font-sans text-justify" style={{ direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
                    {manualPrintData.map((sheet, index) => (
                        <div key={index} className="mb-12" style={{ pageBreakAfter: index < manualPrintData.length - 1 ? 'always' : 'auto' }}>
                            {/* Headings */}
                            <div className="text-center mb-6">
                                <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                                <div className="flex justify-between mt-2 text-xs font-bold px-4 w-full border-t border-gray-300 pt-2">
                                    <span>مديرية التربية لولاية: {institution.wilaya}</span>
                                    <span>مركز إجراء التكوين: {institution.center}</span>
                                </div>
                            </div>

                            {/* Title Block */}
                            <div className="text-center mb-6 border border-black p-2 bg-gray-50 rounded">
                                <h2 className="text-lg font-black underline">
                                    {sheet.term === 'exam' ? 'علامات الامتحان النهائي' : `علامات المراقبة المستمرة - ${sheet.termLabel}`}
                                </h2>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-3 text-xs font-bold border border-black p-3 mb-6 bg-white rounded">
                                <div>التخصص: <span className="font-normal underline">{sheet.specialtyName}</span></div>
                                <div>الفوج: <span className="font-normal underline">{sheet.groupName}</span></div>
                                <div>المقياس: <span className="font-normal underline">{sheet.moduleTitle}</span></div>
                                <div>الأستاذ المكون: <span className="font-normal underline">{sheet.teacherName}</span></div>
                            </div>

                            {/* Trainees List Table */}
                            <table className="w-full border-collapse border border-black text-center text-xs mb-8">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border border-black p-2 w-12">الرقم</th>
                                        <th className="border border-black p-2 text-right px-4">اسم و لقب المتكون</th>
                                        <th className="border border-black p-2 w-32">تاريخ الميلاد</th>
                                        <th className="border border-black p-2 w-40">العلامة / 20</th>
                                        <th className="border border-black p-2">الملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheet.list.map((trainee, tIdx) => (
                                        <tr key={trainee.id} className="h-9">
                                            <td className="border border-black p-2">{tIdx + 1}</td>
                                            <td className="border border-black p-2 text-right font-bold px-4">{trainee.surname} {trainee.name}</td>
                                            <td className="border border-black p-2">{trainee.dob}</td>
                                            <td className="border border-black p-2 text-gray-400">............... / 20</td>
                                            <td className="border border-black p-2"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures Footer */}
                            <div className="grid grid-cols-2 gap-8 mt-12 text-xs font-bold">
                                <div className="text-center">
                                    <p className="mb-12 underline">توقيع الأستاذ المكون:</p>
                                    <p className="text-gray-400">...............................</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-12 underline">إمضاء وختم المدير البيداغوجي:</p>
                                    <p className="text-gray-400">...............................</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. REPORT EVALUATION SHEETS */}
                <div id="report-print-sheet" className="p-8 bg-white text-black font-sans text-justify" style={{ direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
                    {reportPrintData.map((sheet, index) => (
                        <div key={index} className="mb-12" style={{ pageBreakAfter: index < reportPrintData.length - 1 ? 'always' : 'auto' }}>
                            {/* Headings */}
                            <div className="text-center mb-6">
                                <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                                <div className="flex justify-between mt-2 text-xs font-bold px-4 w-full border-t border-gray-300 pt-2">
                                    <span>مديرية التربية لولاية: {institution.wilaya}</span>
                                    <span>مركز إجراء التكوين: {institution.center}</span>
                                </div>
                            </div>

                            {/* Title Block */}
                            <div className="text-center mb-6 border border-black p-2 bg-gray-50 rounded">
                                <h2 className="text-lg font-black underline">
                                    علامات تقييم تقرير نهاية التربص
                                </h2>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-3 text-xs font-bold border border-black p-3 mb-6 bg-white rounded">
                                <div>التخصص: <span className="font-normal underline">{sheet.specialtyName}</span></div>
                                <div>الفوج: <span className="font-normal underline">{sheet.groupName}</span></div>
                                <div className="col-span-2">الأستاذ المكون: <span className="font-normal underline">{sheet.teacherName}</span></div>
                            </div>

                            {/* Trainees List Table */}
                            <table className="w-full border-collapse border border-black text-center text-xs mb-8">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border border-black p-2 w-12">الرقم</th>
                                        <th className="border border-black p-2 text-right px-4">اسم و لقب المتكون</th>
                                        <th className="border border-black p-2 w-32">تاريخ الميلاد</th>
                                        <th className="border border-black p-2 w-40">العلامة / 20</th>
                                        <th className="border border-black p-2">الملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheet.list.map((trainee, tIdx) => (
                                        <tr key={trainee.id} className="h-9">
                                            <td className="border border-black p-2">{tIdx + 1}</td>
                                            <td className="border border-black p-2 text-right font-bold px-4">{trainee.surname} {trainee.name}</td>
                                            <td className="border border-black p-2">{trainee.dob}</td>
                                            <td className="border border-black p-2 text-gray-400">............... / 20</td>
                                            <td className="border border-black p-2"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures Footer */}
                            <div className="grid grid-cols-3 gap-4 mt-12 text-xs font-bold">
                                <div className="text-center">
                                    <p className="mb-12 underline">رئيس لجنة التقييم:</p>
                                    <p className="text-gray-400">...............................</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-12 underline">العضو المقيم:</p>
                                    <p className="text-gray-400">...............................</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-12 underline">المدير البيداغوجي:</p>
                                    <p className="text-gray-400">...............................</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. DOCUMENT RECEIPTS STATUS LISTS */}
                <div id="receipt-print-sheet" className="p-8 bg-white text-black font-sans text-justify" style={{ direction: 'rtl', fontFamily: "'Tajawal', sans-serif" }}>
                    {/* Headings */}
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                        <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                        <div className="flex justify-between mt-2 text-xs font-bold px-4 w-full border-t border-gray-300 pt-2">
                            <span>مديرية التربية لولاية: {institution.wilaya}</span>
                            <span>مركز إجراء التكوين: {institution.center}</span>
                        </div>
                    </div>

                    {/* Title Block */}
                    <div className="text-center mb-6 border-2 border-black p-3 rounded">
                        <h2 className="text-lg font-black underline decoration-double">
                            {receiptFilterType === 'cc' ? "جدول متابعة واستلام علامات التقويم المستمر" :
                             receiptFilterType === 'exam' ? "جدول متابعة واستلام علامات الامتحان النهائي" :
                             receiptFilterType === 'report' ? "جدول متابعة واستلام تقييم تقرير نهاية التربص" :
                             "جدول متابعة واستلام كشوف النقاط وعلامات التقييم"}
                        </h2>
                        <p className="text-xs font-bold mt-1">تاريخ استخراج الوثيقة: {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>

                    {/* Receipts Table */}
                    <table className="w-full border-collapse border border-black text-center text-xs mb-8">
                        <thead className="bg-gray-100 font-bold">
                            <tr>
                                <th className="border border-black p-2 w-10">#</th>
                                <th className="border border-black p-2 text-right px-4">الأستاذ المكون</th>
                                <th className="border border-black p-2 text-right px-4">المقياس / المادة</th>
                                <th className="border border-black p-2">التخصص والفرع / الفوج</th>
                                <th className="border border-black p-2 w-28">نوع الوثيقة</th>
                                <th className="border border-black p-2 w-24">الحالة بالمنصة</th>
                                <th className="border border-black p-2 w-24">تأشيرة الاستلام اليدوي (*)</th>
                                <th className="border border-black p-2 w-28">تاريخ التسليم</th>
                                <th className="border border-black p-2">توقيع المستلم / ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredReceiptRows().map((row, idx) => (
                                <tr key={row.id}>
                                    <td className="border border-black p-2">{idx + 1}</td>
                                    <td className="border border-black p-2 text-right font-bold px-4">{row.trainerName}</td>
                                    <td className="border border-black p-2 text-right px-4">{row.moduleTitle || '-'}</td>
                                    <td className="border border-black p-2 font-bold">{row.specName} (فوج {row.groupId})</td>
                                    <td className="border border-black p-2">{row.docTypeLabel}</td>
                                    <td className="border border-black p-2 font-bold">
                                        {row.status === 'received' ? '✓ تم الاستلام' : '✗ معلق'}
                                    </td>
                                    <td className="border border-black p-2 font-mono text-center">
                                        {row.status === 'received' ? '[ * ]' : '[   ]'}
                                    </td>
                                    <td className="border border-black p-2 font-mono">{row.receivedDate || '........'}</td>
                                    <td className="border border-black p-2 text-right px-2">{row.notes || ''}</td>
                                </tr>
                            ))}
                            {getFilteredReceiptRows().length === 0 && (
                                <tr>
                                    <td colSpan={9} className="border border-black p-6 text-center font-bold text-gray-500">
                                        لا توجد بيانات تطابق الفلاتر المحددة حالياً.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="text-left mt-8 text-xs font-bold pl-12">
                        <p className="underline mb-8">إمضاء وختم مصلحة المتابعة والتقييم البيداغوجي:</p>
                        <p className="text-gray-400">.....................................................</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationManager;