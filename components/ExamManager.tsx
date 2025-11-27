
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Printer, Settings, RefreshCw, Plus, Trash2, UserPlus } from 'lucide-react';
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
    
    // NEW: External Proctors State
    const [externalProctors, setExternalProctors] = useState<string[]>([]);
    const [newExternalProctor, setNewExternalProctor] = useState('');

    const [activeTab, setActiveTab] = useState<'schedule' | 'rooms' | 'proctors' | 'print'>('schedule');
    
    // Print Selection State
    const [selectedPrintDoc, setSelectedPrintDoc] = useState<'schedule' | 'attendance_all' | 'attendance_single' | 'proctor_matrix' | 'pv_conduct'>('schedule');
    const [selectedPrintRoom, setSelectedPrintRoom] = useState<number>(0);
    const [selectedPrintExam, setSelectedPrintExam] = useState<string>('');

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

    // --- EXTERNAL PROCTOR LOGIC ---
    const handleAddExternalProctor = () => {
        if (newExternalProctor.trim()) {
            const updated = [...externalProctors, newExternalProctor.trim()];
            setExternalProctors(updated);
            localStorage.setItem('takwin_external_proctors', JSON.stringify(updated));
            setNewExternalProctor('');
        }
    };

    const handleRemoveExternalProctor = (index: number) => {
        const updated = externalProctors.filter((_, i) => i !== index);
        setExternalProctors(updated);
        localStorage.setItem('takwin_external_proctors', JSON.stringify(updated));
    };

    // --- ACTIONS ---

    const handleGenerateRooms = () => {
        if (!window.confirm("سيتم إعادة توزيع الأفواج (20 متربص للقاعة). هل أنت متأكد؟")) return;

        const newRooms: ExamRoom[] = [];
        let roomCounter = 1;

        specialties.forEach(spec => {
            // Filter trainees for this specialty
            const specTrainees = trainees.filter(t => t.specialtyId === spec.id)
                .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));

            // Chunk by 20
            for (let i = 0; i < specTrainees.length; i += 20) {
                const chunk = specTrainees.slice(i, i + 20);
                newRooms.push({
                    id: roomCounter,
                    specialtyId: spec.id,
                    trainees: chunk,
                    capacity: 20
                });
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

        if (existingIdx >= 0) {
            updated[existingIdx] = { ...updated[existingIdx], [field]: value };
        } else {
            updated.push({
                roomId,
                examSlotId: examId,
                proctor1: field === 'proctor1' ? value : '',
                proctor2: field === 'proctor2' ? value : ''
            });
        }
        setProctorAssignments(updated);
        localStorage.setItem('takwin_exam_proctors', JSON.stringify(updated));
    };

    const getProctor = (roomId: number, examId: string) => {
        return proctorAssignments.find(p => p.roomId === roomId && p.examSlotId === examId) || { proctor1: '', proctor2: '' };
    };

    // Helper to get trainer names list (Internal + External)
    const getAllProctorNames = () => {
        const list: string[] = [];
        // Internal Trainers
        Object.values(trainerConfig).forEach(conf => {
            if (conf.names) Object.values(conf.names).forEach(n => list.push(n as string));
        });
        // External Proctors
        externalProctors.forEach(p => list.push(p + " (حارس إضافي)"));
        
        return [...new Set(list)]; // Unique
    };

    const handlePrint = () => {
        const printContent = document.getElementById('print-area-exam');
        const printSection = document.getElementById('print-section');
        if (printContent && printSection) {
            printSection.innerHTML = '';
            const clone = printContent.cloneNode(true) as HTMLElement;
            printSection.appendChild(clone);
            setTimeout(() => window.print(), 100);
        }
    };

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fadeIn">
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

            {/* TAB 1: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-white font-bold mb-4">ضبط رزنامة الامتحانات (25 - 27 جويلية 2026)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {examSchedule.map(slot => (
                            <div key={slot.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">{MODULES.find(m => m.id === slot.moduleId)?.title}</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-slate-400 block">اليوم</label>
                                        <select 
                                            value={slot.date} 
                                            onChange={e => handleScheduleChange(slot.id, 'date', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                                        >
                                            {EXAM_DAYS.map(d => <option key={d.date} value={d.date}>{d.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-400 block">من</label>
                                            <input type="time" value={slot.startTime} onChange={e => handleScheduleChange(slot.id, 'startTime', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-400 block">إلى</label>
                                            <input type="time" value={slot.endTime} onChange={e => handleScheduleChange(slot.id, 'endTime', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white" />
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
                        <div className="text-center text-slate-500 py-12 border-2 border-dashed border-slate-800 rounded-xl">
                            لم يتم توليد القاعات بعد. اضغط على الزر أعلاه.
                        </div>
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

            {/* TAB 3: PROCTORS (AND EXTERNAL) */}
            {activeTab === 'proctors' && (
                <div className="space-y-6">
                    {/* External Proctors Management */}
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-400" />
                            إدارة الحراس الإضافيين (المسخرين)
                        </h3>
                        <div className="flex gap-4 mb-4">
                            <input 
                                type="text" 
                                placeholder="اللقب والاسم (حارس خارجي)" 
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                value={newExternalProctor}
                                onChange={e => setNewExternalProctor(e.target.value)}
                            />
                            <button onClick={handleAddExternalProctor} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {externalProctors.map((p, idx) => (
                                <div key={idx} className="bg-slate-800 px-3 py-1 rounded-full text-xs text-white flex items-center gap-2 border border-slate-700">
                                    {p}
                                    <button onClick={() => handleRemoveExternalProctor(idx)} className="text-red-400 hover:text-white"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            ))}
                            {externalProctors.length === 0 && <span className="text-slate-500 text-sm">لا يوجد حراس إضافيين.</span>}
                        </div>
                    </div>

                    {/* Assignment Grid */}
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                         <h3 className="text-white font-bold mb-6">توزيع الحراس على القاعات</h3>
                         {examRooms.length === 0 ? (
                             <div className="text-red-400">يجب توليد القاعات أولاً.</div>
                         ) : (
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
                                                        <input 
                                                            list="allProctors" 
                                                            placeholder="الحارس 1" 
                                                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                            value={assign.proctor1}
                                                            onChange={e => handleProctorChange(room.id, exam.id, 'proctor1', e.target.value)}
                                                        />
                                                        <input 
                                                            list="allProctors" 
                                                            placeholder="الحارس 2" 
                                                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                            value={assign.proctor2}
                                                            onChange={e => handleProctorChange(room.id, exam.id, 'proctor2', e.target.value)}
                                                        />
                                                    </div>
                                                 )
                                             })}
                                         </div>
                                     </div>
                                 ))}
                                 <datalist id="allProctors">
                                     {getAllProctorNames().map((name, i) => <option key={i} value={name} />)}
                                 </datalist>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {/* TAB 4: PRINT */}
            {activeTab === 'print' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    {/* Print Controller */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                            <button onClick={() => setSelectedPrintDoc('schedule')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='schedule' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                جدول الرزنامة
                            </button>
                            <button onClick={() => setSelectedPrintDoc('attendance_all')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='attendance_all' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                قوائم الحضور (الكل)
                            </button>
                            <button onClick={() => setSelectedPrintDoc('proctor_matrix')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='proctor_matrix' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                جدول توزيع الحراسة
                            </button>
                            <button onClick={() => setSelectedPrintDoc('pv_conduct')} className={`p-3 rounded-xl text-xs font-bold border ${selectedPrintDoc==='pv_conduct' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                محضر سير الامتحان
                            </button>
                        </div>
                        <div className="lg:col-span-1">
                            <button onClick={handlePrint} className="w-full h-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors">
                                <Printer className="w-6 h-6" /> طباعة الوثيقة
                            </button>
                        </div>
                    </div>

                    {/* Filters for Specific Docs */}
                    {selectedPrintDoc === 'pv_conduct' && (
                        <div className="mb-4 flex gap-4">
                            <select className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm flex-1" value={selectedPrintExam} onChange={e => setSelectedPrintExam(e.target.value)}>
                                <option value="">-- اختر الامتحان --</option>
                                {examSchedule.map(e => <option key={e.id} value={e.id}>{MODULES.find(m=>m.id === e.moduleId)?.title}</option>)}
                            </select>
                            <select className="bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm flex-1" value={selectedPrintRoom} onChange={e => setSelectedPrintRoom(parseInt(e.target.value))}>
                                <option value={0}>كل القاعات</option>
                                {examRooms.map(r => <option key={r.id} value={r.id}>قاعة {r.id}</option>)}
                            </select>
                        </div>
                    )}

                    {/* PREVIEW AREA */}
                    <div className="bg-white text-black p-8 rounded overflow-auto h-[600px] border-4 border-slate-300 shadow-inner">
                        <div id="print-area-exam" className="space-y-12">
                            
                            {/* 1. EXAM SCHEDULE CALENDAR */}
                            {selectedPrintDoc === 'schedule' && (
                                <div className="text-center" style={{ direction: 'rtl' }}>
                                    <div className="border-b-2 border-black pb-4 mb-6">
                                        <h3 className="font-bold">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                        <h3 className="font-bold">وزارة التربية الوطنية</h3>
                                        <h1 className="text-3xl font-black mt-4 border-4 border-double border-black inline-block px-8 py-2">
                                            رزنامة الامتحانات النهائية
                                        </h1>
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
                                                    <td className="border border-black p-2 font-bold text-lg">{exam.startTime} - {exam.endTime}</td>
                                                    <td className="border border-black p-2 font-bold text-xl">{MODULES.find(m => m.id === exam.moduleId)?.title}</td>
                                                    <td className="border border-black p-2 font-bold text-lg">02 سا</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="mt-12 text-left pl-12">
                                        <p className="font-bold text-xl underline">مدير المركز</p>
                                    </div>
                                </div>
                            )}

                            {/* 2. ATTENDANCE LISTS (ALL ROOMS) */}
                            {(selectedPrintDoc === 'attendance_all') && examRooms.map(room => (
                                <div key={room.id} className="page-break" style={{ direction: 'rtl' }}>
                                    <div className="text-center mb-6 border-b-2 border-black pb-4">
                                        <h3 className="font-bold text-sm">وزارة التربية الوطنية - مديرية التربية لولاية {institution.wilaya}</h3>
                                        <h1 className="text-2xl font-black mt-4 bg-black text-white inline-block px-6 py-1">
                                            قائمة حضور المتربصين للامتحان النهائي
                                        </h1>
                                        <div className="flex justify-between items-end mt-4 px-4 font-bold text-lg border border-black p-2">
                                            <span>القاعة رقم: {room.id}</span>
                                            <span>التخصص: {specialties.find(s=>s.id===room.specialtyId)?.name}</span>
                                            <span>العدد: {room.trainees.length}</span>
                                        </div>
                                    </div>
                                    <table className="w-full border border-black text-center text-sm">
                                        <thead>
                                            <tr className="bg-gray-200">
                                                <th className="border border-black p-1 w-10">رقم</th>
                                                <th className="border border-black p-1">اللقب والاسم</th>
                                                <th className="border border-black p-1 w-32">تاريخ الميلاد</th>
                                                <th className="border border-black p-1 w-40">توقيع الفترة الصباحية</th>
                                                <th className="border border-black p-1 w-40">توقيع الفترة المسائية</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {room.trainees.map((t, i) => (
                                                <tr key={t.id} className="h-12">
                                                    <td className="border border-black p-1 font-bold">{i + 1}</td>
                                                    <td className="border border-black p-1 text-right px-2 font-bold text-base">{t.surname} {t.name}</td>
                                                    <td className="border border-black p-1">{t.dob}</td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 flex justify-between px-8 font-bold">
                                        <div>الحارس 1: ....................</div>
                                        <div>الحارس 2: ....................</div>
                                        <div>رئيس المركز: ....................</div>
                                    </div>
                                </div>
                            ))}

                            {/* 3. MASTER PROCTORING MATRIX */}
                            {selectedPrintDoc === 'proctor_matrix' && (
                                <div style={{ direction: 'rtl' }}>
                                    <div className="text-center mb-6">
                                        <h1 className="text-2xl font-black underline">الجدول الإجمالي لتوزيع الحراسة</h1>
                                        <p className="font-bold">الامتحان النهائي - دورة جويلية 2026</p>
                                    </div>
                                    <table className="w-full border-2 border-black text-center text-xs">
                                        <thead>
                                            <tr className="bg-gray-200">
                                                <th className="border border-black p-2 w-48">الأستاذ الحارس</th>
                                                {examSchedule.map(exam => (
                                                    <th key={exam.id} className="border border-black p-1">
                                                        <div className="font-bold">{MODULES.find(m=>m.id===exam.moduleId)?.shortTitle}</div>
                                                        <div className="text-[10px]">{exam.date}</div>
                                                        <div className="text-[10px]">{exam.startTime}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getAllProctorNames().map((proctorName, idx) => (
                                                <tr key={idx} className="hover:bg-gray-100">
                                                    <td className="border border-black p-2 font-bold text-right px-2">{proctorName}</td>
                                                    {examSchedule.map(exam => {
                                                        // Find assignments for this proctor in this exam
                                                        const roomsForProctor = proctorAssignments
                                                            .filter(a => a.examSlotId === exam.id && (a.proctor1 === proctorName || a.proctor2 === proctorName))
                                                            .map(a => a.roomId);
                                                        
                                                        return (
                                                            <td key={exam.id} className="border border-black p-2">
                                                                {roomsForProctor.length > 0 ? (
                                                                    <span className="font-bold bg-gray-200 px-2 rounded border border-gray-400">ق {roomsForProctor.join(',')}</span>
                                                                ) : '-'}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 4. CONDUCT PV (Specific) */}
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
                                                     <span>التوقيت: {exam.startTime} إلى {exam.endTime}</span>
                                                     <span>القاعة: {room.id}</span>
                                                 </div>

                                                 <table className="w-full border-2 border-black text-center mb-6">
                                                     <thead>
                                                         <tr className="bg-gray-200">
                                                             <th className="border border-black p-2">المقياس</th>
                                                             <th className="border border-black p-2">المسجلون</th>
                                                             <th className="border border-black p-2">الحاضرون</th>
                                                             <th className="border border-black p-2">الغائبون</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody>
                                                         <tr>
                                                             <td className="border border-black p-2 font-bold">{MODULES.find(m => m.id === exam.moduleId)?.title}</td>
                                                             <td className="border border-black p-2">{room.trainees.length}</td>
                                                             <td className="border border-black p-2">.........</td>
                                                             <td className="border border-black p-2">.........</td>
                                                         </tr>
                                                     </tbody>
                                                 </table>

                                                 <h3 className="font-bold underline mb-2">قائمة المتكونين الغائبين:</h3>
                                                 <div className="grid grid-cols-2 gap-0 border border-black mb-4">
                                                     <div className="border-l border-black">
                                                         <div className="grid grid-cols-[40px_1fr_1fr] border-b border-black bg-gray-100 font-bold text-center text-xs">
                                                             <div className="p-1">الرقم</div><div className="p-1 border-r border-black">اللقب والاسم</div><div className="p-1 border-r border-black">الملاحظة</div>
                                                         </div>
                                                         {[1,2,3,4,5].map(i => (
                                                             <div key={i} className="grid grid-cols-[40px_1fr_1fr] border-b border-black text-xs h-8">
                                                                 <div className="p-1 border-l border-black text-center">{i}</div>
                                                                 <div className="p-1 border-l border-black"></div>
                                                                 <div className="p-1"></div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                     <div>
                                                         <div className="grid grid-cols-[40px_1fr_1fr] border-b border-black bg-gray-100 font-bold text-center text-xs">
                                                             <div className="p-1">الرقم</div><div className="p-1 border-r border-black">اللقب والاسم</div><div className="p-1 border-r border-black">الملاحظة</div>
                                                         </div>
                                                         {[6,7,8,9,10].map(i => (
                                                             <div key={i} className="grid grid-cols-[40px_1fr_1fr] border-b border-black text-xs h-8">
                                                                 <div className="p-1 border-l border-black text-center">{i}</div>
                                                                 <div className="p-1 border-l border-black"></div>
                                                                 <div className="p-1"></div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 </div>

                                                 <div className="mb-4">
                                                     <h3 className="font-bold underline mb-1">ملاحظات عن سير الامتحان:</h3>
                                                     <div className="border border-black h-20 p-2 text-sm leading-6 relative">
                                                         <div className="border-b border-dotted border-gray-400 w-full absolute top-6 left-0"></div>
                                                         <div className="border-b border-dotted border-gray-400 w-full absolute top-12 left-0"></div>
                                                         <div className="border-b border-dotted border-gray-400 w-full absolute top-18 left-0"></div>
                                                     </div>
                                                 </div>

                                                 <h3 className="font-bold underline mb-2">المكلفون بالحراسة:</h3>
                                                 <table className="w-full border border-black text-center text-sm">
                                                     <thead>
                                                         <tr className="bg-gray-200">
                                                             <th className="border border-black p-1 w-10">الرقم</th>
                                                             <th className="border border-black p-1">اللقب والاسم</th>
                                                             <th className="border border-black p-1 w-32">الصفة</th>
                                                             <th className="border border-black p-1 w-32">الإمضاء</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody>
                                                         <tr>
                                                             <td className="border border-black p-2">01</td>
                                                             <td className="border border-black p-2 text-right px-2">{assign.proctor1}</td>
                                                             <td className="border border-black p-2">حارس</td>
                                                             <td className="border border-black p-2"></td>
                                                         </tr>
                                                         <tr>
                                                             <td className="border border-black p-2">02</td>
                                                             <td className="border border-black p-2 text-right px-2">{assign.proctor2}</td>
                                                             <td className="border border-black p-2">حارس</td>
                                                             <td className="border border-black p-2"></td>
                                                         </tr>
                                                     </tbody>
                                                 </table>
                                                 
                                                 <div className="mt-8 text-left pl-8 font-bold text-lg">
                                                     رئيس المركز
                                                 </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamManager;