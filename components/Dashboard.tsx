
import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Layers, Edit2, Save, X, UserCog, Database, Upload, Download, Building2, MapPin, UserCheck, Loader2, CheckCircle2, XCircle, Activity, AlertTriangle, Trash2, ArrowRight, BarChart3, GraduationCap, Clock, RefreshCw, Presentation, Settings2, Map, Flag, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS, MODULES } from '../constants';
import { Specialty, TrainerConfig, ProjectDatabase, InstitutionConfig, Trainee, AttendanceRecord } from '../types';
import { downloadJSON, readJSONFile, formatDate } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  // --- VIEW MODE STATE (NEW) ---
  const [viewMode, setViewMode] = useState<'presentation' | 'admin'>('presentation');

  // State for the data
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [scheduleExists, setScheduleExists] = useState(false);
  
  // State for editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Specialty[]>(DEFAULT_SPECIALTIES);

  // State for Institution Info
  const [institution, setInstitution] = useState<InstitutionConfig>({
      wilaya: '',
      institute: '',
      center: '',
      director: ''
  });
  const [isEditingInst, setIsEditingInst] = useState(false);
  const [editInstitution, setEditInstitution] = useState<InstitutionConfig>(institution);

  // State for Trainers
  const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
  const [isEditingTrainers, setIsEditingTrainers] = useState(false);
  const [editTrainerConfig, setEditTrainerConfig] = useState<TrainerConfig>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('takwin_specialties_db');
    if (savedData) try { setSpecialties(JSON.parse(savedData)); setEditData(JSON.parse(savedData)); } catch(e){}
    
    const savedInst = localStorage.getItem('takwin_institution_db');
    if (savedInst) try { setInstitution(JSON.parse(savedInst)); setEditInstitution(JSON.parse(savedInst)); } catch(e){}

    const savedTrainers = localStorage.getItem('takwin_trainers_db');
    if (savedTrainers) try { setTrainerConfig(JSON.parse(savedTrainers)); setEditTrainerConfig(JSON.parse(savedTrainers)); } catch(e){}

    const savedTrainees = localStorage.getItem('takwin_trainees_db');
    if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e){}

    const savedAtt = localStorage.getItem('takwin_attendance_db');
    if (savedAtt) try { setAttendance(JSON.parse(savedAtt)); } catch(e){}

    const savedSched = localStorage.getItem('takwin_schedule');
    if (savedSched) setScheduleExists(true);
  }, []);

  // --- FACTORY RESET (New Cycle) ---
  const handleFactoryReset = () => {
      if (confirm("هل أنت متأكد أنك تريد بدء موسم جديد؟\n\nسيتم مسح جميع البيانات (المتربصين، النقاط، الجداول، الأسماء) والبدء من الصفر.\n\nيرجى تصدير قاعدة البيانات الحالية كنسخة احتياطية قبل المتابعة.")) {
          localStorage.clear();
          location.reload();
      }
  };

  // --- RESET ATTENDANCE ONLY ---
  const handleResetAttendance = () => {
      if (confirm("هل أنت متأكد من تصفير سجل الغيابات؟\nسيتم حذف جميع الغيابات المسجلة سابقاً (العدد سيصبح 0).")) {
          setAttendance({});
          localStorage.removeItem('takwin_attendance_db');
      }
  };

  // Database Handlers
  const handleExportDB = () => {
    let schedule = undefined;
    let assignments = undefined;
    let reports = undefined;
    
    try {
        const s = localStorage.getItem('takwin_schedule');
        const a = localStorage.getItem('takwin_assignments');
        const r = localStorage.getItem('takwin_reports_db');
        
        if (s) schedule = JSON.parse(s);
        if (a) assignments = JSON.parse(a);
        if (r) reports = JSON.parse(r);
    } catch (e) {}

    const db: ProjectDatabase = {
      institutionConfig: institution,
      specialties,
      trainerConfig,
      schedule, 
      assignments,
      reports,
      trainees,
      attendance,
      version: '1.6',
      savedAt: new Date().toISOString()
    };
    downloadJSON(db, `takwin_db_${institution.wilaya || 'project'}_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const db = await readJSONFile(file) as ProjectDatabase;
      
      if (db.institutionConfig) {
          setInstitution(db.institutionConfig);
          setEditInstitution(db.institutionConfig);
          localStorage.setItem('takwin_institution_db', JSON.stringify(db.institutionConfig));
      }

      if (db.specialties) {
        setSpecialties(db.specialties);
        setEditData(db.specialties);
        localStorage.setItem('takwin_specialties_db', JSON.stringify(db.specialties));
      }
      
      if (db.trainerConfig) {
        setTrainerConfig(db.trainerConfig);
        setEditTrainerConfig(db.trainerConfig);
        localStorage.setItem('takwin_trainers_db', JSON.stringify(db.trainerConfig));
      }
      
      if (db.schedule) {
          localStorage.setItem('takwin_schedule', JSON.stringify(db.schedule));
          setScheduleExists(true);
      }
      if (db.assignments) localStorage.setItem('takwin_assignments', JSON.stringify(db.assignments));
      if (db.reports) localStorage.setItem('takwin_reports_db', JSON.stringify(db.reports));
      
      if (db.trainees) {
          setTrainees(db.trainees);
          localStorage.setItem('takwin_trainees_db', JSON.stringify(db.trainees));
      }

      if (db.attendance) {
          setAttendance(db.attendance);
          localStorage.setItem('takwin_attendance_db', JSON.stringify(db.attendance));
      }

      alert('تم استيراد قاعدة البيانات وتحديث جميع الإعدادات بنجاح!');
      const savedTrainees = localStorage.getItem('takwin_trainees_db');
      if (savedTrainees) setTrainees(JSON.parse(savedTrainees));
      
      const savedAtt = localStorage.getItem('takwin_attendance_db');
      if (savedAtt) setAttendance(JSON.parse(savedAtt));

    } catch (err) {
      alert('خطأ في قراءة الملف. تأكد من صحة التنسيق.');
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handlers for Institution
  const handleSaveInst = () => {
      setInstitution(editInstitution);
      localStorage.setItem('takwin_institution_db', JSON.stringify(editInstitution));
      setIsEditingInst(false);
  };

  // Handlers for Specialties
  const handleEditClick = () => {
    setEditData([...specialties]); 
    setIsEditing(true);
  };

  const handleSave = () => {
    setSpecialties(editData);
    localStorage.setItem('takwin_specialties_db', JSON.stringify(editData));
    setIsEditing(false);
  };

  const handleInputChange = (id: string, field: 'count' | 'groups', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setEditData(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: numValue } : item
    ));
  };

  // Handlers for Trainers
  const handleEditTrainers = () => {
      setEditTrainerConfig(JSON.parse(JSON.stringify(trainerConfig)));
      setIsEditingTrainers(true);
  };

  const handleSaveTrainers = () => {
      setTrainerConfig(editTrainerConfig);
      localStorage.setItem('takwin_trainers_db', JSON.stringify(editTrainerConfig));
      setIsEditingTrainers(false);
  };

  const updateGeneralCount = (moduleId: number, count: number) => {
      setEditTrainerConfig(prev => ({
          ...prev,
          [moduleId]: {
              ...prev[moduleId],
              generalCount: count
          }
      }));
  };

  const updateSpecialtyCount = (moduleId: number, specId: string, count: number) => {
      setEditTrainerConfig(prev => {
          const currentModule = prev[moduleId] || { names: {}, specialtyCounts: {} };
          return {
            ...prev,
            [moduleId]: {
                ...currentModule,
                specialtyCounts: {
                    ...(currentModule.specialtyCounts || {}),
                    [specId]: count
                }
            }
          };
      });
  };

  const updateTrainerName = (moduleId: number, key: string, name: string) => {
      setEditTrainerConfig(prev => ({
          ...prev,
          [moduleId]: {
              ...prev[moduleId],
              names: {
                  ...prev[moduleId]?.names,
                  [key]: name
              }
          }
      }));
  };

  // --- STATS CALCULATION ---
  const totalTrainees = trainees.length > 0 ? trainees.length : specialties.reduce((acc, curr) => acc + curr.count, 0);
  const totalGroups = specialties.reduce((acc, curr) => acc + curr.groups, 0);
  const totalHours = SESSIONS.reduce((acc, curr) => acc + curr.hoursTotal, 0);
  
  // Demographics
  const maleCount = trainees.filter(t => t.gender === 'M').length;
  const femaleCount = trainees.filter(t => t.gender === 'F').length;
  const malePercent = totalTrainees > 0 ? (maleCount / totalTrainees) * 100 : 50;

  // Absences
  const totalAbsences = Object.values(attendance).filter(status => status === 'A').length;
  const absenceStatus = totalAbsences === 0 ? 'ممتاز' : totalAbsences < 10 ? 'جيد' : 'مقلق';
  const absenceColor = totalAbsences === 0 ? 'text-emerald-400' : totalAbsences < 10 ? 'text-amber-400' : 'text-red-400';

  // Unique Trainers
  const getUniqueTrainersCount = () => {
      const names = new Set<string>();
      Object.values(trainerConfig).forEach((conf: any) => {
          if (conf.names) {
              Object.values(conf.names).forEach((name: unknown) => {
                  if (typeof name === 'string' && name.trim().length > 1) {
                      names.add(name.trim().toLowerCase());
                  }
              });
          }
      });
      return names.size;
  };
  const activeTrainersCount = getUniqueTrainersCount();

  // --- READINESS CALCULATION ---
  const calculateReadiness = () => {
      const steps = [
          { label: 'إدخال بيانات المؤسسة', done: !!(institution.wilaya && institution.center) },
          { label: 'استيراد قائمة المتربصين', done: trainees.length > 0 },
          { label: 'ضبط عدد الأفواج', done: totalGroups > 0 },
          { label: 'تعيين الأسماء للطاقم البيداغوجي', done: Object.keys(trainerConfig).length > 0 },
          { label: 'توليد جدول التوقيت', done: scheduleExists }
      ];
      const completed = steps.filter(s => s.done).length;
      const percent = Math.round((completed / steps.length) * 100);
      return { steps, percent };
  };
  const readiness = calculateReadiness();

  // --- PRESENTATION DATA PREP ---
  const pieData = [
      { name: 'إناث', value: femaleCount, color: '#ec4899' },
      { name: 'ذكور', value: maleCount, color: '#3b82f6' },
  ];
  
  const barData = specialties.map(s => ({
      name: s.name,
      count: s.count,
      groups: s.groups
  }));

  // Helper for Top Municipalities
  const getTopMunicipalities = () => {
      const counts: Record<string, number> = {};
      trainees.forEach(t => {
          if (t.municipality) counts[t.municipality] = (counts[t.municipality] || 0) + 1;
      });
      return Object.entries(counts)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* MODE TOGGLE SWITCH */}
      <div className="flex justify-end mb-4 print:hidden">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex gap-2">
              <button
                  onClick={() => setViewMode('presentation')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      viewMode === 'presentation' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white'
                  }`}
              >
                  <Presentation className="w-4 h-4" />
                  وضع العرض (الافتتاحي)
              </button>
              <button
                  onClick={() => setViewMode('admin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      viewMode === 'admin' 
                      ? 'bg-slate-700 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white'
                  }`}
              >
                  <Settings2 className="w-4 h-4" />
                  وضع الإدارة (البيانات)
              </button>
          </div>
      </div>

      {/* ======================= PRESENTATION MODE ======================= */}
      {viewMode === 'presentation' && (
          <div className="space-y-8 animate-fadeIn">
              
              {/* 1. HERO BANNER */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
                  {/* Background with Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 z-0"></div>
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] z-0"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                      <h3 className="text-emerald-400 font-bold tracking-widest uppercase mb-4 text-sm flex items-center gap-2">
                          <Flag className="w-4 h-4" /> الجمهورية الجزائرية الديمقراطية الشعبية
                      </h3>
                      
                      <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-6 drop-shadow-sm leading-tight">
                          التكوين البيداغوجي التحضيري
                          <br/>
                          <span className="text-3xl md:text-5xl text-blue-400 mt-2 block">لأساتذة التعليم الابتدائي (2025/2026)</span>
                      </h1>

                      <div className="flex flex-wrap justify-center gap-6 mt-4">
                          <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur px-6 py-3 rounded-full border border-slate-600">
                              <MapPin className="text-red-400 w-5 h-5" />
                              <span className="font-bold text-slate-200">{institution.wilaya || 'مديرية التربية'}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur px-6 py-3 rounded-full border border-slate-600">
                              <Building2 className="text-emerald-400 w-5 h-5" />
                              <span className="font-bold text-slate-200">{institution.center || 'مركز التكوين'}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* 2. TIMELINE ROADMAP */}
              <div className="bg-slate-900/80 backdrop-blur p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                      <Calendar className="text-amber-400" />
                      الأجندة الزمنية للدورة التكوينية
                  </h3>
                  
                  <div className="relative">
                      {/* Line */}
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -translate-y-1/2 z-0 hidden md:block"></div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                          {[...SESSIONS, { id: 4, name: 'الامتحان النهائي', startDate: '2026-07-25', endDate: '2026-07-27', description: 'اختتام التكوين والمداولات' }].map((session, idx) => {
                              // Determine status roughly based on date (mock logic for demo, real logic compares with today)
                              const today = new Date().toISOString().split('T')[0];
                              // Use optional chaining or fallback to avoid TS error, though we added endDate now
                              const sessionEnd = (session as any).endDate || '2099-12-31';
                              const isActive = session.startDate <= today && sessionEnd >= today;
                              const isPast = sessionEnd < today;
                              
                              return (
                                  <div key={idx} className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-2 ${
                                      isActive 
                                      ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                                      : isPast 
                                          ? 'bg-slate-800/50 border-emerald-500/50 grayscale-[0.5]' 
                                          : 'bg-slate-900 border-slate-700 opacity-60'
                                  }`}>
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-3 ${
                                          isActive ? 'bg-blue-500 text-white' : isPast ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                                      }`}>
                                          {idx + 1}
                                      </div>
                                      <h4 className="font-bold text-white text-lg">{session.name}</h4>
                                      <p className="text-slate-400 text-sm mt-1 font-mono">{formatDate(session.startDate).split(' ').slice(1,3).join(' ')}</p>
                                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{session.description?.split(':')[0]}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>

              {/* 3. STRATEGIC COUNTERS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-blue-200 font-bold text-sm mb-1">تعداد المتكونين</p>
                              <h3 className="text-4xl font-black">{totalTrainees}</h3>
                          </div>
                          <div className="p-3 bg-white/20 rounded-xl"><Users className="w-6 h-6" /></div>
                      </div>
                      <p className="mt-4 text-xs bg-black/20 inline-block px-2 py-1 rounded">
                          نسبة الإناث: {Math.round((femaleCount/totalTrainees)*100 || 0)}%
                      </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-purple-200 font-bold text-sm mb-1">الهيكل التربوي</p>
                              <h3 className="text-4xl font-black">{totalGroups}</h3>
                          </div>
                          <div className="p-3 bg-white/20 rounded-xl"><Layers className="w-6 h-6" /></div>
                      </div>
                      <p className="mt-4 text-xs bg-black/20 inline-block px-2 py-1 rounded">
                          عدد الأفواج التربوية
                      </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-emerald-200 font-bold text-sm mb-1">الطاقم البيداغوجي</p>
                              <h3 className="text-4xl font-black">{activeTrainersCount}</h3>
                          </div>
                          <div className="p-3 bg-white/20 rounded-xl"><GraduationCap className="w-6 h-6" /></div>
                      </div>
                      <p className="mt-4 text-xs bg-black/20 inline-block px-2 py-1 rounded">
                          أستاذ مكون ومشرف
                      </p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-amber-100 font-bold text-sm mb-1">الحجم الساعي</p>
                              <h3 className="text-4xl font-black">{totalHours}</h3>
                          </div>
                          <div className="p-3 bg-white/20 rounded-xl"><Clock className="w-6 h-6" /></div>
                      </div>
                      <p className="mt-4 text-xs bg-black/20 inline-block px-2 py-1 rounded">
                          ساعة تكوين فعلية
                      </p>
                  </div>
              </div>

              {/* 4. ANALYTICS & STATUS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Demographics Charts */}
                  <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                          <PieIcon className="text-purple-400" /> المؤشرات الديموغرافية
                      </h3>
                      <div className="flex flex-col md:flex-row gap-8 flex-1">
                          <div className="flex-1 h-64 relative">
                              <h4 className="text-center text-xs text-slate-400 mb-2 font-bold">توزيع الجنس</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                          {pieData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                      </Pie>
                                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                                      <Legend />
                                  </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4">
                                  <span className="text-2xl font-bold text-white">{totalTrainees}</span>
                                  <span className="block text-[10px] text-slate-400">مجموع</span>
                              </div>
                          </div>
                          <div className="flex-1 h-64">
                              <h4 className="text-center text-xs text-slate-400 mb-2 font-bold">توزيع التخصصات</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={barData} layout="vertical">
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 10}} />
                                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                                      <Bar dataKey="count" fill="#6366f1" radius={[0,4,4,0]} barSize={20} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>

                  {/* System Status Card */}
                  <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-slate-800 shadow-xl">
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                          <Activity className="text-emerald-400" /> حالة النظام والجاهزية
                      </h3>
                      <div className="space-y-4">
                          {readiness.steps.map((step, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                                  <span className="text-sm text-slate-300 font-medium">{step.label}</span>
                                  {step.done 
                                      ? <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> جاهز</div>
                                      : <div className="flex items-center gap-1 text-slate-500 text-xs font-bold"><Clock className="w-4 h-4" /> قيد الإنجاز</div>
                                  }
                              </div>
                          ))}
                          <div className="mt-6 pt-6 border-t border-slate-800">
                              <h4 className="text-xs font-bold text-slate-400 mb-3">التوزيع الجغرافي (أعلى البلديات)</h4>
                              <div className="flex flex-wrap gap-2">
                                  {getTopMunicipalities().map((m, i) => (
                                      <span key={i} className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 border border-slate-700">
                                          {m.name} ({m.count})
                                      </span>
                                  ))}
                                  {getTopMunicipalities().length === 0 && <span className="text-xs text-slate-600">لا توجد بيانات جغرافية</span>}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ======================= ADMIN MODE (Original Content) ======================= */}
      {viewMode === 'admin' && (
        <div className="animate-fadeIn space-y-6">
            
            {/* 0. READINESS MONITOR (Manager's View) */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                    {/* Progress Circle */}
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={351} strokeDashoffset={351 - (351 * readiness.percent) / 100}
                                className={`${readiness.percent === 100 ? 'text-emerald-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} 
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-white">{readiness.percent}%</span>
                            <span className="text-[10px] text-slate-400">جاهزية الدورة</span>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Activity className="text-blue-400" />
                                    مؤشر تحضير العملية التكوينية
                                </h2>
                                <p className="text-slate-400 text-sm">تابع مدى تقدمك في إعداد البيانات قبل الانطلاق الرسمي</p>
                            </div>
                            <button 
                                onClick={handleFactoryReset}
                                className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 px-4 py-2 rounded-lg text-xs font-bold border border-red-900/50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> بدء موسم جديد (تصفير)
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {readiness.steps.map((step, idx) => (
                                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${step.done ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700'}`}>
                                    {step.done 
                                        ? <div className="p-1 bg-emerald-500 rounded-full"><CheckCircle2 className="w-3 h-3 text-white" /></div>
                                        : <div className="p-1 bg-slate-700 rounded-full"><XCircle className="w-3 h-3 text-slate-400" /></div>
                                    }
                                    <span className={`text-sm font-medium ${step.done ? 'text-emerald-100' : 'text-slate-400'}`}>{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Institution Info Card */}
            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-dzgreen-600 to-dzgreen-800"></div>
                
                <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-dzgreen-900/20 rounded-xl border border-dzgreen-500/20">
                            <Building2 className="w-6 h-6 text-dzgreen-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">البيانات التعريفية للدورة التكوينية</h2>
                            <p className="text-slate-400 text-sm">المعلومات الرسمية الخاصة بمركز التكوين والولاية</p>
                        </div>
                    </div>
                    {!isEditingInst ? (
                        <button 
                            onClick={() => { setEditInstitution(institution); setIsEditingInst(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                            title="تعديل البيانات"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل البيانات
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveInst}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                title="حفظ"
                            >
                                <Save className="w-3.5 h-3.5" />
                                حفظ
                            </button>
                            <button 
                                onClick={() => setIsEditingInst(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                title="إلغاء"
                            >
                                <X className="w-3.5 h-3.5" />
                                إلغاء
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> الولاية
                        </label>
                        {isEditingInst ? (
                            <input 
                                type="text" 
                                value={editInstitution.wilaya}
                                onChange={e => setEditInstitution({...editInstitution, wilaya: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-dzgreen-500 outline-none"
                                placeholder="مثال: الجزائر شرق"
                            />
                        ) : (
                            <div className="text-lg font-bold text-white border-b border-slate-800 pb-2">{institution.wilaya || '---'}</div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> المعهد الوطني لتكوين مستخدمي التربية (INPE)
                        </label>
                        {isEditingInst ? (
                            <input 
                                type="text" 
                                value={editInstitution.institute}
                                onChange={e => setEditInstitution({...editInstitution, institute: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-dzgreen-500 outline-none"
                                placeholder="مثال: الحراش"
                            />
                        ) : (
                            <div className="text-lg font-bold text-white border-b border-slate-800 pb-2">{institution.institute || '---'}</div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> مركز التكوين
                        </label>
                        {isEditingInst ? (
                            <input 
                                type="text" 
                                value={editInstitution.center}
                                onChange={e => setEditInstitution({...editInstitution, center: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-dzgreen-500 outline-none"
                                placeholder="مثال: ثانوية العقيد لطفي"
                            />
                        ) : (
                            <div className="text-lg font-bold text-white border-b border-slate-800 pb-2">{institution.center || '---'}</div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> المدير البيداغوجي / رئيس المركز
                        </label>
                        {isEditingInst ? (
                            <input 
                                type="text" 
                                value={editInstitution.director}
                                onChange={e => setEditInstitution({...editInstitution, director: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-dzgreen-500 outline-none"
                                placeholder="الاسم واللقب"
                            />
                        ) : (
                            <div className="text-lg font-bold text-white border-b border-slate-800 pb-2">{institution.director || '---'}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. VITAL INDICATORS (New Replaces Old Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1: Human Resources (Trainees + Demographics) */}
                <div className="bg-slate-900/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-800/60 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                    <p className="text-slate-400 text-xs font-bold mb-1">تعداد المتكونين</p>
                    <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                        {totalTrainees}
                    </h3>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <Users className="w-5 h-5 text-blue-400" />
                    </div>
                </div>
                {/* Mini Bar Chart */}
                <div className="mt-3 relative z-10">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold">
                        <span>ذكور ({maleCount})</span>
                        <span>إناث ({femaleCount})</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${malePercent}%` }}></div>
                        <div className="h-full bg-pink-500" style={{ width: `${100 - malePercent}%` }}></div>
                    </div>
                </div>
                </div>

                {/* CARD 2: Pedagogical Staff (Real Count) */}
                <div className="bg-slate-900/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-800/60 hover:border-purple-500/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                    <p className="text-slate-400 text-xs font-bold mb-1">الطاقم البيداغوجي</p>
                    <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors">
                        {activeTrainersCount > 0 ? activeTrainersCount : '--'}
                    </h3>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                    عدد المكونين الفعليين (بدون تكرار)
                </p>
                </div>

                {/* CARD 3: Absence Analytics */}
                <div className="bg-slate-900/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-800/60 hover:border-red-500/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                    <div>
                    <p className="text-slate-400 text-xs font-bold mb-1">مؤشر الغياب</p>
                    <h3 className={`text-2xl font-black transition-colors ${absenceColor}`}>
                        {totalAbsences}
                    </h3>
                    </div>
                    <div className="flex gap-2">
                        {totalAbsences > 0 && (
                            <button 
                                onClick={handleResetAttendance}
                                title="تصفير الغيابات (حذف السجل)"
                                className="p-1.5 bg-slate-800 hover:bg-red-900/50 rounded-lg group-hover:text-red-400 text-slate-500 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                        <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${totalAbsences === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <p className="text-[10px] text-slate-400 font-bold">الحالة: {absenceStatus}</p>
                </div>
                </div>
                
                {/* CARD 4: Database & Logistics */}
                <div className="bg-slate-900/80 backdrop-blur p-5 rounded-2xl shadow-lg border border-slate-800/60 hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs font-bold mb-1">الحجم الساعي / الأفواج</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl font-black text-white">{totalHours} سا</h3>
                                <span className="text-xs text-slate-500">/ {totalGroups} فوج</span>
                            </div>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/50">
                        <button onClick={handleExportDB} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 rounded transition-colors border border-slate-700">
                            <Download className="w-3 h-3 inline mx-1" /> حفظ DB
                        </button>
                        <button onClick={handleImportClick} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1.5 rounded transition-colors">
                            <Upload className="w-3 h-3 inline mx-1" /> استيراد
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 3. Specialties */}
                <div className="space-y-6">
                    
                    {/* Specialty Distribution */}
                    <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 h-full">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h3 className="text-lg font-bold text-white">توزيع التخصصات والأفواج</h3>
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <button 
                                        onClick={handleEditClick}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
                                        title="تعديل التخصصات"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        تعديل
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handleSave}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                            title="حفظ"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            حفظ
                                        </button>
                                        <button 
                                            onClick={() => { setIsEditing(false); setEditData([...specialties]); }}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                            title="إلغاء"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            إلغاء
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            {(isEditing ? editData : specialties).map((spec) => (
                            <div key={spec.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${spec.color.split(' ')[0].replace('bg-', 'bg-').replace('/10', '')}`}></div>
                                <span className="font-medium text-slate-200">{spec.name}</span>
                                </div>
                                
                                {isEditing ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center">
                                            <label className="text-[10px] text-slate-500 mb-0.5">المتكونين</label>
                                            <input 
                                                type="number" 
                                                value={spec.count}
                                                onChange={(e) => handleInputChange(spec.id, 'count', e.target.value)}
                                                className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-sm text-white focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <label className="text-[10px] text-slate-500 mb-0.5">أفواج</label>
                                            <input 
                                                type="number" 
                                                value={spec.groups}
                                                onChange={(e) => handleInputChange(spec.id, 'groups', e.target.value)}
                                                className="w-14 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-sm text-white focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700 min-w-[70px] text-center">{spec.groups} أفواج</span>
                                        <span className="font-bold text-white min-w-[80px] text-left" dir="ltr">{spec.count} أستاذ</span>
                                    </div>
                                )}
                            </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Trainers Column */}
                <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-2">
                            <UserCog className="text-purple-400" />
                            <h3 className="text-lg font-bold text-white">إدارة الطاقم البيداغوجي</h3>
                        </div>
                        <div className="flex gap-2">
                            {!isEditingTrainers ? (
                                <button 
                                    onClick={handleEditTrainers}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20"
                                    title="تعيين الأساتذة"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    تعيين الأساتذة
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleSaveTrainers}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                        title="حفظ"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        حفظ
                                    </button>
                                    <button 
                                        onClick={() => { setIsEditingTrainers(false); setEditTrainerConfig(JSON.parse(JSON.stringify(trainerConfig))); }}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                        title="إلغاء"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        إلغاء
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 max-h-[600px]">
                        {MODULES.map(m => {
                            const config = (isEditingTrainers ? editTrainerConfig : trainerConfig)[m.id] || { names: {} };
                            const isDidactics = m.id === 1;

                            return (
                                <div key={m.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-slate-200 text-sm w-2/3">{m.title}</h4>
                                        {!isDidactics && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500">العدد:</span>
                                                {isEditingTrainers ? (
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        max="15"
                                                        value={config.generalCount || 1}
                                                        onChange={(e) => updateGeneralCount(m.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-center text-xs text-white focus:border-purple-500 outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">{config.generalCount || 1}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {isDidactics ? (
                                            specialties.map(spec => {
                                                const count = config.specialtyCounts?.[spec.id] || 1;
                                                return (
                                                    <div key={spec.id} className="border-t border-slate-800/50 pt-2 mt-2">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${spec.color} text-center`}>
                                                                {spec.name}
                                                            </span>
                                                            {isEditingTrainers && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-500">عدد الأساتذة:</span>
                                                                    <input 
                                                                        type="number" min="1" max="5" 
                                                                        value={count}
                                                                        onChange={(e) => updateSpecialtyCount(m.id, spec.id, parseInt(e.target.value)||1)}
                                                                        className="w-10 bg-slate-900 border border-slate-600 rounded text-center text-xs"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2 pl-2 border-r-2 border-slate-700 mr-1">
                                                            {Array.from({ length: count }).map((_, idx) => {
                                                                const key = `${spec.id}-${idx + 1}`;
                                                                return (
                                                                    <div key={idx} className="flex gap-2">
                                                                        {isEditingTrainers ? (
                                                                            <input 
                                                                                type="text" placeholder={`أستاذ ${spec.name} ${idx+1}`}
                                                                                value={config.names?.[key] || ''}
                                                                                onChange={(e) => updateTrainerName(m.id, key, e.target.value)}
                                                                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs text-slate-300 block">
                                                                                {config.names?.[key] || <span className="italic text-slate-600">أستاذ {idx+1} (غير محدد)</span>}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {Array.from({ length: config.generalCount || 1 }).map((_, idx) => {
                                                    const key = (idx + 1).toString();
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500 w-6">{idx + 1}.</span>
                                                            {isEditingTrainers ? (
                                                                <input 
                                                                    type="text"
                                                                    placeholder={`اسم المكون ${idx + 1}`}
                                                                    value={config.names?.[key] || ''}
                                                                    onChange={(e) => updateTrainerName(m.id, key, e.target.value)}
                                                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-purple-500 outline-none"
                                                                />
                                                            ) : (
                                                                <span className="flex-1 text-xs text-slate-300 truncate">
                                                                    {config.names?.[key] || <span className="text-slate-600 italic">غير محدد</span>}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;