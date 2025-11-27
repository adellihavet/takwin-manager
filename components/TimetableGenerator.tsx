
import React, { useState, useEffect, useRef } from 'react';
import { SESSIONS, SPECIALTIES as DEFAULT_SPECIALTIES, MODULES, CORRECTED_DISTRIBUTION } from '../constants';
import { getWorkingDays, formatDate } from '../utils';
import { Specialty, GroupSchedule, TrainerConfig, TrainerAssignment, Module } from '../types';
import { RefreshCw, ArrowRightLeft, GraduationCap, Users, CheckCircle2, AlertCircle, Printer, FileText } from 'lucide-react';

const TimetableGenerator: React.FC = () => {
  // State
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
  const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
  const [viewSpecialtyId, setViewSpecialtyId] = useState<string>('pe'); 
  const [viewModuleId, setViewModuleId] = useState<number>(1);
  
  // Data State (Persistent)
  const [schedule, setSchedule] = useState<GroupSchedule[]>([]);
  // We now store ALL static assignments here
  const [trainerAssignments, setTrainerAssignments] = useState<TrainerAssignment[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Printing State
  const [printMode, setPrintMode] = useState<'none' | 'group' | 'trainer'>('none');
  const [printTarget, setPrintTarget] = useState<string>(''); // GroupId or TrainerKey
  
  // Stats
  const [generationStats, setGenerationStats] = useState<{moduleId: number, required: number, scheduled: number}[]>([]);

  // Special ID for the auto-generated revision module
  const REVISION_MOD_ID = 999;

  useEffect(() => {
    // Load Specialties & Trainers
    const savedData = localStorage.getItem('takwin_specialties_db');
    if (savedData) {
      try { setSpecialties(JSON.parse(savedData)); } catch (e) { console.error(e); }
    }
    
    const savedTrainers = localStorage.getItem('takwin_trainers_db');
    if (savedTrainers) {
        try { setTrainerConfig(JSON.parse(savedTrainers)); } catch (e) { console.error(e); }
    }

    // Load Persistent Schedule
    const savedSchedule = localStorage.getItem('takwin_schedule');
    if (savedSchedule) {
        try { setSchedule(JSON.parse(savedSchedule)); } catch(e) {}
    }

    const savedAssignments = localStorage.getItem('takwin_assignments');
    if (savedAssignments) {
        try { setTrainerAssignments(JSON.parse(savedAssignments)); } catch(e) {}
    }
  }, []);

  // Update Stats whenever schedule changes
  useEffect(() => {
     if (schedule.length > 0) {
        const moduleRequirements: Record<number, number> = {};
        CORRECTED_DISTRIBUTION.forEach(d => {
           moduleRequirements[d.moduleId] = selectedSessionId === 1 ? d.s1 : selectedSessionId === 2 ? d.s2 : d.s3;
        });

        // Add Revision Requirement logic for Stats
        const currentSession = SESSIONS.find(s => s.id === selectedSessionId);
        if (currentSession) {
            const days = Math.max(getWorkingDays(currentSession.startDate, currentSession.endDate).length, currentSession.daysCount);
            const totalCap = days * 5;
            let totalReq = 0;
            MODULES.forEach(m => totalReq += moduleRequirements[m.id] || 0);
            if (totalCap > totalReq) {
                moduleRequirements[REVISION_MOD_ID] = totalCap - totalReq;
            }
        }

        const stats = [...MODULES, { id: REVISION_MOD_ID, title: 'أعمال تطبيقية / مراجعة', shortTitle: 'مراجعة', totalHours: 0 }].map(m => {
            const req = moduleRequirements[m.id] || 0;
            if (req === 0 && m.id !== REVISION_MOD_ID) return { moduleId: m.id, required: 0, scheduled: 0 };
            if (req === 0 && m.id === REVISION_MOD_ID) return null; // Skip if no revision needed

            let totalScheduled = 0;
            let groupCount = 0;
            schedule.forEach(g => {
                groupCount++;
                let hours = 0;
                g.days.forEach(d => d.slots.forEach(s => {
                    if (s.moduleId === m.id) hours += s.duration;
                }));
                totalScheduled += hours;
            });
            const avg = groupCount > 0 ? Math.round(totalScheduled / groupCount) : 0;
            return { moduleId: m.id, required: req, scheduled: avg };
        }).filter(Boolean) as {moduleId: number, required: number, scheduled: number}[];

        setGenerationStats(stats);
     }
  }, [schedule, selectedSessionId]);

  const currentSession = SESSIONS.find(s => s.id === selectedSessionId) || SESSIONS[0];
  const workingDays = getWorkingDays(currentSession.startDate, currentSession.endDate);

  const generateGlobalSchedule = async () => {
    setIsGenerating(true);
    // Give UI time to update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        let bestSchedule: GroupSchedule[] = [];
        let bestAssignments: TrainerAssignment[] = [];
        
        // --- PREPARATION ---
        let allGroups: { globalId: string, specialtyId: string, localId: number }[] = [];
        specialties.forEach(spec => {
          for (let i = 1; i <= spec.groups; i++) {
            allGroups.push({
              globalId: `${spec.id}-${i}`,
              specialtyId: spec.id,
              localId: i,
            });
          }
        });

        const moduleRequirements: Record<number, number> = {};
        let totalCurriculumHours = 0;
        CORRECTED_DISTRIBUTION.forEach(d => {
           const hours = selectedSessionId === 1 ? d.s1 : selectedSessionId === 2 ? d.s2 : d.s3;
           moduleRequirements[d.moduleId] = hours;
           totalCurriculumHours += hours;
        });

        // --- STEP 1: CAPACITY CHECK & SURPLUS CALCULATION ---
        
        // Use the MAX of calculated days vs Official days count
        const daysCount = Math.max(workingDays.length, currentSession.daysCount);
        const sessionTotalHours = daysCount * 5;
        
        // Calculate Surplus (Gap between available time and curriculum)
        // If Session 3 (90h available vs 85h curriculum), surplus is 5h
        const surplusHours = Math.max(0, sessionTotalHours - totalCurriculumHours);
        
        if (surplusHours > 0) {
            // Add the "Revision" module to requirements
            moduleRequirements[REVISION_MOD_ID] = surplusHours;
        }

        const capacityErrors: string[] = [];

        // Capacity Check
        MODULES.forEach(m => {
            const hoursNeededPerGroup = moduleRequirements[m.id];
            if (hoursNeededPerGroup === 0) return;

            if (m.id === 1) {
                // Per Specialty
                specialties.forEach(spec => {
                    const count = trainerConfig[1]?.specialtyCounts?.[spec.id] || 1; // Number of trainers
                    const groupsInSpec = spec.groups;
                    
                    const loadPerTrainer = Math.ceil(groupsInSpec / count) * hoursNeededPerGroup;
                    
                    if (loadPerTrainer > sessionTotalHours) {
                        const tName = `أستاذ ${spec.name}`;
                        capacityErrors.push(
                            `- تخصص ${spec.name}: ${groupsInSpec} أفواج تتطلب ${groupsInSpec * hoursNeededPerGroup} ساعة. ` +
                            `لديك ${count} أساتذة فقط. العبء على الواحد: ${loadPerTrainer} ساعة (المتاح نظرياً: ${sessionTotalHours}). ` +
                            `\n >> الحل: يجب زيادة عدد أساتذة ${spec.name} إلى ${Math.ceil((groupsInSpec * hoursNeededPerGroup) / sessionTotalHours)} على الأقل.`
                        );
                    }
                });
            } else {
                // General Modules
                const count = trainerConfig[m.id]?.generalCount || 1; 
                const totalGroups = allGroups.length;
                
                const loadPerTrainer = Math.ceil(totalGroups / count) * hoursNeededPerGroup;
                
                if (loadPerTrainer > sessionTotalHours) {
                    capacityErrors.push(
                        `- مقياس ${m.shortTitle}: ${totalGroups} فوج كلي يتطلب ${totalGroups * hoursNeededPerGroup} ساعة إجمالية. ` +
                        `لديك ${count} مكونين فقط. العبء على الواحد: ${loadPerTrainer} ساعة (المتاح نظرياً: ${sessionTotalHours}). ` +
                        `\n >> الحل: يجب زيادة عدد المكونين إلى ${Math.ceil((totalGroups * hoursNeededPerGroup) / sessionTotalHours)} على الأقل.`
                    );
                }
            }
        });

        if (capacityErrors.length > 0) {
            alert("خطأ: عدد الأساتذة غير كافٍ لتغطية الحجم الساعي لهذه الدورة (استحالة رياضية)!\n\n" + capacityErrors.join("\n\n"));
            setIsGenerating(false);
            return;
        }

        // --- GENERATION LOOP ---

        const MAX_RETRIES = 50; 
        const bottleneckStats: Record<string, number> = {}; 

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            
            // 1. Setup Data
            const currentGroupSchedules: Record<string, GroupSchedule> = {};
            allGroups.forEach(g => {
                currentGroupSchedules[g.globalId] = { 
                    groupId: g.localId, 
                    specialtyId: g.specialtyId, 
                    days: [] 
                };
            });
            
            const remainingHours: Record<string, Record<number, number>> = {};
            allGroups.forEach(g => {
                remainingHours[g.globalId] = { ...moduleRequirements };
            });

            // 2. Assign Trainers (Static Binding)
            const assignmentsMap: Record<string, Record<number, string>> = {};
            allGroups.forEach(g => assignmentsMap[g.globalId] = {});

            const getTrainerKeys = (modId: number, specId: string) => {
                if (modId === REVISION_MOD_ID) return ["SUPERVISOR"]; // Placeholder for revision

                const keys: string[] = [];
                if (modId === 1) {
                    const count = trainerConfig[1]?.specialtyCounts?.[specId] || 1;
                    for(let i=1; i<=count; i++) keys.push(`${specId}-${i}`);
                } else {
                    const count = trainerConfig[modId]?.generalCount || 1;
                    for(let i=1; i<=count; i++) keys.push(i.toString());
                }
                return keys;
            };

            // Distribute groups to trainers
            const availableModules: Module[] = [...MODULES];
            if (surplusHours > 0) availableModules.push({ id: REVISION_MOD_ID, title: 'Rev', shortTitle: 'Rev', totalHours: 0 });

            availableModules.forEach(m => {
                if (m.id === REVISION_MOD_ID) {
                    // For Revision, assign a unique key per group so it never conflicts
                    allGroups.forEach(g => {
                        assignmentsMap[g.globalId][m.id] = `SUP-${g.globalId}`;
                    });
                } else if (m.id === 1) {
                    specialties.forEach(spec => {
                        const trainers = getTrainerKeys(1, spec.id);
                        const specGroups = allGroups.filter(g => g.specialtyId === spec.id);
                        specGroups.forEach((g, idx) => {
                            const offset = attempt; 
                            assignmentsMap[g.globalId][m.id] = trainers[(idx + offset) % trainers.length];
                        });
                    });
                } else {
                    const trainers = getTrainerKeys(m.id, '');
                    allGroups.forEach((g, idx) => {
                        const offset = attempt;
                        assignmentsMap[g.globalId][m.id] = trainers[(idx + offset) % trainers.length];
                    });
                }
            });

            // 3. Fill Days
            let attemptFailed = false;
            const currentAssignmentsList: TrainerAssignment[] = [];

            // We iterate up to daysCount to ensure we fill even if workingDays < daysCount (e.g. hypothetical days)
            // But we can only map to available workingDays dates.
            // If workingDays < daysCount (e.g. holidays), we might have an issue displaying dates.
            // Assuming workingDays covers the period correctly.
            
            for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
                // Initialize Day Slots
                allGroups.forEach(g => {
                    currentGroupSchedules[g.globalId].days.push({ 
                        date: workingDays[dayIdx].toISOString(), 
                        slots: [] 
                    });
                });

                // Try to fill this day perfectly (5 slots)
                let daySuccess = false;
                
                for (let dayRetry = 0; dayRetry < 20; dayRetry++) {
                    const dayBackupHours = JSON.parse(JSON.stringify(remainingHours));
                    const dayBackupSlots: Record<string, any[]> = {};
                    allGroups.forEach(g => {
                        dayBackupSlots[g.globalId] = [...currentGroupSchedules[g.globalId].days[dayIdx].slots];
                        currentGroupSchedules[g.globalId].days[dayIdx].slots = [];
                    });
                    const dayBackupAssignments = [...currentAssignmentsList];

                    const dayAssignments: TrainerAssignment[] = [];
                    let dayPartialFail = false;
                    
                    const dailyModuleUsage: Record<string, Record<number, number>> = {};
                    allGroups.forEach(g => dailyModuleUsage[g.globalId] = {});

                    for (let h = 0; h < 5; h++) {
                        const busyTrainers = new Set<string>();
                        const shuffledGroups = [...allGroups].sort(() => Math.random() - 0.5);

                        for (const g of shuffledGroups) {
                            const gId = g.globalId;
                            
                            const candidates = availableModules.filter(m => {
                                // 1. Must have hours remaining
                                if ((remainingHours[gId][m.id] || 0) <= 0) return false;
                                
                                // 2. Trainer must be free
                                const trainer = assignmentsMap[gId][m.id];
                                const key = `${m.id}-${trainer}`;
                                if (busyTrainers.has(key)) return false;

                                // 3. CONSTRAINT: Max 2 hours per day
                                const usedToday = dailyModuleUsage[gId][m.id] || 0;
                                if (usedToday >= 2) return false;

                                return true;
                            });

                            if (candidates.length === 0) {
                                dayPartialFail = true;
                                break; 
                            }

                            candidates.sort((a, b) => (remainingHours[gId][b.id]||0) - (remainingHours[gId][a.id]||0));
                            
                            const pickIndex = candidates.length > 1 && Math.random() > 0.7 ? 1 : 0;
                            const m = candidates[pickIndex] || candidates[0];

                            const duration = 1; 

                            remainingHours[gId][m.id] -= duration;
                            dailyModuleUsage[gId][m.id] = (dailyModuleUsage[gId][m.id] || 0) + duration;

                            const trainer = assignmentsMap[gId][m.id];
                            const tKey = `${m.id}-${trainer}`;
                            busyTrainers.add(tKey);
                            
                            const timeLabel = `${8+h}:00 - ${9+h}:00`;
                            
                            currentGroupSchedules[gId].days[dayIdx].slots.push({
                                time: timeLabel,
                                moduleId: m.id,
                                duration: duration
                            });
                            
                            dayAssignments.push({
                                moduleId: m.id,
                                trainerKey: trainer,
                                groupId: gId,
                                dayIndex: dayIdx,
                                hourIndex: h
                            });
                        }
                        if (dayPartialFail) break;
                    }

                    if (!dayPartialFail) {
                        daySuccess = true;
                        currentAssignmentsList.push(...dayAssignments);
                        break; 
                    } else {
                        allGroups.forEach(g => {
                            remainingHours[g.globalId] = dayBackupHours[g.globalId];
                        });
                    }
                }

                if (!daySuccess) {
                    attemptFailed = true;
                    allGroups.forEach(g => {
                        availableModules.forEach(m => {
                            if ((remainingHours[g.globalId][m.id] || 0) > 0) {
                                bottleneckStats[m.id] = (bottleneckStats[m.id] || 0) + 1;
                            }
                        });
                    });
                    break; 
                }
            }

            if (!attemptFailed) {
                bestSchedule = Object.values(currentGroupSchedules);
                bestAssignments = currentAssignmentsList;
                break; 
            }
        }

        if (bestSchedule.length === 0) {
             const sortedBottlenecks = Object.entries(bottleneckStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([id]) => getModuleName(parseInt(id)));

             let msg = "تعذر توليد جدول مثالي 100% بالقيود الحالية.\n";
             msg += "الجدول مزدحم جداً. يرجى محاولة زيادة عدد الأساتذة في المقاييس التالية:\n\n";
             sortedBottlenecks.forEach(name => msg += `- ${name}\n`);
             
             alert(msg);
             setIsGenerating(false);
             return;
        }

        // --- 4. FINALIZE ---
        setSchedule(bestSchedule);
        setTrainerAssignments(bestAssignments);

        localStorage.setItem('takwin_schedule', JSON.stringify(bestSchedule));
        localStorage.setItem('takwin_assignments', JSON.stringify(bestAssignments));

    } catch (err) {
        console.error("Gen Error", err);
        alert("حدث خطأ غير متوقع.");
    } finally {
        setIsGenerating(false);
    }
  };

  const getModuleName = (id: number | null, short = false) => {
    if (id === null) return "فراغ";
    if (id === 999) return "أعمال تطبيقية / مراجعة";
    const m = MODULES.find(m => m.id === id);
    return short ? (m?.shortTitle || m?.title) : (m?.title || "Unknown");
  };

  const getTrainerNameForSlot = (dayIdx: number, hourIdx: number, groupId: number, specialtyId: string, moduleId: number) => {
      if (moduleId === 999) return "مؤطر / مشرف";

      const assignment = trainerAssignments.find(a => 
          a.dayIndex === dayIdx && 
          a.hourIndex === hourIdx && 
          a.groupId === `${specialtyId}-${groupId}` && 
          a.moduleId === moduleId
      );

      if (!assignment) return "";
      
      const key = assignment.trainerKey;
      if (moduleId === 1) {
          return trainerConfig[1]?.names?.[key] || `أستاذ ${key.split('-')[1]}`;
      } else {
          return trainerConfig[moduleId]?.names?.[key] || `مكون ${key}`;
      }
  };

  // Helper to generate columns for Trainer View
  const getTrainerColumns = () => {
      const cols: { id: string, label: string }[] = [];
      
      if (viewModuleId === 999) return [{id: 'SUP', label: 'المشرفون'}];

      const count = viewModuleId === 1 
          ? trainerConfig[1]?.specialtyCounts?.[viewSpecialtyId] || 1
          : trainerConfig[viewModuleId]?.generalCount || 1;
      
      for(let i=1; i<=count; i++) {
          const key = viewModuleId === 1 ? `${viewSpecialtyId}-${i}` : i.toString();
          const name = trainerConfig[viewModuleId === 1 ? 1 : viewModuleId]?.names?.[key] 
                       || (viewModuleId === 1 ? `أستاذ ${i}` : `مكون ${i}`);
          cols.push({ id: key, label: name });
      }
      return cols;
  };

  const getAllTrainersList = () => {
      const trainers: { key: string, name: string, moduleId: number }[] = [];
      MODULES.forEach(m => {
          if (m.id === 1) {
             specialties.forEach(s => {
                 const count = trainerConfig[1]?.specialtyCounts?.[s.id] || 1;
                 for(let i=1; i<=count; i++) {
                     const key = `${s.id}-${i}`;
                     const name = trainerConfig[1]?.names?.[key] || `أستاذ ${s.name} ${i}`;
                     trainers.push({ key, name, moduleId: 1 });
                 }
             })
          } else {
              const count = trainerConfig[m.id]?.generalCount || 1;
              for(let i=1; i<=count; i++) {
                  const key = i.toString();
                  const name = trainerConfig[m.id]?.names?.[key] || `مكون ${m.shortTitle} ${i}`;
                  trainers.push({ key, name, moduleId: m.id });
              }
          }
      });
      return trainers;
  };

  const getAllGroupsList = () => {
      const groups: { id: string, name: string }[] = [];
      specialties.forEach(s => {
          for(let i=1; i<=s.groups; i++) {
              groups.push({ id: `${s.id}-${i}`, name: `${s.name} - فوج ${i}` });
          }
      });
      return groups;
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Controls - Hide on Print */}
      <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 print:hidden">
        <div className="flex flex-col gap-6">
             <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-6">
                <div className="w-full md:w-2/3">
                    <label className="block text-slate-400 text-sm font-bold mb-2">1. اختر الدورة الزمنية</label>
                    <div className="flex gap-2">
                        {SESSIONS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSessionId(s.id)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                                    selectedSessionId === s.id 
                                    ? 'bg-dzgreen-600 border-dzgreen-500 text-white shadow-lg' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="w-full md:w-1/3">
                    <button 
                        onClick={generateGlobalSchedule}
                        disabled={isGenerating}
                        className="w-full h-[52px] flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                        {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                        {isGenerating ? 'توليد التوزيع (بدون فراغات)' : 'توليد التوزيع الشامل'}
                    </button>
                </div>
            </div>

            {/* View Controls & Print Mode */}
            {schedule.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Normal Viewing */}
                     <div className="space-y-4">
                         <h4 className="text-white font-bold text-sm border-b border-slate-700 pb-2 flex items-center gap-2">
                             <Users className="w-4 h-4 text-blue-400" />
                             العرض المباشر (للمعاينة)
                         </h4>
                         <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold mb-1">تخصص (الأفواج):</label>
                                <select 
                                    value={viewSpecialtyId} 
                                    onChange={(e) => setViewSpecialtyId(e.target.value)}
                                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
                                >
                                    {specialties.map(spec => (
                                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-slate-400 text-xs font-bold mb-1">مقياس (الأساتذة):</label>
                                <select 
                                    value={viewModuleId} 
                                    onChange={(e) => setViewModuleId(parseInt(e.target.value))}
                                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
                                >
                                    {MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    {/* Add Revision to dropdown if exists in schedule */}
                                    <option value={999}>أعمال تطبيقية / مراجعة</option>
                                </select>
                            </div>
                         </div>
                     </div>

                     {/* Printing Controls */}
                     <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                         <h4 className="text-white font-bold text-sm border-b border-slate-700 pb-2 flex items-center gap-2">
                             <Printer className="w-4 h-4 text-emerald-400" />
                             طباعة الجداول الفردية
                         </h4>
                         <div className="flex gap-4 items-end">
                             <div className="flex-1">
                                 <label className="block text-slate-400 text-xs font-bold mb-1">نوع الجدول:</label>
                                 <select 
                                    value={printMode} 
                                    onChange={(e) => { setPrintMode(e.target.value as any); setPrintTarget(''); }}
                                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
                                 >
                                     <option value="none">اختر...</option>
                                     <option value="group">جدول خاص بفوج</option>
                                     <option value="trainer">جدول خاص بأستاذ</option>
                                 </select>
                             </div>
                             
                             {printMode !== 'none' && (
                                 <div className="flex-[2]">
                                     <label className="block text-slate-400 text-xs font-bold mb-1">
                                         {printMode === 'group' ? 'اختر الفوج:' : 'اختر الأستاذ:'}
                                     </label>
                                     <select 
                                        value={printTarget} 
                                        onChange={(e) => setPrintTarget(e.target.value)}
                                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
                                     >
                                         <option value="">-- حدد --</option>
                                         {printMode === 'group' 
                                            ? getAllGroupsList().map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                                            : getAllTrainersList().map(t => <option key={`${t.moduleId}-${t.key}`} value={`${t.moduleId}-${t.key}`}>{t.name} ({getModuleName(t.moduleId, true)})</option>)
                                         }
                                     </select>
                                 </div>
                             )}
                         </div>
                         {printTarget && (
                             <button 
                                onClick={handlePrint}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2"
                             >
                                 <Printer className="w-4 h-4" />
                                 طباعة هذا الجدول
                             </button>
                         )}
                     </div>
                </div>
            )}
        </div>
      </div>

      {schedule.length > 0 && (
        <>
            {/* PRINT VIEW: Hidden on Screen unless selected, but handled via CSS media print */}
            <div id="print-section" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black overflow-y-auto">
                {printMode === 'group' && printTarget && (() => {
                    const [specId, groupIdStr] = printTarget.split('-');
                    const groupId = parseInt(groupIdStr);
                    const groupSched = schedule.find(g => g.specialtyId === specId && g.groupId === groupId);
                    const groupName = getAllGroupsList().find(g => g.id === printTarget)?.name;

                    if (!groupSched) return <div>No Schedule Found</div>;

                    return (
                        <div className="space-y-4">
                            <div className="text-center border-b-2 border-black pb-4 mb-6">
                                <h1 className="text-2xl font-bold mb-2">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
                                <h2 className="text-xl font-bold">وزارة التربية الوطنية - مديرية التكوين</h2>
                                <h3 className="text-3xl font-black mt-4 border-2 border-black inline-block px-8 py-2 rounded">
                                    التوزيع الزمني: {groupName}
                                </h3>
                                <p className="mt-2 text-lg font-bold">{currentSession.name} ({currentSession.startDate} - {currentSession.endDate})</p>
                            </div>
                            
                            <table className="w-full border-2 border-black text-center text-sm">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 w-32">اليوم / الساعة</th>
                                        <th className="border border-black p-2">08:00 - 09:00</th>
                                        <th className="border border-black p-2">09:00 - 10:00</th>
                                        <th className="border border-black p-2 bg-gray-300 w-8">ر</th>
                                        <th className="border border-black p-2">10:15 - 11:15</th>
                                        <th className="border border-black p-2">11:15 - 12:15</th>
                                        <th className="border border-black p-2">12:15 - 13:15</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupSched.days.map((day, idx) => {
                                        const slots = day.slots;
                                        // Helper to find slot at hour
                                        const getSlot = (h: number) => slots.find(s => parseInt(s.time.split(':')[0]) === h) 
                                                || slots.find(s => parseInt(s.time.split(':')[0]) === h-1 && s.duration === 2);
                                        
                                        return (
                                            <tr key={idx}>
                                                <td className="border border-black p-2 font-bold bg-gray-50">{formatDate(day.date)}</td>
                                                {/* 8-9 */}
                                                <td className="border border-black p-2">{(() => {
                                                    const s = getSlot(8);
                                                    if (!s?.moduleId) return '';
                                                    return (
                                                        <div className="text-xs">
                                                            <div className="font-bold">{getModuleName(s.moduleId, true)}</div>
                                                            <div>{getTrainerNameForSlot(idx, 0, groupId, specId, s.moduleId)}</div>
                                                        </div>
                                                    )
                                                })()}</td>
                                                {/* 9-10 */}
                                                <td className="border border-black p-2">{(() => {
                                                    const s = getSlot(9);
                                                    if (!s?.moduleId) return '';
                                                    return (
                                                        <div className="text-xs">
                                                            <div className="font-bold">{getModuleName(s.moduleId, true)}</div>
                                                            <div>{getTrainerNameForSlot(idx, 1, groupId, specId, s.moduleId)}</div>
                                                        </div>
                                                    )
                                                })()}</td>
                                                {/* Break */}
                                                <td className="border border-black bg-gray-300"></td>
                                                {/* 10:15-11:15 (Mapped to index 2) */}
                                                <td className="border border-black p-2">{(() => {
                                                    const s = getSlot(10);
                                                    if (!s?.moduleId) return '';
                                                    return (
                                                        <div className="text-xs">
                                                            <div className="font-bold">{getModuleName(s.moduleId, true)}</div>
                                                            <div>{getTrainerNameForSlot(idx, 2, groupId, specId, s.moduleId)}</div>
                                                        </div>
                                                    )
                                                })()}</td>
                                                {/* 11:15-12:15 */}
                                                <td className="border border-black p-2">{(() => {
                                                    const s = getSlot(11);
                                                    if (!s?.moduleId) return '';
                                                    return (
                                                        <div className="text-xs">
                                                            <div className="font-bold">{getModuleName(s.moduleId, true)}</div>
                                                            <div>{getTrainerNameForSlot(idx, 3, groupId, specId, s.moduleId)}</div>
                                                        </div>
                                                    )
                                                })()}</td>
                                                {/* 12:15-13:15 */}
                                                <td className="border border-black p-2">{(() => {
                                                    const s = getSlot(12);
                                                    if (!s?.moduleId) return '';
                                                    return (
                                                        <div className="text-xs">
                                                            <div className="font-bold">{getModuleName(s.moduleId, true)}</div>
                                                            <div>{getTrainerNameForSlot(idx, 4, groupId, specId, s.moduleId)}</div>
                                                        </div>
                                                    )
                                                })()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="mt-8 flex justify-between text-sm font-bold px-12">
                                <div></div>
                                <div>إمضاء المدير البيداغوجي</div>
                            </div>
                        </div>
                    );
                })()}

                {printMode === 'trainer' && printTarget && (() => {
                    // FIX: Parse hyphenated keys correctly
                    const splitIdx = printTarget.indexOf('-');
                    const modIdStr = printTarget.substring(0, splitIdx);
                    const trainerKey = printTarget.substring(splitIdx + 1);
                    const moduleId = parseInt(modIdStr);
                    
                    const trainerName = getAllTrainersList().find(t => t.moduleId === moduleId && t.key === trainerKey)?.name;
                    
                    // Filter assignments from assignment state
                    const myAssignments = trainerAssignments.filter(a => a.moduleId === moduleId && a.trainerKey === trainerKey);

                    return (
                        <div className="space-y-4">
                            <div className="text-center border-b-2 border-black pb-4 mb-6">
                                <h1 className="text-2xl font-bold mb-2">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
                                <h2 className="text-xl font-bold">وزارة التربية الوطنية - مديرية التكوين</h2>
                                <h3 className="text-3xl font-black mt-4 border-2 border-black inline-block px-8 py-2 rounded">
                                    جدول توقيت الأستاذ: {trainerName}
                                </h3>
                                <p className="mt-2 text-lg font-bold">المقياس: {getModuleName(moduleId)}</p>
                                <p className="text-md font-medium">{currentSession.name}</p>
                            </div>
                            
                            <table className="w-full border-2 border-black text-center text-sm">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 w-32">اليوم / الساعة</th>
                                        <th className="border border-black p-2">08:00 - 09:00</th>
                                        <th className="border border-black p-2">09:00 - 10:00</th>
                                        <th className="border border-black p-2 bg-gray-300 w-8">ر</th>
                                        <th className="border border-black p-2">10:15 - 11:15</th>
                                        <th className="border border-black p-2">11:15 - 12:15</th>
                                        <th className="border border-black p-2">12:15 - 13:15</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workingDays.map((day, dIdx) => {
                                        const getCell = (hIdx: number) => {
                                            const assign = myAssignments.find(a => a.dayIndex === dIdx && a.hourIndex === hIdx);
                                            if (!assign) return '';
                                            const [specId, gLocalId] = assign.groupId.split('-');
                                            const specName = specialties.find(s => s.id === specId)?.name;
                                            return (
                                                <div className="text-xs font-bold">
                                                    <div>{specName}</div>
                                                    <div>فوج {gLocalId}</div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <tr key={dIdx}>
                                                <td className="border border-black p-2 font-bold bg-gray-50">{formatDate(day.toISOString())}</td>
                                                <td className="border border-black p-2">{getCell(0)}</td>
                                                <td className="border border-black p-2">{getCell(1)}</td>
                                                <td className="border border-black bg-gray-300"></td>
                                                <td className="border border-black p-2">{getCell(2)}</td>
                                                <td className="border border-black p-2">{getCell(3)}</td>
                                                <td className="border border-black p-2">{getCell(4)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            <div className="mt-8 flex justify-between text-sm font-bold px-12">
                                <div></div>
                                <div>إمضاء المدير البيداغوجي</div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* SCREEN VIEW (Original) - Hidden on Print */}
            <div className="space-y-12 animate-fadeIn print:hidden">
                
                {/* 1. GROUPS SCHEDULE */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                        <Users className="w-6 h-6 text-blue-400" />
                        <h3 className="text-xl font-bold text-white">
                            جدول التوقيت - أفواج تخصص: <span className="text-blue-400">{specialties.find(s=>s.id === viewSpecialtyId)?.name}</span>
                        </h3>
                    </div>

                    {schedule[0].days.map((day, dayIndex) => (
                        <div key={dayIndex} className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
                            <div className="p-3 bg-blue-900/10 border-b border-slate-800">
                                <h3 className="font-bold text-white text-sm">{formatDate(day.date)}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="bg-slate-800/30 text-slate-400">
                                            <th className="py-2 px-4 w-32">التوقيت</th>
                                            {specialties.find(s => s.id === viewSpecialtyId)?.groups && Array.from({length: specialties.find(s => s.id === viewSpecialtyId)!.groups}).map((_, i) => (
                                                <th key={i} className="py-2 px-4 text-center border-l border-slate-700 text-slate-200">
                                                    فوج {i + 1}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[0,1,2,3,4].map(h => {
                                            const hourStart = 8 + h;
                                            return (
                                                <tr key={h} className="border-t border-slate-800">
                                                    <td className="py-2 px-4 font-mono text-slate-500">{hourStart}:00 - {hourStart+1}:00</td>
                                                    {specialties.find(s => s.id === viewSpecialtyId)?.groups && Array.from({length: specialties.find(s => s.id === viewSpecialtyId)!.groups}).map((_, i) => {
                                                        const groupSchedule = schedule.find(g => g.specialtyId === viewSpecialtyId && g.groupId === i + 1);
                                                        const slot = groupSchedule?.days[dayIndex].slots.find(s => parseInt(s.time.split(':')[0]) === hourStart)
                                                                    || groupSchedule?.days[dayIndex].slots.find(s => parseInt(s.time.split(':')[0]) === hourStart - 1 && s.duration === 2);
                                                        
                                                        const trainerName = slot?.moduleId ? getTrainerNameForSlot(dayIndex, h, i+1, viewSpecialtyId, slot.moduleId) : '';

                                                        return (
                                                            <td key={i} className="py-2 px-2 border-l border-slate-700 text-center">
                                                                {slot?.moduleId ? (
                                                                    <div className={`border border-slate-600 rounded px-2 py-1.5 flex flex-col gap-1 ${slot.moduleId === 999 ? 'bg-amber-900/30' : 'bg-slate-800'}`}>
                                                                        <span className="font-bold text-white text-xs">{getModuleName(slot.moduleId)}</span>
                                                                        <span className="text-[10px] text-slate-400 bg-slate-900/50 rounded px-1 py-0.5">{trainerName}</span>
                                                                    </div>
                                                                ) : <span className="text-slate-700">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. TRAINERS SCHEDULE */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2 mt-12">
                        <GraduationCap className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-bold text-white">
                            توزيع الأساتذة للمقياس: <span className="text-purple-400">{getModuleName(viewModuleId)}</span>
                        </h3>
                    </div>

                    {schedule[0].days.map((day, dayIndex) => (
                        <div key={dayIndex} className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
                            <div className="p-3 bg-purple-900/10 border-b border-slate-800">
                                <h3 className="font-bold text-white text-sm">{formatDate(day.date)}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="bg-slate-800/30 text-slate-400">
                                            <th className="py-2 px-4 w-32">التوقيت</th>
                                            {getTrainerColumns().map(col => (
                                                <th key={col.id} className="py-2 px-4 text-center border-l border-slate-700 text-slate-200">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[0,1,2,3,4].map(h => {
                                            const hourStart = 8 + h;
                                            return (
                                                <tr key={h} className="border-t border-slate-800">
                                                    <td className="py-2 px-4 font-mono text-slate-500">{hourStart}:00</td>
                                                    {getTrainerColumns().map(col => {
                                                        const assignment = trainerAssignments.find(a => 
                                                            a.moduleId === viewModuleId &&
                                                            a.dayIndex === dayIndex &&
                                                            a.hourIndex === h &&
                                                            a.trainerKey === col.id
                                                        );
                                                        
                                                        // Handle Supervisor for revision (dummy display)
                                                        if (viewModuleId === 999 && !assignment) {
                                                            const supAssign = trainerAssignments.find(a => a.moduleId === 999 && a.dayIndex === dayIndex && a.hourIndex === h);
                                                            if (supAssign) {
                                                                return (
                                                                    <td key={col.id} className="py-2 px-2 border-l border-slate-700 text-center">
                                                                        <div className="bg-amber-900/30 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200">
                                                                            مشرف عام
                                                                        </div>
                                                                    </td>
                                                                )
                                                            }
                                                        }

                                                        if (!assignment) return <td key={col.id} className="border-l border-slate-700"></td>;
                                                        
                                                        const parts = assignment.groupId.split('-');
                                                        const specName = specialties.find(s=>s.id === parts[0])?.name;
                                                        return (
                                                            <td key={col.id} className="py-2 px-2 border-l border-slate-700 text-center">
                                                                <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-purple-200">
                                                                    {specName} - ف {parts[1]}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. VALIDATION STATS */}
                <div className="bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800 p-5 mt-8">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" />
                        التحقق من الحجم الساعي الموزع (Validation)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="bg-slate-800 text-slate-400">
                                    <th className="p-3 rounded-tr-lg">المقياس</th>
                                    <th className="p-3 text-center">المطلوب (سا)</th>
                                    <th className="p-3 text-center">المبرمج (سا)</th>
                                    <th className="p-3 text-center rounded-tl-lg">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {generationStats.length > 0 ? generationStats.map(stat => (
                                    <tr key={stat.moduleId} className="hover:bg-slate-800/50">
                                        <td className="p-3 font-medium text-slate-200">{getModuleName(stat.moduleId)}</td>
                                        <td className="p-3 text-center text-slate-400">{stat.required}</td>
                                        <td className="p-3 text-center font-bold text-white">{stat.scheduled}</td>
                                        <td className="p-3 text-center">
                                            {stat.scheduled === stat.required ? (
                                                <span className="text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-full">مكتمل</span>
                                            ) : (
                                                <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-500/10 rounded-full flex items-center justify-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {stat.scheduled < stat.required ? `ناقص ${stat.required - stat.scheduled}` : `زائد ${stat.scheduled - stat.required}`}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                                            يرجى توليد التوزيع الزمني أولاً لعرض الإحصائيات
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default TimetableGenerator;
