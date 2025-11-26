
import React, { useState, useEffect, useRef } from 'react';
import { Users, Upload, Plus, Trash2, Search, Table, Download, Layers, ArrowRightLeft, Printer, ClipboardList, UserPlus, CheckSquare, Calendar, Check, X as XIcon } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig, AttendanceRecord } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES } from '../constants';

const TraineeManager: React.FC = () => {
    // Data State
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    const [attendance, setAttendance] = useState<AttendanceRecord>({});

    // UI State
    const [activeTab, setActiveTab] = useState<'list' | 'groups'>('list');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [selectedGroupSpec, setSelectedGroupSpec] = useState<string>('pe');
    const [selectedGroupNum, setSelectedGroupNum] = useState<number>(1);
    const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
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
        if (savedSpec) try { setSpecialties(JSON.parse(savedSpec)); } catch(e) {}

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

    const toggleAttendance = (traineeId: string) => {
        const key = `${attendanceDate}-${traineeId}`;
        const currentStatus = attendance[key];
        const newAttendance = { ...attendance };

        if (currentStatus === 'P') {
            newAttendance[key] = 'A'; // Present -> Absent
        } else if (currentStatus === 'A') {
            delete newAttendance[key]; // Absent -> Reset
        } else {
            newAttendance[key] = 'P'; // Reset -> Present
        }
        saveAttendance(newAttendance);
    };

    // --- SMART ADD LOGIC (Auto Balance) ---
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

            const randomIndex = Math.floor(Math.random() * candidateGroups.length);
            targetGroupId = candidateGroups[randomIndex];
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
        alert(`تمت إضافة المتربص بنجاح وإدراجه آلياً في الفوج رقم: ${targetGroupId} (نظراً لتوازن العدد)`);
    };

    // --- Auto Grouping (Batch) ---
    const handleAutoGrouping = () => {
        if (trainees.length === 0) return;
        if (!window.confirm("سيقوم النظام بترتيب المتربصين أبجدياً وتوزيعهم بالتساوي (Round Robin) على عدد الأفواج المحدد لكل تخصص.\nهل تريد المتابعة؟")) return;

        const updatedTrainees = [...trainees];
        let reportMsg = "تم توزيع الأفواج بنجاح:\n------------------\n";
        
        specialties.forEach(spec => {
            const specTrainees = updatedTrainees.filter(t => t.specialtyId === spec.id);
            if (specTrainees.length === 0) return;

            specTrainees.sort((a, b) => {
                const nameA = `${a.surname} ${a.name}`;
                const nameB = `${b.surname} ${b.name}`;
                return nameA.localeCompare(nameB, 'ar');
            });

            const groupCount = spec.groups;
            const distribution: Record<number, number> = {}; 

            if (groupCount > 0) {
                specTrainees.forEach((t, index) => {
                    const groupNum = (index % groupCount) + 1;
                    distribution[groupNum] = (distribution[groupNum] || 0) + 1;
                    const mainIndex = updatedTrainees.findIndex(x => x.id === t.id);
                    if (mainIndex !== -1) updatedTrainees[mainIndex].groupId = groupNum;
                });
                reportMsg += `\n📌 ${spec.name} (${specTrainees.length} / ${groupCount} أفواج):\n`;
                for(let g=1; g<=groupCount; g++) reportMsg += `   - فوج ${g}: ${distribution[g] || 0}\n`;
            }
        });

        saveTrainees(updatedTrainees);
        alert(reportMsg);
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
            if (importedTrainees.length > 0) {
                if (window.confirm(`تم العثور على ${importedTrainees.length} متربص. إضافة؟`)) {
                    saveTrainees([...trainees, ...importedTrainees]);
                }
            } else alert("لم يتم العثور على بيانات صالحة.");
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const mapSpecialtyTextToId = (text: string): string => {
        if (!text) return 'pe';
        const t = text.toLowerCase();
        if (t.includes('بدنية') || t.includes('رياضة') || t.includes('pe')) return 'pe';
        if (t.includes('إنجليزية') || t.includes('انجليزية') || t.includes('english')) return 'eng';
        if (t.includes('فرنسية') || t.includes('french')) return 'fr';
        if (t.includes('عربية') || t.includes('arabic')) return 'ar';
        return 'pe';
    };

    const handleDelete = (id: string) => {
        if (window.confirm('هل أنت متأكد؟')) saveTrainees(trainees.filter(t => t.id !== id));
    };

    const handleDeleteAll = () => {
        if (window.confirm(`تحذير: حذف الكل؟`)) saveTrainees([]);
    };

    const handlePrintGroup = () => window.print();

    // Filter for main list
    const filteredTrainees = trainees.filter(t => {
        const matchesSpec = filterSpecialty === 'all' || t.specialtyId === filterSpecialty;
        const matchesSearch = t.surname.includes(searchTerm) || t.name.includes(searchTerm);
        return matchesSpec && matchesSearch;
    });

    // Filter for group view
    const groupTrainees = trainees
        .filter(t => t.specialtyId === selectedGroupSpec && t.groupId === selectedGroupNum)
        .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));

    return (
        <div className="space-y-6 animate-fadeIn">
            
            {/* Tabs Navigation */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit mb-6 print:hidden">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'list' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    القائمة العامة والإدارة
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'groups' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    قوائم الحضور والغياب
                </button>
            </div>

            {/* --- TAB 1: GENERAL LIST MANAGEMENT --- */}
            {activeTab === 'list' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
                        <div>
                            <h2 className="text-2xl font-bold text-white">إدارة المتربصين</h2>
                            <p className="text-slate-400 text-sm mt-1">العدد الكلي: {trainees.length}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                            <button onClick={handleAutoGrouping} className="btn-secondary flex gap-2 items-center bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-purple-400/30"><ArrowRightLeft className="w-4 h-4"/> توزيع آلي</button>
                            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex gap-2 items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Table className="w-4 h-4"/> استيراد</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .txt" />
                            <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex gap-2 items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Plus className="w-4 h-4"/> إضافة</button>
                            {trainees.length > 0 && <button onClick={handleDeleteAll} className="btn-danger flex gap-2 items-center bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"><Trash2 className="w-4 h-4"/> حذف الكل</button>}
                        </div>
                    </div>

                    {/* Add Form */}
                    {isAdding && (
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-slideDown print:hidden">
                            <h3 className="font-bold text-white mb-4">إضافة متربص جديد</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input placeholder="اللقب" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.surname || ''} onChange={e => setNewTrainee({...newTrainee, surname: e.target.value})} />
                                <input placeholder="الاسم" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.name || ''} onChange={e => setNewTrainee({...newTrainee, name: e.target.value})} />
                                <input type="date" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.dob || ''} onChange={e => setNewTrainee({...newTrainee, dob: e.target.value})} />
                                <input placeholder="مكان الميلاد" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.pob || ''} onChange={e => setNewTrainee({...newTrainee, pob: e.target.value})} />
                                <select className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.specialtyId} onChange={e => setNewTrainee({...newTrainee, specialtyId: e.target.value})}>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.gender} onChange={e => setNewTrainee({...newTrainee, gender: e.target.value as 'M'|'F'})}>
                                    <option value="M">ذكر</option>
                                    <option value="F">أنثى</option>
                                </select>
                                <input placeholder="المؤسسة" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.school || ''} onChange={e => setNewTrainee({...newTrainee, school: e.target.value})} />
                                <input placeholder="البلدية" className="input-field bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.municipality || ''} onChange={e => setNewTrainee({...newTrainee, municipality: e.target.value})} />
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleSmartAdd} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold">حفظ وإضافة</button>
                            </div>
                        </div>
                    )}

                    {/* Filter */}
                    <div className="flex gap-4 mb-4 print:hidden">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-2.5 text-slate-500 w-4 h-4" />
                            <input type="text" placeholder="بحث..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-10 pl-4 py-2 text-white focus:border-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none" value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}>
                            <option value="all">الكل</option>
                            {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden print:hidden">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-950 text-slate-400">
                                <tr>
                                    <th className="p-4">#</th>
                                    <th className="p-4">اللقب والاسم</th>
                                    <th className="p-4">تاريخ الميلاد</th>
                                    <th className="p-4">التخصص</th>
                                    <th className="p-4">الفوج</th>
                                    <th className="p-4">المؤسسة</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredTrainees.map((t, idx) => (
                                    <tr key={t.id} className="hover:bg-slate-800/50">
                                        <td className="p-4 text-slate-500">{idx + 1}</td>
                                        <td className="p-4 font-bold text-white">{t.surname} {t.name}</td>
                                        <td className="p-4 text-slate-300">{t.dob}</td>
                                        <td className="p-4">{specialties.find(s=>s.id === t.specialtyId)?.name}</td>
                                        <td className="p-4"><span className="bg-purple-500/10 text-purple-300 px-2 py-1 rounded font-bold">{t.groupId ? `فوج ${t.groupId}` : '-'}</span></td>
                                        <td className="p-4 text-slate-300">{t.school}</td>
                                        <td className="p-4 text-center"><button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* --- TAB 2: ATTENDANCE & GROUPS --- */}
            {activeTab === 'groups' && (
                <div className="space-y-6">
                    {/* Control Bar */}
                    <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-slate-800/60 flex flex-wrap gap-6 items-end print:hidden">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-2">1. اختر التخصص</label>
                            <select 
                                value={selectedGroupSpec}
                                onChange={e => { setSelectedGroupSpec(e.target.value); setSelectedGroupNum(1); }}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-64 outline-none focus:border-purple-500"
                            >
                                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-2">2. اختر الفوج</label>
                            <div className="flex gap-2">
                                {Array.from({ length: specialties.find(s => s.id === selectedGroupSpec)?.groups || 1 }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedGroupNum(idx + 1)}
                                        className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center transition-all ${
                                            selectedGroupNum === idx + 1 
                                            ? 'bg-purple-600 text-white shadow-lg scale-105' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-2">3. تاريخ الحضور</label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-2.5 text-slate-500 w-4 h-4" />
                                <input 
                                    type="date"
                                    value={attendanceDate}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg pr-10 pl-4 py-2 text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="mr-auto flex gap-2">
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                إضافة للفوج
                            </button>
                            <button 
                                onClick={handlePrintGroup}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة القائمة
                            </button>
                        </div>
                    </div>

                    {/* Smart Add Modal (Reused for Group Tab) */}
                    {isAdding && (
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-slideDown print:hidden">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <UserPlus className="text-blue-400" />
                                إضافة متربص جديد (سيتم إدراجه آلياً في الفوج الأنسب)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input placeholder="اللقب" className="bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.surname || ''} onChange={e => setNewTrainee({...newTrainee, surname: e.target.value})} />
                                <input placeholder="الاسم" className="bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.name || ''} onChange={e => setNewTrainee({...newTrainee, name: e.target.value})} />
                                <input type="date" className="bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.dob || ''} onChange={e => setNewTrainee({...newTrainee, dob: e.target.value})} />
                                <input placeholder="المؤسسة" className="bg-slate-900 border border-slate-600 p-2 rounded text-white" value={newTrainee.school || ''} onChange={e => setNewTrainee({...newTrainee, school: e.target.value})} />
                                {/* Specialty is locked to current view */}
                                <div className="p-2 bg-slate-900/50 border border-slate-700 rounded text-slate-400 text-sm flex items-center">
                                    التخصص: {specialties.find(s => s.id === selectedGroupSpec)?.name}
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2 justify-end">
                                <button onClick={() => setIsAdding(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold">إلغاء</button>
                                <button 
                                    onClick={() => { setNewTrainee({...newTrainee, specialtyId: selectedGroupSpec}); handleSmartAdd(); }} 
                                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold"
                                >
                                    تأكيد الإضافة
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Screen View Table */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden print:hidden">
                        <div className="p-4 bg-purple-900/20 border-b border-slate-800 font-bold text-white flex justify-between items-center">
                            <span>قائمة الفوج {selectedGroupNum} - {specialties.find(s => s.id === selectedGroupSpec)?.name}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-400 font-normal">تاريخ: {attendanceDate}</span>
                                <span className="text-sm bg-purple-600 px-2 py-0.5 rounded">العدد: {groupTrainees.length}</span>
                            </div>
                        </div>
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-950 text-slate-400">
                                <tr>
                                    <th className="p-4 w-12">#</th>
                                    <th className="p-4">اللقب والاسم</th>
                                    <th className="p-4">تاريخ الميلاد</th>
                                    <th className="p-4">المؤسسة</th>
                                    <th className="p-4 w-32 text-center">غياب / حضور</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {groupTrainees.map((t, idx) => {
                                    const key = `${attendanceDate}-${t.id}`;
                                    const status = attendance[key];
                                    
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-800/50">
                                            <td className="p-4 text-slate-500">{idx + 1}</td>
                                            <td className="p-4 font-bold text-white">{t.surname} {t.name}</td>
                                            <td className="p-4 text-slate-300">{t.dob}</td>
                                            <td className="p-4 text-slate-300">{t.school}</td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => toggleAttendance(t.id)}
                                                    className={`w-8 h-8 rounded flex items-center justify-center transition-colors border-2 ${
                                                        status === 'P' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                                                        status === 'A' ? 'bg-red-500/20 border-red-500 text-red-500' :
                                                        'border-slate-600 text-transparent hover:border-slate-400'
                                                    }`}
                                                >
                                                    {status === 'P' && <Check className="w-5 h-5" />}
                                                    {status === 'A' && <XIcon className="w-5 h-5" />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {groupTrainees.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">الفوج فارغ</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* PRINT TEMPLATE - DAILY SIGNATURE SHEET */}
                    <div id="print-section" className="hidden print:block fixed inset-0 bg-white text-black z-[9999] p-8">
                        <div className="text-center mb-6 border-b-2 border-black pb-4" style={{ direction: 'rtl' }}>
                            <h3 className="font-bold text-lg">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                            <h3 className="font-bold text-lg">وزارة التربية الوطنية</h3>
                            <div className="flex justify-between mt-4 text-sm font-bold px-4">
                                <span>مديرية التربية: {institution.wilaya}</span>
                                <span>مركز التكوين: {institution.center}</span>
                            </div>
                            <h1 className="text-3xl font-black mt-6 border-2 border-black inline-block px-8 py-2 rounded">
                                ورقة الحضور اليومية
                            </h1>
                            <div className="mt-4 flex justify-around text-lg font-bold">
                                <span>التخصص: {specialties.find(s => s.id === selectedGroupSpec)?.name}</span>
                                <span>الفـــــوج: {selectedGroupNum}</span>
                                <span>التاريخ: {attendanceDate}</span>
                            </div>
                        </div>

                        <table className="w-full border-2 border-black text-center text-sm" style={{ direction: 'rtl' }}>
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-black p-2 w-10">رقم</th>
                                    <th className="border border-black p-2">اللقب والاسم</th>
                                    <th className="border border-black p-2 w-28">تاريخ الميلاد</th>
                                    <th className="border border-black p-2">مؤسسة العمل</th>
                                    <th className="border border-black p-2 w-32">الإمضاء</th>
                                    <th className="border border-black p-2 w-40">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupTrainees.map((t, idx) => (
                                    <tr key={t.id}>
                                        <td className="border border-black p-2 font-bold">{idx + 1}</td>
                                        <td className="border border-black p-2 font-bold text-right px-3">{t.surname} {t.name}</td>
                                        <td className="border border-black p-2">{t.dob}</td>
                                        <td className="border border-black p-2 text-right px-2">{t.school}</td>
                                        <td className="border border-black"></td>
                                        <td className="border border-black"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-8 flex justify-between px-12 font-bold">
                            <div>إمضاء الأستاذ المكون</div>
                            <div>إمضاء المشرف / المدير</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraineeManager;
