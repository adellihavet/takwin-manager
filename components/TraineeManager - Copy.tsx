import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Upload, Plus, Trash2, Search, Table, Download, Layers, ArrowRightLeft, Printer, ClipboardList, UserPlus, CheckSquare, Calendar, Check, X as XIcon, Repeat, X, BarChart3, Info, FileText, LayoutGrid, CheckCircle2, AlertTriangle, FileWarning } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig, AttendanceRecord, AttendanceStatus, SessionInfo } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS } from '../constants';
import { getWorkingDays, formatDate } from '../utils';

const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const TraineeManager: React.FC = () => {
    // Data State
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    const [attendance, setAttendance] = useState<AttendanceRecord>({});

    // UI State
    const [activeTab, setActiveTab] = useState<'list' | 'groups'>('list');
    const [viewMode, setViewMode] = useState<'table' | 'matrix'>('table');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [selectedGroupSpec, setSelectedGroupSpec] = useState<string>('pe');
    const [selectedGroupNum, setSelectedGroupNum] = useState<number>(1);
    const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
    const [attendanceDate, setAttendanceDate] = useState<string>(formatDateKey(new Date()));
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [transferTarget, setTransferTarget] = useState<Trainee | null>(null);
    
    // Form State
    const [newTrainee, setNewTrainee] = useState<Partial<Trainee>>({
        gender: 'M',
        specialtyId: 'pe'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

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

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}

        const savedAtt = localStorage.getItem('takwin_attendance_db');
        if (savedAtt) try { setAttendance(JSON.parse(savedAtt)); } catch(e) {}
    }, []);

    const saveTrainees = (data: Trainee[]) => {
        setTrainees(data);
        localStorage.setItem('takwin_trainees_db', JSON.stringify(data));
    };

    const saveAttendance = (data: AttendanceRecord) => {
        setAttendance(data);
        localStorage.setItem('takwin_attendance_db', JSON.stringify(data));
    };

    // Matrix Logic: Toggle between P -> A -> J -> P
    const cycleAttendance = (traineeId: string, dateStr: string) => {
        const key = `${dateStr}-${traineeId}`;
        const current = attendance[key]?.status || 'P';
        const newAttendance = { ...attendance };

        if (current === 'P') {
            newAttendance[key] = { status: 'A' };
        } else if (current === 'A') {
            newAttendance[key] = { status: 'J' };
        } else {
            delete newAttendance[key]; // Returns to Present (P)
        }
        saveAttendance(newAttendance);
    };

    const handleTransfer = (newGroupId: number) => {
        if (!transferTarget) return;
        const updatedTrainees = trainees.map(t => 
            t.id === transferTarget.id ? { ...t, groupId: newGroupId } : t
        );
        saveTrainees(updatedTrainees);
        setTransferTarget(null);
        alert(`تم نقل المتربص ${transferTarget.surname} ${transferTarget.name} إلى الفوج ${newGroupId} بنجاح.`);
    };

    const handleSmartAdd = () => {
        if (!newTrainee.surname || !newTrainee.name) return;
        const targetSpecId = newTrainee.specialtyId || 'pe';
        const targetSpec = specialties.find(s => s.id === targetSpecId);
        let targetGroupId = 1;

        if (targetSpec && targetSpec.groups > 1) {
            const counts: Record<number, number> = {};
            for(let i=1; i<=targetSpec.groups; i++) counts[i] = 0;
            trainees.filter(t => t.specialtyId === targetSpecId).forEach(t => {
                if (t.groupId) counts[t.groupId] = (counts[t.groupId] || 0) + 1;
            });
            let minCount = Infinity;
            let candidateGroups: number[] = [];
            for(let i=1; i<=targetSpec.groups; i++) {
                if (counts[i] < minCount) {
                    minCount = counts[i];
                    candidateGroups = [i];
                } else if (counts[i] === minCount) {
                    candidateGroups.push(i);
                }
            }
            targetGroupId = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        }

        const t: Trainee = {
            id: Math.random().toString(36).substr(2, 9),
            surname: newTrainee.surname!,
            name: newTrainee.name!,
            dob: newTrainee.dob || '',
            pob: newTrainee.pob || '',
            gender: newTrainee.gender as 'M' | 'F',
            school: newTrainee.school || '',
            municipality: newTrainee.municipality || '',
            specialtyId: targetSpecId,
            groupId: targetGroupId 
        };

        saveTrainees([...trainees, t]);
        setNewTrainee({ gender: 'M', specialtyId: targetSpecId });
        setIsAdding(false);
    };

    const handleAutoGrouping = () => {
        if (trainees.length === 0) return;
        if (!window.confirm("سيقوم النظام بترتيب المتربصين أبجدياً وتوزيعهم بالتساوي على عدد الأفواج المحدد لكل تخصص.\nهل تريد المتابعة؟")) return;
        const updatedTrainees = [...trainees];
        specialties.forEach(spec => {
            const specTrainees = updatedTrainees.filter(t => t.specialtyId === spec.id);
            if (specTrainees.length === 0) return;
            specTrainees.sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
            specTrainees.forEach((t, index) => {
                const groupNum = (index % spec.groups) + 1;
                const mainIndex = updatedTrainees.findIndex(x => x.id === t.id);
                if (mainIndex !== -1) updatedTrainees[mainIndex].groupId = groupNum;
            });
        });
        saveTrainees(updatedTrainees);
        alert("تم توزيع الأفواج بنجاح.");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split(/\r\n|\n/);
            const importedTrainees: Trainee[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(/[,;]/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols.length < 3) continue;
                importedTrainees.push({
                    id: Math.random().toString(36).substr(2, 9),
                    surname: cols[1] || '',
                    name: cols[2] || '',
                    dob: cols[3] || '',
                    pob: cols[4] || '',
                    gender: (cols[5] && cols[5].includes('أنثى')) ? 'F' : 'M',
                    school: cols[6] || '',
                    municipality: cols[7] || '',
                    specialtyId: mapSpecialtyTextToId(cols[8] || '')
                });
            }
            if (importedTrainees.length > 0) saveTrainees([...trainees, ...importedTrainees]);
        };
        reader.readAsText(file);
    };

    const mapSpecialtyTextToId = (text: string): string => {
        const t = text.toLowerCase();
        if (t.includes('بدنية') || t.includes('pe')) return 'pe';
        if (t.includes('إنجليزية') || t.includes('eng')) return 'eng';
        if (t.includes('فرنسية') || t.includes('fr')) return 'fr';
        if (t.includes('عربية') || t.includes('ar')) return 'ar';
        return 'pe';
    };

    const handlePrintGroup = () => {
        const content = document.getElementById('attendance-print-template');
        let printSection = document.getElementById('print-section');
        if (!printSection) { printSection = document.createElement('div'); printSection.id = 'print-section'; document.body.appendChild(printSection); }
        if (content && printSection) { printSection.innerHTML = ''; const clone = content.cloneNode(true) as HTMLElement; clone.classList.remove('hidden'); printSection.appendChild(clone); window.print(); }
    };

    // مدمج من الملف القديم: وظيفة طباعة قائمة التعليق
    const handlePrintPostingList = () => {
        const content = document.getElementById('posting-list-template');
        let printSection = document.getElementById('print-section');
        if (!printSection) { printSection = document.createElement('div'); printSection.id = 'print-section'; document.body.appendChild(printSection); }
        if (content && printSection) { printSection.innerHTML = ''; const clone = content.cloneNode(true) as HTMLElement; clone.classList.remove('hidden'); printSection.appendChild(clone); window.print(); }
    };

    const handlePrintAbsenceSlip = () => {
        const content = document.getElementById('absence-slip-template');
        let printSection = document.getElementById('print-section');
        if (!printSection) { printSection = document.createElement('div'); printSection.id = 'print-section'; document.body.appendChild(printSection); }
        if (content && printSection) { printSection.innerHTML = ''; const clone = content.cloneNode(true) as HTMLElement; clone.classList.remove('hidden'); printSection.appendChild(clone); window.print(); }
    };

    const downloadGroupExcel = () => {
        if (groupTrainees.length === 0) {
            alert("لا توجد بيانات لتنزيلها لهذا الفوج.");
            return;
        }

        const specName = specialties.find(s => s.id === selectedGroupSpec)?.name || '';
        const headers = ["الرقم", "اللقب و الاسم", "تاريخ الميلاد", "ولاية المترشح(ة)", "التخصص"];

        const csvRows = groupTrainees.map((t, idx) => {
            const rowNumber = idx + 1;
            const fullName = `${t.surname} ${t.name}`;
            const dob = t.dob || '';
            const wilaya = t.municipality || '';
            const specialty = specName;

            const escape = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

            return [
                escape(rowNumber),
                escape(fullName),
                escape(dob),
                escape(wilaya),
                escape(specialty)
            ].join(",");
        });

        const BOM = "\uFEFF";
        const csvContent = BOM + headers.join(",") + "\n" + csvRows.join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `قائمة_فوج_${selectedGroupNum}_${specName.replace(/\s+/g, '_')}.csv`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Derived Data for Matrix
    const currentSession = SESSIONS.find(s => s.id === selectedSessionId) || SESSIONS[0];
    const workingDays = getWorkingDays(currentSession.startDate, currentSession.endDate);

    const groupTrainees = useMemo(() => {
        return trainees
            .filter(t => t.specialtyId === selectedGroupSpec && t.groupId === selectedGroupNum)
            .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
    }, [trainees, selectedGroupSpec, selectedGroupNum]);

    const getAbsenceCount = (traineeId: string) => {
        return workingDays.filter(day => {
            const dateKey = formatDateKey(day);
            const status = attendance[`${dateKey}-${traineeId}`]?.status;
            return status === 'A' || status === 'J';
        }).length;
    };

    const getAbsenceListForPrint = () => {
        return groupTrainees.map(t => {
            const dates = workingDays.filter(day => {
                const dateKey = formatDateKey(day);
                const status = attendance[`${dateKey}-${t.id}`]?.status;
                return status === 'A' || status === 'J';
            }).map(day => ({ 
                date: formatDateKey(day), 
                status: attendance[`${formatDateKey(day)}-${t.id}`]?.status 
            }));
            return { trainee: t, absences: dates };
        }).filter(item => item.absences.length > 0);
    };

    const getBorderColor = () => {
        if (selectedGroupSpec === 'pe') return 'border-blue-600';
        if (selectedGroupSpec === 'eng') return 'border-indigo-600';
        if (selectedGroupSpec === 'ar') return 'border-emerald-600';
        if (selectedGroupSpec === 'fr') return 'border-purple-600';
        return 'border-gray-800';
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            
            {/* Tabs Navigation */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit mb-6 print:hidden">
                <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Users className="w-4 h-4" /> القائمة العامة والإدارة
                </button>
                <button onClick={() => setActiveTab('groups')} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'groups' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <ClipboardList className="w-4 h-4" /> تتبع الحضور والغياب
                </button>
            </div>

            {/* --- TAB 1: LIST --- */}
            {activeTab === 'list' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
                        <div><h2 className="text-2xl font-bold text-white">إدارة المتربصين</h2><p className="text-slate-400 text-sm mt-1">العدد الكلي: {trainees.length}</p></div>
                        <div className="flex gap-2 flex-wrap justify-end">
                            <button onClick={handleAutoGrouping} className="btn-secondary flex gap-2 items-center bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-purple-400/30"><ArrowRightLeft className="w-4 h-4"/> توزيع آلي</button>
                            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex gap-2 items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Table className="w-4 h-4"/> استيراد</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
                            <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex gap-2 items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Plus className="w-4 h-4"/> إضافة</button>
                            {trainees.length > 0 && <button onClick={() => saveTrainees([])} className="btn-danger flex gap-2 items-center bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Trash2 className="w-4 h-4"/> حذف الكل</button>}
                        </div>
                    </div>
                    
                    {/* Add Form (Modal) */}
                    {isAdding && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Plus className="text-blue-500 w-5 h-5" />
                                        إضافة متربص جديد
                                    </h3>
                                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">اللقب</label>
                                        <input placeholder="اللقب" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.surname || ''} onChange={e => setNewTrainee({...newTrainee, surname: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">الاسم</label>
                                        <input placeholder="الاسم" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.name || ''} onChange={e => setNewTrainee({...newTrainee, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">تاريخ الميلاد</label>
                                        <input type="date" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.dob || ''} onChange={e => setNewTrainee({...newTrainee, dob: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">مكان الميلاد</label>
                                        <input placeholder="مكان الميلاد" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.pob || ''} onChange={e => setNewTrainee({...newTrainee, pob: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">التخصص</label>
                                        <select className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.specialtyId} onChange={e => setNewTrainee({...newTrainee, specialtyId: e.target.value})}>
                                            {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">الجنس</label>
                                        <select className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.gender} onChange={e => setNewTrainee({...newTrainee, gender: e.target.value as 'M'|'F'})}>
                                            <option value="M">ذكر</option>
                                            <option value="F">أنثى</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">مؤسسة العمل</label>
                                        <input placeholder="المؤسسة" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.school || ''} onChange={e => setNewTrainee({...newTrainee, school: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold block">البلدية</label>
                                        <input placeholder="البلدية" className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white outline-none focus:border-blue-500 text-right" value={newTrainee.municipality || ''} onChange={e => setNewTrainee({...newTrainee, municipality: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsAdding(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all">إلغاء</button>
                                    <button onClick={handleSmartAdd} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/20">حفظ وإضافة</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-950 text-slate-400">
                                <tr><th className="p-4">#</th><th className="p-4">اللقب والاسم</th><th className="p-4">التخصص</th><th className="p-4">الفوج</th><th className="p-4 text-center">إجراءات</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {trainees.filter(t => filterSpecialty === 'all' || t.specialtyId === filterSpecialty).map((t, idx) => (
                                    <tr key={t.id} className="hover:bg-slate-800/50">
                                        <td className="p-4 text-slate-500">{idx + 1}</td>
                                        <td className="p-4 font-bold text-white">{t.surname} {t.name}</td>
                                        <td className="p-4">{specialties.find(s=>s.id === t.specialtyId)?.name}</td>
                                        <td className="p-4"><span className="bg-purple-500/10 text-purple-300 px-2 py-1 rounded font-bold">{t.groupId ? `فوج ${t.groupId}` : '-'}</span></td>
                                        <td className="p-4 text-center"><button onClick={() => saveTrainees(trainees.filter(x=>x.id!==t.id))} className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-700 rounded transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* --- TAB 2: ATTENDANCE --- */}
            {activeTab === 'groups' && (
                <div className="space-y-6">
                    {/* Control Bar */}
                    <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-slate-800/60 flex flex-wrap gap-6 items-end print:hidden">
                        <div className="space-y-2">
                            <label className="block text-slate-400 text-xs font-bold">1. التخصص والفوج</label>
                            <div className="flex gap-2">
                                <select value={selectedGroupSpec} onChange={e => setSelectedGroupSpec(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={selectedGroupNum} onChange={e => setSelectedGroupNum(parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                                    {Array.from({ length: specialties.find(s => s.id === selectedGroupSpec)?.groups || 1 }).map((_, i) => (
                                        <option key={i} value={i+1}>فوج {i+1}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-400 text-xs font-bold">2. وضع العرض</label>
                            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                                <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    <ClipboardList className="w-3 h-3 inline-block ml-1" /> سجل يومي
                                </button>
                                <button onClick={() => setViewMode('matrix')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    <LayoutGrid className="w-3 h-3 inline-block ml-1" /> شبكة الدورة
                                </button>
                            </div>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="space-y-2">
                                <label className="block text-slate-400 text-xs font-bold">3. تاريخ الحضور</label>
                                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-slate-400 text-xs font-bold">3. اختر الدورة</label>
                                <select value={selectedSessionId} onChange={e => setSelectedSessionId(parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm">
                                    {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="mr-auto flex gap-2">
                            {/* مدمج من الملف القديم: زر طباعة قائمة التعليق */}
                            <button onClick={handlePrintPostingList} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg">
                                <FileText className="w-4 h-4" /> طباعة قائمة المتكونين
                            </button>
                            <button onClick={handlePrintAbsenceSlip} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg">
                                <FileWarning className="w-4 h-4" /> كشف غيابات المكون
                            </button>
                            <button onClick={handlePrintGroup} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg">
                                <Printer className="w-4 h-4" /> ورقة الحضور
                            </button>
                            <button onClick={downloadGroupExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg">
                                <Download className="w-4 h-4" /> تحميل القائمة Excel
                            </button>
                        </div>
                    </div>

                    {/* VIEW: TABLE (DAILY) */}
                    {viewMode === 'table' && (
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden print:hidden">
                            <div className="p-4 bg-purple-900/20 border-b border-slate-800 font-bold text-white flex justify-between items-center">
                                <span>حالة حضور الفوج ليوم {attendanceDate}</span>
                                <span className="text-sm bg-purple-600 px-3 py-0.5 rounded">العدد: {groupTrainees.length}</span>
                            </div>
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-950 text-slate-400">
                                    <tr><th className="p-4 w-12">#</th><th className="p-4">اللقب والاسم</th><th className="p-4">مؤسسة العمل</th><th className="p-4 w-40 text-center">الحالة</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {groupTrainees.map((t, idx) => {
                                        const key = `${attendanceDate}-${t.id}`;
                                        const status = attendance[key]?.status || 'P';
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-800/50">
                                                <td className="p-4 text-slate-500">{idx + 1}</td>
                                                <td className="p-4 font-bold text-white">{t.surname} {t.name}</td>
                                                <td className="p-4 text-slate-400 text-xs">{t.school}</td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => cycleAttendance(t.id, attendanceDate)} className={`w-full py-2 rounded-lg font-bold transition-all border ${status === 'A' ? 'bg-red-50/20 text-red-400 border-red-500/50' : status === 'J' ? 'bg-amber-50/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                                        {status === 'A' ? 'غائب ❌' : status === 'J' ? 'مبرر ⚠️' : 'حاضر ✅'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* VIEW: MATRIX (SESSION) */}
                    {viewMode === 'matrix' && (
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden print:hidden">
                            <div className="p-4 bg-blue-900/20 border-b border-slate-800 font-bold text-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-blue-400" />
                                    <span>مصفوفة غيابات الدورة ({workingDays.length} يوم عمل)</span>
                                </div>
                                <div className="flex gap-4 text-xs font-bold">
                                    <span className="flex items-center gap-1 text-red-400"><XIcon className="w-3 h-3" /> غائب</span>
                                    <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> مبرر</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-center text-[10px] border-collapse">
                                    <thead className="bg-slate-950 text-slate-400">
                                        <tr className="border-b border-slate-800">
                                            <th className="p-3 text-right w-48 sticky right-0 bg-slate-950 z-10 border-l border-slate-800 text-xs">المتربص</th>
                                            {workingDays.map((day, i) => (
                                                <th key={i} className="p-1 border-l border-slate-800 w-8" title={formatDate(day.toISOString())}>{i + 1}</th>
                                            ))}
                                            <th className="p-3 bg-slate-900 text-white border-r border-slate-800 w-16 text-xs">إجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {groupTrainees.map((t) => {
                                            const totalMissed = getAbsenceCount(t.id);
                                            return (
                                                <tr key={t.id} className="hover:bg-slate-800/30 group">
                                                    <td className="p-2 text-right sticky right-0 bg-slate-900 z-10 border-l border-slate-800 group-hover:bg-slate-800">
                                                        <span className="font-bold text-white block">{t.surname} {t.name}</span>
                                                    </td>
                                                    {workingDays.map((day, i) => {
                                                        const dateStr = formatDateKey(day);
                                                        const key = `${dateStr}-${t.id}`;
                                                        const status = attendance[key]?.status || 'P';
                                                        return (
                                                            <td 
                                                                key={i} 
                                                                onClick={() => cycleAttendance(t.id, dateStr)}
                                                                className={`p-1 border-l border-slate-800 cursor-pointer transition-colors hover:brightness-125 ${status === 'A' ? 'bg-red-500/30' : status === 'J' ? 'bg-amber-500/30' : 'bg-transparent'}`}
                                                            >
                                                                {status === 'A' ? <XIcon className="w-3 h-3 text-red-500 mx-auto" /> : status === 'J' ? <AlertTriangle className="w-3 h-3 text-amber-500 mx-auto" /> : <div className="w-1 h-1 bg-slate-800 rounded-full mx-auto opacity-20"></div>}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`p-2 font-black border-r border-slate-800 text-xs ${totalMissed > 3 ? 'text-red-400 bg-red-950/20' : totalMissed > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                                                        {totalMissed || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- PRINT TEMPLATES --- */}

                    {/* 1. DAILY ATTENDANCE SHEET */}
                    <div id="attendance-print-template" className="hidden">
                        <div className="p-8 bg-white text-black h-full" style={{ direction: 'rtl' }}>
                            <div className="text-center mb-4 border-b-2 border-black pb-2">
                                <h3 className="font-bold text-lg">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                <h3 className="font-bold text-lg">وزارة التربية الوطنية</h3>
                                <div className="flex justify-between mt-2 text-sm font-bold px-4">
                                    <span>مديرية التربية لولاية {institution.wilaya}</span>
                                    <span>مركز التكوين {institution.center}</span>
                                </div>
                                <h1 className="text-2xl font-black mt-4 border-2 border-black inline-block px-8 py-2 rounded">ورقة الحضور اليومية</h1>
                                <div className="mt-2 flex justify-around text-lg font-bold">
                                    <span>التخصص: {specialties.find(s => s.id === selectedGroupSpec)?.name}</span>
                                    <span>الفـــــوج: {selectedGroupNum}</span>
                                    <span>التاريخ: {attendanceDate}</span>
                                </div>
                            </div>
                            <table className="w-full border-2 border-black text-center text-sm table-fixed">
                                <thead>
                                    <tr className="bg-gray-200 h-10">
                                        <th className="border border-black p-1 w-[5%]">رقم</th>
                                        <th className="border border-black p-1 w-[35%]">اللقب والاسم</th>
                                        <th className="border border-black p-1 w-[15%]">تاريخ الميلاد</th>
                                        <th className="border border-black p-1 w-[25%]">مؤسسة العمل</th>
                                        <th className="border border-black p-1 w-[20%]">الإمضاء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupTrainees.map((t, idx) => (
                                        <tr key={t.id} className="h-10">
                                            <td className="border border-black p-1 font-bold">{idx + 1}</td>
                                            <td className="border border-black p-1 font-bold text-right px-3">{t.surname} {t.name}</td>
                                            <td className="border border-black p-1">{t.dob}</td>
                                            <td className="border border-black p-1 text-right px-2">{t.school}</td>
                                            <td className="border border-black"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-8 flex justify-between px-12 font-bold text-lg">
                                <div>إمضاء الأستاذ المكون</div>
                                <div>المدير البيداغوجي</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. POSTING LIST (مدمج من الملف القديم) */}
                    <div id="posting-list-template" className="hidden">
                        <div className={`p-4 bg-white text-black h-full border-4 ${getBorderColor()} rounded-lg flex flex-col`} style={{ direction: 'rtl' }}>
                            <div className="text-center mb-2">
                                <h3 className="font-bold text-base mb-1">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                                <div className="flex justify-between mt-2 border-t border-black pt-1 text-xs font-bold px-2">
                                    <span>مديرية التربية: {institution.wilaya}</span>
                                    <span>مركز التكوين: {institution.center}</span>
                                </div>
                            </div>
                            <div className="text-center mb-4">
                                <h1 className="text-2xl font-black bg-black text-white py-1 px-6 rounded-md inline-block shadow-md mb-2">قائمة المتكونين</h1>
                                <div className="flex items-center justify-center gap-3">
                                    <h2 className="text-lg font-bold text-gray-800">التخصص: {specialties.find(s => s.id === selectedGroupSpec)?.name}</h2>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded border border-gray-300">
                                        <span className="text-xl font-bold">فــــــــوج:</span>
                                        <span className="text-3xl font-black">{selectedGroupNum}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <table className="w-full border-2 border-black text-center text-sm table-fixed">
                                    <thead className="bg-gray-100 h-8 border-b-2 border-black">
                                        <tr>
                                            <th className="border border-black w-10 py-1">رقم</th>
                                            <th className="border border-black py-1">اللقب</th>
                                            <th className="border border-black py-1">الاسم</th>
                                            <th className="border border-black w-28 py-1">تاريخ الميلاد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupTrainees.map((t, idx) => (
                                            <tr key={t.id} className={`h-8 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="border border-black font-bold">{idx + 1}</td>
                                                <td className="border border-black font-bold text-right px-3">{t.surname}</td>
                                                <td className="border border-black font-bold text-right px-3">{t.name}</td>
                                                <td className="border border-black font-bold text-xs" dir="ltr">{t.dob}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-end px-4">
                                <div className="text-sm font-bold">العدد الإجمالي: {groupTrainees.length} متربص</div>
                                <div className="text-center"><p className="font-bold text-sm mb-8">المدير البيداغوجي</p></div>
                            </div>
                        </div>
                    </div>

                    {/* 3. ABSENCE SLIP TEMPLATE */}
                    <div id="absence-slip-template" className="hidden">
                        <div className={`p-10 bg-white text-black h-full border-[10px] ${getBorderColor()} rounded-[3rem] flex flex-col`} style={{ direction: 'rtl' }}>
                            <div className="text-center mb-6">
                                <h3 className="font-bold text-lg">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                <h3 className="font-bold text-lg">وزارة التربية الوطنية</h3>
                                <div className="flex justify-between mt-4 border-t-2 border-black pt-2 font-bold text-sm">
                                    <span>مديرية التربية لولاية {institution.wilaya}</span>
                                    <span>مركز التكوين {institution.center}</span>
                                </div>
                            </div>
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-black underline decoration-double mb-4">كشف متابعة غيابات المتربصين</h1>
                                <div className="bg-gray-100 p-4 border-2 border-black rounded-xl inline-block w-full">
                                    <div className="grid grid-cols-2 gap-4 text-xl font-bold">
                                        <div className="text-right">التخصص: {specialties.find(s => s.id === selectedGroupSpec)?.name}</div>
                                        <div className="text-left">الفوج رقم: {selectedGroupNum}</div>
                                        <div className="text-right">الدورة: {currentSession.name}</div>
                                        <div className="text-left">السنة التكوينية: 2026/2025</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <table className="w-full border-2 border-black text-center text-base border-collapse">
                                    <thead className="bg-gray-200">
                                        <tr className="h-12"><th className="border border-black p-2 w-12">رقم</th><th className="border border-black p-2 w-1/3">اللقب والاسم</th><th className="border border-black p-2 w-1/2">تواريخ الغياب</th><th className="border border-black p-2">المجموع</th></tr>
                                    </thead>
                                    <tbody>
                                        {getAbsenceListForPrint().map((item, idx) => (
                                            <tr key={idx} className="min-h-16">
                                                <td className="border border-black p-2 font-bold">{idx + 1}</td>
                                                <td className="border border-black p-2 font-black text-right px-4">{item.trainee.surname} {item.trainee.name}</td>
                                                <td className="border border-black p-2 text-sm text-right px-4">
                                                    {item.absences.map((a, i) => (
                                                        <span key={i} className={`inline-block ml-2 mb-1 p-1 rounded border ${a.status === 'J' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                                            {a.date} {a.status === 'J' ? '(مبرر)' : ''}
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="border border-black p-2 font-black text-2xl bg-gray-50">{item.absences.length}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-8 flex justify-between items-end px-10">
                                <div className="text-center font-bold"><p className="mb-20">استلمت من طرف المكون</p></div>
                                <div className="text-center font-bold"><p className="mb-20">المدير البيداغوجي</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraineeManager;
