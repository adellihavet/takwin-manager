
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, ComposedChart, Line, ReferenceLine 
} from 'recharts';
import { 
  Users, BookOpen, MapPin, Award, TrendingUp, AlertTriangle, 
  Filter, BarChart2, BrainCircuit, Activity, Lightbulb, 
  UserCheck, Timer, Microscope 
} from 'lucide-react';
import { SPECIALTIES as DEFAULT_SPECIALTIES, MODULES } from '../constants';
import { Specialty, TrainerConfig, Trainee, AttendanceRecord, EvaluationDatabase } from '../types';

// --- THEME COLORS (Professional BI Palette) ---
const COLORS = {
  male: '#3b82f6',    // Blue-500
  female: '#ec4899',  // Pink-500
  success: '#10b981', // Emerald-500
  warning: '#f59e0b', // Amber-500
  danger: '#ef4444',  // Red-500
  primary: '#6366f1', // Indigo-500
  purple: '#8b5cf6',  // Violet-500
  dark: '#1e293b',    // Slate-800
  grid: '#334155',    // Slate-700
  text: '#94a3b8'     // Slate-400
};

// --- HELPER: CUSTOM AXIS TICK FOR ARABIC TEXT ---
// Truncates long text to prevent overlap
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  const truncated = text.length > 10 ? text.substring(0, 10) + '..' : text;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#94a3b8" fontSize={10} transform="rotate(-35)">
        {truncated}
      </text>
    </g>
  );
};

// --- HELPER: CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl text-xs backdrop-blur-md z-50 min-w-[200px]">
        <p className="font-bold text-slate-100 mb-2 border-b border-slate-700 pb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-white text-sm">
                {typeof entry.value === 'number' && entry.value % 1 !== 0 ? entry.value.toFixed(2) : entry.value}
                {entry.unit ? ` ${entry.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DataAnalytics: React.FC = () => {
  // --- STATE ---
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [grades, setGrades] = useState<EvaluationDatabase>({});
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  
  // Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  // --- DATA LOADING ---
  useEffect(() => {
      const load = (key: string, setter: any) => {
          const stored = localStorage.getItem(key);
          if (stored) try { setter(JSON.parse(stored)); } catch(e){}
      };
      load('takwin_trainees_db', setTrainees);
      load('takwin_attendance_db', setAttendance);
      load('takwin_grades_db', setGrades);
      load('takwin_specialties_db', setSpecialties);
  }, []);

  // --- ADVANCED ANALYTICS ENGINE ---
  const analytics = useMemo(() => {
      // 1. Enrich Trainee Data
      const enrichedData = trainees.map(t => {
          // Grades
          const tGrades = grades[t.id] || { modules: {} };
          let sumWeighted = 0, totalCoeff = 0;
          const modGrades: Record<number, number> = {};
          
          MODULES.forEach(m => {
              const mg = tGrades.modules?.[m.id];
              const avgCC = ((mg?.s1||0) + (mg?.s2||0) + (mg?.s3||0)) / 3;
              const exam = mg?.exam || 0;
              sumWeighted += (avgCC * 2 * m.coefficient) + (exam * 3 * m.coefficient);
              totalCoeff += (m.coefficient * 5);
              modGrades[m.id] = exam; // Keep exam for specific analysis
          });
          
          const report = tGrades.report || 0;
          // Global Formula: ((GlobalCC*2) + (GlobalExam*3) + Report) / 6
          // Simplified approximation for bulk analysis:
          const finalAvg = totalCoeff ? parseFloat(((sumWeighted + report) / (totalCoeff + 1)).toFixed(2)) : 0;

          // Attendance
          const absences = Object.entries(attendance).filter(([k, v]) => k.endsWith(`-${t.id}`) && v === 'A').length;

          // Age
          let age = 0;
          if (t.dob) {
              const birthYear = parseInt(t.dob.split(/[-/]/)[0]); // Assumes YYYY-MM-DD
              if (!isNaN(birthYear)) age = 2025 - birthYear;
          }

          return { ...t, finalAvg, absences, age, modGrades };
      });

      // Filter based on UI selection
      const dataset = selectedSpecialty === 'all' 
          ? enrichedData 
          : enrichedData.filter(d => d.specialtyId === selectedSpecialty);

      if (dataset.length === 0) return null;

      // --- SECTION 1: GENDER & DISCIPLINE INSIGHTS ---
      const males = dataset.filter(d => d.gender === 'M');
      const females = dataset.filter(d => d.gender === 'F');
      
      const maleStats = {
          count: males.length,
          avgGrade: males.length ? males.reduce((s, c) => s + c.finalAvg, 0) / males.length : 0,
          avgAbsence: males.length ? males.reduce((s, c) => s + c.absences, 0) / males.length : 0,
          passRate: males.length ? (males.filter(m => m.finalAvg >= 10).length / males.length) * 100 : 0
      };

      const femaleStats = {
          count: females.length,
          avgGrade: females.length ? females.reduce((s, c) => s + c.finalAvg, 0) / females.length : 0,
          avgAbsence: females.length ? females.reduce((s, c) => s + c.absences, 0) / females.length : 0,
          passRate: females.length ? (females.filter(f => f.finalAvg >= 10).length / females.length) * 100 : 0
      };

      const genderChartData = [
          { name: 'ذكور', grade: parseFloat(maleStats.avgGrade.toFixed(2)), absence: parseFloat(maleStats.avgAbsence.toFixed(2)), fill: COLORS.male },
          { name: 'إناث', grade: parseFloat(femaleStats.avgGrade.toFixed(2)), absence: parseFloat(femaleStats.avgAbsence.toFixed(2)), fill: COLORS.female }
      ];

      // --- SECTION 2: AGE & PERFORMANCE CORRELATION ---
      // Bucket ages: <25, 25-30, 30-35, 35-40, >40
      const ageBuckets: Record<string, { sumGrade: number, count: number, sumAbs: number }> = {
          'أقل من 25': { sumGrade: 0, count: 0, sumAbs: 0 },
          '25-30': { sumGrade: 0, count: 0, sumAbs: 0 },
          '30-35': { sumGrade: 0, count: 0, sumAbs: 0 },
          '35-40': { sumGrade: 0, count: 0, sumAbs: 0 },
          'أكثر من 40': { sumGrade: 0, count: 0, sumAbs: 0 },
      };

      dataset.forEach(d => {
          let key = 'أكثر من 40';
          if (d.age < 25) key = 'أقل من 25';
          else if (d.age <= 30) key = '25-30';
          else if (d.age <= 35) key = '30-35';
          else if (d.age <= 40) key = '35-40';

          if (d.finalAvg > 0) { // Only count if graded
            ageBuckets[key].sumGrade += d.finalAvg;
            ageBuckets[key].sumAbs += d.absences;
            ageBuckets[key].count++;
          }
      });

      const ageChartData = Object.entries(ageBuckets).map(([range, val]) => ({
          name: range,
          avgGrade: val.count ? parseFloat((val.sumGrade / val.count).toFixed(2)) : 0,
          avgAbsence: val.count ? parseFloat((val.sumAbs / val.count).toFixed(1)) : 0,
          count: val.count
      })).filter(d => d.count > 0); // Hide empty buckets

      // --- SECTION 3: GEOGRAPHIC INTELLIGENCE ---
      const geoStats: Record<string, { sumGrade: number, count: number, passed: number }> = {};
      dataset.forEach(d => {
          const m = d.municipality || 'غير محدد';
          if (!geoStats[m]) geoStats[m] = { sumGrade: 0, count: 0, passed: 0 };
          geoStats[m].sumGrade += d.finalAvg;
          geoStats[m].count++;
          if (d.finalAvg >= 10) geoStats[m].passed++;
      });

      const geoChartData = Object.entries(geoStats)
          .map(([name, val]) => ({
              name,
              avg: parseFloat((val.sumGrade / val.count).toFixed(2)),
              successRate: Math.round((val.passed / val.count) * 100),
              count: val.count
          }))
          .filter(d => d.count >= 2) // Exclude outliers (municipalities with 1 person)
          .sort((a, b) => b.avg - a.avg) // Sort by performance
          .slice(0, 8); // Top 8

      // --- SECTION 4: AUTOMATED INSIGHTS (The Brain) ---
      const insights = [];
      
      // Gender Insight
      const gradeDiff = Math.abs(maleStats.avgGrade - femaleStats.avgGrade);
      const betterGender = maleStats.avgGrade > femaleStats.avgGrade ? 'الذكور' : 'الإناث';
      if (gradeDiff > 0.5) {
          insights.push({
              type: 'info',
              icon: <Users className="w-5 h-5 text-blue-400" />,
              text: `لوحظ تفوق فئة ${betterGender} في التحصيل العلمي بفارق (${gradeDiff.toFixed(2)}) نقطة في المعدل العام.`
          });
      }

      // Discipline Insight
      const absDiff = Math.abs(maleStats.avgAbsence - femaleStats.avgAbsence);
      const worseAbsence = maleStats.avgAbsence > femaleStats.avgAbsence ? 'الذكور' : 'الإناث';
      if (absDiff > 1) {
          insights.push({
              type: 'warning',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
              text: `مؤشر الانضباط: تسجل فئة ${worseAbsence} معدلات غياب أعلى (${Math.max(maleStats.avgAbsence, femaleStats.avgAbsence).toFixed(1)} غياب/متربص) مقارنة بالفئة الأخرى، مما قد يؤثر سلباً على النتائج.`
          });
      }

      // Correlation Insight
      const correlationData = dataset.filter(d => d.finalAvg > 0);
      const highAbsenceLowGrade = correlationData.filter(d => d.absences > 3 && d.finalAvg < 10).length;
      if (highAbsenceLowGrade > 3) {
          insights.push({
              type: 'danger',
              icon: <TrendingUp className="w-5 h-5 text-red-400" />,
              text: `تحليل الارتباط: تم رصد ${highAbsenceLowGrade} حالات تؤكد العلاقة المباشرة بين كثرة الغياب (أكثر من 3) والرسوب (معدل أقل من 10).`
          });
      }

      // Module Difficulty
      const moduleAvgs = MODULES.map(m => {
          const validGrades = dataset.map(d => d.modGrades[m.id]).filter(g => g !== undefined && g > 0);
          const avg = validGrades.length ? validGrades.reduce((a,b)=>a+b,0)/validGrades.length : 0;
          return { title: m.shortTitle, avg };
      }).sort((a,b) => a.avg - b.avg);
      
      if (moduleAvgs.length > 0 && moduleAvgs[0].avg < 10) {
           insights.push({
              type: 'alert',
              icon: <BookOpen className="w-5 h-5 text-purple-400" />,
              text: `مؤشر الصعوبة البيداغوجية: يعتبر مقياس "${moduleAvgs[0].title}" الأصعب في هذه الدورة بمعدل عام متدنٍ (${moduleAvgs[0].avg.toFixed(2)}/20). يرجى مراجعة طريقة التقييم أو التدريس.`
          });
      }

      return { maleStats, femaleStats, genderChartData, ageChartData, geoChartData, insights, total: dataset.length };
  }, [trainees, grades, attendance, selectedSpecialty]);

  if (!analytics) return <div className="p-12 text-center text-slate-500">جاري تحليل البيانات... أو لا توجد بيانات كافية.</div>;

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-slate-800 pb-4 gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-900/40">
                      <BrainCircuit className="w-8 h-8 text-white" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">تحليل المعطيات</h2>
                      <p className="text-slate-400 text-sm font-medium">قراءة تحليلية لمؤشرات الأداء، الانضباط، والعوامل الديموغرافية</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <Filter className="w-4 h-4 text-slate-400 mr-2" />
                  <select 
                      className="bg-transparent text-white text-sm font-bold outline-none px-2 py-1"
                      value={selectedSpecialty}
                      onChange={e => setSelectedSpecialty(e.target.value)}
                  >
                      <option value="all" className="bg-slate-900 text-white">تحليل شامل (كل التخصصات)</option>
                      {specialties.map(s => <option key={s.id} value={s.id} className="bg-slate-900 text-white">{s.name}</option>)}
                  </select>
              </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard title="إجمالي المتكونين" value={analytics.total} icon={<Users className="text-blue-400" />} sub="متربص" color="blue" />
              <KPICard title="معدل الذكور" value={analytics.maleStats.avgGrade.toFixed(2)} icon={<UserCheck className="text-sky-400" />} sub={`نجاح: ${Math.round(analytics.maleStats.passRate)}%`} color="sky" />
              <KPICard title="معدل الإناث" value={analytics.femaleStats.avgGrade.toFixed(2)} icon={<UserCheck className="text-pink-400" />} sub={`نجاح: ${Math.round(analytics.femaleStats.passRate)}%`} color="pink" />
              <KPICard title="الفجوة بين الجنسين" value={Math.abs(analytics.maleStats.avgGrade - analytics.femaleStats.avgGrade).toFixed(2)} icon={<Activity className="text-purple-400" />} sub="نقطة فرق" color="purple" />
          </div>
      </div>

      {/* 2. AUTOMATED INSIGHTS (THE BRAIN) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-xl border border-indigo-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h3 className="font-black text-white text-lg mb-6 flex items-center gap-2 border-b border-slate-800/50 pb-4">
              <Microscope className="w-6 h-6 text-indigo-400" />
              الاستنتاجات الآلية للنظام
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.insights.map((insight, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex gap-4 items-start hover:border-indigo-500/30 transition-colors">
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                          {insight.icon}
                      </div>
                      <div>
                          <p className="text-slate-300 text-sm leading-relaxed font-medium">
                              {insight.text}
                          </p>
                      </div>
                  </div>
              ))}
              {analytics.insights.length === 0 && (
                  <div className="col-span-2 text-center text-slate-500 py-4 italic">لا توجد استنتاجات بارزة حالياً (البيانات متوازنة أو غير كافية).</div>
              )}
          </div>
      </div>

      {/* 3. DEEP DIVE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CHART A: Gender Performance vs Discipline Nexus */}
          <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60">
              <div className="mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-sky-400" />
                      مصفوفة الأداء: الجنس والانضباط والتحصيل
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">مقارنة محورية تكشف أثر الغياب على معدلات كل جنس</p>
              </div>
              
              <div className="h-80 w-full">
                  <ResponsiveContainer>
                      <ComposedChart data={analytics.genderChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontWeight="bold" />
                          <YAxis yAxisId="left" orientation="left" stroke={COLORS.success} label={{ value: 'المعدل العام', angle: -90, position: 'insideLeft', fill: COLORS.success, fontSize: 10 }} domain={[0, 20]} />
                          <YAxis yAxisId="right" orientation="right" stroke={COLORS.danger} label={{ value: 'متوسط الغياب', angle: 90, position: 'insideRight', fill: COLORS.danger, fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar yAxisId="left" dataKey="grade" name="معدل التحصيل" barSize={50} radius={[6, 6, 0, 0]}>
                              {analytics.genderChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="absence" name="مؤشر الغياب" stroke={COLORS.danger} strokeWidth={3} dot={{r: 6, fill: COLORS.danger}} />
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* CHART B: Age Correlation Analysis */}
          <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60">
              <div className="mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                      <Timer className="w-5 h-5 text-amber-400" />
                      تحليل الفئات العمرية
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">هل الخبرة (السن) عامل مساعد أم معيق للأداء؟</p>
              </div>

              <div className="h-80 w-full">
                  <ResponsiveContainer>
                      <AreaChart data={analytics.ageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 11}} />
                          <YAxis stroke="#94a3b8" domain={[0, 20]} />
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="avgGrade" name="متوسط المعدل" stroke={COLORS.warning} fillOpacity={1} fill="url(#colorGrade)" />
                          <Line type="step" dataKey="avgAbsence" name="متوسط الغياب" stroke={COLORS.danger} strokeDasharray="4 4" strokeWidth={2} dot={false} />
                          <Legend />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* CHART C: Geographic Performance Heatmap (Horizontal) */}
          <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60">
              <div className="mb-6 flex justify-between items-center">
                  <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                          خارطة الأداء الجغرافي (أفضل البلديات نجاحاً)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">تصنيف البلديات بناءً على جودة النتائج (المعدل) وليس العدد</p>
                  </div>
              </div>

              <div className="h-72 w-full">
                  <ResponsiveContainer>
                      <BarChart data={analytics.geoChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} opacity={0.3} />
                          <XAxis type="number" domain={[0, 20]} stroke="#94a3b8" hide />
                          <YAxis dataKey="name" type="category" stroke="#e2e8f0" width={100} tick={{fontSize: 11, fontWeight: 'bold'}} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="avg" name="معدل البلدية" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18}>
                                {analytics.geoChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index < 3 ? COLORS.success : COLORS.primary} />
                                ))}
                          </Bar>
                          <Bar dataKey="successRate" name="نسبة النجاح %" fill={COLORS.purple} radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

      </div>
    </div>
  );
};

// Simple Stat Card Component
const KPICard = ({ title, value, icon, sub, color }: any) => (
    <div className={`bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-${color}-500/50 transition-all group`}>
        <div className="flex justify-between items-start mb-3">
            <p className="text-slate-400 text-xs font-bold">{title}</p>
            <div className={`p-1.5 rounded-lg bg-${color}-500/10 group-hover:bg-${color}-500/20 transition-colors`}>{icon}</div>
        </div>
        <h3 className="text-2xl font-black text-white mb-1">{value}</h3>
        <p className={`text-[10px] font-bold text-${color}-400 bg-${color}-500/10 inline-block px-2 py-0.5 rounded`}>{sub}</p>
    </div>
);

export default DataAnalytics;
