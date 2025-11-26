
import React, { useState, useEffect } from 'react';
import { SESSIONS, MODULES, SPECIALTIES } from '../constants';
import { GroupSchedule, TrainerAssignment, TrainerConfig, Specialty } from '../types';
import { getWorkingDays, formatDate } from '../utils';
import { AlertTriangle, CheckCircle2, ArrowRightLeft, GripVertical } from 'lucide-react';

const TimetableEditor: React.FC = () => {
    // Data
    const [schedule, setSchedule] = useState<GroupSchedule[]>([]);
    const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);
    const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
    const [specialties, setSpecialties] = useState<Specialty[]>(SPECIALTIES);

    // UI State
    const [selectedSessionId, setSelectedSessionId] = useState(1);
    const [selectedGroupGlobalId, setSelectedGroupGlobalId] = useState<string>('');
    
    // Drag & Drop State
    const [draggedSlot, setDraggedSlot] = useState<{ dayIdx: number, hourIdx: number, moduleId: number, duration: number } | null>(null);
    const [dropFeedback, setDropFeedback] = useState<{ status: 'neutral' | 'allowed' | 'forbidden', message: string } | null>(null);

    // Load Data
    useEffect(() => {
        const s = localStorage.getItem('takwin_schedule');
        const a = localStorage.getItem('takwin_assignments');
        const t = localStorage.getItem('takwin_trainers_db');
        const sp = localStorage.getItem('takwin_specialties_db');

        if (s) setSchedule(JSON.parse(s));
        if (a) setAssignments(JSON.parse(a));
        if (t) setTrainerConfig(JSON.parse(t));
        if (sp) setSpecialties(JSON.parse(sp));
    }, []);

    // Helpers
    const currentSession = SESSIONS.find(s => s.id === selectedSessionId) || SESSIONS[0];
    const workingDays = getWorkingDays(currentSession.startDate, currentSession.endDate);

    const currentGroupSchedule = schedule.find(g => {
        if (!selectedGroupGlobalId) return false;
        const [specId, localId] = selectedGroupGlobalId.split('-');
        return g.specialtyId === specId && g.groupId === parseInt(localId);
    });

    const getTrainerKey = (groupId: string, moduleId: number) => {
        const entry = assignments.find(a => a.groupId === groupId && a.moduleId === moduleId);
        return entry?.trainerKey;
    };

    const getTrainerName = (moduleId: number, key: string) => {
        if (!key) return 'غير محدد';
        if (moduleId === 999) return 'مشرف';
        const names = moduleId === 1 ? trainerConfig[1]?.names : trainerConfig[moduleId]?.names;
        return names?.[key] || key;
    };

    const getModuleName = (id: number | null) => {
        if (!id) return '';
        if (id === 999) return 'مراجعة';
        return MODULES.find(m => m.id === id)?.shortTitle || '';
    };

    // --- CORE LOGIC: CHECK CONFLICTS ---
    const checkConflict = (moduleId: number, targetDayIdx: number, targetHourIdx: number): { conflict: boolean, reason: string } => {
        if (moduleId === 999) return { conflict: false, reason: '' }; 

        const trainerKey = getTrainerKey(selectedGroupGlobalId, moduleId);
        if (!trainerKey) return { conflict: false, reason: '' }; 

        // Check if this trainer is busy in the target slot with ANOTHER group
        const conflict = assignments.find(a => 
            a.dayIndex === targetDayIdx &&
            a.hourIndex === targetHourIdx &&
            a.trainerKey === trainerKey &&
            a.groupId !== selectedGroupGlobalId 
        );

        if (conflict) {
            const [specId, gId] = conflict.groupId.split('-');
            const specName = specialties.find(s => s.id === specId)?.name;
            const tName = getTrainerName(moduleId, trainerKey);

            return { 
                conflict: true, 
                reason: `تعارض: الأستاذ (${tName}) يدرس ${specName} (فوج ${gId}) في هذا الوقت.` 
            };
        }

        return { conflict: false, reason: '' };
    };

    // --- DRAG & DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, dayIdx: number, hourIdx: number, moduleId: number, duration: number) => {
        setDraggedSlot({ dayIdx, hourIdx, moduleId, duration });
        e.dataTransfer.effectAllowed = "move";
        // Hide ghost image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent, targetDayIdx: number, targetHourIdx: number) => {
        e.preventDefault(); // Necessary to allow dropping
        if (!draggedSlot) return;

        // Prevent dropping on same slot
        if (draggedSlot.dayIdx === targetDayIdx && draggedSlot.hourIdx === targetHourIdx) {
            setDropFeedback(null);
            return;
        }

        const { conflict, reason } = checkConflict(draggedSlot.moduleId, targetDayIdx, targetHourIdx);

        if (conflict) {
            setDropFeedback({ status: 'forbidden', message: reason });
        } else {
            setDropFeedback({ status: 'allowed', message: 'يمكن النقل هنا' });
        }
    };

    const handleDrop = (e: React.DragEvent, targetDayIdx: number, targetHourIdx: number) => {
        e.preventDefault();
        setDropFeedback(null);
        
        if (!draggedSlot || !currentGroupSchedule) return;
        if (draggedSlot.dayIdx === targetDayIdx && draggedSlot.hourIdx === targetHourIdx) return;

        // 1. Final Conflict Check
        const { conflict } = checkConflict(draggedSlot.moduleId, targetDayIdx, targetHourIdx);
        if (conflict) {
            alert("لا يمكن النقل لوجود تعارض مع توقيت الأستاذ.");
            return;
        }

        // 2. Execute Move/Swap
        const newSchedule = JSON.parse(JSON.stringify(schedule));
        const groupIdx = newSchedule.findIndex((g: GroupSchedule) => 
            g.specialtyId === currentGroupSchedule.specialtyId && 
            g.groupId === currentGroupSchedule.groupId
        );
        
        const groupDays = newSchedule[groupIdx].days;
        
        // Identify Source & Target Slots in Data Structure
        // NOTE: Logic assumes 1-hour slots primarily for simplicity in this editor version
        const sourceSlotIdx = groupDays[draggedSlot.dayIdx].slots.findIndex((s: any) => parseInt(s.time) === (8 + draggedSlot.hourIdx));
        const targetSlotIdx = groupDays[targetDayIdx].slots.findIndex((s: any) => parseInt(s.time) === (8 + targetHourIdx));

        const sourceModuleId = draggedSlot.moduleId;
        let targetModuleId: number | null = null;

        // Check reverse conflict if swapping (Target has a module)
        if (targetSlotIdx !== -1) {
            targetModuleId = groupDays[targetDayIdx].slots[targetSlotIdx].moduleId;
            // Check if Target Module's Trainer is free at Source Time
            const reverseCheck = checkConflict(targetModuleId!, draggedSlot.dayIdx, draggedSlot.hourIdx);
            if (reverseCheck.conflict) {
                alert(`لا يمكن التبديل: ${reverseCheck.reason}`);
                return;
            }
        }

        // Modify Schedule Array
        // A. Remove Source
        if (sourceSlotIdx !== -1) groupDays[draggedSlot.dayIdx].slots.splice(sourceSlotIdx, 1);
        // B. Remove Target (if exists)
        if (targetSlotIdx !== -1) groupDays[targetDayIdx].slots.splice(targetSlotIdx, 1);

        // C. Add Source to Target Location
        groupDays[targetDayIdx].slots.push({
            time: `${8+targetHourIdx}:00 - ${9+targetHourIdx}:00`,
            moduleId: sourceModuleId,
            duration: 1
        });

        // D. Add Target to Source Location (Swap)
        if (targetModuleId !== null) {
            groupDays[draggedSlot.dayIdx].slots.push({
                time: `${8+draggedSlot.hourIdx}:00 - ${9+draggedSlot.hourIdx}:00`,
                moduleId: targetModuleId,
                duration: 1
            });
        }

        // Modify Assignments Array (Critical for global consistency)
        let newAssignments = assignments.filter(a => 
            // Remove old assignments for this group at these times
            !(a.groupId === selectedGroupGlobalId && a.dayIndex === draggedSlot.dayIdx && a.hourIndex === draggedSlot.hourIdx) &&
            !(a.groupId === selectedGroupGlobalId && a.dayIndex === targetDayIdx && a.hourIndex === targetHourIdx)
        );

        // Add new assignment for Moved Module
        const tKeySource = getTrainerKey(selectedGroupGlobalId, sourceModuleId);
        if (tKeySource) {
            newAssignments.push({
                moduleId: sourceModuleId,
                trainerKey: tKeySource,
                groupId: selectedGroupGlobalId,
                dayIndex: targetDayIdx,
                hourIndex: targetHourIdx
            });
        }

        // Add new assignment for Swapped Module
        if (targetModuleId !== null) {
            const tKeyTarget = getTrainerKey(selectedGroupGlobalId, targetModuleId!);
            if (tKeyTarget) {
                newAssignments.push({
                    moduleId: targetModuleId!,
                    trainerKey: tKeyTarget,
                    groupId: selectedGroupGlobalId,
                    dayIndex: draggedSlot.dayIdx,
                    hourIndex: draggedSlot.hourIdx
                });
            }
        }

        // Save State & LocalStorage
        setSchedule(newSchedule);
        setAssignments(newAssignments);
        localStorage.setItem('takwin_schedule', JSON.stringify(newSchedule));
        localStorage.setItem('takwin_assignments', JSON.stringify(newAssignments));
        
        setDraggedSlot(null);
    };

    const getAllGroups = () => {
        const groups: {id: string, label: string}[] = [];
        specialties.forEach(s => {
            for(let i=1; i<=s.groups; i++) {
                groups.push({ id: `${s.id}-${i}`, label: `${s.name} - فوج ${i}` });
            }
        });
        return groups;
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <ArrowRightLeft className="text-amber-400" />
                            التعديل اليدوي للتوزيع (السحب والإفلات)
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            اسحب الحصص لتغيير مكانها. النظام سينبهك فوراً في حال وجود تعارض مع جدول الأستاذ.
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">الدورة</label>
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                {SESSIONS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSessionId(s.id)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${selectedSessionId === s.id ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">الفوج المراد تعديله</label>
                            <select 
                                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-64 focus:border-amber-500 outline-none"
                                value={selectedGroupGlobalId}
                                onChange={e => setSelectedGroupGlobalId(e.target.value)}
                            >
                                <option value="">-- اختر الفوج --</option>
                                {getAllGroups().map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* FEEDBACK TOAST */}
                {dropFeedback && (
                    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 animate-bounce ${
                        dropFeedback.status === 'forbidden' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                        {dropFeedback.status === 'forbidden' ? <AlertTriangle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
                        {dropFeedback.message}
                    </div>
                )}

                {/* GRID */}
                {selectedGroupGlobalId && currentGroupSchedule ? (
                    <div className="relative select-none bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <div className="grid grid-cols-6 gap-2 text-center">
                            {/* Header */}
                            <div className="bg-slate-800 p-3 rounded-lg font-bold text-slate-400 border border-slate-700">اليوم / التوقيت</div>
                            {[0,1,2,3,4].map(h => (
                                <div key={h} className="bg-slate-800 p-3 rounded-lg font-bold text-slate-300 border border-slate-700">
                                    {8+h}:00 - {9+h}:00
                                </div>
                            ))}

                            {/* Body */}
                            {workingDays.map((day, dIdx) => (
                                <React.Fragment key={dIdx}>
                                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-700 font-bold text-white flex items-center justify-center text-sm">
                                        {formatDate(day.toISOString())}
                                    </div>
                                    {[0,1,2,3,4].map(hIdx => {
                                        const slot = currentGroupSchedule.days[dIdx]?.slots.find(s => parseInt(s.time.split(':')[0]) === (8 + hIdx))
                                            || currentGroupSchedule.days[dIdx]?.slots.find(s => parseInt(s.time.split(':')[0]) === (8 + hIdx - 1) && s.duration === 2);
                                        
                                        const isOccupied = !!slot?.moduleId;
                                        // Only highlight drop zones if dragging
                                        const isTarget = draggedSlot && (draggedSlot.dayIdx !== dIdx || draggedSlot.hourIdx !== hIdx);
                                        
                                        return (
                                            <div 
                                                key={hIdx}
                                                onDragOver={(e) => isTarget && handleDragOver(e, dIdx, hIdx)}
                                                onDrop={(e) => isTarget && handleDrop(e, dIdx, hIdx)}
                                                className={`relative p-2 rounded-xl border-2 transition-all duration-200 h-24 flex flex-col items-center justify-center gap-1
                                                    ${isTarget ? 'border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' : 'border-slate-800 bg-slate-900/50'}
                                                    ${isOccupied ? 'cursor-grab active:cursor-grabbing hover:border-blue-500/50' : ''}
                                                `}
                                                draggable={isOccupied}
                                                onDragStart={(e) => isOccupied && handleDragStart(e, dIdx, hIdx, slot!.moduleId!, slot!.duration)}
                                                onDragEnd={() => { setDraggedSlot(null); setDropFeedback(null); }}
                                            >
                                                {isOccupied ? (
                                                    <>
                                                        <div className={`text-xs font-bold px-2 py-1 rounded w-full text-center truncate ${
                                                            slot!.moduleId === 999 ? 'bg-amber-900/40 text-amber-200' : 'bg-blue-900/40 text-blue-200'
                                                        }`}>
                                                            {getModuleName(slot!.moduleId)}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                            <GripVertical className="w-3 h-3 opacity-50" />
                                                            {/* Short Trainer Info if needed */}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-700 text-xs font-mono">--</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 gap-4">
                        <ArrowRightLeft className="w-12 h-12 opacity-20" />
                        <p>يرجى اختيار الفوج من القائمة أعلاه للبدء في عملية التعديل</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableEditor;
