
import React, { useState } from 'react';
import { SESSIONS, MODULES, MODULE_CONTENTS, CORRECTED_DISTRIBUTION } from '../constants';
import { getWorkingDays, formatDate, isHoliday } from '../utils';
import { Clock, CalendarCheck, AlertCircle, Info, BookOpen, List, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';

const ScheduleView: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState(1);
  const [viewMode, setViewMode] = useState<'calendar' | 'content'>('calendar');

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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

      <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 p-6 min-h-[600px]">
        {/* Header Info */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
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
                                <h3 className="font-bold text-white text-lg">{module.title}</h3>
                                <div className={`text-xs font-bold px-3 py-1.5 rounded border ${isHoursMatching ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                    الحجم المخصص: {targetHours} سا
                                </div>
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
    </div>
  );
};

export default ScheduleView;