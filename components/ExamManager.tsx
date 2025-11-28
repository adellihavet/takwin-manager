
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Printer, Settings, RefreshCw, Plus, Trash2, UserPlus, Wand2, Clock, CheckCircle2 } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig, ExamSlot, ExamRoom, ProctorAssignment, TrainerConfig } from '../types';
import { MODULES } from '../constants';

interface ExamManagerProps {
    trainees: Trainee[];
    specialties: Specialty[];
    institution: InstitutionConfig;
}

const ExamManager: React.FC<ExamManagerProps> = ({ trainees, specialties, institution }) => {
    // State
    const [examSchedule, setExamSchedule] = useState<ExamSlot[]>([]);
    const [examRooms, setExamRooms] = useState<ExamRoom[]>([]);
    const [proctorAssignments, setProctorAssignments] = useState<ProctorAssignment[]>([]);
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    
    // External Proctors State
    const [externalProctors, setExternalProctors] = useState<string[]>([]);
    const [newExternalProctor, setNewExternalProctor] = useState('');

    const [activeTab, setActiveTab] = useState<'schedule' | 'rooms' | 'proctors' | 'print'>('schedule');
    
    // Print Selection State
    const [selectedPrintDoc, setSelectedPrintDoc] = useState<'schedule' | 'attendance_exam' | 'proctor_matrix' | 'proctor_individual' | 'pv_conduct'>('schedule');
    const [selectedPrintRoom, setSelectedPrintRoom] = useState<number>(0);
    const [selectedPrintExam, setSelectedPrintExam] = useState<string>(''); // ExamSlot ID for specific filters

    // Constants
    const EXAM_DAYS = [
        { date: '2026-07-25', label: 'السبت 25 جويلية 2026' },
        { date: '2026-07-26', label: 'الأحد 26 جويلية 2026' },
        { date: '2026-07-27', label: 'الاثنين 27 جويلية 2026' },
    ];

    // Load Data
    useEffect(() => {
        const savedSchedule = localStorage.getItem('takwin_exam_schedule');
        if (savedSchedule) setExamSchedule(JSON.parse(savedSchedule));
        else {
             const initial: ExamSlot[] = [];
             MODULES.forEach((m, idx) => {
                 const dayIdx = idx % 3; 
                 initial.push({
                     id: `exam-${m.id}`,
                     moduleId: m.id,
                     date: EXAM_DAYS[dayIdx].date,
                     startTime: '08:00',
                     endTime: '10:00'
                 });
             });
             setExamSchedule(initial);
        }

        const savedRooms = localStorage.getItem('takwin_exam_rooms');
        if (savedRooms) setExamRooms(JSON.parse(savedRooms));

        const savedProctors = localStorage.getItem('takwin_exam_proctors');
        if (savedProctors) setProctorAssignments(JSON.parse(savedProctors));

        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) setTrainerConfig(JSON.parse(savedTrainers));

        const savedExternalProctors = localStorage.getItem('takwin_external_proctors');
        if (savedExternalProctors) setExternalProctors(JSON.parse(savedExternalProctors));

    }, []);

    // --- HELPER: CALCULATE DURATION (Robust Fix) ---
    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return "--";
        const [h1, m1] = start.split(':').map(Number);
        let [h2, m2] = end.split(':').map(Number);
        
        // Handle 12:00 Logic (End of morning)
        if (h2 === 0 && h1 <= 12) h2 = 12;
        
        // Next day wrap
        if (h2 < h1) h2 += 24;

        const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        
        if (hours === 0 && mins === 0) return "0 د";
        let result = "";
        if (hours > 0) result += `${hours} سا`;
        if (mins > 0) result += ` ${mins} د`;
        return result;
    };

    // --- HELPER: FORMAT TIME (Fix 00:00 -> 12:00) ---
    const formatTimeDisplay = (timeStr: string) => {
        if (!timeStr) return "";
        if (timeStr === "00:00") return "12:00"; // Display 00:00 as 12:00
        return timeStr;
    };

    // --- EXTERNAL PROCTOR LOGIC ---
    const handleAddExternalProctor = () => {
        if (!newExternalProctor.trim()) return;
        const newName = newExternalProctor.trim() + " (إضافي)";
        const updatedProctors = [...externalProctors, newName];
        setExternalProctors(updatedProctors);
        localStorage.setItem('takwin_external_proctors', JSON.stringify(updatedProctors));
        setNewExternalProctor('');

        if (proctorAssignments.length > 0) {
            let filledCount = 0;
            const newAssignments = [...proctorAssignments];
            examSchedule.forEach(exam => {
                const isAssignedHere = newAssignments.some(p => p.examSlotId === exam.id && (p.proctor1 === newName || p.proctor2 === newName));
                if (isAssignedHere) return;
                const gapAssignment = newAssignments.find(p => p.examSlotId === exam.id && (!p.proctor1 || !p.proctor2));
                if (gapAssignment) {
                    if (!gapAssignment.proctor1) { gapAssignment.proctor1 = newName; filledCount++; }
                    else if (!gapAssignment.proctor2) { gapAssignment.proctor2 = newName; filledCount++; }
                }
            });
            if (filledCount > 0) {
                setProctorAssignments(newAssignments);
                localStorage.setItem('takwin_exam_proctors', JSON.stringify(newAssignments));
                alert(`تم إضافة الحارس "${newName}" وتعيينه آلياً في ${filledCount} مكان شاغر.`);
            }
        }
    };

    const handleRemoveExternalProctor = (index: number) => {
        const updated = externalProctors.filter((_, i) => i !== index);
        setExternalProctors(updated);
        localStorage.setItem('takwin_external_proctors', JSON.stringify(updated));
    };

    const getAllProctorNames = () => {
        const list: string[] = [];
        Object.values(trainerConfig).forEach(conf => {
            if (conf.names) Object.values(conf.names).forEach(n => list.push(n as string));
        });
        externalProctors.forEach(p => list.push(p));
        return [...new Set(list)];
    };

    const handleAutoAssignProctors = () => {
        if (examSchedule.length === 0 || examRooms.length === 0) { alert("يرجى ضبط الرزنامة وتفويج القاعات أولاً."); return; }
        const availableProctors = getAllProctorNames();
        if (availableProctors.length === 0) { alert("لا يوجد أساتذة أو حراس مسجلين."); return; }
        if (!window.confirm(`سيتم توزيع الحراسة مع مراعاة العدل.\nالعدد المتوفر: ${availableProctors.length} حارس.\nهل أنت متأكد؟`)) return;

        let newAssignments: ProctorAssignment[] = [];
        const proctorLoad: Record<string, number> = {};
        availableProctors.forEach(p => proctorLoad[p] = 0);

        const sortedExams = [...examSchedule].sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

        sortedExams.forEach(exam => {
            const candidates = [...availableProctors].sort((a, b) => {
                const loadDiff = proctorLoad[a] - proctorLoad[b];
                return loadDiff !== 0 ? loadDiff : Math.random() - 0.5;
            });

            const examRoomAssigns: Record<number, { p1: string, p2: string }> = {};
            examRooms.forEach(r => examRoomAssigns[r.id] = { p1: '', p2: '' });
            const usedInThisSlot = new Set<string>();

            examRooms.forEach(room => {
                const p = candidates.find(c => !usedInThisSlot.has(c));
                if (p) { examRoomAssigns[room.id].p1 = p; usedInThisSlot.add(p); proctorLoad[p]++; }
            });

            const remainingCandidates = candidates.filter(c => !usedInThisSlot.has(c)).sort((a,b) => proctorLoad[a] - proctorLoad[b]);

            examRooms.forEach(room => {
                const p = remainingCandidates.find(c => !usedInThisSlot.has(c));
                if (p) { examRoomAssigns[room.id].p2 = p; usedInThisSlot.add(p); proctorLoad[p]++; }
            });

            Object.entries(examRoomAssigns).forEach(([roomId, proctors]) => {
                newAssignments.push({ roomId: parseInt(roomId), examSlotId: exam.id, proctor1: proctors.p1, proctor2: proctors.p2 });
            });
        });

        setProctorAssignments(newAssignments);
        localStorage.setItem('takwin_exam_proctors', JSON.stringify(newAssignments));
        alert("تم توزيع الحراسة بنجاح.");
    };

    const handleGenerateRooms = () => {
        if (!window.confirm("سيتم إعادة توزيع الأفواج (20 متربص للقاعة). هل أنت متأكد؟")) return;
        const newRooms: ExamRoom[] = [];
        let roomCounter = 1;
        specialties.forEach(spec => {
            const specTrainees = trainees.filter(t => t.specialtyId === spec.id).sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
            for (let i = 0; i < specTrainees.length; i += 20) {
                newRooms.push({ id: roomCounter, specialtyId: spec.id, trainees: specTrainees.slice(i, i + 20), capacity: 20 });
                roomCounter++;
            }
        });
        setExamRooms(newRooms);
        localStorage.setItem('takwin_exam_rooms', JSON.stringify(newRooms));
        alert(`تم توزيع المتربصين على ${newRooms.length} قاعة امتحان بنجاح.`);
    };

    const handleScheduleChange = (id: string, field: keyof ExamSlot, value: string) => {
        const updated = examSchedule.map(s => s.id === id ? { ...s, [field]: value } : s);
        setExamSchedule(updated);
        localStorage.setItem('takwin_exam_schedule', JSON.stringify(updated));
    };

    const handleProctorChange = (roomId: number, examId: string, field: 'proctor1' | 'proctor2', value: string) => {
        const existingIdx = proctorAssignments.findIndex(p => p.roomId === roomId && p.examSlotId === examId);
        let updated = [...proctorAssignments];
        if (existingIdx >= 0) updated[existingIdx] = { ...updated[existingIdx], [field]: value };
        else updated.push({ roomId, examSlotId: examId, proctor1: field === 'proctor1' ? value : '', proctor2: field === 'proctor2' ? value : '' });
        setProctorAssignments(updated);
        localStorage.setItem('takwin_exam_proctors', JSON.stringify(updated));
    };

    const getProctor = (roomId: number, examId: string) => {
        return proctorAssignments.find(p => p.roomId === roomId && p.examSlotId === examId) || { proctor1: '', proctor2: '' };
    };

    // --- PRINT HANDLER ---
    const handlePrint = () => {
        const printContent = document.getElementById('print-area-exam');
        let printSection = document.getElementById('print-section');
        
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (printContent && printSection) {
            printSection.innerHTML = '';
            const clone = printContent.cloneNode(true) as HTMLElement;
            clone.classList.remove('hidden'); 
            printSection.appendChild(clone);
            window.print();
        }
    };

    const chunkArray = (arr: any[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    };

    // --- RENDER CONTENT COMPONENT (Reused for Preview & Print) ---
    const RenderPrintContent = () => (
        <div id="print-area-exam">
            <div className="space-y-12">
                
                {/* 1. SCHEDULE */}
                {selectedPrintDoc === 'schedule' && (
                    <div className="text-center" style={{ direction: 'rtl' }}>
                        <div className="border-b-2 border-black pb-4 mb-6">
                            <h3 className="font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                            <h3 className="font-bold">وزارة التربية الوطنية</h3>
                            <h1 className="text-3xl font-black mt-4 border-4 border-double border-black inline-block px-8 py-2">رزنامة الامتحانات النهائية</h1>
                            <p className="mt-2 font-bold text-lg">دورة: جويلية 2026</p>
                            <p className="text-md">مركز التكوين: {institution.center}</p>
                        </div>
                        <table className="w-full border-2 border-black text-center">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border border-black p-3 text-lg">التاريخ</th>
                                    <th className="border border-black p-3 text-lg">التوقيت</th>
                                    <th className="border border-black p-3 text-lg">المقياس</th>
                                    <th className="border border-black p-3 text-lg">المدة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examSchedule.sort((a,b) => a.date.localeCompare(b.date)).map(exam => (
                                    <tr key={exam.id} className="h-16">
                                        <td className="border border-black p-2 font-bold text-lg">{exam.date}</td>
                                        <td className="border border-black p-2 font-bold text-lg" dir="ltr">
                                            {formatTimeDisplay(exam.startTime)} - {formatTimeDisplay(exam.endTime)}
                                        </td>
                                        <td className="border border-black p-2 font-bold text-xl">{MODULES.find(m => m.id === exam.moduleId)?.title}</td>
                                        <td className="border border-black p-2 font-bold text-lg" style={{ direction: 'ltr' }}>{calculateDuration(exam.startTime, exam.endTime)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-12 text-left pl-12"><p className="font-bold text-xl underline">المدير البيداغوجي</p></div>
                    </div>
                )}

                {/* 2. ATTENDANCE LISTS */}
                {selectedPrintDoc === 'attendance_exam' && (() => {
                    if (!selectedPrintExam) return <div className="text-center font-bold text-red-500">يرجى اختيار الامتحان من القائمة</div>;
                    const exam = examSchedule.find(e => e.id === selectedPrintExam);
                    const moduleName = MODULES.find(m => m.id === exam?.moduleId)?.title;

                    return examRooms.map(room => (
                        <div key={room.id} className="page-break" style={{ direction: 'rtl' }}>
                            <div className="text-center mb-2 border-b border-black pb-1">
                                <h3 className="font-bold text-xs">وزارة التربية الوطنية - مديرية التربية لولاية {institution.wilaya}</h3>
                                <h1 className="text-xl font-black mt-2 bg-black text-white inline-block px-4 py-0.5">قائمة حضور المتربصين للامتحان</h1>
                                <div className="border border-black mt-2 p-1 text-sm font-bold bg-gray-50 flex justify-around">
                                    <span>المادة: {moduleName}</span>
                                    <span>التاريخ: {exam?.date}</span>
                                    <span>القاعة: {room.id}</span>
                                </div>
                            </div>
                            <table className="w-full border border-black text-center text-xs">
                                <thead>
                                    <tr className="bg-gray-200 h-6">
                                        <th className="border border-black w-8">رقم</th>
                                        <th className="border border-black">اللقب والاسم</th>
                                        <th className="border border-black w-24">تاريخ الميلاد</th>
                                        <th className="border border-black w-32">توقيع المترشح</th>
                                        <th className="border border-black w-16">العلامة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {room.trainees.map((t, i) => (
                                        <tr key={t.id} className="h-8">
                                            <td className="border border-black font-bold">{i + 1}</td>
                                            <td className="border border-black text-right px-2 font-bold">{t.surname} {t.name}</td>
                                            <td className="border border-black">{t.dob}</td>
                                            <td className="border border-black"></td>
                                            <td className="border border-black"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 flex justify-between px-8 font-bold text-xs">
                                <div>عدد الحاضرين: .......</div>
                                <div>عدد الغائبين: .......</div>
                                <div>رئيس القاعة: ....................</div>
                            </div>
                        </div>
                    ));
                })()}

                {/* 3. PROCTOR CONVOCATION CARDS (Improved Layout) */}
                {selectedPrintDoc === 'proctor_individual' && (() => {
                    const allProctors = getAllProctorNames();
                    const activeProctors = allProctors.filter(name => proctorAssignments.some(p => p.proctor1 === name || p.proctor2 === name));
                    const chunks = chunkArray(activeProctors, 4);
                    const todayDate = new Date().toLocaleDateString('ar-DZ');

                    return chunks.map((chunk, pageIndex) => (
                        <div key={pageIndex} className="page-break" style={{ 
                            direction: 'rtl', 
                            width: '100%', 
                            maxWidth: '190mm', // Safe width for A4
                            height: '270mm', // Safe height
                            margin: '0 auto', 
                            boxSizing: 'border-box',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gridTemplateRows: '1fr 1fr',
                            gap: '5mm',
                            padding: '0mm', // Remove padding to maximize space
                            pageBreakAfter: 'always'
                        }}>
                            {chunk.map((proctorName, idx) => {
                                const myTasks = proctorAssignments.filter(p => p.proctor1 === proctorName || p.proctor2 === proctorName);
                                return (
                                    <div key={idx} className="border-[3px] border-double border-slate-800 rounded-2xl p-3 flex flex-col justify-between relative bg-white h-full shadow-sm overflow-hidden">
                                        <div className="text-center border-b-2 border-slate-200 pb-2 mb-2">
                                            <h3 className="font-bold text-[10px] text-slate-500">مديرية التربية لولاية {institution.wilaya}</h3>
                                            <h3 className="font-bold text-[10px] text-slate-500">مركز التكوين {institution.center}</h3>
                                            <div className="mt-2 bg-slate-900 text-white px-4 py-1 rounded inline-block">
                                                <h2 className="text-base font-bold">استدعاء للحراسة</h2>
                                            </div>
                                        </div>
                                        
                                        <div className="text-center mb-3">
                                            <p className="text-xs text-slate-500 mb-1">السيد(ة) الأستاذ(ة):</p>
                                            <p className="text-lg font-black border-b border-dotted border-black inline-block px-4">{proctorName}</p>
                                        </div>

                                        <table className="w-full border border-black text-center text-[10px] flex-1 mb-2">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="border border-black p-1">التاريخ</th>
                                                    <th className="border border-black p-1">التوقيت</th>
                                                    <th className="border border-black p-1">القاعة</th>
                                                    <th className="border border-black p-1">المادة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {myTasks.slice(0, 5).map((task, tIdx) => {
                                                    const exam = examSchedule.find(e => e.id === task.examSlotId);
                                                    return (
                                                        <tr key={tIdx}>
                                                            <td className="border border-black p-1">{exam?.date.split('-').slice(1).join('/')}</td>
                                                            <td className="border border-black p-1 text-[9px]" dir="ltr">
                                                                {formatTimeDisplay(exam?.startTime || '')} - {formatTimeDisplay(exam?.endTime || '')}
                                                            </td>
                                                            <td className="border border-black p-1 font-bold bg-gray-50">ق {task.roomId}</td>
                                                            <td className="border border-black p-1 truncate max-w-[60px]">{MODULES.find(m => m.id === exam?.moduleId)?.shortTitle}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        
                                        <div className="flex justify-between items-end mt-1 px-2">
                                            <div className="text-[9px] font-bold text-right">
                                                <p>حرر بـ: {institution.wilaya || '...........'}</p>
                                                <p>بتاريخ: {todayDate}</p>
                                            </div>
                                            <div className="text-[10px] font-bold text-center">
                                                <p className="mb-4">المدير</p>
                                                <p>................</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ));
                })()}

                {/* 4. PROCTOR MATRIX */}
                {selectedPrintDoc === 'proctor_matrix' && (
                    <div style={{ direction: 'rtl' }}>
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-black underline">الجدول الإجمالي لتوزيع الحراسة</h1>
                        </div>
                        <table className="w-full border-2 border-black text-center text-xs">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-black p-2 w-48">الأستاذ الحارس</th>
                                    {examSchedule.map(exam => (
                                        <th key={exam.id} className="border border-black p-1">
                                            <div className="font-bold">{MODULES.find(m=>m.id===exam.moduleId)?.shortTitle}</div>
                                            <div className="text-[10px]">{exam.date}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {getAllProctorNames().map((proctorName, idx) => (
                                    <tr key={idx} className="hover:bg-gray-100">
                                        <td className="border border-black p-2 font-bold text-right px-2">{proctorName}</td>
                                        {examSchedule.map(exam => {
                                            const rooms = proctorAssignments.filter(a => a.examSlotId === exam.id && (a.proctor1 === proctorName || a.proctor2 === proctorName)).map(a => a.roomId);
                                            return <td key={exam.id} className="border border-black p-2">{rooms.length > 0 ? <span className="font-bold bg-gray-200 px-1 rounded border border-gray-400">ق {rooms.join(',')}</span> : '-'}</td>
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 5. CONDUCT PV */}
                {selectedPrintDoc === 'pv_conduct' && selectedPrintExam && (
                    <div className="space-y-12">
                        {(selectedPrintRoom ? [examRooms.find(r => r.id === selectedPrintRoom)!] : examRooms).map(room => {
                            const exam = examSchedule.find(e => e.id === selectedPrintExam);
                            const assign = getProctor(room.id, selectedPrintExam);
                            if (!exam) return null;
                            return (
                                <div key={room.id} className="page-break" style={{ direction: 'rtl' }}>
                                        <div className="text-center mb-4">
                                            <h4 className="font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h4>
                                            <h4 className="font-bold">وزارة التربية الوطنية</h4>
                                            <div className="flex justify-between text-sm font-bold mt-2">
                                                <span>مديرية التربية لولاية: {institution.wilaya}</span>
                                                <span>مركز التكوين: {institution.center}</span>
                                            </div>
                                        </div>
                                        <h1 className="text-2xl font-black text-center border-2 border-black py-2 mb-4 bg-gray-100">محضر سير الامتحانات الكتابية</h1>
                                        <div className="mb-4 font-bold flex flex-wrap gap-4 justify-between border-b pb-2">
                                            <span>التاريخ: {exam.date}</span>
                                            <span>التوقيت: {formatTimeDisplay(exam.startTime)} إلى {formatTimeDisplay(exam.endTime)}</span>
                                            <span>القاعة: {room.id}</span>
                                        </div>
                                        <table className="w-full border-2 border-black text-center mb-6">
                                            <thead><tr className="bg-gray-200"><th className="border border-black p-2">المقياس</th><th className="border border-black p-2">المسجلون</th><th className="border border-black p-2">الحاضرون</th><th className="border border-black p-2">الغائبون</th></tr></thead>
                                            <tbody><tr><td className="border border-black p-2 font-bold">{MODULES.find(m => m.id === exam.moduleId)?.title}</td><td className="border border-black p-2">{room.trainees.length}</td><td className="border border-black p-2">...</td><td className="border border-black p-2">...</td></tr></tbody>
                                        </table>
                                        <h3 className="font-bold underline mb-2">الحراسة:</h3>
                                        <table className="w-full border border-black text-center text-sm mb-8">
                                            <thead><tr className="bg-gray-200"><th className="border border-black p-1 w-10">#</th><th className="border border-black p-1">اللقب والاسم</th><th className="border border-black p-1 w-32">الإمضاء</th></tr></thead>
                                            <tbody>
                                                <tr><td className="border border-black p-2">1</td><td className="border border-black p-2 font-bold">{assign.proctor1}</td><td className="border border-black p-2"></td></tr>
                                                <tr><td className="border border-black p-2">2</td><td className="border border-black p-2 font-bold">{assign.proctor2}</td><td className="border border-black p-2"></td></tr>
                                            </tbody>
                                        </table>
                                        <div className="mt-8 text-left pl-8 font-bold text-lg">المدير البيداغوجي</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* CSS to hide ghost cards on screen */}
            <style>{`
                @media screen {
                    #print-section { display: none !important; }
                }
                @media print {
                    #print-section { display: block !important; }
                }
            `}</style>

            {/* Sub-Navigation */}
            <div className="flex flex-wrap gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 w-fit print:hidden">
                <button onClick={() => setActiveTab('schedule')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'schedule' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Calendar className="w-4 h-4" /> رزنامة الامتحانات
                </button>
                <button onClick={() => setActiveTab('rooms')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'rooms' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Users className="w-4 h-4" /> تفويج القاعات
                </button>
                <button onClick={() => setActiveTab('proctors')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'proctors' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Settings className="w-4 h-4" /> الحراسة والمراقبة
                </button>
                <button onClick={() => setActiveTab('print')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'print' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Printer className="w-4 h-4" /> طباعة الوثائق
                </button>
            </div>

            {/* TAB 1: SCHEDULE (Cards) */}
            {activeTab === 'schedule' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        ضبط رزنامة الامتحانات (25 - 27 جويلية 2026)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {examSchedule.map(slot => (
                            <div key={slot.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-lg text-xs font-bold border border-purple-500/20">
                                        {MODULES.find(m => m.id === slot.moduleId)?.shortTitle}
                                    </div>
                                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {calculateDuration(slot.startTime, slot.endTime)}
                                    </div>
                                </div>
                                
                                <h4 className="font-bold text-white text-base mb-4 leading-tight">
                                    {MODULES.find(m => m.id === slot.moduleId)?.title}
                                </h4>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">التاريخ</label>
                                        <select value={slot.date} onChange={e => handleScheduleChange(slot.id, 'date', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-purple-500">
                                            {EXAM_DAYS.map(d => <option key={d.date} value={d.date}>{d.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-400 block mb-1">من</label>
                                            <input type="time" value={slot.startTime} onChange={e => handleScheduleChange(slot.id, 'startTime', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-sm outline-none focus:border-purple-500 text-center" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-400 block mb-1">إلى</label>
                                            <input type="time" value={slot.endTime} onChange={e => handleScheduleChange(slot.id, 'endTime', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-sm outline-none focus:border-purple-500 text-center" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: ROOMS */}
            {activeTab === 'rooms' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold">تفويج قاعات الامتحان (20 متربص/قاعة)</h3>
                        <button onClick={handleGenerateRooms} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">
                            <RefreshCw className="w-4 h-4" /> إعادة التفويج الآلي
                        </button>
                    </div>
                    {examRooms.length === 0 ? (
                        <div className="text-center text-slate-500 py-12 border-2 border-dashed border-slate-800 rounded-xl">لم يتم توليد القاعات بعد. اضغط على الزر أعلاه.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {examRooms.map(room => (
                                <div key={room.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="flex justify-between font-bold text-white mb-2">
                                        <span>القاعة {room.id}</span>
                                        <span className="text-purple-400">{specialties.find(s=>s.id === room.specialtyId)?.name}</span>
                                    </div>
                                    <div className="text-sm text-slate-400 mb-2">عدد المتربصين: {room.trainees.length}</div>
                                    <div className="h-32 overflow-y-auto custom-scrollbar bg-slate-900/50 rounded p-2 text-xs text-slate-300">
                                        <ol className="list-decimal list-inside">
                                            {room.trainees.map(t => <li key={t.id}>{t.surname} {t.name}</li>)}
                                        </ol>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: PROCTORS */}
            {activeTab === 'proctors' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-400" />
                            إدارة الحراس الإضافيين
                        </h3>
                        <div className="flex gap-4 mb-4">
                            <input type="text" placeholder="اللقب والاسم (حارس خارجي)" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" value={newExternalProctor} onChange={e => setNewExternalProctor(e.target.value)} />
                            <button 
                                onClick={handleAddExternalProctor} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                                title="إضافة حارس إضافي"
                            >
                                <Plus className="w-5 h-5" /> إضافة
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {externalProctors.map((p, idx) => (
                                <div key={idx} className="bg-slate-800 px-3 py-1 rounded-full text-xs text-white flex items-center gap-2 border border-slate-700">
                                    {p}
                                    <button onClick={() => handleRemoveExternalProctor(idx)} className="text-red-400 hover:text-white"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="text-white font-bold">توزيع الحراس</h3>
                             <button 
                                 onClick={handleAutoAssignProctors} 
                                 className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all"
                                 title="توزيع الحراس آلياً"
                             >
                                 <Wand2 className="w-4 h-4" /> توزيع آلي
                             </button>
                         </div>
                         {examRooms.length === 0 ? <div className="text-red-400">يجب توليد القاعات أولاً.</div> : (
                             <div className="space-y-8">
                                 {examSchedule.sort((a,b) => a.date.localeCompare(b.date)).map(exam => (
                                     <div key={exam.id} className="border border-slate-700 rounded-xl overflow-hidden">
                                         <div className="bg-slate-800 p-3 font-bold text-white flex justify-between">
                                             <span>{MODULES.find(m => m.id === exam.moduleId)?.title}</span>
                                             <span className="text-slate-400 text-sm">{exam.date} ({exam.startTime})</span>
                                         </div>
                                         <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                             {examRooms.map(room => {
                                                 const assign = getProctor(room.id, exam.id);
                                                 return (
                                                    <div key={room.id} className="flex items-center gap-3 bg-slate-900/30 p-2 rounded border border-slate-800">
                                                        <div className="w-16 font-bold text-slate-300 text-sm">قاعة {room.id}</div>
                                                        <input list="allProctors" placeholder="الحارس 1" className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={assign.proctor1} onChange={e => handleProctorChange(room.id, exam.id, 'proctor1', e.target.value)} />
                                                        <input list="allProctors" placeholder="الحارس 2" className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={assign.proctor2} onChange={e => handleProctorChange(room.id, exam.id, 'proctor2', e.target.value)} />
                                                    </div>
                                                 )
                                             })}
                                         </div>
                                     </div>
                                 ))}
                                 <datalist id="allProctors">{getAllProctorNames().map((name, i) => <option key={i} value={name} />)}</datalist>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {/* TAB 4: PRINT CONTROL */}
            {activeTab === 'print' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                            <button onClick={() => setSelectedPrintDoc('schedule')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='schedule' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>جدول الرزنامة</button>
                            <button onClick={() => setSelectedPrintDoc('attendance_exam')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='attendance_exam' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>قوائم الحضور</button>
                            <button onClick={() => setSelectedPrintDoc('proctor_individual')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='proctor_individual' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>استدعاءات الحراسة</button>
                            <button onClick={() => setSelectedPrintDoc('proctor_matrix')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='proctor_matrix' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>جدول توزيع الحراسة</button>
                            <button onClick={() => setSelectedPrintDoc('pv_conduct')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='pv_conduct' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>محضر سير الامتحان</button>
                        </div>
                        <div className="lg:col-span-1">
                            <button onClick={handlePrint} className="w-full h-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors">
                                <Printer className="w-6 h-6" /> طباعة الوثيقة
                            </button>
                        </div>
                    </div>

                    {(selectedPrintDoc === 'attendance_exam' || selectedPrintDoc === 'pv_conduct') && (
                        <div className="mb-4 flex gap-4">
                            <select className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm flex-1" value={selectedPrintExam} onChange={e => setSelectedPrintExam(e.target.value)}>
                                <option value="">-- اختر الامتحان (إجباري) --</option>
                                {examSchedule.map(e => <option key={e.id} value={e.id}>{MODULES.find(m=>m.id === e.moduleId)?.title}</option>)}
                            </select>
                            {selectedPrintDoc === 'pv_conduct' && (
                                <select className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm flex-1" value={selectedPrintRoom} onChange={e => setSelectedPrintRoom(parseInt(e.target.value))}>
                                    <option value={0}>كل القاعات</option>
                                    {examRooms.map(r => <option key={r.id} value={r.id}>قاعة {r.id}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Preview Area (Restored) */}
                    <div className="bg-white text-black p-8 rounded overflow-auto h-[600px] border-4 border-slate-300 shadow-inner mt-4">
                        <div className="text-center text-slate-500 mb-8 font-bold border-2 border-dashed border-gray-300 p-2 rounded">
                           -- معاينة الوثيقة قبل الطباعة --
                        </div>
                        <RenderPrintContent />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamManager;