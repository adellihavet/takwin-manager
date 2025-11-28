
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, ChevronLeft, Terminal, Bot, Zap } from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    type?: 'text' | 'options';
    options?: { label: string; action: string }[];
    timestamp: Date;
}

// --- KNOWLEDGE BASE (The Brain) ---
// This ensures that button clicks (actions) ALWAYS return the correct response directly.
const KNOWLEDGE_BASE: Record<string, { text: string, options?: { label: string; action: string }[] }> = {
    // --- EVALUATION & GRADES ---
    "calc_help": {
        text: "**طريقة حساب المعدلات بالتفصيل:**\n\nيعتمد النظام القاعدة الرسمية التالية:\n\n1. **معدل المقياس:** (تقويم د1 + تقويم د2 + تقويم د3) ÷ 3 = معدل المراقبة المستمرة (CC).\n2. **المعدل العام للمتربص:**\n   ((معدل CC × 2) + (علامة الامتحان × 3) + (علامة التقرير × 1)) ÷ 6\n\n*ملاحظة:* يتم ضرب المعدلات في معاملات المقاييس عند حساب المجموع العام.",
        options: [{ label: "مشاكل استيراد النقاط", action: "import_grades_help" }]
    },
    "import_grades_help": {
        text: "**قواعد استيراد النقاط (Excel/CSV):**\n\nلتجنب الأخطاء الكارثية:\n1. **العمود الأول (ID_SYSTEM):** هو مفتاح الربط المشفر. ممنوع تغييره أو حذفه.\n2. **تطابق الملف:** حمل القائمة من زر 'تحميل القائمة' لنفس المقياس، املأها، ثم أعد رفعها لنفس المقياس.\n3. **الترتيب:** لا تغير ترتيب الأسماء في ملف الإكسل.\n4. **الفواصل:** النظام يقبل النقطة (.) أو الفاصلة (،) للكسور.",
        options: [{ label: "كيفية المداولات", action: "deliberation_help" }]
    },
    "deliberation_help": {
        text: "**المداولات النهائية:**\n\nفي تبويب 'التقويم' > 'المداولات':\n- يمكنك طباعة محضر المداولات (PV) كاملاً مع الإحصائيات.\n- يمكنك تصدير قائمة الناجحين والمؤجلين.\n- **تنبيه:** تأكد من حجز نقطة 'التقرير النهائي' (المذكرة) قبل طباعة المحضر لأن معاملها 1.",
    },

    // --- TIMETABLE ---
    "timetable_gen": {
        text: "**توليد التوزيع الزمني:**\n\n- **التوليد الشامل:** يقوم بملء الجدول مع مراعاة الفراغات البيداغوجية.\n- **بدون فراغات:** يضغط الحصص لتكون متتالية.\n- **التعارض:** إذا فشل التوليد، فهذا يعني أن عدد الأساتذة غير كافٍ لتغطية عدد الأفواج في نفس الوقت. الحل هو إضافة أساتذة جدد في 'إدارة الطاقم البيداغوجي'.",
        options: [{ label: "التعديل اليدوي", action: "manual_edit_help" }, { label: "مصفوفة التحقق", action: "matrix_help" }]
    },
    "manual_edit_help": {
        text: "**التعديل اليدوي (Drag & Drop):**\n\n- اسحب الحصة وأفلتها في المكان الجديد.\n- **الحماية:** سيمنعك النظام ويظهر رسالة خطأ حمراء إذا كان الأستاذ المعني يدرس فوجاً آخر في ذلك التوقيت.\n- لا يمكنك التعديل إذا لم تولد الجدول أولاً.",
    },
    "matrix_help": {
        text: "**مصفوفة التحقق من الإسناد:**\n\nتظهر أسفل الجدول. وظيفتها ضمان 'الاستقرار البيداغوجي'.\n- **علامة صح خضراء:** نفس الأستاذ يدرس الفوج في كل الدورات.\n- **علامة خطأ حمراء:** الفوج يدرسه أساتذة مختلفون في دورات مختلفة (يجب توحيد الأستاذ يدوياً).",
    },

    // --- EXAMS & PROCTORS ---
    "exam_proctors": {
        text: "**توزيع الحراسة:**\n\nالنظام يوزع الحراس آلياً بمعيار 'العدل':\n- يحاول مساواة عدد الحراسات بين الجميع.\n- يمنع وضع نفس الحارس في نفس القاعة مرتين متتاليتين.\n- **هام:** يجب توليد قاعات الامتحان أولاً قبل توزيع الحراس.",
        options: [{ label: "حراس خارجيين", action: "ext_proctor_help" }, { label: "تفويج القاعات", action: "exam_rooms_help" }]
    },
    "ext_proctor_help": {
        text: "**إضافة حراس خارجيين:**\n\nفي تبويب 'الامتحانات' > 'الحراسة':\n- يمكنك إضافة أسماء موظفين إداريين أو عمال لدعم الحراسة.\n- سيتم دمجهم فوراً في القرعة الآلية للتوزيع.\n- يمكنك حذفهم لاحقاً بزر سلة المهملات.",
    },
    "exam_rooms_help": {
        text: "بناءً على التعليمات، يتم تقسيم المتربصين إلى قاعات بسعة **20 متربص** لكل قاعة.\nالعملية تتم آلياً بالترتيب الأبجدي لكل تخصص.",
    },

    // --- TRAINEES ---
    "trainee_import": {
        text: "**استيراد المتربصين:**\n\n- الصيغة الوحيدة المقبولة هي CSV.\n- استخدم زر 'نموذج CSV' للحصول على القالب الصحيح.\n- **هام:** التخصص يجب أن يكتب بدقة (مثلاً: 'لغة عربية') ليتعرف عليه النظام ويسنده للون المناسب.",
        options: [{ label: "التوزيع الآلي للأفواج", action: "auto_group_help" }]
    },
    "auto_group_help": {
        text: "يتم توزيع المتربصين على الأفواج بنظام 'Round Robin' (واحد بواحد) لضمان تساوي العدد بدقة متناهية بين جميع الأفواج.",
    },

    // --- PRINTING ---
    "print_issues": {
        text: "**حل مشاكل الطباعة:**\n\nلظهور الألوان والتنسيق الصحيح:\n1. في نافذة الطباعة، ابحث عن **More Settings**.\n2. فعل خيار **Background Graphics** (ضروري جداً).\n3. اجعل الهوامش **Margins: None** أو Minimum.\n4. تأكد من اتجاه الورقة (Landscape للجداول، Portrait للشهادات).",
    },

    // --- CERTIFICATES ---
    "certs_help": {
        text: "**الشهادات:**\n\n- تطبع فقط للناجحين (معدل >= 10).\n- **تاريخ المحضر:** حقل يدوي، يجب كتابته ليظهر في متن الشهادة.\n- التصميم مطابق للنموذج الوزاري الرسمي.",
    },

    // --- GENERAL ---
    "db_save": {
        text: "**حفظ العمل:**\n\nاضغط زر 'حفظ قاعدة البيانات' في لوحة القيادة يومياً. الملف الناتج (.json) هو ضمانك الوحيد لاسترجاع العمل إذا تعطل المتصفح أو غيرت الحاسوب.",
    }
};

const TakwinChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- INTELLIGENT MATCHING ENGINE ---
    const findBestResponse = (rawInput: string) => {
        const input = rawInput.toLowerCase(); // Normalization happens implicitly via includes/regex

        // High Priority Keywords
        if (input.includes('حساب') || input.includes('معدل')) return KNOWLEDGE_BASE["calc_help"];
        if (input.includes('طباعة') || input.includes('الوان') || input.includes('pdf')) return KNOWLEDGE_BASE["print_issues"];
        if (input.includes('نقاط') || input.includes('excel') || input.includes('csv')) return KNOWLEDGE_BASE["import_grades_help"];
        if (input.includes('مداولات') || input.includes('محضر')) return KNOWLEDGE_BASE["deliberation_help"];
        
        if (input.includes('توزيع') && (input.includes('وقت') || input.includes('زمني') || input.includes('جدول'))) return KNOWLEDGE_BASE["timetable_gen"];
        if (input.includes('تعديل') && (input.includes('يدوي') || input.includes('سحب'))) return KNOWLEDGE_BASE["manual_edit_help"];
        if (input.includes('مصفوفة') || input.includes('ثبات') || input.includes('احمر')) return KNOWLEDGE_BASE["matrix_help"];
        
        if (input.includes('حراس') || input.includes('مراقبة')) {
            if (input.includes('خارجي') || input.includes('اضافي')) return KNOWLEDGE_BASE["ext_proctor_help"];
            return KNOWLEDGE_BASE["exam_proctors"];
        }
        if (input.includes('قاعات') || input.includes('20')) return KNOWLEDGE_BASE["exam_rooms_help"];

        if (input.includes('متربص') && (input.includes('استيراد') || input.includes('ملف'))) return KNOWLEDGE_BASE["trainee_import"];
        if (input.includes('افواج') || input.includes('تفويج')) return KNOWLEDGE_BASE["auto_group_help"];
        
        if (input.includes('شهادة') || input.includes('دبلوم')) return KNOWLEDGE_BASE["certs_help"];
        if (input.includes('حفظ') || input.includes('بيانات') || input.includes('ضاع')) return KNOWLEDGE_BASE["db_save"];

        // Fallback
        return {
            text: "عذراً، لم أفهم سؤالك بدقة. \n\nأنا ملم بكل الجوانب التقنية، جرب سؤالي عن:\n- طريقة حساب المعدل\n- مشاكل الطباعة\n- كيفية توزيع الحراسة\n- استيراد النقاط",
            options: [
                { label: "طريقة حساب المعدل", action: "calc_help" },
                { label: "مشاكل الطباعة", action: "print_issues" },
                { label: "توزيع الحراسة", action: "exam_proctors" }
            ]
        };
    };

    const processAction = (actionKey: string) => {
        const response = KNOWLEDGE_BASE[actionKey];
        if (response) {
            return response;
        }
        // Fallback if action key is missing (should not happen with correct wiring)
        return { text: "حدث خطأ في استرجاع المعلومة المطلوبة." };
    };

    // --- COMPONENT LOGIC ---

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 1,
                text: "مرحباً سيدي المدير! \n\nأنا جاهز تماماً للإجابة على أدق التفاصيل التقنية والقانونية للتطبيق.\nيمكنك الاعتماد علي في شرح طريقة الحساب، حل مشاكل الطباعة، وتسيير الامتحانات.",
                sender: 'bot',
                timestamp: new Date(),
                type: 'options',
                options: [
                    { label: "طريقة حساب المعدل", action: "calc_help" },
                    { label: "مشاكل الطباعة والألوان", action: "print_issues" },
                    { label: "توزيع الحراسة والامتحانات", action: "exam_proctors" },
                    { label: "استيراد النقاط (Excel)", action: "import_grades_help" }
                ]
            }]);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        
        const userMsg: Message = {
            id: Date.now(),
            text: inputText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');

        setTimeout(() => {
            const response = findBestResponse(inputText);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: response.text,
                sender: 'bot',
                type: response.options ? 'options' : 'text',
                options: response.options,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        }, 500);
    };

    const handleOptionClick = (action: string, label: string) => {
        // 1. Add User Click as Message
        const userMsg: Message = {
            id: Date.now(),
            text: label,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        
        // 2. Direct Action Lookup (No NLP Guessing)
        setTimeout(() => {
            const response = processAction(action);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: response.text,
                sender: 'bot',
                type: response.options ? 'options' : 'text',
                options: response.options,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        }, 400);
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                title="المساعد الذكي"
                className={`fixed left-6 bottom-6 z-[9990] p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center border-2 border-white/20 ${
                    isOpen ? 'bg-slate-700 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/40'
                }`}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-7 h-7 text-white" />}
            </button>

            <div className={`fixed left-6 bottom-24 z-[9999] w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left ${
                isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'
            }`} style={{ height: '550px', maxHeight: '80vh' }}>
                
                {/* Header */}
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">المساعد التقني (Takwin Bot)</h3>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" /> متصل الآن
                        </p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/95 custom-scrollbar scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
                            <div className={`max-w-[90%] rounded-2xl p-3 text-sm leading-relaxed shadow-md ${
                                msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                            }`}>
                                <div className="whitespace-pre-line dir-rtl">{msg.text}</div>
                                
                                {msg.type === 'options' && msg.options && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.options.map((opt, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleOptionClick(opt.action, opt.label)}
                                                className="bg-slate-700 hover:bg-slate-600 hover:text-white text-indigo-300 text-xs py-2 px-3 rounded-lg transition-colors border border-slate-600 font-bold flex items-center gap-1 shadow-sm"
                                            >
                                                <ChevronLeft className="w-3 h-3" /> {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <span className="text-[9px] opacity-40 block mt-1 text-left select-none">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="اكتب سؤالك هنا..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none placeholder:text-slate-500"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default TakwinChatbot;
