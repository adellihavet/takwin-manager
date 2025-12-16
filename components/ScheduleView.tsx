
import React, { useState, useEffect } from 'react';
import { SESSIONS, MODULES, MODULE_CONTENTS, CORRECTED_DISTRIBUTION, SPECIALTIES } from '../constants';
import { getWorkingDays, formatDate, isHoliday } from '../utils';
import { Clock, CalendarCheck, AlertCircle, Info, BookOpen, List, Calendar as CalendarIcon, CheckSquare, Printer, X, FileText, Layers } from 'lucide-react';
import { GroupSchedule, TrainerAssignment, TrainerConfig, InstitutionConfig } from '../types';

const ScheduleView: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState(1);
  const [viewMode, setViewMode] = useState<'calendar' | 'content'>('calendar');

  // --- PRINT LOGIC STATE ---
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintModuleId, setSelectedPrintModuleId] = useState<number>(0);
  const [selectedPrintTrainerKey, setSelectedPrintTrainerKey] = useState<string>('');
  
  // --- BATCH PRINT STATE ---
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  
  // --- DATA LOADING FOR PRINTING ---
  const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);
  const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
  const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });

  useEffect(() => {
      const a = localStorage.getItem('takwin_assignments');
      if (a) try { setAssignments(JSON.parse(a)); } catch(e){}

      const t = localStorage.getItem('takwin_trainers_db');
      if (t) try { setTrainerConfig(JSON.parse(t)); } catch(e){}

      const i = localStorage.getItem('takwin_institution_db');
      if (i) try { setInstitution(JSON.parse(i)); } catch(e){}
  }, []);

  const currentSession = SESSIONS.find(s => s.id === selectedSessionId) || SESSIONS[0];
  const workingDays = getWorkingDays(currentSession.startDate, currentSession.endDate);

  const getSessionTopics = (moduleId: number) => {
    const content = MODULE_CONTENTS.find(c => c.moduleId === moduleId);
    if (!content) return [];
    if (selectedSessionId === 1) return content.s1Topics;
    if (selectedSessionId === 2) return content.s2Topics;
    return content.s3Topics;
  };

  const getSessionModuleHours = (moduleId: number) => {
      const dist = CORRECTED_DISTRIBUTION.find(d => d.moduleId === moduleId);
      if (selectedSessionId === 1) return dist?.s1 || 0;
      if (selectedSessionId === 2) return dist?.s2 || 0;
      return dist?.s3 || 0;
  };

  // Helper to determine the label for specific days based on new logic
  const getDailyVolumeLabel = (index: number) => {
      if (selectedSessionId !== 3) return "5 ساعات"; // Default for S1 & S2
      
      // S3 Logic
      if (index < 17) return "4 ساعات"; // Days 1 to 17
      if (index === 17) return "2 ساعات"; // Day 18
      return null; // Day 19+ (Empty)
  };

  // --- PRINT PREPARATION HELPERS ---
  const getAvailableTrainersForPrint = () => {
      if (!selectedPrintModuleId) return [];
      const relevantAssignments = assignments.filter(a => 
          a.sessionId === selectedSessionId && a.moduleId === selectedPrintModuleId
      );
      const uniqueKeys = Array.from(new Set(relevantAssignments.map(a => a.trainerKey)));
      
      return uniqueKeys.map(key => {
          let name = key;
          if (selectedPrintModuleId === 1) {
              name = trainerConfig[1]?.names?.[key] || key;
          } else {
              name = trainerConfig[selectedPrintModuleId]?.names?.[key] || `مكون ${key}`;
          }
          return { key, name };
      });
  };

  // Helper to get data for a specific trainer (Used for both single and batch print)
  const calculatePrintData = (moduleId: number, trainerKey: string) => {
      const myAssignments = assignments.filter(a => 
          a.sessionId === selectedSessionId && 
          a.moduleId === moduleId && 
          a.trainerKey === trainerKey
      );
      // Unique group IDs
      const uniqueGroupIds = Array.from(new Set(myAssignments.map(a => a.groupId)));
      
      const groupsData = uniqueGroupIds.map(gid => {
          const [sId, gNum] = gid.split('-');
          const sName = SPECIALTIES.find(s => s.id === sId)?.name || '';
          return { id: gid, name: sName, num: gNum };
      }).sort((a,b) => parseInt(a.num) - parseInt(b.num));

      // Get Trainer Name
      let trainerName = trainerKey;
      if (moduleId === 1) {
          trainerName = trainerConfig[1]?.names?.[trainerKey] || trainerKey;
      } else {
          trainerName = trainerConfig[moduleId]?.names?.[trainerKey] || `مكون ${trainerKey}`;
      }

      return {
          groupsData,
          trainerName,
          moduleName: MODULES.find(m => m.id === moduleId)?.title || '',
          syllabus: getSessionTopics(moduleId),
          totalVolume: getSessionTopics(moduleId).reduce((acc, curr) => acc + curr.duration, 0)
      };
  };

  const handleOpenPrintModal = (moduleId: number) => {
      setSelectedPrintModuleId(moduleId);
      setSelectedPrintTrainerKey(''); 
      setIsBatchPrinting(false);
      setPrintModalOpen(true);
  };

  const handleBatchPrintAll = () => {
      setIsBatchPrinting(true);
      setTimeout(() => {
          const content = document.getElementById('batch-print-template');
          let printSection = document.getElementById('print-section');
          
          if (!printSection) {
              printSection = document.createElement('div');
              printSection.id = 'print-section';
              document.body.appendChild(printSection);
          }
          
          if (content && printSection) {
              printSection.innerHTML = '';
              const clone = content.cloneNode(true) as HTMLElement;
              clone.classList.remove('hidden');
              printSection.appendChild(clone);
              window.print();
              setIsBatchPrinting(false);
          }
      }, 500); // Wait for render
  };

  const executePrint = () => {
      const content = document.getElementById('pedagogical-print-template');
      let printSection = document.getElementById('print-section');
      
      if (!printSection) {
          printSection = document.createElement('div');
          printSection.id = 'print-section';
          document.body.appendChild(printSection);
      }
      
      if (content && printSection) {
          printSection.innerHTML = '';
          const clone = content.cloneNode(true) as HTMLElement;
          clone.classList.remove('hidden');
          printSection.appendChild(clone);
          window.print();
          setPrintModalOpen(false); 
      }
  };

  // --- PREPARE BATCH DATA ---
  const getAllBatchData = () => {
      if (!isBatchPrinting) return [];
      const batchItems: any[] = [];
      
      // Iterate all modules
      MODULES.forEach(module => {
          // Find all trainers for this module in this session
          const relevantAssignments = assignments.filter(a => 
              a.sessionId === selectedSessionId && a.moduleId === module.id
          );
          const uniqueKeys = Array.from(new Set(relevantAssignments.map(a => a.trainerKey)));
          
          uniqueKeys.forEach(tKey => {
              const data = calculatePrintData(module.id, tKey);
              batchItems.push({
                  key: `${module.id}-${tKey}`,
                  ...data
              });
          });
      });
      return batchItems;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
        {/* FORCE PORTRAIT FOR THIS DOC */}
        <style>{`
            @media print {
                @page { size: portrait; margin: 0; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-table th, .print-table td { border: 1px solid black; padding: 4px; }
                .page-break { page-break-after: always; break-after: page; display: block; height: 0; }
            }
        `}</style>

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 print:hidden">
          {/* Session Tabs */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {SESSIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                  selectedSessionId === s.id 
                  ? 'bg-dzgreen-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] scale-105' 
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
             <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'calendar' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                 <CalendarIcon className="w-4 h-4" />
                 الرزنامة الزمنية
             </button>
             <button
                onClick={() => setViewMode('content')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'content' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
             >
                 <BookOpen className="w-4 h-4" />
                 المحتوى البيداغوجي
             </button>
          </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 p-6 min-h-[600px] print:hidden">
        {/* Header Info */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-slate-800 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    {viewMode === 'calendar' ? <CalendarCheck className="text-dzgreen-500" /> : <List className="text-purple-500" />}
                    {viewMode === 'calendar' ? `جدول سير ${currentSession.name}` : `البرنامج التفصيلي: ${currentSession.name}`}
                </h2>
                <p className="text-slate-400 mt-1 mr-9">
                    {viewMode === 'calendar' 
                        ? `من ${currentSession.startDate} إلى ${currentSession.endDate}` 
                        : `المواضيع المقررة وفق الحجم الساعي المخصص للدورة (${currentSession.hoursTotal} ساعة)`
                    }
                </p>
            </div>
            
            {viewMode === 'content' && (
                <button 
                    onClick={handleBatchPrintAll}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 border border-emerald-400/20"
                >
                    <Layers className="w-5 h-5" />
                    طباعة جميع التكليفات ({SESSIONS.find(s=>s.id===selectedSessionId)?.name})
                </button>
            )}

            {viewMode === 'calendar' && (
                <div className="text-left hidden md:block">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-2 rounded-full font-medium text-sm border border-amber-500/20 shadow-sm">
                        <Clock className="w-4 h-4" />
                        {selectedSessionId === 3 
                            ? "التوقيت اليومي: 08:00 - 12:00 (4 ساعات)" 
                            : "التوقيت اليومي: 08:00 - 13:00 (5 ساعات)"
                        }
                    </div>
                </div>
            )}
        </div>

        {/* --- VIEW MODE: CALENDAR --- */}
        {viewMode === 'calendar' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {workingDays.map((day, idx) => {
                        const isDayHoliday = isHoliday(day);
                        const volumeLabel = getDailyVolumeLabel(idx);

                        return (
                            <div key={idx} className={`relative p-5 rounded-xl border transition-all duration-300 ${
                                isDayHoliday 
                                ? 'bg-red-900/10 border-red-500/20 opacity-75' 
                                : !volumeLabel 
                                    ? 'bg-slate-900/30 border-slate-800 opacity-60' // Empty day style
                                    : 'bg-slate-800/50 border-slate-700 hover:border-dzgreen-500/50 hover:bg-slate-800 hover:shadow-md hover:-translate-y-1'
                            }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-bold bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">اليوم {idx + 1}</span>
                                    {!isDayHoliday && volumeLabel && <span className="text-xs font-bold text-dzgreen-400 bg-dzgreen-500/10 px-2 py-1 rounded">{volumeLabel}</span>}
                                </div>
                                <h4 className="font-bold text-slate-100 text-lg mb-1">
                                    {formatDate(day.toISOString())}
                                </h4>
                                {isDayHoliday ? (
                                    <div className="flex items-center gap-2 text-red-400 text-sm font-bold mt-4 bg-red-500/10 p-2 rounded">
                                        <AlertCircle className="w-4 h-4" />
                                        عطلة مدفوعة
                                    </div>
                                ) : volumeLabel ? (
                                    <div className="space-y-1.5 mt-4">
                                        <div className="h-1.5 bg-blue-500/40 rounded-full w-3/4"></div>
                                        <div className="h-1.5 bg-emerald-500/40 rounded-full w-1/2"></div>
                                        <div className="h-1.5 bg-purple-500/40 rounded-full w-2/3"></div>
                                    </div>
                                ) : (
                                    <div className="mt-4 text-xs text-slate-500 italic text-center border-t border-slate-800 pt-2">
                                        يوم إضافي (احتياطي / مغادرة)
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-blue-200 text-sm flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-blue-400 block mb-1">ملاحظة:</strong>
                        تم استثناء أيام الجمعة وعطلة 5 جويلية (في الدورة الثالثة) من حساب أيام العمل الفعلية.
                        المجموع الفعلي للأيام: <span className="text-white font-bold">{workingDays.length} يوم</span>.
                    </div>
                </div>
            </>
        )}

        {/* --- VIEW MODE: CONTENT (SYLLABUS TABLE) --- */}
        {viewMode === 'content' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {MODULES.map(module => {
                    const topics = getSessionTopics(module.id);
                    const targetHours = getSessionModuleHours(module.id);
                    if (topics.length === 0) return null;

                    const totalTopicsHours = topics.reduce((acc, curr) => acc + curr.duration, 0);
                    const isHoursMatching = totalTopicsHours === targetHours;

                    return (
                        <div key={module.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-purple-500/30 transition-colors flex flex-col">
                            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{module.title}</h3>
                                    <div className={`text-xs font-bold px-3 py-1.5 rounded border mt-1 inline-block ${isHoursMatching ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        الحجم المخصص: {targetHours} سا
                                    </div>
                                </div>
                                {/* PRINT BUTTON ADDED HERE */}
                                <button 
                                    onClick={() => handleOpenPrintModal(module.id)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                                    title="طباعة وثيقة التكليف والبرنامج"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 p-0">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="bg-slate-900/30 text-slate-500 border-b border-slate-800">
                                            <th className="py-2 px-4 font-medium w-[80%]">محتوى المقياس (الموضوع)</th>
                                            <th className="py-2 px-4 font-medium text-center">المدة (سا)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {topics.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="py-3 px-4 text-slate-300">
                                                    <div className="flex items-start gap-2">
                                                        <CheckSquare className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                                        <span>{item.topic}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-400">
                                                    {item.duration}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-900/50 border-t border-slate-800">
                                        <tr>
                                            <td className="py-2 px-4 font-bold text-slate-400">المجموع الموزع</td>
                                            <td className={`py-2 px-4 text-center font-bold ${isHoursMatching ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {totalTopicsHours} سا
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {module.id === 8 && selectedSessionId === 3 && (
                                    <div className="px-4 py-2 bg-emerald-900/10 border-t border-emerald-500/10">
                                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            يتضمن هذا المقياس محتوى "تقييم المكتسبات" (النظرة الجديدة) كما ورد في الملحق.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

      </div>

      {/* PRINT SELECTION MODAL */}
      {printModalOpen && (
          <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                  <button onClick={() => setPrintModalOpen(false)} className="absolute top-4 left-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Printer className="text-blue-400" />
                      طباعة وثيقة التكليف البيداغوجي
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                          <p className="text-sm text-blue-200">
                              المقياس: <span className="font-bold">{MODULES.find(m => m.id === selectedPrintModuleId)?.title}</span>
                          </p>
                      </div>

                      <div>
                          <label className="block text-slate-400 text-xs font-bold mb-2">اختر الأستاذ (لإظهار اسمه في التكليف):</label>
                          <select 
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                              value={selectedPrintTrainerKey}
                              onChange={e => setSelectedPrintTrainerKey(e.target.value)}
                          >
                              <option value="">-- اختر الأستاذ --</option>
                              {getAvailableTrainersForPrint().map(t => (
                                  <option key={t.key} value={t.key}>{t.name}</option>
                              ))}
                          </select>
                          {getAvailableTrainersForPrint().length === 0 && (
                              <p className="text-xs text-red-400 mt-2">لا يوجد أساتذة معينين لهذا المقياس في هذه الدورة.</p>
                          )}
                      </div>

                      <button 
                          onClick={executePrint}
                          disabled={!selectedPrintTrainerKey}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg mt-4"
                      >
                          طباعة الوثيقة
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HIDDEN PRINT TEMPLATE (SINGLE) */}
      <div id="pedagogical-print-template" className="hidden">
            {selectedPrintModuleId && selectedPrintTrainerKey && (
                <div className="w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] relative flex flex-col">
                    <PrintContent 
                        institution={institution}
                        sessionName={currentSession.name}
                        {...calculatePrintData(selectedPrintModuleId, selectedPrintTrainerKey)}
                        groupsData={calculatePrintData(selectedPrintModuleId, selectedPrintTrainerKey).groupsData} // Re-calculated
                    />
                </div>
            )}
      </div>

      {/* HIDDEN BATCH PRINT TEMPLATE */}
      <div id="batch-print-template" className="hidden">
          {isBatchPrinting && getAllBatchData().map((item, index) => (
              <div key={index} className="w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] relative flex flex-col page-break">
                  <PrintContent 
                      institution={institution}
                      sessionName={currentSession.name}
                      moduleName={item.moduleName}
                      trainerName={item.trainerName}
                      syllabus={item.syllabus}
                      groupsData={item.groupsData}
                      totalVolume={item.totalVolume}
                  />
              </div>
          ))}
      </div>

    </div>
  );
};

// --- Helper Component for Print Layout (ELEGANT PEDAGOGICAL CONTRACT) ---
const PrintContent: React.FC<{
    institution: InstitutionConfig;
    sessionName: string;
    moduleName: string;
    trainerName: string;
    syllabus: any[];
    groupsData: { id: string, name: string, num: string }[];
    totalVolume: number;
}> = ({ institution, sessionName, moduleName, trainerName, syllabus, groupsData, totalVolume }) => {
    
    // Format groups for header text (e.g., "الرياضيات (1، 2)، العربية (3)")
    const formattedGroupsText = groupsData.map(g => `${g.name} (ف${g.num})`).join('، ');

    return (
        <div className="h-full flex flex-col" style={{ direction: 'rtl' }}>
            
            {/* UPDATED HEADER: Centered Republic/Ministry, Split Director/Center */}
            <div className="text-center mb-2 font-bold font-serif leading-tight">
                <h3>الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                <h3>وزارة التربية الوطنية</h3>
            </div>
            
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4 text-sm font-bold">
                <div className="text-right">
                    مديرية التربية لولاية {institution.wilaya}
                </div>
                <div className="text-left">
                    مركز التكوين: {institution.center}
                </div>
            </div>

            {/* TITLE */}
            <div className="text-center mb-4 relative">
                <h1 className="text-xl font-black bg-gray-100 inline-block px-6 py-1 border-2 border-black rounded-lg uppercase tracking-wide">
                    وثيقة التكليف والمتابعة البيداغوجية
                </h1>
            </div>

            {/* COMPACT INFO CARD (Includes Year now) */}
            <div className="border border-black p-2 mb-4 bg-gray-50 flex flex-wrap gap-y-2 text-xs font-bold shadow-sm">
                <div className="w-1/2 border-l border-gray-300 pl-2">
                    <span className="text-gray-600 block">الأستاذ(ة) المكون(ة):</span>
                    <span className="text-base text-black">{trainerName}</span>
                </div>
                <div className="w-1/2 pr-2">
                    <span className="text-gray-600 block">المقياس:</span>
                    <span className="text-sm">{moduleName}</span>
                </div>
                
                <div className="w-1/2 border-t border-gray-300 pt-1 mt-1 border-l pl-2">
                    <span className="text-gray-600 inline-block ml-2">الدورة / السنة:</span>
                    <span>{sessionName} (2026/2025)</span>
                </div>
                <div className="w-1/2 border-t border-gray-300 pt-1 mt-1 pr-2">
                    <span className="text-gray-600 inline-block ml-2">الحجم الساعي:</span>
                    <span>{totalVolume} سا</span>
                </div>

                <div className="w-full border-t border-gray-300 pt-1 mt-1">
                    <span className="text-gray-600 ml-2">الأفواج المسندة:</span>
                    <span>{formattedGroupsText}</span>
                </div>
            </div>

            {/* CONTENT TABLE (Dynamic Columns for Groups) */}
            <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-xs underline">البرنامج البيداغوجي ومتابعة الإنجاز مع الأفواج:</h3>
                </div>

                {/* The Table - No Filler Rows */}
                <table className="w-full border-collapse border border-black text-sm text-center mb-2">
                    <thead>
                        <tr className="bg-gray-200 h-10">
                            <th className="border border-black w-10">رقم</th>
                            <th className="border border-black">عناصر الدرس / الموضوع</th>
                            <th className="border border-black w-16">المدة</th>
                            {/* DYNAMIC GROUP COLUMNS */}
                            {groupsData.length > 0 ? (
                                groupsData.map(g => (
                                    <th key={g.id} className="border border-black w-24">
                                        <div className="text-[10px]">{g.name}</div>
                                        <div className="text-[10px]">فوج {g.num}</div>
                                    </th>
                                ))
                            ) : (
                                <th className="border border-black w-24">الإنجاز</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {syllabus.map((topic, idx) => (
                            <tr key={idx} className="h-12">
                                <td className="border border-black font-bold bg-gray-50 py-1">{idx + 1}</td>
                                <td className="border border-black text-right px-3 font-bold py-1 leading-snug">{topic.topic}</td>
                                <td className="border border-black font-bold bg-gray-50 py-1">{topic.duration}</td>
                                {/* Checkboxes for each group */}
                                {groupsData.length > 0 ? (
                                    groupsData.map(g => (
                                        <td key={g.id} className="border border-black"></td>
                                    ))
                                ) : (
                                    <td className="border border-black"></td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* OBSERVATIONS SECTION - Fills some space cleanly without looking like a fake table */}
                <div className="mt-2 border border-black rounded p-2 bg-gray-50 mb-2">
                    <h4 className="font-bold underline text-xs mb-2">ملاحظات بيداغوجية عامة (تسجل عند نهاية الدورة):</h4>
                    <div className="space-y-4">
                        <div className="border-b border-dotted border-gray-400 h-6"></div>
                        <div className="border-b border-dotted border-gray-400 h-6"></div>
                        <div className="border-b border-dotted border-gray-400 h-6"></div>
                    </div>
                </div>
            </div>

            {/* COMPACT FOOTER - PINNED TO BOTTOM */}
            <div className="mt-auto flex justify-between items-end px-8 pb-0 pt-2">
                <div className="text-center">
                    <p className="font-bold text-xs mb-8">استلمت نسخة من البرنامج:</p>
                    <p className="text-[10px]">إمضاء الأستاذ(ة): ....................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-xs mb-8">المدير البيداغوجي:</p>
                    <p className="text-[10px]">الختم والتوقيع</p>
                </div>
            </div>
        </div>
    );
};

export default ScheduleView;
