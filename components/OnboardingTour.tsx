
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Database, LayoutDashboard, Users, Table, FileText, CheckCircle2, Edit3, Calculator, Printer, Award } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    title: "مرحباً بك في منصة تسيير التكوين",
    content: "هذه المنصة الشاملة مصممة لرقمنة تسيير الدورة التكوينية بالكامل، من تسجيل المتربصين إلى غاية طباعة الشهادات النهائية.",
    icon: <CheckCircle2 className="w-16 h-16 text-dzgreen-500" />,
  },
  {
    title: "1. البداية: لوحة القيادة",
    content: "ابدأ من هنا بضبط بيانات المؤسسة (الولاية، المركز)، وتحديد عدد الأفواج لكل تخصص. استخدم زر 'استيراد' لجلب قاعدة بيانات سابقة إذا توفرت.",
    icon: <LayoutDashboard className="w-16 h-16 text-blue-400" />,
  },
  {
    title: "2. المتربصين والأفواج",
    content: "يمكنك استيراد القوائم بملفات CSV. استخدم خاصية 'التوزيع الآلي' لتقسيم المتربصين على الأفواج بالتساوي وبشكل عادل بضغطة زر واحدة.",
    icon: <Users className="w-16 h-16 text-pink-400" />,
  },
  {
    title: "3. التوزيع الزمني والتعديل",
    content: "قم بتوليد الجدول آلياً، ثم استخدم 'المعدل اليدوي' لسحب وإفلات الحصص عند الحاجة. النظام سينبهك فوراً بوجود تعارض في توقيت الأساتذة.",
    icon: <Table className="w-16 h-16 text-purple-400" />,
  },
  {
    title: "4. نظام التقويم (النقاط)",
    content: "تخلص من الحجز اليدوي! قم بتحميل قوائم التنقيط (Excel/CSV) الخاصة بكل أستاذ، أرسلها له ليملأها، ثم أعد رفعها ليتم رصد العلامات آلياً.",
    icon: <Calculator className="w-16 h-16 text-emerald-400" />,
  },
  {
    title: "5. الامتحانات والشهادات",
    content: "توزيع آلي للمتربصين على القاعات، تعيين الحراس، وطباعة كشوف النقاط والشهادات النهائية ومحاضر المداولات بتصميم رسمي.",
    icon: <Award className="w-16 h-16 text-amber-400" />,
  },
  {
    title: "تنبيه هام جداً: إعدادات الطباعة",
    content: "عند طباعة أي وثيقة (جدول، شهادة)، قد يظهر التنسيق متداخلاً. يجب عليك في نافذة الطباعة ضبط 'الهوامش' (Margins) إلى None أو Minimum، واختيار اتجاه الورقة (أفقي/عمودي) حسب نوع الوثيقة لضمان ظهورها بشكل صحيح.",
    icon: <Printer className="w-16 h-16 text-slate-300 border-2 border-dashed border-slate-500 rounded-lg p-2" />,
    isImportant: false // Highlighted visually via icon but not red danger
  },
  {
    title: "حفظ العمل (قاعدة البيانات)",
    content: "التطبيق يعمل على المتصفح. لضمان عدم ضياع عملك عند غلق الصفحة أو تغيير الجهاز، يجب عليك ضغط زر 'حفظ قاعدة البيانات' (في لوحة القيادة) بانتظام.",
    icon: <Database className="w-20 h-20 text-red-500 animate-pulse" />,
    isImportant: true
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('takwin_tour_completed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`bg-slate-900 border-2 ${step.isImportant ? 'border-red-500 shadow-red-900/50' : 'border-slate-700 shadow-slate-900/50'} rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden relative flex flex-col`}>
        
        {/* Header Image/Icon Area */}
        <div className={`h-40 ${step.isImportant ? 'bg-red-500/10' : 'bg-slate-800'} flex items-center justify-center border-b border-slate-800 relative`}>
          <div className={`p-6 bg-slate-950/80 rounded-full backdrop-blur-md border ${step.isImportant ? 'border-red-500/50' : 'border-slate-700'}`}>
            {step.icon}
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors bg-slate-950/50 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800">
            خطوة {currentStep + 1} من {TOUR_STEPS.length}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 text-center flex-1 flex flex-col justify-center items-center min-h-[200px]">
          <h2 className={`text-2xl font-black mb-6 ${step.isImportant ? 'text-red-400' : 'text-white'}`}>
            {step.title}
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed font-medium">
            {step.content}
          </p>
        </div>

        {/* Footer / Controls */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              currentStep === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
            السابق
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-2">
            {TOUR_STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                  ? (step.isImportant ? 'bg-red-500 w-8' : 'bg-dzgreen-500 w-8') 
                  : 'bg-slate-700 w-2'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
              step.isImportant 
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
              : 'bg-dzgreen-600 hover:bg-dzgreen-500 shadow-dzgreen-900/20'
            }`}
          >
            {currentStep === TOUR_STEPS.length - 1 ? 'ابدأ العمل' : 'التالي'}
            {currentStep !== TOUR_STEPS.length - 1 && <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;