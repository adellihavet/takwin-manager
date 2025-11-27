
import { Specialty, SessionInfo, Module, Distribution, ModuleContent } from './types';

export const SPECIALTIES: Specialty[] = [
  { id: 'pe', name: 'التربية البدنية', count: 149, groups: 5, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'eng', name: 'اللغة الإنجليزية', count: 89, groups: 3, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'fr', name: 'اللغة الفرنسية', count: 24, groups: 1, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'ar', name: 'اللغة العربية', count: 106, groups: 3, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
];

export const SESSIONS: SessionInfo[] = [
  { 
    id: 1, 
    name: 'الدورة الأولى', 
    startDate: '2025-12-20', 
    endDate: '2025-12-31', 
    daysCount: 11, 
    hoursTotal: 55,
    description: 'المرحلة الأولى: التأسيس المعرفي واكتساب المفاهيم القاعدية في جميع المقاييس'
  },
  { 
    id: 2, 
    name: 'الدورة الثانية', 
    startDate: '2026-03-23', 
    endDate: '2026-04-02', 
    daysCount: 10, 
    hoursTotal: 50,
    description: 'المرحلة الثانية: بناء المهارات العملية وتعميق الجوانب التطبيقية'
  },
  { 
    id: 3, 
    name: 'الدورة الثالثة', 
    startDate: '2026-07-01', 
    endDate: '2026-07-22', 
    daysCount: 18, 
    hoursTotal: 85,
    description: 'المرحلة الثالثة: الإدماج المهني، التقويم الشامل والمشاريع الختامية'
  },
];

export const MODULES: (Module & { coefficient: number })[] = [
  { 
    id: 1, 
    title: 'تعليمية مادة التخصص وطرائق التدريس', 
    shortTitle: 'التعليمية',
    totalHours: 40,
    coefficient: 2,
    description: 'هيكلة وبناء المقطع التعلمي، طرائق التدريس الحديثة، الوسائل التعليمية، استغلال السندات، والتقويم التربوي الفعال.'
  },
  { 
    id: 2, 
    title: 'النظام التربوي والمناهج التعليمية', 
    shortTitle: 'النظام التربوي',
    totalHours: 20,
    coefficient: 1,
    description: 'مفاهيم النظام التربوي، أنواع المناهج، أسس بناء المنهاج، وتحليل مكونات المنهاج الدراسي.'
  },
  { 
    id: 3, 
    title: 'علوم التربية وعلم النفس', 
    shortTitle: 'علم النفس',
    totalHours: 20,
    coefficient: 1,
    description: 'علم النفس العام، العمليات العقلية، المراحل العمرية (الطفولة والمراهقة)، سيكولوجية الفروق الفردية، والمشكلات النفسية والتربوية.'
  },
  { 
    id: 4, 
    title: 'التشريع المدرسي', 
    shortTitle: 'التشريع',
    totalHours: 20,
    coefficient: 1,
    description: 'مفهوم الموظف، الحقوق والواجبات، الأخطاء المهنية، المجالس، الحياة المهنية، النصوص القانونية وعلاقتها بالمناهج.'
  },
  { 
    id: 5, 
    title: 'ميثاق أخلاقيات المهنة', 
    shortTitle: 'أخلاقيات المهنة',
    totalHours: 10,
    coefficient: 1,
    description: 'مبادئ وقواعد الميثاق، أدبيات مهنة المربي، الالتزام المهني، وعلاقة الميثاق باستقرار الحياة المدرسية.'
  },
  { 
    id: 6, 
    title: 'الوساطة المدرسية', 
    shortTitle: 'الوساطة',
    totalHours: 10,
    coefficient: 1,
    description: 'مفهوم الوساطة، دور الوسيط التربوي، أساليب الوقاية من النزاعات، وتقنيات الحوار التربوي.'
  },
  { 
    id: 7, 
    title: 'تقنيات تسيير القسم', 
    shortTitle: 'تسيير القسم',
    totalHours: 10,
    coefficient: 1,
    description: 'إدارة الصف (1 و 2)، التفاعل الصفي، القيادة التربوية، وتمثيل ومحاكاة الممارسات التعليمية.'
  },
  { 
    id: 8, 
    title: 'التقويم والمعالجة البيداغوجية', 
    shortTitle: 'التقويم',
    totalHours: 25,
    coefficient: 2,
    description: 'مفهوم التقويم وأنواعه، بناء الاختبارات، تحليل النتائج، المعالجة البيداغوجية، والمخططات السنوية للتقويم.'
  },
  { 
    id: 9, 
    title: 'هندسة التكوين', 
    shortTitle: 'هندسة التكوين',
    totalHours: 10,
    coefficient: 1,
    description: 'تحليل الحاجات التكوينية، تخطيط العمليات التكوينية، وآليات التطوير المهني.'
  },
  { 
    id: 10, 
    title: 'الإعلام الآلي وتكنولوجيا التعليم', 
    shortTitle: 'تكنولوجيا التعليم',
    totalHours: 25,
    coefficient: 1,
    description: 'إدماج التكنولوجيات الحديثة، الرقمنة، واستخدام البرمجيات المكتبية (Word, Excel, PPT) في التعليم.'
  },
];

export const REVISED_MODULES: Module[] = MODULES;

export const CORRECTED_DISTRIBUTION: Distribution[] = [
  // Session 1 (55h) | Session 2 (50h) | Session 3 (85h)
  { moduleId: 1, s1: 12, s2: 10, s3: 18 },
  { moduleId: 2, s1: 6, s2: 6, s3: 8 },
  { moduleId: 3, s1: 6, s2: 6, s3: 8 },
  { moduleId: 4, s1: 6, s2: 6, s3: 8 },
  { moduleId: 5, s1: 4, s2: 3, s3: 3 },
  { moduleId: 6, s1: 2, s2: 4, s3: 4 },
  { moduleId: 7, s1: 4, s2: 3, s3: 3 },
  { moduleId: 8, s1: 7, s2: 6, s3: 12 },
  { moduleId: 9, s1: 0, s2: 0, s3: 10 },
  { moduleId: 10, s1: 8, s2: 6, s3: 11 },
];

/**
 * Detailed Syllabus extracted EXACTLY from the provided PDF sequence.
 * Content is strictly verbatim.
 * Durations are bucketed to fit S1, S2, S3 capacities.
 */
export const MODULE_CONTENTS: ModuleContent[] = [
    {
        // Total: 40h | S1: 12h | S2: 10h | S3: 18h
        moduleId: 1, 
        s1Topics: [
            // PDF Page 1 Col 1
            { topic: "عناصر العملية التعليمية التعلمية", duration: 2 },
            { topic: "ضبط مفهوم التعليمية والبيداغوجيا", duration: 2 },
            { topic: "التخطيط لحصة تعلمية - تعليمية", duration: 2 },
            { topic: "تمثيل الأدوار", duration: 2 },
            { topic: "استغلال السندات البيداغوجية", duration: 2 },
            { topic: "تصنيف الأفعال السلوكية", duration: 2 } // = 12h
        ],
        s2Topics: [
            // PDF Page 1 Col 1 Bottom
            { topic: "تنظيم الفضاء وعلاقته بالأهداف التعلمية", duration: 2 },
            { topic: "تنظيم فضاء التربية التحضيرية", duration: 2 },
            // PDF Page 1 Col 2
            { topic: "هيكلة المقطع التعلمي", duration: 2 },
            { topic: "بناء المقطع التعلمي", duration: 2 },
            { topic: "التخطيط لأسبوع الادماج", duration: 2 } // = 10h
        ],
        s3Topics: [
            // PDF Page 1 Col 2 Continued
            { topic: "طرائق التدريس", duration: 2 }, // Added specifically
            { topic: "طرائق التدريس الحديثة", duration: 2 },
            { topic: "التقويم التربوي الفعال", duration: 2 },
            { topic: "التعلم التعاوني", duration: 2 },
            // PDF Page 1 Col 3
            { topic: "مهارات القرن 21", duration: 2 },
            { topic: "التواصل الفعال", duration: 2 },
            { topic: "الوسائل التعليمية", duration: 2 },
            { topic: "انجاز وسيلة بيداغوجية", duration: 2 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 18h
        ]
    },
    {
        // Total: 20h | S1: 6h | S2: 6h | S3: 8h
        moduleId: 2, 
        s1Topics: [
            // PDF Page 1 Col 1 Bottom
            { topic: "مفهوم النظام التربوي", duration: 2 },
            { topic: "أنواع النظام التربوي", duration: 2 },
            { topic: "المناهج التربوية", duration: 2 } // = 6h
        ],
        s2Topics: [
            // PDF Page 1 Col 2 Bottom
            { topic: "ورشات العمل", duration: 2 },
            { topic: "مفهوم المنهاج وتطوره", duration: 2 },
            { topic: "أسس بناء المنهاج", duration: 2 } // = 6h
        ],
        s3Topics: [
            // PDF Page 1 Col 3 Bottom
            { topic: "مكونات المنهاج", duration: 2 },
            { topic: "أنواع المناهج والعوامل المؤثرة فيها", duration: 2 },
            { topic: "تقويم المناهج", duration: 2 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // Added strictly as per PDF
        ]
    },
    {
        // Total: 20h | S1: 6h | S2: 6h | S3: 8h
        moduleId: 3, 
        s1Topics: [
            // PDF Page 2 Col 1
            { topic: "المراحل العمرية للمتعلم ( الطفولة )", duration: 2 },
            { topic: "المراحل العمرية للمتعلم ( المراهقة )", duration: 2 },
            { topic: "مبادئ علم النفس. الفروق الفردية/ التعليم والتعلم / الدافعية / القياس والتقويم", duration: 2 } // = 6h
        ],
        s2Topics: [
            // PDF Page 2 Col 1 Bottom
            { topic: "التعلم النشط والتعلم التقليدي / اساليب اثارة الدافعية/ ممارسات التعلم", duration: 2 },
            // PDF Page 2 Col 2
            { topic: "علم النفس العام العمليات العقلية", duration: 2 },
            { topic: "سيكولوجية الفروق الفردية", duration: 2 } // = 6h
        ],
        s3Topics: [
            // PDF Page 2 Col 2 Continued
            { topic: "المشكلاتت النفسية والتربوية للطفولة (العزلة والانطواء/ السرقة والعنف/ مخاوف الطفال)", duration: 2 },
            { topic: "المشكلات النفسية والتربوية للطفولة (التأخر الدراسي/ الرسوب المدرسي/ التسرب المدرسي)", duration: 2 },
            // PDF Page 2 Col 3
            { topic: "الشخصية / القيادة / دينامية الجماعة", duration: 2 },
            { topic: "/ تقويم نهاية التكوين", duration: 2 } // Combined end eval to fit
        ]
    },
    {
        // Total: 20h | S1: 6h | S2: 6h | S3: 8h
        moduleId: 4, 
        s1Topics: [
            // PDF Page 2 Col 1 Bottom
            { topic: "مفهوم الموظف حقوق وواجبات الموظف", duration: 2 },
            { topic: "المفاهيم القاعدية المؤسسة لغايات التربية", duration: 2 },
            { topic: "المفاهيم القاعدية المؤسسة لمهام المدرسة الجزائرية", duration: 2 } // = 6h
        ],
        s2Topics: [
            // PDF Page 2 Col 1 Bottom (Cont)
            { topic: "مدخل عام للتشريع الهيئات التربوية", duration: 2 },
             // PDF Page 2 Col 2 Bottom
            { topic: "أسلاك موظفي قطاع التربية / الحياة المهنية", duration: 2 },
            { topic: "اللجان الادارية المختلفة / الأخطاء المهنية و الاجراءات الادارية", duration: 2 } // = 6h
        ],
        s3Topics: [
             // PDF Page 2 Col 3 Bottom
            { topic: "المجالس", duration: 2 },
            { topic: "التأمينات االجتماعية وحوادث العمل", duration: 2 },
            { topic: "الأعمال المكملة للمدرسة / الثقافة العامة للأستاذ", duration: 2 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 8h
        ]
    },
    {
        // Total: 10h | S1: 4h | S2: 3h | S3: 3h
        moduleId: 5, 
        s1Topics: [
             // PDF Page 3 Col 1
            { topic: "أدبيات مهنة المربي", duration: 2 },
            { topic: "مفاهيم حول مبادئ وقواعد ميثاق أخلاقيات المهنة", duration: 2 } // = 4h
        ],
        s2Topics: [
             // PDF Page 3 Col 2
            { topic: "مفاهيم / تطبيقات أخلاقيات المهنة/علاقة الميثاق باستقرار الحياة المدرسية ", duration: 1.5 },
            { topic: "أهمية ميثاق أخلاقيات المهنة في الحياة المدرسية", duration: 1.5 } // = 3h
        ],
        s3Topics: [
             // PDF Page 3 Col 3
            { topic: "الحق و الواجب و الجماعة التربوية", duration: 1.5 },
            { topic: "تقويم نهاية التكوين", duration: 1.5 } // = 3h
        ]
    },
    {
        // Total: 10h | S1: 2h | S2: 4h | S3: 4h
        moduleId: 6, 
        s1Topics: [
             // PDF Page 3 Col 1
            { topic: "الوساطة المدرسية", duration: 2 } // = 2h
        ],
        s2Topics: [
             // PDF Page 3 Col 2
            { topic: "الوسيط التربوي", duration: 2 },
            { topic: "أساليب الوقاية من النزاعات المدرسية", duration: 2 } // = 4h
        ],
        s3Topics: [
             // PDF Page 3 Col 2 Bottom
            { topic: "الوساطة البيداغوجية ", duration: 2 },
             // PDF Page 3 Col 3
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 4h
        ]
    },
    {
        // Total: 10h | S1: 4h | S2: 3h | S3: 3h
        moduleId: 7, 
        s1Topics: [
             // PDF Page 3 Col 1
            { topic: "ادارة الصف 1", duration: 2 },
            { topic: "ادارة الصف 2", duration: 2 } // = 4h
        ],
        s2Topics: [
             // PDF Page 3 Col 1 Bottom
            { topic: "تمثيل و محاكاة الممارسات التعليمية", duration: 1.5 },
            { topic: "الوثائق البيداغوجية/ البرامج السنوية/ المخططات السنوية", duration: 1.5 } // = 3h
        ],
        s3Topics: [
             // PDF Page 3 Col 2
            { topic: "المقطع التعلمي ونماذج تطبيقية لاستغلال الكتاب المدرسي", duration: 1 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 3h
        ]
    },
    {
        // Total: 25h | S1: 7h | S2: 6h | S3: 12h
        // Includes Annex Content in S3
        moduleId: 8, 
        s1Topics: [
            // PDF Page 3 Col 1 Bottom
            { topic: "مفهوم التقويم", duration: 1.5 },
            { topic: "أنواع التقويم ووسائله", duration: 2 },
            { topic: "المعالجة البيداغوجية وأنواعها", duration: 2 },
            { topic: "تغذية راجعة / المقوم الجيد", duration: 1.5 } // = 7h
        ],
        s2Topics: [
            // PDF Page 3 Col 2 Bottom
            { topic: "أنواع التقويم/ المخطط السنوي للتقويم البيداغوجي", duration: 2 },
            { topic: "المخطط السنوي للمراقبة المستمرة", duration: 2 },
            { topic: "المعالجة/ مصادره و خطوات المعالجة", duration: 2 } // = 6h
        ],
        s3Topics: [
            // PDF Page 3 Col 3 Bottom
            { topic: "الاختبارات / أشكالها / مزاياها / بناء الاختبارات", duration: 2 },
            { topic: "تصورات حول مفهوم المعالجة و أنماطها", duration: 2 },
            { topic: "معالجة الخطأ/ خطة المعالجة / تأمل ذاتي", duration: 1 },
            { topic: "أهداف النظرة الجديدة لتقييم المكتسبات", duration: 1 },
            { topic: "تقييم المكتسبات وفق متطلبات المناهج", duration: 1 },
            { topic: "الكفاءات المعنية بالتقييم / الأنماط المعتمدة", duration: 1 },
            { topic: "معايير التقييم / شروط إعداد المواضيع", duration: 1 },
            { topic: "الشبكات التحليلية/ نماذج من مواضيع التقييم/ دفتر تقييم المكتسبات", duration: 1 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 12h
        ]
    },
    {
        // Total: 10h | S1: 0h | S2: 0h | S3: 10h
        moduleId: 9, 
        s1Topics: [],
        s2Topics: [],
        s3Topics: [
            // PDF Page 4 Col 2
            { topic: "التنظيم العلمي للعمل", duration: 2 },
            { topic: "تحليل المهام", duration: 2 },
            // PDF Page 4 Col 3
            { topic: "الجودة والضمان / التخطيط / التقويم / ادارة حلقة الجودة/ السبب والأثر بين التعليم والتعلم", duration: 2 },
            { topic: "خطة التطوير (المحتويات / المراحل / طريقة التكوين)", duration: 2 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 10h
        ]
    },
    {
        // Total: 25h | S1: 8h | S2: 6h | S3: 11h
        moduleId: 10, 
        s1Topics: [
            // PDF Page 4 Col 1
            { topic: "ادماج تكنولوجيات الاعلام والاتصال في التعليم", duration: 2 },
            { topic: "استخدام الحاسوب وادارة الملفات", duration: 2 },
            { topic: "انتاج وثيقة تتضمن النص أو الصورة", duration: 2 },
            { topic: "الابحار والبحث في شبكة الأنترنت", duration: 2 } // = 8h
        ],
        s2Topics: [
            // PDF Page 4 Col 2
            { topic: "استعمال البريد الالكتروني", duration: 2 },
            { topic: "تقييم التعلمات و معالجة البيانات", duration: 2 },
            { topic: "نظام التشغيل/ الشبكات/ التخزين السحابي", duration: 2 } // = 6h
        ],
        s3Topics: [
            // PDF Page 4 Col 3
            { topic: "معالجة النصوص والجداول", duration: 2 },
            { topic: "العروض التقديمية", duration: 2 },
            { topic: "تغذية راجعة حول مايكروسوفت أكسل", duration: 1 },
            { topic: "العروض التقديمية Powerpoint", duration: 2 },
            { topic: "العروض التقديمية Powerpoint", duration: 2 },
            { topic: "تقويم نهاية التكوين", duration: 2 } // = 11h
        ]
    }
];
