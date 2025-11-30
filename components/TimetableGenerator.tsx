
import React, { useState, useEffect, useRef } from 'react';
import { SESSIONS, SPECIALTIES as DEFAULT_SPECIALTIES, MODULES, CORRECTED_DISTRIBUTION } from '../constants';
import { getWorkingDays, formatDate } from '../utils';
import { Specialty, GroupSchedule, TrainerConfig, TrainerAssignment, Module, InstitutionConfig } from '../types';
import { RefreshCw, ArrowRightLeft, GraduationCap, Users, CheckCircle2, AlertCircle, Printer, FileText, BarChart3, ShieldCheck, XCircle } from 'lucide-react';

const TimetableGenerator: React.FC = () => {
  // State
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
  const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
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
    // Load Specialties & Trainers & Institution
    const savedData = localStorage.getItem('takwin_specialties_db');
    if (savedData) {
      try { setSpecialties(JSON.parse(savedData)); } catch (e) { console.error(e); }
    }
    
    const savedTrainers = localStorage.getItem('takwin_trainers_db');
    if (savedTrainers) {
        try { setTrainerConfig(JSON.parse(savedTrainers)); } catch (e) { console.error(e); }
    }

    const savedInst = localStorage.getItem('takwin_institution_db');
    if (savedInst) {
        try { setInstitution(JSON.parse(savedInst)); } catch (e) { console.error(e); }
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
           let hours = selectedSessionId === 1 ? d.s1 : selectedSessionId === 2 ? d.s2 : d.s3;
           if (selectedSessionId === 3) hours = Math.max(0, hours - 2);
           moduleRequirements[d.moduleId] = hours;
        });

        const currentSession = SESSIONS.find(s => s.id === selectedSessionId);
        const sessionStart = currentSession ? new Date(currentSession.startDate) : new Date();
        const sessionEnd = currentSession ? new Date(currentSession.endDate) : new Date();
        sessionStart.setHours(0,0,0,0);
        sessionEnd.setHours(23,59,59,999);

        const stats = [...MODULES, { id: REVISION_MOD_ID, title: 'أعمال تطبيقية / مراجعة', shortTitle: 'مراجعة', totalHours: 0 }].map(m => {
            const req = moduleRequirements[m.id] || 0;
            if (req === 0 && m.id !== REVISION_MOD_ID) return { moduleId: m.id, required: 0, scheduled: 0 };
            if (req === 0 && m.id === REVISION_MOD_ID) return null;

            let totalScheduled = 0;
            let groupCount = 0;
            schedule.forEach(g => {
                groupCount++;
                let hours = 0;
                g.days.forEach(d => {
                    const dDate = new Date(d.date);
                    if (dDate >= sessionStart && dDate <= sessionEnd) {
                        d.slots.forEach(s => {
                            if (s.moduleId === m.id) hours += s.duration;
                        });
                    }
                });
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
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        let bestSchedule: GroupSchedule[] = [];
        let bestAssignments: TrainerAssignment[] = [];
        let bestFailureReason = "";
        
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
           let hours = selectedSessionId === 1 ? d.s1 : selectedSessionId === 2 ? d.s2 : d.s3;
           if (selectedSessionId === 3) hours = Math.max(0, hours - 2); 
           moduleRequirements[d.moduleId] = hours;
           totalCurriculumHours += hours;
        });

        let sessionTotalHours = 0;
        if (selectedSessionId === 3) {
            sessionTotalHours = 65; 
        } else {
            const daysCount = Math.max(workingDays.length, currentSession.daysCount);
            sessionTotalHours = daysCount * 5;
        }

        const surplusHours = Math.max(0, sessionTotalHours - totalCurriculumHours);
        if (surplusHours > 0) moduleRequirements[REVISION_MOD_ID] = surplusHours;

        // --- INSTRUCTOR PERSISTENCE MAP ---
        const persistenceMap = new Map<string, string>();
        trainerAssignments.forEach(assign => {
            if (assign.sessionId !== selectedSessionId) {
                const uniqueKey = `${assign.groupId}-${assign.moduleId}`;
                if (!persistenceMap.has(uniqueKey)) {
                    persistenceMap.set(uniqueKey, assign.trainerKey);
                }
            }
        });

        // --- HELPER: GET TRAINER IDENTITY (NAME-BASED) ---
        // This is the core fix. It resolves the Trainer Key to a Real Name.
        // If "Ahmed" is assigned to Mod 1 and Mod 2, this function returns "NAME:Ahmed" for both.
        // This allows checking if "Ahmed" is busy regardless of which module he is teaching.
        const getTrainerIdentity = (modId: number, tKey: string) => {
            if (modId === REVISION_MOD_ID) return `REV-${tKey}`;
            
            // Get Config Context
            const conf = modId === 1 ? trainerConfig[1] : trainerConfig[modId];
            
            // Try to find the name
            const name = conf?.names?.[tKey]?.trim();
            
            // If name is found and valid, use it as the unique identity
            if (name && name.length > 1) return `NAME:${name.toLowerCase()}`;
            
            // Fallback to Abstract Key if no name is provided
            return `ID:${modId}-${tKey}`;
        };

        const MAX_RETRIES = 50; 
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

            const assignmentsMap: Record<string, Record<number, string>> = {};
            allGroups.forEach(g => assignmentsMap[g.globalId] = {});

            const getTrainerKeys = (modId: number, specId: string) => {
                if (modId === REVISION_MOD_ID) return ["SUPERVISOR"];
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

            const availableModules: Module[] = [...MODULES];
            if (surplusHours > 0) availableModules.push({ id: REVISION_MOD_ID, title: 'Rev', shortTitle: 'Rev', totalHours: 0 });

            // --- ASSIGNMENT LOGIC ---
            availableModules.forEach(m => {
                if (m.id === REVISION_MOD_ID) {
                    allGroups.forEach(g => assignmentsMap[g.globalId][m.id] = `SUP-${g.globalId}`);
                } else {
                    if (m.id === 1) {
                        specialties.forEach(spec => {
                            const trainers = getTrainerKeys(1, spec.id);
                            const specGroups = allGroups.filter(g => g.specialtyId === spec.id);
                            
                            specGroups.forEach((g, idx) => {
                                const historyKey = `${g.globalId}-${m.id}`;
                                if (persistenceMap.has(historyKey)) {
                                    assignmentsMap[g.globalId][m.id] = persistenceMap.get(historyKey)!;
                                } else {
                                    const offset = attempt; 
                                    assignmentsMap[g.globalId][m.id] = trainers[(idx + offset) % trainers.length];
                                }
                            });
                        });
                    } else {
                        const trainers = getTrainerKeys(m.id, '');
                        allGroups.forEach((g, idx) => {
                            const historyKey = `${g.globalId}-${m.id}`;
                            if (persistenceMap.has(historyKey)) {
                                assignmentsMap[g.globalId][m.id] = persistenceMap.get(historyKey)!;
                            } else {
                                const offset = attempt;
                                assignmentsMap[g.globalId][m.id] = trainers[(idx + offset) % trainers.length];
                            }
                        });
                    }
                }
            });

            let attemptFailed = false;
            const currentAssignmentsList: TrainerAssignment[] = [];

            for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
                if (selectedSessionId === 3 && dayIdx > 15) continue; 

                allGroups.forEach(g => {
                    currentGroupSchedules[g.globalId].days.push({ 
                        date: workingDays[dayIdx].toISOString(), 
                        slots: [] 
                    });
                });

                let daySuccess = false;
                
                for (let dayRetry = 0; dayRetry < 20; dayRetry++) {
                    const dayBackupHours = JSON.parse(JSON.stringify(remainingHours));
                    const dayBackupSlots: Record<string, any[]> = {};
                    allGroups.forEach(g => {
                        dayBackupSlots[g.globalId] = [...currentGroupSchedules[g.globalId].days[dayIdx].slots];
                        currentGroupSchedules[g.globalId].days[dayIdx].slots = [];
                    });
                    
                    const prevAssignmentsLen = currentAssignmentsList.length;
                    let dayPartialFail = false;
                    const dailyModuleUsage: Record<string, Record<number, number>> = {};
                    allGroups.forEach(g => dailyModuleUsage[g.globalId] = {});

                    for (let h = 0; h < 5; h++) {
                        if (selectedSessionId === 3 && dayIdx > 0 && h >= 4) continue;

                        // IMPORTANT: We use a set of Occupied IDENTITIES (Names) not just IDs
                        const busyIdentities = new Set<string>();
                        
                        const shuffledGroups = [...allGroups].sort(() => Math.random() - 0.5);

                        for (const g of shuffledGroups) {
                            const gId = g.globalId;
                            
                            const candidates = availableModules.filter(m => {
                                // 1. Check Remaining Hours
                                if ((remainingHours[gId][m.id] || 0) <= 0) return false;
                                
                                // 2. Check Trainer Availability (By NAME)
                                const trainerKey = assignmentsMap[gId][m.id];
                                const identity = getTrainerIdentity(m.id, trainerKey);
                                
                                // If "Name:Ahmed" is already busy teaching ANY module, we skip
                                if (busyIdentities.has(identity)) return false;
                                
                                // 3. Check Daily Limit (Max 2 hours per module per day)
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

                            const trainerKey = assignmentsMap[gId][m.id];
                            const identity = getTrainerIdentity(m.id, trainerKey);
                            busyIdentities.add(identity);
                            
                            currentGroupSchedules[gId].days[dayIdx].slots.push({
                                time: `${8+h}:00 - ${9+h}:00`,
                                moduleId: m.id,
                                duration: duration
                            });
                            
                            currentAssignmentsList.push({
                                moduleId: m.id,
                                trainerKey: trainerKey,
                                groupId: gId,
                                dayIndex: dayIdx,
                                hourIndex: h,
                                sessionId: selectedSessionId
                            });
                        }
                        if (dayPartialFail) break;
                    }

                    if (!dayPartialFail) {
                        daySuccess = true;
                        break; 
                    } else {
                        allGroups.forEach(g => {
                            remainingHours[g.globalId] = dayBackupHours[g.globalId];
                            currentGroupSchedules[g.globalId].days[dayIdx].slots = dayBackupSlots[g.globalId];
                        });
                        currentAssignmentsList.splice(prevAssignmentsLen);
                    }
                }

                if (!daySuccess) {
                    attemptFailed = true;
                    const neededModules: Record<number, number> = {};
                    allGroups.forEach(g => {
                        Object.entries(remainingHours[g.globalId]).forEach(([mId, hrs]) => {
                            if (hrs > 0) neededModules[parseInt(mId)] = (neededModules[parseInt(mId)] || 0) + hrs;
                        });
                    });
                    const worstModuleId = Object.keys(neededModules).reduce((a, b) => neededModules[parseInt(a)] > neededModules[parseInt(b)] ? a : b, "1");
                    const modName = getModuleName(parseInt(worstModuleId));
                    bestFailureReason = `تعذر إكمال التوزيع بسبب ضغط التوقيت على الأساتذة (خاصة في مقياس ${modName}). يرجى التحقق من الأسماء المكررة أو زيادة عدد الأساتذة.`;
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
             alert(bestFailureReason || "تعذر توليد جدول مثالي. تأكد من أنك لم تسند مقاييس كثيرة لنفس الأستاذ بشكل يجعل التوزيع مستحيلاً.");
             setIsGenerating(false);
             return;
        }

        // --- MERGE LOGIC ---
        const sessionStart = new Date(currentSession.startDate);
        const sessionEnd = new Date(currentSession.endDate);
        sessionStart.setHours(0,0,0,0);
        sessionEnd.setHours(23,59,59,999);

        let finalSchedule = [...schedule];
        if (finalSchedule.length === 0) {
            finalSchedule = allGroups.map(g => ({ groupId: g.localId, specialtyId: g.specialtyId, days: [] }));
        }

        bestSchedule.forEach(newGroupData => {
            const targetIndex = finalSchedule.findIndex(g => g.specialtyId === newGroupData.specialtyId && g.groupId === newGroupData.groupId);
            if (targetIndex !== -1) {
                const keptDays = finalSchedule[targetIndex].days.filter(d => {
                    const date = new Date(d.date);
                    return date < sessionStart || date > sessionEnd;
                });
                finalSchedule[targetIndex].days = [...keptDays, ...newGroupData.days];
                finalSchedule[targetIndex].days.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            } else {
                finalSchedule.push(newGroupData);
            }
        });

        const retainedAssignments = trainerAssignments.filter(a => a.sessionId !== selectedSessionId);
        const finalAssignments = [...retainedAssignments, ...bestAssignments];

        setSchedule(finalSchedule);
        setTrainerAssignments(finalAssignments);

        localStorage.setItem('takwin_schedule', JSON.stringify(finalSchedule));
        localStorage.setItem('takwin_assignments', JSON.stringify(finalAssignments));
        
        alert(`تم توليد وحفظ توزيع ${currentSession.name} بنجاح!\n(تم مراعاة الأساتذة الذين يدرسون أكثر من مقياس)`);

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
          a.sessionId === selectedSessionId && 
          a.dayIndex === dayIdx && 
          a.hourIndex === hourIdx && 
          a.groupId === `${specialtyId}-${groupId}` && 
          a.moduleId === moduleId
      );
      if (!assignment) return "";
      const key = assignment.trainerKey;
      if (moduleId === 1) return trainerConfig[1]?.names?.[key] || `أستاذ ${key.split('-')[1]}`;
      else return trainerConfig[moduleId]?.names?.[key] || `مكون ${key}`;
  };

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

  const getSessionDaysToRender = () => {
      if (schedule.length === 0) return [];
      const start = new Date(currentSession.startDate);
      const end = new Date(currentSession.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return schedule[0].days.filter(d => {
          const date = new Date(d.date);
          return date >= start && date <= end;
      });
  };

  const visibleDays = getSessionDaysToRender();

  // --- SMART PAGINATION FOR LANDSCAPE GROUP SCHEDULE ---
  // Splits total days evenly into 2 pages to balance content and leave room for footer.
  const getBalancedGroupPages = (fullDays: any[]) => {
      const total = fullDays.length;
      if (total === 0) return [];
      
      // Calculate split point
      const mid = Math.ceil(total / 2);
      
      // Create exactly 2 pages (or 1 if very short, but request implies ensuring multi-page balance)
      const page1 = fullDays.slice(0, mid);
      const page2 = fullDays.slice(mid);
      
      return [page1, page2].filter(p => p.length > 0);
  };

  // --- FILTERED TRAINER SCHEDULE ---
  // Returns only days where the trainer has at least one session.
  const getPrintableTrainerSchedule = () => {
      if (!printTarget) return [];
      
      const parts = printTarget.split('-');
      const mId = parseInt(parts[0]);
      const tKey = parts.slice(1).join('-');

      // Filter days to show only working days for this trainer
      // We map original index first to ensure we can still look up the assignment correctly
      const activeDays = visibleDays.map((day, originalIndex) => ({
          ...day,
          originalIndex // Store the index relative to the session start (0..N)
      })).filter(dayObj => {
          // Check if trainer works on this day (any hour 0-4)
          return [0,1,2,3,4].some(h => {
              return trainerAssignments.some(a => 
                  a.sessionId === selectedSessionId &&
                  a.moduleId === mId &&
                  a.trainerKey === tKey &&
                  a.dayIndex === dayObj.originalIndex &&
                  a.hourIndex === h
              );
          });
      });

      // Return as a single chunk (one page usually fits all active days)
      return [activeDays];
  };

  const getPrintableGroupSchedule = (groupIdGlobal: string) => {
      const [specId, gNum] = groupIdGlobal.split('-');
      const grp = schedule.find(g => g.specialtyId === specId && g.groupId === parseInt(gNum));
      if (!grp) return [];
      
      const sessionStart = new Date(currentSession.startDate);
      const sessionEnd = new Date(currentSession.endDate);
      sessionStart.setHours(0,0,0,0);
      sessionEnd.setHours(23,59,59,999);

      const days = grp.days.filter(d => {
          const date = new Date(d.date);
          return date >= sessionStart && date <= sessionEnd;
      });

      return getBalancedGroupPages(days); 
  };

  // --- VERIFICATION MATRIX RENDERING ---
  const renderVerificationMatrix = () => {
      if (trainerAssignments.length === 0) return null;

      // Group IDs extraction
      const groups: { specId: string, groupNum: number, globalId: string }[] = [];
      specialties.forEach(s => {
          for(let i=1; i<=s.groups; i++) groups.push({ specId: s.id, groupNum: i, globalId: `${s.id}-${i}` });
      });

      return (
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 p-6 mt-12 print:hidden">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">مصفوفة التحقق من ثبات الإسناد</h3>
              </div>
              
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-slate-950 text-slate-300 sticky top-0 z-10">
                          <tr>
                              <th className="p-3">الفوج</th>
                              <th className="p-3">المقياس</th>
                              <th className="p-3 text-center border-l border-slate-800">أستاذ الدورة 1</th>
                              <th className="p-3 text-center border-l border-slate-800">أستاذ الدورة 2</th>
                              <th className="p-3 text-center border-l border-slate-800">أستاذ الدورة 3</th>
                              <th className="p-3 text-center">الحالة</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {groups.map((group) => (
                              <React.Fragment key={group.globalId}>
                                  {MODULES.map((module) => {
                                      // Get trainer for each session
                                      const getT = (sId: number) => {
                                          const a = trainerAssignments.find(ass => ass.sessionId === sId && ass.groupId === group.globalId && ass.moduleId === module.id);
                                          if (!a) return null;
                                          const name = module.id === 1 
                                              ? trainerConfig[1]?.names?.[a.trainerKey] 
                                              : trainerConfig[module.id]?.names?.[a.trainerKey];
                                          return { key: a.trainerKey, name: name || a.trainerKey };
                                      };

                                      const t1 = getT(1);
                                      const t2 = getT(2);
                                      const t3 = getT(3);

                                      // Skip if no assignments at all (unlikely if generated)
                                      if (!t1 && !t2 && !t3) return null;

                                      // Check consistency
                                      let status: 'ok' | 'warn' | 'error' = 'ok';
                                      if (t1 && t2 && t1.key !== t2.key) status = 'error';
                                      if (t2 && t3 && t2.key !== t3.key) status = 'error';
                                      if (t1 && t3 && t1.key !== t3.key) status = 'error';

                                      return (
                                          <tr key={`${group.globalId}-${module.id}`} className="hover:bg-slate-800/30">
                                              {/* Only show group name for the first module row, but simplicity dictates showing it small or repeated */}
                                              <td className="p-3 text-xs text-slate-400">
                                                  {specialties.find(s=>s.id===group.specId)?.name} - ف{group.groupNum}
                                              </td>
                                              <td className="p-3 font-bold text-white">{module.shortTitle}</td>
                                              <td className="p-3 text-center text-xs text-slate-300 border-l border-slate-800">{t1?.name || '-'}</td>
                                              <td className="p-3 text-center text-xs text-slate-300 border-l border-slate-800">{t2?.name || '-'}</td>
                                              <td className="p-3 text-center text-xs text-slate-300 border-l border-slate-800">{t3?.name || '-'}</td>
                                              <td className="p-3 text-center">
                                                  {status === 'ok' ? (
                                                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-1 text-red-400 font-bold text-xs">
                                                          <XCircle className="w-4 h-4" /> عدم تطابق
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                  })}
                                  <tr className="bg-slate-800/50 h-2"><td colSpan={6}></td></tr>
                              </React.Fragment>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Styles for print settings - DYNAMIC BASED ON MODE */}
      <style>{`
        @media print {
            @page {
                size: ${printMode === 'trainer' ? 'A4 portrait' : 'A4 landscape'};
                margin: 0;
            }
            body {
                overflow: visible !important;
                height: auto !important;
            }
            /* Do not use display: none on #root, use visibility: hidden on body children instead */
            body * {
                visibility: hidden;
            }
            
            #print-section, #print-section * {
                visibility: visible;
            }
            
            #print-section {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                min-height: 100vh;
                background: white;
                z-index: 99999;
                margin: 0;
                padding: 0;
            }
            
            /* Landscape Page Class */
            .print-page-landscape {
                width: 297mm;
                height: 210mm;
                page-break-after: always;
                break-after: page;
                position: relative;
                overflow: hidden;
                background: white;
                padding: 10mm;
                box-sizing: border-box;
            }

            /* Portrait Page Class */
            .print-page-portrait {
                width: 210mm;
                height: 297mm;
                page-break-after: always;
                break-after: page;
                position: relative;
                overflow: hidden;
                background: white;
                padding: 10mm;
                box-sizing: border-box;
            }

            /* Remove last break */
            .print-page-landscape:last-child, .print-page-portrait:last-child {
                page-break-after: auto;
                break-after: auto;
            }
        }
      `}</style>

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
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg"
                             >
                                 <Printer className="w-4 h-4" />
                                 طباعة الجدول
                             </button>
                         )}
                     </div>
                </div>
            )}
        </div>
      </div>

      {schedule.length > 0 && (
        <>
            {/* --- PRINT VIEW SECTION --- */}
            <div id="print-section" className="hidden print:block text-black">
                <div style={{ direction: 'rtl' }}>
                    
                    {/* GROUP PRINT (LANDSCAPE - BALANCED) */}
                    {printMode === 'group' && printTarget && (
                        <>
                            {getPrintableGroupSchedule(printTarget).map((pageDays, pageIndex, allPages) => (
                                <div key={pageIndex} className="print-page-landscape flex flex-col h-full relative">
                                    
                                    {/* Page Header */}
                                    <div className="text-center border-b-2 border-black pb-2 mb-2">
                                        <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                        <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                                        <div className="flex justify-between mt-1 px-4 text-xs font-bold">
                                            <span>مديرية التربية لولاية {institution.wilaya || '...................'}</span>
                                            <span>مركز التكوين {institution.center || '...................'}</span>
                                        </div>
                                    </div>

                                    {/* Page Title */}
                                    <div className="text-center mb-2">
                                        <h1 className="text-lg font-black bg-gray-200 inline-block px-6 py-1 border-2 border-black rounded">
                                            جدول التوقيت الأسبوعي - {getAllGroupsList().find(g => g.id === printTarget)?.name}
                                        </h1>
                                        <div className="flex justify-center gap-4 mt-1 font-bold text-xs">
                                            <span>{currentSession.name}</span>
                                            <span>({currentSession.startDate} إلى {currentSession.endDate})</span>
                                            {allPages.length > 1 && <span>(صفحة {pageIndex + 1} من {allPages.length})</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Table Container - FIXED HEIGHT ROWS */}
                                    <div className="flex-grow-0">
                                        <table className="w-full border-2 border-black text-center text-xs table-fixed">
                                            <thead className="bg-gray-100 h-10">
                                                <tr>
                                                    <th className="border border-black p-1 w-[12%]">اليوم / التاريخ</th>
                                                    {[0,1,2,3,4].map(h => {
                                                        if (selectedSessionId === 3 && h === 4) return null;
                                                        return (
                                                            <th key={h} className="border border-black p-1">
                                                                {8+h}:00 - {9+h}:00
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageDays.map((day, dIdx) => (
                                                    <tr key={dIdx} className="h-14">
                                                        <td className="border border-black p-1 font-bold bg-gray-50">
                                                            <div className="text-sm">{formatDate(day.date).split(' ')[0]}</div>
                                                            <div className="text-[10px] font-normal">{formatDate(day.date).split(' ').slice(1).join(' ')}</div>
                                                        </td>
                                                        {[0,1,2,3,4].map(h => {
                                                            if (selectedSessionId === 3 && h === 4) return null;

                                                            const slot = day.slots.find(s => parseInt(s.time) === (8+h)) 
                                                                || day.slots.find(s => parseInt(s.time) === (8+h-1) && s.duration === 2);
                                                            
                                                            if (!slot || !slot.moduleId) {
                                                                return <td key={h} className="border border-black bg-gray-100"></td>;
                                                            }

                                                            // Find trainer
                                                            const [specId, gNum] = printTarget.split('-');
                                                            const trainerName = getTrainerNameForSlot(schedule[0].days.findIndex(d => d.date === day.date), h, parseInt(gNum), specId, slot.moduleId);

                                                            return (
                                                                <td key={h} className="border border-black p-1 align-middle relative group">
                                                                    <div className={`font-bold text-xs border-b border-dotted border-gray-400 pb-1 mb-1 ${slot.moduleId===999 ? 'text-amber-900' : 'text-black'}`}>
                                                                        {getModuleName(slot.moduleId)}
                                                                    </div>
                                                                    <div className="text-[9px] italic text-gray-700">{trainerName}</div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Signatures on LAST PAGE */}
                                    {pageIndex === allPages.length - 1 ? (
                                        <div className="mt-auto h-24 flex justify-end px-12 font-bold text-left text-sm">
                                            <div className="text-center">
                                                <p className="mb-10">المدير البيداغوجي</p>
                                                <p>........................</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </>
                    )}

                    {/* TRAINER PRINT (PORTRAIT - FILTERED SINGLE PAGE) */}
                    {printMode === 'trainer' && printTarget && (
                        <>
                            {getPrintableTrainerSchedule().map((pageDays, pageIndex) => (
                                <div key={pageIndex} className="print-page-portrait flex flex-col justify-between">
                                    <div className="text-center border-b-2 border-black pb-2 mb-2">
                                        <h3 className="font-bold text-base">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                                        <h3 className="font-bold text-base">وزارة التربية الوطنية</h3>
                                        <div className="flex justify-between mt-1 px-4 text-xs font-bold">
                                            <span>مديرية التربية لولاية {institution.wilaya || '...................'}</span>
                                            <span>مركز التكوين {institution.center || '...................'}</span>
                                        </div>
                                    </div>

                                    <div className="text-center mb-4">
                                        <h1 className="text-lg font-black bg-gray-200 inline-block px-6 py-1 border-2 border-black rounded">
                                            جدول التوقيت الشخصي
                                        </h1>
                                        <div className="mt-2 text-sm font-bold flex flex-col gap-1">
                                            <span>الأستاذ: {getAllTrainersList().find(t => `${t.moduleId}-${t.key}` === printTarget)?.name}</span>
                                            <span>مقياس: {getModuleName(parseInt(printTarget.split('-')[0]))}</span>
                                        </div>
                                        <div className="flex justify-center gap-4 mt-1 font-bold text-xs text-gray-600">
                                            <span>{currentSession.name}</span>
                                        </div>
                                    </div>

                                    <div className="flex-grow flex items-start">
                                        <table className="w-full border-2 border-black text-center text-xs table-fixed h-full">
                                            <thead className="bg-gray-100 h-10">
                                                <tr>
                                                    <th className="border border-black p-1 w-[15%]">اليوم</th>
                                                    {[0,1,2,3,4].map(h => {
                                                        if (selectedSessionId === 3 && h === 4) return null;
                                                        return (
                                                            <th key={h} className="border border-black p-1">
                                                                {8+h}:00 - {9+h}:00
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageDays.map((day, dIdx) => (
                                                    <tr key={dIdx} className="h-14">
                                                        <td className="border border-black p-1 font-bold bg-gray-50 h-auto">
                                                            <div className="text-sm">{formatDate(day.date).split(' ')[0]}</div>
                                                            <div className="text-[10px] font-normal">{formatDate(day.date).split(' ').slice(1).join(' ')}</div>
                                                        </td>
                                                        {[0,1,2,3,4].map(h => {
                                                            if (selectedSessionId === 3 && h === 4) return null;

                                                            const parts = printTarget.split('-');
                                                            const mId = parseInt(parts[0]);
                                                            const tKey = parts.slice(1).join('-'); 

                                                            // Correct logic for Filtered Trainer Schedule:
                                                            // We must use `day.originalIndex` because the `pageDays` array is filtered and its index `dIdx` 
                                                            // no longer matches the session day index (0..N) stored in assignments.
                                                            
                                                            const assign = trainerAssignments.find(a => 
                                                                a.sessionId === selectedSessionId &&
                                                                a.moduleId === mId &&
                                                                a.trainerKey === tKey &&
                                                                a.dayIndex === (day as any).originalIndex && // USE originalIndex
                                                                a.hourIndex === h
                                                            );

                                                            if (!assign) return <td key={h} className="border border-black bg-gray-100"></td>;

                                                            const [sId, gN] = assign.groupId.split('-');
                                                            const sName = specialties.find(s=>s.id === sId)?.name;

                                                            return (
                                                                <td key={h} className="border border-black p-1 font-bold text-xs align-middle bg-white">
                                                                    <div className="font-bold">{sName}</div>
                                                                    <div className="bg-black text-white inline-block px-2 rounded mt-1">فوج {gN}</div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer for Trainers - Portrait layout signature */}
                                    <div className="mt-4 h-24 flex justify-end px-8 font-bold text-left text-sm">
                                        <div className="text-center">
                                            <p className="mb-10">المدير البيداغوجي</p>
                                            <p>........................</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
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

                    {visibleDays.map((day, dayIndex) => (
                        <div key={day.date} className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
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
                                                        
                                                        // Find slot by date AND time
                                                        const daySched = groupSchedule?.days.find(d => d.date === day.date);
                                                        const slot = daySched?.slots.find(s => parseInt(s.time.split(':')[0]) === hourStart)
                                                                    || daySched?.slots.find(s => parseInt(s.time.split(':')[0]) === hourStart - 1 && s.duration === 2);
                                                        
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
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2 border-b border-slate-800 pb-2 mt-12">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-purple-400" />
                            <h3 className="text-xl font-bold text-white">
                                توزيع الأساتذة
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-slate-400 text-xs font-bold whitespace-nowrap">اختر المقياس:</label>
                            <select 
                                value={viewModuleId} 
                                onChange={(e) => setViewModuleId(parseInt(e.target.value))}
                                className="bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm w-64"
                            >
                                {MODULES.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                <option value={999}>أعمال تطبيقية / مراجعة</option>
                            </select>
                        </div>
                    </div>

                    {visibleDays.map((day, dayIndex) => (
                        <div key={day.date} className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden">
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
                                                            a.sessionId === selectedSessionId && 
                                                            a.moduleId === viewModuleId &&
                                                            a.dayIndex === dayIndex &&
                                                            a.hourIndex === h &&
                                                            a.trainerKey === col.id
                                                        );
                                                        
                                                        if (viewModuleId === 999 && !assignment) {
                                                            const supAssign = trainerAssignments.find(a => a.sessionId === selectedSessionId && a.moduleId === 999 && a.dayIndex === dayIndex && a.hourIndex === h);
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

                {/* 3. VERIFICATION MATRIX - NEW */}
                {renderVerificationMatrix()}

                {/* 4. VALIDATION STATS - RESTORED */}
                <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 p-6 mt-8">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <BarChart3 className="w-6 h-6 text-emerald-400" />
                        <h3 className="text-xl font-bold text-white">إحصائيات التوليد واكتمال النصاب</h3>
                        {selectedSessionId === 3 && (
                            <span className="text-xs bg-amber-900/50 text-amber-200 px-2 py-1 rounded border border-amber-800 mr-2">
                                (تم خصم 20 سا للامتحانات من النصاب)
                            </span>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-800 text-slate-400">
                                <tr>
                                    <th className="p-3">المقياس</th>
                                    <th className="p-3 text-center">المطلوب (ساعات)</th>
                                    <th className="p-3 text-center">المجدول (المعدل)</th>
                                    <th className="p-3 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {generationStats.map(stat => (
                                    <tr key={stat.moduleId} className="hover:bg-slate-800/30">
                                        <td className="p-3 font-bold text-slate-200">{getModuleName(stat.moduleId)}</td>
                                        <td className="p-3 text-center">{stat.required}</td>
                                        <td className="p-3 text-center">{stat.scheduled}</td>
                                        <td className="p-3 text-center">
                                            {stat.scheduled >= stat.required ? (
                                                <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold">
                                                    <CheckCircle2 className="w-4 h-4" /> مكتمل
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 text-red-400 font-bold">
                                                    <AlertCircle className="w-4 h-4" /> ناقص ({stat.required - stat.scheduled})
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
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