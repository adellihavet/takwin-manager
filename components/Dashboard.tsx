
import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Layers, Edit2, Save, X, UserCog, Database, Upload, Download, Building2, MapPin, UserCheck, PieChart as PieIcon, BarChart3, Map, ClipboardX, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { SPECIALTIES as DEFAULT_SPECIALTIES, SESSIONS, MODULES } from '../constants';
import { Specialty, TrainerConfig, ProjectDatabase, InstitutionConfig, Trainee, AttendanceRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
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

    // Direct synchronous update to ensure state changes immediately
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
            // Count exact absences 'A'
            loadedAbsenceCount = Object.values(parsed).filter(x => x === 'A').length;
        }

        // Small delay just for UI feedback
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
    // We call the internal logic without alert on mount
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

      alert('تم استيراد قاعدة البيانات وتحديث جميع الإعدادات (بما في ذلك المتكونين والغياب) بنجاح!');
      // Force reload data into state
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

  // --- ANALYTICS LOGIC ---
  const calculateAnalytics = () => {
      // Demographics
      let male = 0, female = 0;
      const currentYear = new Date().getFullYear();
      const ageGroups = { '20-29': 0, '30-39': 0, '40-49': 0, '+50': 0 };
      const munCounts: Record<string, number> = {};

      if (trainees && trainees.length > 0) {
        trainees.forEach(t => {
            // Gender
            if (t.gender === 'M') male++; else female++;
            
            // Age
            if (t.dob) {
                let year = NaN;
                const dobStr = t.dob.toString().trim();
                if (dobStr.includes('-')) year = parseInt(dobStr.split('-')[0]);
                else if (dobStr.includes('/')) {
                    const parts = dobStr.split('/');
                    if (parts.length === 3) year = parseInt(parts[2]);
                } else if (dobStr.length === 4) year = parseInt(dobStr);

                if (!isNaN(year) && year > 1900 && year <= currentYear) {
                    const age = currentYear - year;
                    if (age >= 20 && age < 30) ageGroups['20-29']++;
                    else if (age >= 30 && age < 40) ageGroups['30-39']++;
                    else if (age >= 40 && age < 50) ageGroups['40-49']++;
                    else if (age >= 50) ageGroups['+50']++;
                }
            }

            // Geo
            let m = 'غير محدد';
            if (t.municipality && t.municipality.trim().length > 0) m = t.municipality.trim();
            munCounts[m] = (munCounts[m] || 0) + 1;
        });
      }

      const genderData = [{ name: 'ذكور', value: male, color: '#3b82f6' }, { name: 'إناث', value: female, color: '#ec4899' }];
      const ageData = Object.entries(ageGroups).map(([key, val]) => ({ name: key, value: val }));
      const geoData = Object.entries(munCounts).sort(([,a], [,b]) => b - a).slice(0, 7).map(([key, val]) => ({ name: key, value: val }));

      // Attendance Analytics
      // 1. Identify distinct dates that have ANY record
      const uniqueDays = new Set<string>();
      
      let totalAbsences = 0;
      const absenceBySpecialty: Record<string, number> = {};
      const traineeAbsenceCount: Record<string, number> = {};

      if (attendance) {
        Object.entries(attendance).forEach(([key, status]) => {
            // Key: YYYY-MM-DD-TRAINEE_ID
            const dateStr = key.substring(0, 10);
            uniqueDays.add(dateStr);

            if (status === 'A') {
                totalAbsences++;
                const tId = key.length > 11 ? key.substring(11) : '';
                
                if (tId) {
                   traineeAbsenceCount[tId] = (traineeAbsenceCount[tId] || 0) + 1;

                   const t = trainees.find(tr => tr.id === tId);
                   if (t) {
                       absenceBySpecialty[t.specialtyId] = (absenceBySpecialty[t.specialtyId] || 0) + 1;
                   }
                }
            }
        });
      }

      // Calculation:
      // Total Possible Presence = (Number of Days with records) * (Total Number of Trainees)
      // This assumes if a day has records, ALL trainees were expected to be there (Implicit Presence)
      const daysCount = uniqueDays.size || 0;
      const traineesCount = trainees.length || 0;
      
      // Prevent division by zero if no data
      let attendanceRate = 0;
      if (daysCount > 0 && traineesCount > 0) {
          const totalPossibleAttendance = daysCount * traineesCount;
          const actualPresence = totalPossibleAttendance - totalAbsences;
          attendanceRate = Math.round((actualPresence / totalPossibleAttendance) * 100);
      } else {
          // If no days recorded yet, assume 100% or 0% depending on preference. usually 0 or -
          attendanceRate = 0;
      }
      
      const absenceChartData = specialties.map(s => ({
          name: s.name,
          value: absenceBySpecialty[s.id] || 0,
          color: s.color.includes('blue') ? '#3b82f6' : s.color.includes('indigo') ? '#6366f1' : s.color.includes('purple') ? '#a855f7' : '#10b981'
      }));

      // Top Absentees
      const topAbsentees = Object.entries(traineeAbsenceCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([id, count]) => {
              const t = trainees.find(tr => tr.id === id);
              return { name: t ? `${t.surname} ${t.name}` : `متربص غير موجود (${id})`, count, specialty: t ? specialties.find(s=>s.id === t.specialtyId)?.name : '' };
          });

      return { genderData, ageData, geoData, attendanceRate, totalAbsences, absenceChartData, topAbsentees };
  };

  const analytics = calculateAnalytics();
  const COLORS = ['#3b82f6', '#6366f1', '#a855f7', '#10b981'];
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
                >
                    <Edit2 className="w-3.5 h-3.5" />
                    تعديل البيانات
                </button>
            ) : (
                <div className="flex gap-2">
                    <button 
                        onClick={handleSaveInst}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        حفظ
                    </button>
                    <button 
                        onClick={() => setIsEditingInst(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
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
            <p className="text-slate-400 text-sm font-medium mb-1">مجموع الأساتذة المتكونين</p>
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
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <Download className="w-3.5 h-3.5" />
                    حفظ
                </button>
                <button 
                    onClick={handleImportClick}
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
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                تعديل
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    حفظ
                                </button>
                                <button 
                                    onClick={() => { setIsEditing(false); setEditData([...specialties]); }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
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
                
                <div className="h-64">
                    <h4 className="text-center text-xs text-slate-500 mb-2">نسبة التوزيع حسب التخصص</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={(isEditing ? editData : specialties) as any[]}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            stroke="none"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                            {(isEditing ? editData : specialties).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
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
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعيين الأساتذة
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={handleSaveTrainers}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                            >
                                <Save className="w-3.5 h-3.5" />
                                حفظ
                            </button>
                            <button 
                                onClick={() => { setIsEditingTrainers(false); setEditTrainerConfig(JSON.parse(JSON.stringify(trainerConfig))); }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
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
                                    // DIDACTICS: Per Specialty
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
                                                {/* Inputs for each trainer in this specialty */}
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
                                    // GENERAL: Simple List based on generalCount
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

      {/* 5. ANALYTICS SECTION (FULL WIDTH) */}
      <div className="space-y-8">
            {/* Demographics */}
            <div className="bg-slate-900/80 backdrop-blur p-8 rounded-2xl shadow-lg border border-slate-800/60 mt-8 animate-slideUp">
                <h3 className="text-xl font-bold text-white mb-8 border-b border-slate-800 pb-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-400 w-6 h-6" />
                    التحليل الديموغرافي والجغرافي للمتكونين
                </h3>
                {trainees.length === 0 ? (
                    <div className="text-center text-slate-500 py-12">
                        لا توجد بيانات للمتكونين لعرض الإحصائيات. يرجى إضافة أو استيراد قائمة المتربصين.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Gender Chart */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 h-80 flex flex-col">
                            <h4 className="text-center text-sm text-slate-300 mb-4 font-bold flex items-center justify-center gap-2">
                                <Users className="w-4 h-4 text-pink-400" /> التوزيع حسب الجنس
                            </h4>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={analytics.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none" label>
                                            {analytics.genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Age Chart */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 h-80 flex flex-col">
                            <h4 className="text-center text-sm text-slate-300 mb-4 font-bold flex items-center justify-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" /> الفئات العمرية
                            </h4>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.ageData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" tick={{fill: '#cbd5e1', fontSize: 12}} />
                                        <YAxis tick={{fill: '#94a3b8'}} allowDecimals={false} />
                                        <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="العدد" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Geography Chart */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 h-80 flex flex-col">
                            <h4 className="text-center text-sm text-slate-300 mb-4 font-bold flex items-center justify-center gap-2">
                                <Map className="w-4 h-4 text-emerald-400" /> التوزيع الجغرافي (أعلى البلديات)
                            </h4>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.geoData} layout="vertical" margin={{ left: 10, right: 40, top: 10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" tick={{fill: '#94a3b8'}} allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={90} tick={{fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold'}} />
                                        <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="العدد" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ATTENDANCE ANALYTICS */}
            <div className="bg-slate-900/80 backdrop-blur p-8 rounded-2xl shadow-lg border border-slate-800/60 animate-slideUp delay-100">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ClipboardX className="text-red-400 w-6 h-6" />
                        مؤشرات المواظبة والانضباط
                    </h3>
                    <button 
                        onClick={refreshAllData}
                        disabled={isRefreshing}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border shadow-md ${
                            isRefreshing 
                            ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-wait' 
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:shadow-lg transform hover:scale-105'
                        }`}
                        title="تحديث البيانات من السجل"
                    >
                        {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                        {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Summary Stats */}
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center h-40">
                            <span className="text-slate-400 text-sm mb-2">نسبة الحضور العامة</span>
                            <div className="text-5xl font-black text-emerald-400 drop-shadow-lg">{analytics.attendanceRate}%</div>
                            <div className="w-full h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${analytics.attendanceRate}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex items-center justify-between h-32">
                            <div>
                                <span className="text-slate-400 text-sm block mb-1">مجموع الغيابات المسجلة</span>
                                <span className="text-3xl font-black text-red-400">{analytics.totalAbsences}</span>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Middle: Absence by Specialty */}
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 h-80 flex flex-col">
                        <h4 className="text-center text-sm text-slate-300 mb-4 font-bold">عدد الغيابات حسب التخصص</h4>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.absenceChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" tick={{fill: '#cbd5e1', fontSize: 10}} interval={0} />
                                    <YAxis tick={{fill: '#94a3b8'}} allowDecimals={false} />
                                    <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30} name="الغيابات">
                                        {analytics.absenceChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Top Absentees List */}
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 h-80 overflow-hidden flex flex-col">
                        <h4 className="text-center text-sm text-slate-300 mb-4 font-bold text-red-300">أكثر المتكونين غياباً (Top 5)</h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {analytics.topAbsentees.length > 0 ? analytics.topAbsentees.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-slate-900/50 rounded border border-slate-700/50">
                                    <div>
                                        <div className="text-sm font-bold text-white">{item.name}</div>
                                        <div className="text-[10px] text-slate-400">{item.specialty}</div>
                                    </div>
                                    <div className="bg-red-500/20 text-red-400 font-bold px-2 py-1 rounded text-xs">
                                        {item.count} غياب
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-slate-500 text-sm mt-10">لا توجد غيابات مسجلة حتى الآن</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
      </div>
    </div>
  );
};

export default Dashboard;