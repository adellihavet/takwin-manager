
import React from 'react';
import { X, Printer, Layout, Maximize, Palette } from 'lucide-react';

interface PrintGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrintGuide: React.FC<PrintGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden relative">
                
                {/* Header */}
                <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Printer className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">إعدادات الطباعة المثالية</h2>
                            <p className="text-blue-100 text-sm">لضمان ظهور الوثائق والشهادات بشكل صحيح</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    
                    <div className="flex gap-6 items-start">
                        <div className="p-3 bg-slate-100 rounded-xl shrink-0">
                            <Layout className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1">1. الهوامش (Margins)</h3>
                            <p className="text-slate-600 text-sm mb-2">
                                هذا هو السبب رقم 1 لتداخل الجداول. يجب إلغاء الهوامش تماماً.
                            </p>
                            <div className="bg-slate-100 p-2 rounded border border-slate-300 inline-block text-xs font-mono font-bold text-slate-700">
                                Margins: None (أو Minimum)
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="p-3 bg-slate-100 rounded-xl shrink-0">
                            <Maximize className="w-8 h-8 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1">2. اتجاه الورقة (Layout)</h3>
                            <p className="text-slate-600 text-sm">
                                <span className="font-bold text-purple-600">Landscape (أفقي):</span> لجداول التوقيت والمصفوفات.<br/>
                                <span className="font-bold text-purple-600">Portrait (عمودي):</span> للشهادات، المحاضر، واستدعاءات الحراسة.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="p-3 bg-slate-100 rounded-xl shrink-0">
                            <Palette className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1">3. رسومات الخلفية (Background Graphics)</h3>
                            <p className="text-slate-600 text-sm mb-2">
                                إذا ظهرت لك <span className="font-bold text-red-500">صفحة سوداء</span>، فهذا يعني أن هذا الخيار مفعل والمتصفح يطبع لون الوضع الليلي.
                            </p>
                            <div className="flex gap-4">
                                <div className="text-xs bg-red-50 text-red-700 border border-red-200 p-2 rounded">
                                    إزالة العلامة<br/>لإزالة الخلفية السوداء
                                </div>
                                <div className="text-xs bg-green-50 text-green-700 border border-green-200 p-2 rounded">
                                    تفعيل العلامة<br/>إذا كنت تريد طباعة الألوان والشعارات
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105"
                    >
                        فهمت، شكراً
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintGuide;