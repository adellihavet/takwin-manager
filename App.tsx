
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CurriculumTable from './components/CurriculumTable';
import ScheduleView from './components/ScheduleView';
import TimetableGenerator from './components/TimetableGenerator';
import SummaryReport from './components/SummaryReport';
import TraineeManager from './components/TraineeManager';
import CertificateGenerator from './components/CertificateGenerator';
import EvaluationManager from './components/EvaluationManager';
import DataAnalytics from './components/DataAnalytics';
import OnboardingTour from './components/OnboardingTour';
import SmartHelpTooltip from './components/SmartHelpTooltip';
import TakwinChatbot from './components/TakwinChatbot';
import PrintGuide from './components/PrintGuide'; 
import PrivacyBanner from './components/PrivacyBanner';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Table, 
  FileText, 
  Users, 
  Award, 
  HelpCircle, 
  Calculator, 
  BarChart2,
  Printer 
} from 'lucide-react';

function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'curriculum' | 'schedule' | 'timetable' | 'summary' | 'trainees' | 'evaluation' | 'analytics' | 'certificates'>('dashboard');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isPrintGuideOpen, setIsPrintGuideOpen] = useState(false);

  // --- EFFECTS ---
  
  // 1. Check for first-time tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('takwin_tour_completed');
    if (!hasSeenTour) {
      setTimeout(() => setIsTourOpen(true), 1500);
    }
  }, []);

  // 2. Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // --- RENDER HELPERS ---
  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
      isActive 
        ? 'bg-dzgreen-500/10 text-dzgreen-400 border border-dzgreen-500/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-right selection:bg-dzgreen-500 selection:text-white" dir="rtl">
      
      {/* --- GLOBAL OVERLAYS --- */}
      <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      <PrintGuide isOpen={isPrintGuideOpen} onClose={() => setIsPrintGuideOpen(false)} />
      <SmartHelpTooltip />
      <TakwinChatbot />
      <PrivacyBanner />

      {/* --- HEADER & NAVIGATION --- */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo Area */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-dzgreen-600 to-dzgreen-800 text-white p-2 rounded-lg shadow-lg shadow-dzgreen-900/50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight tracking-tight">المدير البيداغوجي</h1>
                <p className="text-xs text-slate-400">المساعد الذكي لتسيير مركز التكوين التحضيري</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-4">
                <nav className="flex space-x-reverse space-x-1 overflow-x-auto pb-1 md:pb-0 max-w-[60vw] scrollbar-hide">
                  
                  <button onClick={() => setActiveTab('dashboard')} className={getTabClass('dashboard')}>
                      <LayoutDashboard className="w-4 h-4" /> <span className="hidden lg:inline">القيادة</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('curriculum')} className={getTabClass('curriculum')}>
                      <BookOpen className="w-4 h-4" /> <span className="hidden lg:inline">البرنامج</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('schedule')} className={getTabClass('schedule')}>
                      <CalendarDays className="w-4 h-4" /> <span className="hidden lg:inline">الرزنامة</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('timetable')} className={getTabClass('timetable')}>
                      <Table className="w-4 h-4" /> <span className="hidden lg:inline">التوزيع</span>
                  </button>
                  
                  {/* Editor Removed - It is now a sub-tab in Timetable */}
                  
                  <button onClick={() => setActiveTab('trainees')} className={getTabClass('trainees')}>
                      <Users className="w-4 h-4" /> <span className="hidden lg:inline">المتكونون</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('evaluation')} className={getTabClass('evaluation')}>
                      <Calculator className="w-4 h-4" /> <span className="hidden lg:inline">التقويم</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('analytics')} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'analytics' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                      <BarChart2 className="w-4 h-4" /> <span className="hidden lg:inline">التحليل</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('certificates')} className={getTabClass('certificates')}>
                      <Award className="w-4 h-4" /> <span className="hidden lg:inline">الشهادات</span>
                  </button>
                  
                  <button onClick={() => setActiveTab('summary')} className={getTabClass('summary')}>
                      <FileText className="w-4 h-4" /> <span className="hidden lg:inline">الحوصلة</span>
                  </button>
                </nav>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsPrintGuideOpen(true)}
                    className="p-2 bg-blue-600 text-white hover:bg-blue-500 rounded-full border border-blue-500 transition-colors shadow-sm" 
                    title="نصائح الطباعة"
                  >
                      <Printer className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => setIsTourOpen(true)} 
                    className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full border border-slate-700 transition-colors shadow-sm" 
                    title="دليل الاستخدام"
                  >
                      <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'curriculum' && <CurriculumTable />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'timetable' && <TimetableGenerator />}
        {/* TimetableEditor is now imported inside TimetableGenerator */}
        {activeTab === 'summary' && <SummaryReport />}
        {activeTab === 'trainees' && <TraineeManager />}
        {activeTab === 'evaluation' && <EvaluationManager />}
        {activeTab === 'analytics' && <DataAnalytics />}
        {activeTab === 'certificates' && <CertificateGenerator />}
      </main>
      
      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 mt-12 py-8 bg-slate-950 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>© 2025 منصة تسيير مركز التكوين التحضيري للأساتذة (كمال دليحة).</p>
        </div>
      </footer>
    </div>
  );
}

export default App;