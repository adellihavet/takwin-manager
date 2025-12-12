
import React, { useState } from 'react';
import { MODULES, CORRECTED_DISTRIBUTION, SESSIONS } from '../constants';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

const CurriculumTable: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Constant for the Final Evaluation hours per module
  const FINAL_EVAL_HOURS = 2;

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-lg border border-slate-800/60 overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">توزيع المقاييس البيداغوجية</h2>
          <p className="text-sm text-slate-400 mt-1">توزيع الحجم الساعي (190 سا) وفق المقاييس الرسمية</p>
        </div>
        <div className="flex gap-2">
            {SESSIONS.map(s => (
                <div key={s.id} className="text-center px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
                    <span className="block font-bold text-white">
                        {/* Custom display logic for Session 3 totals in header stats */}
                        {s.id === 3 ? 70 : s.hoursTotal} <span className="text-xs text-slate-500 font-normal">سا</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{s.name}</span>
                </div>
            ))}
             <div className="text-center px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
                <span className="block font-bold text-white">20 <span className="text-xs text-slate-500 font-normal">سا</span></span>
                <span className="text-[10px] text-slate-400">تقويم نهائي</span>
            </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="py-4 px-6 w-1/3 font-medium">المقياس (الوحدة)</th>
              <th className="py-4 px-6 text-center font-medium bg-blue-500/5 text-blue-300">الدورة 1 (50سا)</th>
              <th className="py-4 px-6 text-center font-medium bg-purple-500/5 text-purple-300">الدورة 2 (50سا)</th>
              <th className="py-4 px-6 text-center font-medium bg-emerald-500/5 text-emerald-300">الدورة 3 (70سا)</th>
              <th className="py-4 px-6 text-center font-medium bg-amber-500/5 text-amber-300">التقويم النهائي (20سا)</th>
              <th className="py-4 px-6 text-center font-medium">المجموع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {MODULES.map((module) => {
              const dist = CORRECTED_DISTRIBUTION.find(d => d.moduleId === module.id);
              if (!dist) return null;
              
              // New Total Logic: S1 + S2 + S3 + FinalEval (2h)
              const rowTotal = dist.s1 + dist.s2 + dist.s3 + FINAL_EVAL_HOURS;
              const isMatch = rowTotal === module.totalHours;
              const isExpanded = expandedId === module.id;

              return (
                <React.Fragment key={module.id}>
                  <tr 
                    className={`transition-colors cursor-pointer ${isExpanded ? 'bg-slate-800' : 'hover:bg-slate-800/40'}`}
                    onClick={() => toggleExpand(module.id)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button className="text-slate-500 hover:text-dzgreen-400 transition-colors">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <div>
                          <span className="font-semibold text-slate-200 block">{module.title}</span>
                          {isExpanded && <span className="text-xs text-blue-400 block mt-1 md:hidden">انقر للتفاصيل</span>}
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-6 text-center font-medium ${dist.s1 > 0 ? 'text-blue-400 bg-blue-500/5' : 'text-slate-700 bg-blue-500/5'}`}>
                      {dist.s1 > 0 ? `${dist.s1} سا` : '-'}
                    </td>
                    <td className={`py-4 px-6 text-center font-medium ${dist.s2 > 0 ? 'text-purple-400 bg-purple-500/5' : 'text-slate-700 bg-purple-500/5'}`}>
                      {dist.s2 > 0 ? `${dist.s2} سا` : '-'}
                    </td>
                    <td className={`py-4 px-6 text-center font-medium ${dist.s3 > 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-700 bg-emerald-500/5'}`}>
                      {dist.s3 > 0 ? `${dist.s3} سا` : '-'}
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-amber-400 bg-amber-500/5">
                      {FINAL_EVAL_HOURS} سا
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-white border-r border-slate-800">
                      {rowTotal} <span className="text-xs font-normal text-slate-500">سا</span>
                      {!isMatch && <span className="block text-xs text-red-500">خاطئ</span>}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-slate-800/50 animate-fadeIn">
                      <td colSpan={6} className="py-0 px-0">
                        <div className="px-6 py-4 mx-2 my-2 bg-slate-900 border border-slate-700 rounded-lg shadow-inner flex items-start gap-4">
                          <div className="bg-blue-500/10 p-2 rounded-full shrink-0 mt-0.5 border border-blue-500/20">
                            <Info size={16} className="text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-300 mb-2">محتوى المقياس:</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{module.description || 'لا يوجد وصف متاح لهذا المقياس.'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-950 border-t border-slate-800">
            <tr>
              <td className="py-4 px-6 font-bold text-slate-300">المجموع الكلي للحجم الساعي</td>
              <td className="py-4 px-6 text-center font-bold text-blue-400">
                 {CORRECTED_DISTRIBUTION.reduce((a, b) => a + b.s1, 0)} سا
              </td>
              <td className="py-4 px-6 text-center font-bold text-purple-400">
                 {CORRECTED_DISTRIBUTION.reduce((a, b) => a + b.s2, 0)} سا
              </td>
              <td className="py-4 px-6 text-center font-bold text-emerald-400">
                 {CORRECTED_DISTRIBUTION.reduce((a, b) => a + b.s3, 0)} سا
              </td>
              <td className="py-4 px-6 text-center font-bold text-amber-400">
                 {MODULES.length * FINAL_EVAL_HOURS} سا
              </td>
              <td className="py-4 px-6 text-center font-black text-xl text-dzgreen-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
                190 سا
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CurriculumTable;
