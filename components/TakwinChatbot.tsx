import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, Sparkles } from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    type?: 'text' | 'options';
    options?: { label: string; action: string }[];
    timestamp: Date;
}

const TakwinChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Knowledge Base & Logic ---
    const getBotResponse = (input: string): { text: string, options?: { label: string; action: string }[] } => {
        const text = input.toLowerCase().trim();

        // 0. GREETINGS
        if (text.match(/^(مرحبا|اهلين|السلام|تحية)/)) {
             return {
                text: "أهلاً بك! كيف يمكنني مساعدتك في تسيير الدورة اليوم؟",
                options: [
                    { label: "أريد دليلاً للبدء", action: "guide_start" },
                    { label: "نصائح الطباعة", action: "print_help" }
                ]
            };
        }

        // 1. DASHBOARD & GENERAL
        if (text.match(/(احصائيات|عدد|ارقام|كم يوجد|المسجلين)/)) {
            const trainees = JSON.parse(localStorage.getItem('takwin_trainees_db') || '[]');
            return {
                text: `حالياً، النظام يحتوي على ${trainees.length} متربص مسجل.\nيمكنك الاطلاع على التفاصيل الكاملة (الجنس، التوزيع الجغرافي) في 'لوحة القيادة'.`
            };
        }
        
        // 2. TIMETABLE (GENERATOR & EDITOR)
        if (text.match(/(توزيع|جدول|توقيت|حصص|رزنامة)/) || text === 'schedule_help') {
             if (text.includes("توليد") || text.includes("انشاء")) {
                 return { text: "لتوليد الجدول: اذهب لتبويب 'التوزيع'، اختر الدورة الزمنية، واضغط 'توليد التوزيع الشامل'. النظام سيقوم بالعملية آلياً." };
             }
             if (text.includes("تعديل") || text.includes("تغيير")) {
                 return { text: "يمكنك تعديل الجدول يدوياً عبر تبويب 'تعديل'. استخدم السحب والإفلات لنقل الحصص بين الأيام." };
             }
             if (text.includes("طباعة")) {
                 return { text: "لطباعة الجداول: اذهب لتبويب 'التوزيع' > قسم الطباعة أسفل الصفحة. يمكنك طباعة جدول خاص بفوج معين أو بأستاذ معين." };
             }
            return {
                text: "نظام التوزيع الزمني ينقسم لقسمين:\n1. 'التوزيع': للتوليد الآلي والطباعة.\n2. 'تعديل': للتعديل اليدوي بالسحب والإفلات.\nماذا تحتاج بالضبط؟",
                options: [
                    { label: "طريقة التوليد الآلي", action: "how_gen_table" },
                    { label: "كيفية التعديل اليدوي", action: "how_edit_table" },
                    { label: "حل تعارض الأساتذة", action: "conflict_help" }
                ]
            };
        }
        // Specific actions for timetable
        if (text === 'how_gen_table') return { text: "في تبويب 'التوزيع'، تأكد أولاً من ضبط عدد الأساتذة في لوحة القيادة، ثم اضغط زر 'توليد التوزيع الشامل' وانتظر قليلاً." };
        if (text === 'how_edit_table') return { text: "في تبويب 'تعديل'، اختر الفوج، ستظهر لك شبكة التوقيت. اسحب أي حصة ملونة وأفلتها في مكان فارغ أو فوق حصة أخرى للتبديل." };
        if (text === 'conflict_help') return { text: "أثناء التعديل اليدوي، إذا حاولت نقل حصة لوقت يكون فيه الأستاذ مشغولاً مع فوج آخر، سيقوم النظام بمنعك وإظهار رسالة تنبيه." };

        // 3. TRAINEES
        if (text.match(/(متربص|غياب|حضور|قائمة|فوج|افواج)/)) {
            if (text.includes("اضافة") || text.includes("تسجيل")) {
                return { text: "لإضافة متربص: اذهب لتبويب 'المتكونين' واضغط زر 'إضافة'. يمكنك أيضاً استيراد قائمة كاملة بملف Excel/CSV." };
            }
            if (text.includes("غياب")) {
                return { text: "لتسجيل الغيابات: اذهب لتبويب 'المتكونين' > اختر 'قوائم الحضور والغياب'. اضغط على المربع أمام اسم المتربص لتغيير حالته (حاضر/غائب)." };
            }
             if (text.includes("فوج") || text.includes("افواج")) {
                return { text: "يمكنك توزيع المتربصين على الأفواج آلياً عبر زر 'توزيع آلي' في تبويب المتكونين. النظام سيوزعهم بالتساوي حسب الترتيب الأبجدي." };
            }
            return {
                text: "إدارة المتكونين تشمل التسجيل، التفويج، ومتابعة الغيابات. ماذا تريد أن تفعل؟",
                options: [
                    { label: "استيراد قائمة", action: "how_import" },
                    { label: "تسجيل الغياب", action: "how_absence" },
                    { label: "طباعة ورقة الحضور", action: "print_attendance" }
                ]
            };
        }
        if (text === 'how_import') return { text: "اضغط زر 'استيراد' في صفحة المتكونين. الملف يجب أن يكون CSV يحتوي الأعمدة: الرقم، اللقب، الاسم، تاريخ الميلاد..." };
        if (text === 'how_absence') return { text: "من تبويب 'المتكونين'، انتقل للوضع 'قوائم الحضور'، اختر الفوج والتاريخ، ثم انقر لتغيير الحالة." };
        if (text === 'print_attendance') return { text: "بعد اختيار الفوج في قسم 'قوائم الحضور'، سيظهر لك زر 'طباعة القائمة' الذي يولد ورقة الإمضاء اليومية." };

        // 4. EVALUATION & GRADES
        if (text.match(/(نقاط|معدل|علامات|تقييم|كشف)/) || text === 'evaluation_help') {
            if (text.includes("حساب")) {
                return { text: "المعدل العام يحسب كالتالي:\n((معدل المراقبة × 2) + (الامتحان × 3) + (نقطة التقرير × 1)) ÷ 6." };
            }
            if (text.includes("استيراد") || text.includes("excel")) {
                return { text: "في تبويب 'التقويم'، يمكنك تحميل نموذج Excel لكل مقياس، ملؤه بالنقاط، ثم إعادة رفعه لملء العلامات آلياً." };
            }
            return {
                text: "موديول التقويم يتيح لك حجز نقاط المراقبة المستمرة، الامتحانات، والتقرير النهائي. كما يقوم بحساب المعدلات آلياً.",
                options: [
                    { label: "كيفية حساب المعدل", action: "calc_formula" },
                    { label: "استيراد النقاط", action: "grades_import" },
                    { label: "طباعة كشف النقاط", action: "print_grades" }
                ]
            };
        }
        if (text === 'calc_formula') return { text: "الصيغة الرسمية:\n( (معدل البطاقات × 2) + (الامتحان النهائي × 3) + (علامة التربص/التقرير × 1) ) تقسيم 6.\nالنجاح يتطلب معدل 10/20." };
        if (text === 'grades_import') return { text: "1. اذهب لتبويب 'التقويم'.\n2. اختر المقياس.\n3. اضغط 'تحميل القائمة' لتحصل على ملف CSV.\n4. املأ النقاط في الملف.\n5. اضغط 'رفع النقاط' لاستيراده." };
        if (text === 'print_grades') return { text: "في الجدول أسفل تبويب 'التقويم'، اضغط على أيقونة العين (👁️) أمام اسم المتربص لفتح كشف النقاط التفصيلي وطباعته." };

        // 5. EXAMS
        if (text.match(/(امتحان|حراسة|قاعة|استدعاء)/) || text === 'exams_help') {
             return {
                text: "قسم الامتحانات يتيح لك:\n- ضبط تواريخ الامتحانات.\n- توزيع المتربصين على القاعات (20/قاعة).\n- التوزيع الآلي للحراس.\n- طباعة الاستدعاءات ومحضر سير الامتحان.",
                options: [
                    { label: "توزيع الحراس", action: "proctor_auto" },
                    { label: "طباعة الاستدعاءات", action: "print_convocation" }
                ]
            };
        }
        if (text === 'proctor_auto') return { text: "في تبويب 'الامتحانات' > 'الحراسة'، اضغط 'توزيع آلي'. الخوارزمية ستوزع الحراس المتوفرين لضمان وجود حارسين في كل قاعة دون تضارب." };
        if (text === 'print_convocation') return { text: "من تبويب 'الامتحانات' > 'طباعة الوثائق'، اختر 'استدعاءات الحراسة'. يمكنك طباعة الاستدعاءات فردياً أو جدول شامل." };

        // 6. CERTIFICATES & REPORTS
        if (text.match(/(شهادة|تقرير|مداولات|نجاح)/)) {
             return {
                text: "الوثائق الختامية:\n- الشهادات: تطبع فقط للناجحين (معدل >= 10).\n- المداولات: تطبع محضر اللجنة الرسمي.\n- التقرير التكويني: لتحرير التقرير الوصفي للدورة.",
                options: [
                    { label: "طباعة الشهادات", action: "print_certs" },
                    { label: "محضر المداولات", action: "print_pv" }
                ]
            };
        }
        if (text === 'print_certs') return { text: "اذهب لتبويب 'الشهادات'. أدخل تاريخ المداولات، ثم اضغط 'طباعة الكل'. الشهادات ستملأ آلياً ببيانات الناجحين." };
        if (text === 'print_pv') return { text: "في تبويب 'التقويم' > 'المداولات النهائية'، املأ بيانات اللجنة واضغط 'طباعة المحضر'. المحضر يحتوي الإحصائيات وقائمة الناجحين." };

        // 7. PRINTING & SAVING
        if (text.match(/(حفظ|ضياع|بيانات|طباعة|مشكلة)/) || text === 'print_help') {
             if (text.includes("حفظ")) return { text: "للحفاظ على عملك، اضغط زر 'حفظ قاعدة البيانات' في لوحة القيادة بانتظام. هذا ينزل ملفاً يحتوي كل بياناتك لاسترجاعها لاحقاً." };
             return {
                text: "نصائح هامة للطباعة:\n1. اضبط الهوامش (Margins) على 'None' أو 'Minimum'.\n2. فعل خيار 'Background Graphics' لطباعة الألوان والخلفيات.\n3. استخدم متصفح Google Chrome لأفضل نتيجة."
            };
        }

        // 8. GUIDE / START
        if (text.match(/(بداية|شرح|كيف ابدا|مساعدة)/) || text === 'guide_start') {
             return {
                text: "خطوات العمل المقترحة:\n1. 'القيادة': ضبط بيانات المؤسسة والأساتذة.\n2. 'المتكونين': استيراد القائمة وتوزيع الأفواج.\n3. 'التوزيع': توليد الجدول الزمني.\n4. 'التقويم': حجز النقاط وطباعة الشهادات.",
                options: [
                    { label: "توزيع الأساتذة", action: "setup_trainers" },
                    { label: "استيراد المتربصين", action: "how_import" }
                ]
            };
        }
        if (text === 'setup_trainers') return { text: "في 'لوحة القيادة'، قسم 'إدارة الطاقم البيداغوجي'، حدد عدد الأساتذة لكل مقياس واكتب أسماءهم ليظهروا في الجداول والاستدعاءات." };

        // FALLBACK
        return {
            text: "عذراً، لم أفهم استفسارك بدقة. هل يمكنك صياغته بشكل آخر؟\nأنا أفهم كلمات مثل: 'توزيع'، 'نقاط'، 'امتحان'، 'شهادة'، 'متربص'، 'طباعة'...",
            options: [
                { label: "كيف أبدأ؟", action: "guide_start" },
                { label: "مشكلة في الطباعة", action: "print_help" },
                { label: "كيفية حساب المعدل", action: "calc_formula" }
            ]
        };
    };

    // --- COMPONENT LOGIC ---

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 1,
                text: "مرحباً بك في منصة تسيير التكوين.\nأنا المساعد الآلي 'مرشد'، موجود هنا لتسهيل عملك والإجابة على استفساراتك حول كيفية استخدام المنصة، التوزيع الزمني، الامتحانات، والوثائق الإدارية.",
                sender: 'bot',
                timestamp: new Date(),
                type: 'options',
                options: [
                    { label: "كيف أبدأ العمل؟", action: "guide_start" },
                    { label: "إدارة الامتحانات", action: "exams_help" },
                    { label: "مشاكل الطباعة", action: "print_help" }
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
        processResponse(inputText);
        setInputText('');
    };

    const handleOptionClick = (action: string, label: string) => {
        const userMsg: Message = {
            id: Date.now(),
            text: label,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        processResponse(action);
    };

    const processResponse = (query: string) => {
        setTimeout(() => {
            const response = getBotResponse(query);
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

    return (
        <>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed left-6 bottom-6 z-[9990] p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
                    isOpen ? 'bg-red-500 rotate-90' : 'bg-indigo-600'
                }`}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-7 h-7 text-white" />}
            </button>

            <div className={`fixed left-6 bottom-24 z-[9999] w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left ${
                isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'
            }`} style={{ height: '550px' }}>
                
                {/* Header */}
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Bot className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">المساعد الذكي (مرشد)</h3>
                        <p className="text-[10px] text-slate-400">متصل - قاعدة المعارف V2.0</p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed relative ${
                                msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                            }`}>
                                {msg.sender === 'bot' && <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" />}
                                <p className="whitespace-pre-line">{msg.text}</p>
                                
                                {msg.type === 'options' && msg.options && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.options.map((opt, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleOptionClick(opt.action, opt.label)}
                                                className="bg-slate-700 hover:bg-slate-600 text-indigo-200 text-xs py-1.5 px-3 rounded-lg transition-colors border border-slate-600 font-medium"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <span className="text-[9px] opacity-50 block mt-1 text-left">
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
                        placeholder="اكتب استفسارك..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default TakwinChatbot;
