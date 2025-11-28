
import React, { useState, useEffect } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

// القاموس الذكي المحدث: دقة عالية لكل وظيفة
// Expanded Smart Dictionary with granular context
const HELP_DICTIONARY: Record<string, string> = {
    // --- إدارة قاعدة البيانات (Dashboard) ---
    "حفظ قاعدة البيانات": "تصدير ملف JSON يحتوي على نسخة احتياطية شاملة لكل عملك (الأساتذة، النقاط، الجداول). ينصح به يومياً.",
    "استيراد قاعدة البيانات": "استرجاع نسخة احتياطية سابقة (ملف JSON) لاستكمال العمل من حيث توقفت.",
    "تحديث البيانات": "إعادة قراءة البيانات من الذاكرة المحلية وتحديث الإحصائيات والأرقام فوراً (مفيد عند حدوث تضارب).",
    
    // --- إعدادات المؤسسة والتخصصات ---
    "تعديل البيانات": "فتح الحقول لتغيير معلومات المؤسسة (الولاية، المركز، المدير).",
    "تعديل التخصصات": "تغيير عدد الأفواج أو عدد الأساتذة لكل تخصص.",
    "تعيين الأساتذة": "إسناد الأساتذة لكل مقياس (بالاسم) ليظهروا في جداول التوقيت وفي الاستدعاءات.",
    
    // --- الجداول الزمنية (Timetable) ---
    "توليد التوزيع الشامل": "تشغيل الخوارزمية الذكية لإنشاء جدول زمني أسبوعي يراعي القيود وتوفر الأساتذة وعدم التضارب.",
    "توليد التوزيع (بدون فراغات)": "محاولة إنشاء جدول مضغوط قدر الإمكان.",
    "العرض المباشر": "معاينة الجدول على الشاشة قبل الطباعة.",
    "طباعة الجدول": "تحويل الجدول المعروض إلى صيغة قابلة للطباعة (يرجى ضبط الهوامش إلى None).",
    "نوع الجدول": "اختيار ما إذا كنت تريد طباعة جدول لفوج كامل أو جدول فردي لأستاذ معين.",
    "مصفوفة التحقق": "جدول يوضح توزيع الأساتذة على الأفواج للتأكد من أن نفس الأستاذ يدرس نفس الفوج طيلة الدورات.",

    // --- التعديل اليدوي (Editor) ---
    "التعديل اليدوي": "واجهة تسمح لك بسحب وإفلات الحصص لتغيير توقيتها يدوياً مع تنبيهك عند حدوث تعارض.",
    "الفوج المراد تعديله": "اختر الفوج لعرض شبكة توقيته والبدء في التعديل.",

    // --- المتربصين (Trainees) ---
    "توزيع آلي": "خوارزمية تقوم بخلط المتربصين وتوزيعهم بالتساوي على الأفواج المتاحة (Round Robin).",
    "نموذج CSV": "تنزيل ملف Excel/CSV فارغ معد مسبقاً لملئه ببيانات المتربصين.",
    "استيراد القائمة": "رفع ملف CSV يحتوي على قائمة المتربصين لإضافتهم دفعة واحدة.",
    "إضافة متربص": "فتح استمارة لإضافة متربص واحد يدوياً (الاسم، اللقب، تاريخ الميلاد...).",
    "حذف الكل": "تصفير قاعدة بيانات المتربصين (حذر: لا يمكن التراجع إلا إذا كنت تملك نسخة احتياطية).",
    "نقل": "نقل المتربص المحدد من فوجه الحالي إلى فوج آخر.",
    
    // --- الحضور والغياب ---
    "تسجيل الغياب": "النقر على الزر لتغيير حالة المتربص من 'حاضر' إلى 'غائب' والعكس.",
    "طباعة القائمة": "طباعة ورقة الحضور اليومية (ورقة الإمضاءات) الخاصة بالفوج المختار.",

    // --- التقويم والنقاط (Evaluation) ---
    "تحميل القائمة": "تصدير قائمة التنقيط الخاصة بالمقياس المختار (Excel) لتسليمها للأستاذ.",
    "رفع النقاط": "استيراد ملف النقاط بعد ملئه من طرف الأستاذ ليتم رصد العلامات آلياً.",
    "نظام الاستيراد": "الطريقة الأسرع لحجز النقاط عبر ملفات Excel/CSV بدلاً من الكتابة اليدوية.",
    "كشف النقاط": "عرض وطباعة البطاقة التفصيلية للمتربص (المعدلات والمعاملات).",
    "طباعة المحضر": "طباعة محضر المداولات الرسمي (PV) الذي يحتوي على الإحصائيات وقائمة الناجحين.",

    // --- الامتحانات (Exams) ---
    "توزيع الحراس آلياً": "خوارزمية ذكية تقوم بتعيين حارسين لكل قاعة امتحان مع مراعاة العدل في عدد الحراسات وعدم التضارب في التوقيت.",
    "إعادة التفويج الآلي": "تقسيم المتربصين على قاعات الامتحان (20 متربص للقاعة) حسب الترتيب الأبجدي.",
    "إضافة حارس إضافي": "تسجيل اسم موظف جديد (من خارج الطاقم التربوي المسجل) لإدراجه ضمن قوائم الحراسة الاحتياطية.",
    
    // --- الشهادات (Certificates) ---
    "طباعة الكل": "طباعة شهادات نهاية التكوين دفعة واحدة لجميع المتربصين الناجحين.",
    "تاريخ محضر المداولات": "التاريخ الذي سيكتب في الشهادة (يجب أن يطابق تاريخ PV).",

    // --- الحوصلة والتقارير (Summary) ---
    "الكتابة بالصوت": "تفعيل الميكروفون لتحويل كلامك إلى نص مكتوب تلقائياً (يدعم اللهجة الجزائرية والعربية الفصحى).",

    // --- عام (General Fallbacks) ---
    "حفظ": "حفظ التغييرات التي قمت بها الآن في هذا النموذج (Local Storage).",
    "إلغاء": "تجاهل التغييرات وإغلاق النافذة.",
    "طباعة": "فتح نافذة الطباعة للمتصفح.",
    "استيراد": "رفع ملف بيانات.",
    "تعديل": "تفعيل وضع الكتابة.",
    "Word": "تصدير التقرير إلى ملف Word قابل للتعديل.",
};

const SmartHelpTooltip: React.FC = () => {
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string } | null>(null);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleMouseOver = (e: MouseEvent) => {
            // Find the closest clickable element
            const target = (e.target as HTMLElement).closest('button, a, input[type="file"] + label, select, .help-target');
            
            if (!target) {
                setTooltip(null);
                return;
            }

            const element = target as HTMLElement;
            // Priority: Title Attribute -> Aria Label -> Text Content
            const title = element.getAttribute('title') || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const textContent = element.textContent?.trim() || '';

            let helpText = '';
            
            // 1. Sort dictionary keys by length (descending) to match specific phrases before generic ones
            // Example: Match "حفظ قاعدة البيانات" before "حفظ"
            const sortedKeys = Object.keys(HELP_DICTIONARY).sort((a, b) => b.length - a.length);

            for (const key of sortedKeys) {
                // Check all possible text sources
                if (title.includes(key) || ariaLabel.includes(key) || textContent.includes(key)) {
                    helpText = HELP_DICTIONARY[key];
                    break; // Stop at the first (longest/most specific) match
                }
            }

            // 2. Icon-based heuristics (Fallback if no text match found)
            if (!helpText) {
                if (element.querySelector('.lucide-printer')) helpText = HELP_DICTIONARY["طباعة"];
                else if (element.querySelector('.lucide-save')) helpText = HELP_DICTIONARY["حفظ"];
                else if (element.querySelector('.lucide-trash-2')) helpText = HELP_DICTIONARY["حذف"];
                else if (element.querySelector('.lucide-edit-2') || element.querySelector('.lucide-edit-3')) helpText = HELP_DICTIONARY["تعديل"];
                else if (element.querySelector('.lucide-download')) helpText = HELP_DICTIONARY["تحميل"];
            }

            if (helpText) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    const rect = element.getBoundingClientRect();
                    setTooltip({
                        visible: true,
                        x: rect.left + (rect.width / 2),
                        y: rect.bottom + 10,
                        text: helpText
                    });
                }, 400); // Slightly longer delay to avoid annoyance
            } else {
                setTooltip(null);
            }
        };

        const handleMouseOut = () => {
            clearTimeout(timeoutId);
            setTooltip(null);
        };

        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mouseout', handleMouseOut);
        window.addEventListener('scroll', handleMouseOut);

        return () => {
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);
            window.removeEventListener('scroll', handleMouseOut);
            clearTimeout(timeoutId);
        };
    }, []);

    if (!tooltip || !tooltip.visible) return null;

    // Boundary Logic
    const screenWidth = window.innerWidth;
    let leftPos = tooltip.x;
    let transformClass = '-translate-x-1/2'; 

    if (leftPos < 150) { leftPos = 20; transformClass = ''; } 
    else if (leftPos > screenWidth - 150) { leftPos = screenWidth - 20; transformClass = '-translate-x-full'; }

    return (
        <div 
            className={`fixed z-[99999] pointer-events-none transition-all duration-200 ease-out animate-fadeIn ${transformClass}`}
            style={{ left: `${leftPos}px`, top: `${tooltip.y}px` }}
        >
            <div className="relative bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs p-3 rounded-xl shadow-2xl border border-amber-500/50 max-w-[280px] w-max">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-amber-500/50 transform rotate-45"></div>
                <div className="flex items-start gap-2 relative z-10">
                    <div className="p-1 bg-amber-500/10 rounded-full mt-0.5"><Sparkles className="w-3 h-3 text-amber-400" /></div>
                    <div>
                        <p className="font-bold text-amber-400 mb-0.5 text-[10px]">تلميح ذكي</p>
                        <p className="leading-tight text-slate-300 font-medium">{tooltip.text}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartHelpTooltip;
