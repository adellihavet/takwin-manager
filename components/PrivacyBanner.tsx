
import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Info } from 'lucide-react';

const PrivacyBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // نتحقق مما إذا كان المستخدم قد أغلق التنبيه سابقاً
        const isDismissed = localStorage.getItem('takwin_privacy_banner_dismissed');
        if (!isDismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        // حفظ خيار المستخدم بعدم إظهار الرسالة مرة أخرى
        localStorage.setItem('takwin_privacy_banner_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-amber-50 border-t-4 border-amber-500 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] print:hidden animate-slideUp">
            <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="flex gap-4">
                    <div className="p-3 bg-amber-100 rounded-full shrink-0 mt-1">
                        <ShieldAlert className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-amber-900 mb-2">إخلاء مسؤولية وتنبيه حول الخصوصية</h3>
                        <p className="text-sm md:text-base text-amber-800 leading-relaxed max-w-4xl text-justify ml-4">
                            نحيطكم علماً بأن هذه المنصة هي أداة مساعدة للتنظيم والتسيير فقط. 
                            <span className="font-bold"> جميع المعلومات والبيانات المدخلة محفوظة محلياً وحصرياً على متصفحك أو جهازك الشخصي</span> (Local Storage). 
                            لا يتم إرسال، تخزين، أو مشاركة أي بيانات مع أي خادم خارجي أو طرف ثالث، ولا يمكن لأي أحد الاطلاع عليها سواك. 
                            أنت المسؤول الوحيد عن حماية ملفات قاعدة البيانات التي تقوم بتحميلها.
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleDismiss}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2 text-sm whitespace-nowrap w-full md:w-auto justify-center"
                >
                    <X className="w-5 h-5" />
                    فهمت، إغلاق التنبيه
                </button>
            </div>
        </div>
    );
};

export default PrivacyBanner;