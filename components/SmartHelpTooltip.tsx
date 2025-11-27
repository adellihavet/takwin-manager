import React, { useState, useEffect } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

// القاموس الذكي: يربط النصوص أو الأنماط الموجودة في الأزرار بالشرح المناسب
// Smart Dictionary mapping text content to help descriptions
const HELP_DICTIONARY: Record<string, string> = {
    // General Actions
    "حفظ": "يقوم بحفظ التغييرات الحالية في الذاكرة المحلية للمتصفح (Local Storage) لضمان عدم ضياع العمل.",
    "طباعة": "فتح نافذة الطباعة للمتصفح. تأكد من ضبط الإعدادات (الهوامش والاتجاه) قبل التأكيد.",
    "تعديل": "تفعيل وضع التعديل للسماح بتغيير البيانات يدوياً.",
    "إلغاء": "الخروج من وضع التعديل وتجاهل التغييرات غير المحفوظة.",
    "استيراد": "رفع الملف الذي قمت بحفظه (Excel/CSV أو JSON) من جهازك لملء البيانات آلياً.",
    "تحميل": "تنزيل نموذج فارغ أو قائمة البيانات الحالية كملف على جهازك. احرص على عدم تغيير أسماء الأعمدة و محتوى عمود ID_SYSTEM.",
    "إضافة": "فتح نموذج لإضافة عنصر جديد (متربص، حارس، إلخ).",
    "حذف": "إزالة العنصر المحدد نهائياً.",
    
    // Dashboard & Stats
    "تحديث البيانات": "إعادة قراءة البيانات من الذاكرة وتحديث الإحصائيات والأرقام فوراً.",
    "قاعدة بيانات المشروع": "تصدير نسخة احتياطية شاملة لكل عملك (الأساتذة، النقاط، الجداول) في ملف واحد.",
    
    // Timetable
    "توليد التوزيع": "تشغيل الخوارزمية الذكية لإنشاء جدول زمني يراعي القيود وتوفر الأساتذة.",
    "توزيع آلي": "توزيع المتربصين على القاعات أو الأفواج بشكل متوازن وعادل آلياً.",
    "تصفية العرض": "إظهار بيانات خاصة بتخصص معين أو فوج معين فقط.",
    
    // Grading
    "حجز النقاط": "إدخال العلامات يدوياً أو تعديلها.",
    "تنظيم الامتحانات": "ضبط رزنامة الامتحانات وتوزيع الحراس والقاعات.",
    "المداولات النهائية": "حساب المعدلات وطباعة المحاضر النهائية والقرارات.",
    "كشف النقاط التفصيلي": "عرض وثيقة رسمية تحتوي على كل علامات المتربص ومعدلاته.",
    
    // Specific
    "Word": "تصدير التقرير إلى ملف Word قابل للتعديل.",
    "دليل الاستخدام": "عرض جولة تعريفية تشرح كيفية استخدام المنصة.",
    "توزيع الحراس": "خوارزمية لتوزيع الحراس على القاعات مع مراعاة عدم التكرار.",
};

const SmartHelpTooltip: React.FC = () => {
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string } | null>(null);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleMouseOver = (e: MouseEvent) => {
            // Find the closest clickable element (button, link, or input)
            const target = (e.target as HTMLElement).closest('button, a, input[type="file"] + label, select, .help-target');
            
            if (!target) {
                setTooltip(null);
                return;
            }

            const element = target as HTMLElement;
            const textContent = element.textContent?.trim() || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const title = element.getAttribute('title') || '';

            // 1. Search in Dictionary based on text content (Partial match logic)
            let helpText = '';
            
            // Check exact matches or matches where the button text contains the keyword
            for (const [key, value] of Object.entries(HELP_DICTIONARY)) {
                if (textContent.includes(key) || ariaLabel.includes(key) || title.includes(key)) {
                    helpText = value;
                    break; // Stop at first match (Priority to first defined)
                }
            }

            // Special case for Icon-only buttons (heuristic)
            if (!helpText) {
                if (element.querySelector('.lucide-printer')) helpText = HELP_DICTIONARY["طباعة"];
                else if (element.querySelector('.lucide-save')) helpText = HELP_DICTIONARY["حفظ"];
                else if (element.querySelector('.lucide-trash-2')) helpText = HELP_DICTIONARY["حذف"];
                else if (element.querySelector('.lucide-edit-2')) helpText = HELP_DICTIONARY["تعديل"];
                else if (element.querySelector('.lucide-download')) helpText = HELP_DICTIONARY["تحميل"];
            }

            if (helpText) {
                // Debounce slightly to prevent flickering on fast movement
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    const rect = element.getBoundingClientRect();
                    setTooltip({
                        visible: true,
                        x: rect.left + (rect.width / 2),
                        y: rect.bottom + 10, // Position below the element
                        text: helpText
                    });
                }, 300); // 300ms delay before showing
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
        
        // Also listen to scroll to hide tooltip
        window.addEventListener('scroll', handleMouseOut);

        return () => {
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);
            window.removeEventListener('scroll', handleMouseOut);
            clearTimeout(timeoutId);
        };
    }, []);

    if (!tooltip || !tooltip.visible) return null;

    // Adjust position to stay on screen
    const screenWidth = window.innerWidth;
    let leftPos = tooltip.x;
    let transformClass = '-translate-x-1/2'; // Center by default

    // If too close to left edge
    if (leftPos < 150) {
        leftPos = 20; 
        transformClass = '';
    } 
    // If too close to right edge
    else if (leftPos > screenWidth - 150) {
        leftPos = screenWidth - 20;
        transformClass = '-translate-x-full';
    }

    return (
        <div 
            className={`fixed z-[99999] pointer-events-none transition-all duration-200 ease-out animate-fadeIn ${transformClass}`}
            style={{ 
                left: `${leftPos}px`, 
                top: `${tooltip.y}px` 
            }}
        >
            <div className="relative bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs p-3 rounded-xl shadow-2xl border border-amber-500/50 max-w-[280px] w-max">
                {/* Arrow */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-amber-500/50 transform rotate-45"></div>
                
                <div className="flex items-start gap-2 relative z-10">
                    <div className="p-1 bg-amber-500/10 rounded-full mt-0.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                    </div>
                    <div>
                        <p className="font-bold text-amber-400 mb-0.5 text-[10px]">مساعد ذكي</p>
                        <p className="leading-tight text-slate-300 font-medium">{tooltip.text}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartHelpTooltip;