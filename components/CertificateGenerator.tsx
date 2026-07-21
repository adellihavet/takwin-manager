import React, { useState, useEffect } from 'react';
import { Printer, Filter, Calendar, PenTool, Hash, Search, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES } from '../constants';

const CertificateGenerator: React.FC = () => {
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [deliberationDate, setDeliberationDate] = useState<string>('');
    const [signatureDate, setSignatureDate] = useState<string>('');

    // Certificate numbering config state for each specialty
    const [certificateConfigs, setCertificateConfigs] = useState<Record<string, { startNumber: number; prefix: string; padLength: number }>>({});

    // Deferred/postponed trainee IDs state (for دورة استدراكية)
    const [deferredTraineeIds, setDeferredTraineeIds] = useState<string[]>([]);
    const [searchTraineeQuery, setSearchTraineeQuery] = useState<string>('');

    useEffect(() => {
        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e) {}
        
        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) {
            try {
                const parsed: Specialty[] = JSON.parse(savedSpec);
                const updated = parsed.map(s => {
                    const def = DEFAULT_SPECIALTIES.find(d => d.id === s.id);
                    return def ? { ...s, name: def.name, color: def.color || s.color } : s;
                });
                setSpecialties(updated);
                localStorage.setItem('takwin_specialties_db', JSON.stringify(updated));
            } catch(e) {}
        }

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}

        const savedConfigs = localStorage.getItem('takwin_certificate_numbers_config');
        if (savedConfigs) {
            try {
                setCertificateConfigs(JSON.parse(savedConfigs));
            } catch(e) {}
        }

        const savedDeferred = localStorage.getItem('takwin_deferred_certificates_ids');
        if (savedDeferred) {
            try {
                setDeferredTraineeIds(JSON.parse(savedDeferred));
            } catch(e) {}
        }

        // ضبط تاريخ اليوم تلقائياً بتنسيق YYYY/MM/DD
        const today = new Date();
        const formattedDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        setSignatureDate(formattedDate);
    }, []);

    const updateConfig = (specialtyId: string, fields: Partial<{ startNumber: number; prefix: string; padLength: number }>) => {
        const updated = {
            ...certificateConfigs,
            [specialtyId]: {
                ...(certificateConfigs[specialtyId] || { startNumber: 1, prefix: '', padLength: 2 }),
                ...fields
            }
        };
        setCertificateConfigs(updated);
        localStorage.setItem('takwin_certificate_numbers_config', JSON.stringify(updated));
    };

    const toggleTraineeDeferral = (id: string) => {
        let updated: string[];
        if (deferredTraineeIds.includes(id)) {
            updated = deferredTraineeIds.filter(tid => tid !== id);
        } else {
            updated = [...deferredTraineeIds, id];
        }
        setDeferredTraineeIds(updated);
        localStorage.setItem('takwin_deferred_certificates_ids', JSON.stringify(updated));
    };

    const getCertificateNumber = (trainee: Trainee) => {
        const specConfig = certificateConfigs[trainee.specialtyId] || { startNumber: 1, prefix: '', padLength: 2 };
        const sortedTraineesOfSpec = trainees
            .filter(t => t.specialtyId === trainee.specialtyId && !deferredTraineeIds.includes(t.id))
            .sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));
        
        const index = sortedTraineesOfSpec.findIndex(t => t.id === trainee.id);
        if (index === -1) return '';
        
        const num = (specConfig.startNumber || 1) + index;
        const paddedNum = String(num).padStart(specConfig.padLength || 2, '0');
        return `${specConfig.prefix || ''}${paddedNum}`;
    };

    const filteredTrainees = trainees.filter(t => 
        (filterSpecialty === 'all' || t.specialtyId === filterSpecialty) &&
        !deferredTraineeIds.includes(t.id)
    );

    // Sort to group by specialty, then sort alphabetically within each specialty
    const sortedFilteredTrainees = [...filteredTrainees].sort((a, b) => {
        if (a.specialtyId !== b.specialtyId) {
            return a.specialtyId.localeCompare(b.specialtyId);
        }
        const nameA = `${a.surname} ${a.name}`;
        const nameB = `${b.surname} ${b.name}`;
        return nameA.localeCompare(nameB, 'ar');
    });
    
    const handlePrint = () => {
        const content = document.getElementById('certificates-print-template');
        let printSection = document.getElementById('print-section');
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        if (content && printSection) {
            printSection.innerHTML = '';
            const clone = content.cloneNode(true) as HTMLElement;
            clone.classList.remove('hidden');
            printSection.appendChild(clone);
            window.print();
        }
    };

    return (
        <div className="animate-fadeIn">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa:wght@400;700&display=swap');
                    .font-amiri { font-family: 'Amiri', serif; }
                    .font-aref { font-family: 'Aref Ruqaa', serif; }
                    @media print {
                        .page-break { page-break-after: always; }
                        /* فرض طباعة الخلفيات والألوان بدقة */
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                `}
            </style>

            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">إصدار شهادات النجاح</h2>
                        <p className="text-slate-400 text-sm">التصميم الوطني لدفعة 2026/2025</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        طباعة الشهادات ({filteredTrainees.length})
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <div className="space-y-2">
                        <label className="text-slate-300 font-bold text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            تاريخ محضر المداولات:
                        </label>
                        <input type="text" placeholder="2026/07/30" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-500 text-right font-bold" value={deliberationDate} onChange={e => setDeliberationDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-300 font-bold text-sm flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-emerald-400" />
                            تاريخ التحرير:
                        </label>
                        <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500 text-right font-bold" value={signatureDate} onChange={e => setSignatureDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-300 font-bold text-sm flex items-center gap-2">
                            <Filter className="w-4 h-4 text-blue-400" />
                            تصفية حسب التخصص:
                        </label>
                        <select className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}>
                            <option value="all">كل التخصصات</option>
                            {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Certificate numbers configuration per specialty */}
                <div className="mt-8 border-t border-slate-700/80 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Hash className="w-5 h-5 text-amber-500" />
                        ضبط مجالات أرقام الشهادات لكل تخصص
                    </h3>
                    <p className="text-slate-400 text-xs mb-4">
                        حدد رقم البداية وبادئة الأرقام (إن وجدت) وطول الأصفار لكل تخصص لتوليد أرقام تسلسلية رقمية ذكية لكل متكون تلقائياً بالترتيب الأبجدي.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {specialties.map(spec => {
                            const config = certificateConfigs[spec.id] || { startNumber: 1, prefix: '', padLength: 2 };
                            const specTraineesCount = trainees.filter(t => t.specialtyId === spec.id).length;
                            
                            // Calculate expected range
                            const start = config.startNumber || 1;
                            const end = start + Math.max(0, specTraineesCount - 1);
                            const pad = config.padLength || 2;
                            const prefix = config.prefix || '';
                            
                            const rangeText = specTraineesCount > 0 
                                ? `من ${prefix}${String(start).padStart(pad, '0')} إلى ${prefix}${String(end).padStart(pad, '0')}`
                                : 'لا يوجد متكونين في هذا التخصص حالياً';

                            return (
                                <div key={spec.id} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                                        <span className="font-bold text-white text-sm flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spec.color || '#3b82f6' }} />
                                            {spec.name}
                                        </span>
                                        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold font-mono">
                                            {specTraineesCount} متكون
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 font-bold block text-right">رقم البداية:</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-500 text-center font-bold font-mono"
                                                value={config.startNumber || 1} 
                                                onChange={e => updateConfig(spec.id, { startNumber: parseInt(e.target.value) || 1 })} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 font-bold block text-right">البادئة/السابقة:</label>
                                            <input 
                                                type="text" 
                                                placeholder="مثال: 10/"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-500 text-center font-bold"
                                                value={config.prefix || ''} 
                                                onChange={e => updateConfig(spec.id, { prefix: e.target.value })} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 font-bold block text-right">عدد الخانات (أصفار):</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="6"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-500 text-center font-bold font-mono"
                                                value={config.padLength || 2} 
                                                onChange={e => updateConfig(spec.id, { padLength: parseInt(e.target.value) || 1 })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/60 py-2 px-3 rounded-lg text-center border border-slate-900">
                                        <p className="text-xs text-slate-400 font-medium">
                                            المجال المتولد: <span className="text-amber-400 font-bold font-mono">{rangeText}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Exclude / Defer Trainees Section */}
                <div className="mt-8 border-t border-slate-700/80 pt-6">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <UserX className="w-5 h-5 text-red-500" />
                        استثناء وتأجيل طباعة شهادات المتكونين (المتخلفين والدورة الاستدراكية)
                    </h3>
                    <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                        قم بتحديد المتكونين المؤجلين أو المتخلفين الذين ترغب في عدم إصدار شهادات لهم في هذه الدورة. المتكون المستثنى 
                        <strong className="text-amber-400"> لن تطبع شهادته</strong>، وسيتم <strong className="text-amber-400">تجاوزه تلقائياً في حساب تسلسل أرقام الشهادات</strong> لضمان بقاء الأرقام متتالية ومستمرة بدون أي فراغات.
                    </p>

                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full sm:max-w-md">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="ابحث عن متكون بالاسم أو اللقب..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-white text-xs text-right outline-none focus:border-amber-500 placeholder:text-slate-500"
                                    value={searchTraineeQuery}
                                    onChange={e => setSearchTraineeQuery(e.target.value)}
                                />
                            </div>
                            <div className="text-xs text-slate-400 font-bold flex gap-4">
                                <span>إجمالي المستطنين حالياً: <span className="text-red-400 font-mono text-sm">{deferredTraineeIds.length}</span></span>
                                <span>|</span>
                                <span>المعروضين للتعديل: <span className="text-amber-400 font-mono text-sm">{
                                    trainees.filter(t => (filterSpecialty === 'all' || t.specialtyId === filterSpecialty) && 
                                    (`${t.surname} ${t.name}`.toLowerCase().includes(searchTraineeQuery.trim().toLowerCase()))).length
                                }</span></span>
                            </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto border border-slate-800/80 rounded-xl divide-y divide-slate-800/60 bg-slate-950/20 pr-1">
                            {(() => {
                                const list = trainees.filter(t => {
                                    const matchesSpec = filterSpecialty === 'all' || t.specialtyId === filterSpecialty;
                                    const fullName = `${t.surname} ${t.name}`.toLowerCase();
                                    const matchesSearch = fullName.includes(searchTraineeQuery.trim().toLowerCase());
                                    return matchesSpec && matchesSearch;
                                }).sort((a, b) => (a.surname + a.name).localeCompare(b.surname + b.name, 'ar'));

                                if (list.length === 0) {
                                    return (
                                        <div className="p-8 text-center text-xs text-slate-500">
                                            لا توجد نتائج تطابق خيارات التصفية والبحث الحالية.
                                        </div>
                                    );
                                }

                                return list.map(t => {
                                    const isDeferred = deferredTraineeIds.includes(t.id);
                                    return (
                                        <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-900/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTraineeDeferral(t.id)}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                                        isDeferred 
                                                            ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' 
                                                            : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:border-emerald-400 hover:bg-emerald-500/20'
                                                    }`}
                                                >
                                                    {isDeferred ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                </button>
                                                <div className="text-right">
                                                    <p className={`text-xs font-bold ${isDeferred ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                        {t.surname} {t.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {specialties.find(s => s.id === t.specialtyId)?.name || ''} - الفوج {t.groupId}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTraineeDeferral(t.id)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                                        isDeferred 
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                    }`}
                                                >
                                                    {isDeferred ? 'مؤجل ومستثنى' : 'نشط (مدرج في الطباعة)'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 print:hidden opacity-90 transform scale-75 md:scale-90 origin-top select-none pointer-events-none">
                <div className="text-center text-slate-500 mb-2 font-bold bg-slate-800/50 p-2 rounded">-- معاينة النسخة الرسمية النهائية --</div>
                {sortedFilteredTrainees.slice(0, 1).map(t => (
                    <CertificateCard 
                        key={t.id} 
                        trainee={t} 
                        institution={institution} 
                        specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} 
                        deliberationDate={deliberationDate} 
                        signatureDate={signatureDate} 
                        certificateNumber={getCertificateNumber(t)}
                    />
                ))}
            </div>

            <div id="certificates-print-template" className="hidden">
                {sortedFilteredTrainees.map(t => (
                    <div key={t.id} className="page-break">
                        <CertificateCard 
                            trainee={t} 
                            institution={institution} 
                            specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} 
                            deliberationDate={deliberationDate} 
                            signatureDate={signatureDate} 
                            certificateNumber={getCertificateNumber(t)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

interface CertificateProps {
    trainee: Trainee;
    institution: InstitutionConfig;
    specialtyName: string;
    deliberationDate: string;
    signatureDate: string;
    certificateNumber: string;
}

const CertificateCard: React.FC<CertificateProps> = ({ trainee, institution, specialtyName, deliberationDate, signatureDate, certificateNumber }) => {
    
    // --- دوال التواريخ (مهمة جداً لضبط الاتجاه) ---
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '..../..../.......';
        const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})/;
        const match = dateString.match(isoDateRegex);
        if (match) {
            const [_, year, month, day] = match;
            return `${year}/${month}/${day}`; 
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${y}/${m}/${d}`;
    };

    const formatSchoolYear = (yearString: string) => {
        if (!yearString) return '';
        const separator = yearString.includes('/') ? '/' : yearString.includes('-') ? '-' : null;
        if (separator) {
            const parts = yearString.split(separator);
            if (parts.length === 2) {
                const part1 = parts[0].trim(); 
                const part2 = parts[1].trim();
                return `${part2}${separator}${part1}`;
            }
        }
        return yearString;
    };

    const DateDisplay = ({ value, isDate = true, className = "" }: { value: string | undefined, isDate?: boolean, className?: string }) => {
        if (!value) return <span>..../..../.......</span>;
        const displayValue = isDate ? formatDate(value) : value;
        return <span dir="ltr" className={className} style={{ display: 'inline-block', unicodeBidi: 'embed' }}>{displayValue}</span>;
    };

    // هذا هو كلاس التنسيق الموحد لجميع المتغيرات (خط الرقعة + الأخضر الجزائري)
    const VARIABLE_STYLE = "font-aref font-bold text-emerald-700 text-xl px-1";

    return (
        <div className="w-[297mm] h-[210mm] relative bg-white text-black mx-auto flex flex-col p-8 overflow-hidden border-[1px] border-slate-200" style={{ direction: 'rtl' }}>
            
            {/* Patriotic Corner Ornaments */}
            <div className="absolute top-8 right-8 w-16 h-16 border-t-[6px] border-r-[6px] border-emerald-600 z-20"></div>
            <div className="absolute top-8 left-8 w-16 h-16 border-t-[6px] border-l-[6px] border-red-600 z-20"></div>
            <div className="absolute bottom-8 right-8 w-16 h-16 border-b-[6px] border-r-[6px] border-red-600 z-20"></div>
            <div className="absolute bottom-8 left-8 w-16 h-16 border-b-[6px] border-l-[6px] border-emerald-600 z-20"></div>

            <div className="relative z-30 flex flex-col h-full px-16">
                
                {/* 1. National Header */}
                <div className="relative mb-1 pt-4">
                    <div className="text-center font-amiri font-bold text-2xl space-y-0.5">
                        <p className="tracking-widest">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                        <p>وزارة التربية الوطنية</p>
                    </div>
                </div>

                {/* 2. Directorate and Institute (Styled Variables) */}
                <div className="flex justify-between items-center mb-1 font-amiri font-bold border-b border-slate-200 pb-1">
                    <div className="text-right w-1/2 text-[16px]">
                        <p>المعهد الوطني لتكوين موظفي قطاع التربية الوطنية <span className={VARIABLE_STYLE}>{institution.institute || '....................'}</span></p>
                    </div>
                    <div className="text-left w-1/2 text-[17px]">
                        <p>مديرية التربية لولاية <span className={VARIABLE_STYLE}>{institution.wilaya || '....................'}</span></p>
                    </div>
                </div>

                {/* 3. Certificate Title */}
                <div className="text-center mb-1">
                    <h1 className="text-6xl font-aref font-black text-slate-800 drop-shadow-sm">شهادة نجاح</h1>
                </div>

                {/* 4. Preamble (Styled Variables) */}
                <div className="text-[13px] space-y-0.5 font-amiri text-justify font-medium text-slate-800 leading-[1.25] px-4 mb-2">
                    <p>إن مدير المعهد الوطني لتكوين موظفي قطاع التربية الوطنية <span className={VARIABLE_STYLE + " text-base"}>{institution.institute || '....................'}</span>،</p>
                    <p>- بمقتضى الأمر رقم 06-03 المؤرخ في 19 جمادى الثانية عام 1427 الموافق 15 يوليو سنة 2006، المتضمن القانون الأساسي العام للوظيفة العمومية، المتمم،</p>
                    <p>- وبمقتضى المرسوم التنفيذي رقم 25-54 المؤرخ في 21 رجب عام 1446 الموافق 21 جانفي سنة 2025، والمتضمن القانون الأساسي الخاص بالموظفين المنتمين للأسلاك الخاصة بالتربية الوطنية،</p>
                    <p>- وبمقتضى القرار المؤرخ في 9 ذي القعدة عام 1436 الموافق 24 غشت سنة 2015، يحدد كيفيات تنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي لموظفي التعليم ومدته وكذا محتوى برامجه،</p>
                    <p>- وبناء على الرسالة المنشور رقم 355 المؤرخة في 2025/11/23 المتعلقة بتنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي والتكوين المسبق للتعيين للأساتذة المتعاقدين المدمجين بعنوان سنة 2025،</p>
                    <p>- وبناء على محضر لجنة نهاية التكوين بتاريخ: <span className="border-b border-black px-6 inline-flex"><DateDisplay value={deliberationDate} className={VARIABLE_STYLE} /></span></p>
                </div>

                {/* 5. Witness */}
                <div className="text-center mb-1">
                    <h2 className="text-4xl font-aref font-bold text-slate-900 px-10 py-0.5">يشـــــــــــــــــــــــــهـــــد</h2>
                </div>

                {/* 6. Main Body Content (Styled Variables - Unified Font & Color) */}
                <div className="px-6 text-[22px] leading-[1.4] font-amiri text-right bg-slate-50/20 p-3 rounded-2xl border border-slate-100">
                    <p className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span>أن السيد(ة):</span>
                        {/* هنا تم استخدام نفس الستايل (الأخضر وخط الرقعة) لاسم الطالب */}
                        <span className={`border-b border-slate-400 px-4 min-w-[280px] text-center ${VARIABLE_STYLE} text-4xl`}>{trainee.surname} {trainee.name}</span>
                        <span>المولود(ة) في:</span>
                        <span className="border-b border-slate-400 px-4 inline-flex"><DateDisplay value={trainee.dob} className={VARIABLE_STYLE} /></span>
                        <span>بـــــ:</span>
                        <span className={`border-b border-slate-400 px-4 flex-grow text-center ${VARIABLE_STYLE}`}>{trainee.pob}</span>
                    </p>
                    
                    <p className="flex flex-wrap items-baseline gap-2 mt-2">
                        <span>قد تابع(ت) بنجاح دورة التكوين البيداغوجي التحضيري أثناء التربص التجريبي، رتبة:</span>
                        <span className="font-black text-slate-900 bg-slate-100 px-4 rounded">أستاذ التعليم الابتدائي</span>
                        <span>مادة:</span>
                        <span className={`border-b-2 border-slate-900 px-6 ${VARIABLE_STYLE}`}>{specialtyName}</span>
                        <span>دفعة:</span>
                        <span className="px-4 inline-flex"><DateDisplay value={formatSchoolYear("2025/2026")} isDate={false} className={VARIABLE_STYLE} /></span>
                    </p>
                </div>

                {/* 7. Footer (Styled Variables) */}
                <div className="mt-4 flex justify-center items-center font-amiri font-bold text-lg border-y border-slate-100 py-1">
                    <div className="flex gap-12 w-full justify-center">
                        <p>حرر في: <span className={`border-b border-dotted border-black px-6 ${VARIABLE_STYLE}`}>{institution.wilaya || '....................'}</span></p>
                        <p>بتاريخ: <span className="border-b border-dotted border-black px-6 inline-flex"><DateDisplay value={signatureDate} className={VARIABLE_STYLE} /></span></p>
                        <p>تحت رقم: <span className={`border-b border-dotted border-black px-8 ${VARIABLE_STYLE}`}>{certificateNumber || '...................'}</span></p>
                    </div>
                </div>

                {/* 8. Signatures */}
                <div className="flex justify-between mt-auto pb-6 font-amiri">
                    <div className="text-center w-80">
                        <p className="font-black text-xl mb-14 underline decoration-red-600 underline-offset-8 decoration-2">إمضاء مدير المعهد</p>
                        <div className="h-6"></div>
                    </div>
                    
                    <div className="w-32 h-32 flex items-center justify-center opacity-5">
                    </div>

                    <div className="text-center w-80">
                        <p className="font-black text-xl mb-14 underline decoration-emerald-600 underline-offset-8 decoration-2">إمضاء مدير التربية</p>
                        <div className="h-6"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CertificateGenerator;
