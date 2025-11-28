
import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Layers, Edit2, Save, X, UserCog, Database, Upload, Download, Building2, MapPin, UserCheck, Loader2 } from 'lucide-react';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS, MODULES } from '../constants';
import { Specialty, TrainerConfig, ProjectDatabase, InstitutionConfig, Trainee, AttendanceRecord } from '../types';
import { downloadJSON, readJSONFile } from '../utils';

const Dashboard: React.FC = () => {
  // State for the data
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  
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
  const [isRefreshing, setIsRefreshing] = useState(false);


  // State for Trainers
  const [trainerConfig, setTrainerConfig] = useState<TrainerConfig>({});
  const [isEditingTrainers, setIsEditingTrainers] = useState(false);
  const [editTrainerConfig, setEditTrainerConfig] = useState<TrainerConfig>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to reload all data from localStorage
  const refreshAllData = () => {
    setIsRefreshing(true);
    let loadedTraineesCount = 0;
    let loadedAbsenceCount = 0;

    try {
        const savedData = localStorage.getItem('takwin_specialties_db');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setSpecialties(parsed);
            setEditData(parsed);
        }

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) {
            const parsed = JSON.parse(savedInst);
            setInstitution(parsed);
            setEditInstitution(parsed);
        }

        const savedTrainers = localStorage.getItem('takwin_trainers_db');
        if (savedTrainers) {
            const parsed = JSON.parse(savedTrainers);
            setTrainerConfig(parsed);
            setEditTrainerConfig(parsed);
        }

        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) {
            const parsed = JSON.parse(savedTrainees);
            setTrainees(parsed); 
            loadedTraineesCount = parsed.length;
        }

        const savedAtt = localStorage.getItem('takwin_attendance_db');
        if (savedAtt) {
            const parsed = JSON.parse(savedAtt);
            setAttendance(parsed); 
            loadedAbsenceCount = Object.values(parsed).filter(x => x === 'A').length;
        }

        setTimeout(() => {
            setIsRefreshing(false);
            alert(`تم تحديث البيانات!\n\n- عدد المتربصين: ${loadedTraineesCount}\n- عدد الغيابات المسجلة: ${loadedAbsenceCount}`);
        }, 300);

    } catch (e) {
        console.error(e);
        setIsRefreshing(false);
        alert('حدث خطأ أثناء تحديث البيانات');
    }
  };

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
  }, []);

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
      version: '1.5',
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
      
      if (db.schedule) localStorage.setItem('takwin_schedule', JSON.stringify(db.schedule));
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

  const totalTrainees = specialties.reduce((acc, curr) => acc + curr.count, 0);
  const totalGroups = specialties.reduce((acc, curr) => acc + curr.groups, 0);
  const totalHours = SESSIONS.reduce((acc, curr) => acc + curr.hoursTotal, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
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

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 flex items-center justify-between hover:border-blue-500/30 transition-colors group">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">مجموع الأساتذة</p>
            <h3 className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {trainees.length > 0 ? trainees.length : totalTrainees}
            </h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 flex items-center justify-between hover:border-emerald-500/30 transition-colors group">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">عدد الأفواج</p>
            <h3 className="text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors">{totalGroups}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
            <Layers className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 flex items-center justify-between hover:border-amber-500/30 transition-colors group">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">الحجم الساعي</p>
            <h3 className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors">{totalHours} <span className="text-sm font-normal text-slate-500">سا</span></h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-amber-400" />
          </div>
        </div>
        
        {/* Database Card */}
        <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 flex flex-col justify-center gap-2 hover:border-red-500/30 transition-colors group">
            <h3 className="text-slate-200 font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-red-400" />
                قاعدة بيانات المشروع
            </h3>
            <div className="flex gap-2 w-full mt-1">
                <button 
                    onClick={handleExportDB}
                    title="حفظ قاعدة البيانات"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <Download className="w-3.5 h-3.5" />
                    حفظ
                </button>
                <button 
                    onClick={handleImportClick}
                    title="استيراد قاعدة البيانات"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Upload className="w-3.5 h-3.5" />
                    استيراد
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleFileChange}
                />
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
  );
};

export default Dashboard;