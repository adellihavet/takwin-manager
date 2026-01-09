import React, { useState, useEffect } from 'react';
import { Printer, Filter, Calendar, PenTool } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES } from '../constants';

const CertificateGenerator: React.FC = () => {
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    const [deliberationDate, setDeliberationDate] = useState<string>('');
    const [signatureDate, setSignatureDate] = useState<string>('');

    useEffect(() => {
        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e) {}
        
        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) try { setSpecialties(JSON.parse(savedSpec)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}

        // ضبط تاريخ اليوم تلقائياً بتنسيق YYYY/MM/DD
        const today = new Date();
        const formattedDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        setSignatureDate(formattedDate);
    }, []);

    const filteredTrainees = trainees.filter(t => (filterSpecialty === 'all' || t.specialtyId === filterSpecialty));
    
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
                        <input type="text" placeholder="2026/07/25" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-500 text-right font-bold" value={deliberationDate} onChange={e => setDeliberationDate(e.target.value)} />
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
            </div>

            <div className="grid grid-cols-1 gap-8 print:hidden opacity-90 transform scale-75 md:scale-90 origin-top select-none pointer-events-none">
                <div className="text-center text-slate-500 mb-2 font-bold bg-slate-800/50 p-2 rounded">-- معاينة النسخة الرسمية النهائية --</div>
                {filteredTrainees.slice(0, 1).map(t => (
                    <CertificateCard key={t.id} trainee={t} institution={institution} specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} deliberationDate={deliberationDate} signatureDate={signatureDate} />
                ))}
            </div>

            <div id="certificates-print-template" className="hidden">
                {filteredTrainees.map(t => (
                    <div key={t.id} className="page-break">
                        <CertificateCard trainee={t} institution={institution} specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} deliberationDate={deliberationDate} signatureDate={signatureDate} />
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
}

const CertificateCard: React.FC<CertificateProps> = ({ trainee, institution, specialtyName, deliberationDate, signatureDate }) => {
    const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg/960px-%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg.png";
    const FLAG_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Flag_of_Algeria.svg/320px-Flag_of_Algeria.svg.png";
    
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
                    <div className="absolute top-2 right-0">
                        <img src={FLAG_URL} alt="Flag" className="w-24 shadow-sm border border-slate-100" />
                    </div>
                    <div className="absolute top-2 left-0">
                        <img src={LOGO_URL} alt="Logo" className="w-20" />
                    </div>
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
                    <p>- وبناء على المنشور رقم 355 المؤرخ في 2025/11/23 المتعلق بتنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي والتكوين المسبق للتعيين للأساتذة المتعاقدين المدمجين بعنوان سنة <DateDisplay value={formatSchoolYear("2025/2026")} isDate={false} className={VARIABLE_STYLE + " text-base"}/>،</p>
                    <p>- وبناء على محضر لجنة نهاية التكوين بتاريخ: <span className="border-b border-black px-6 inline-flex"><DateDisplay value={deliberationDate} className={VARIABLE_STYLE} /></span></p>
                </div>

                {/* 5. Witness */}
                <div className="text-center mb-1">
                    <h2 className="text-4xl font-aref font-bold text-slate-900 px-10 py-0.5">يشـــــــــــــــــــــــــهـــــد</h2>
                </div>

                {/* 6. Main Body Content (Styled Variables - Unified Font & Color) */}
                <div className="px-6 text-[22px] leading-[1.4] font-amiri text-right bg-slate-50/20 p-3 rounded-2xl border border-slate-100">
                    <p className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span>بأن السيد(ة):</span>
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
                        <span>بعنوان دفعة:</span>
                        <span className="px-4 inline-flex"><DateDisplay value={formatSchoolYear("2025/2026")} isDate={false} className={VARIABLE_STYLE} /></span>
                    </p>
                </div>

                {/* 7. Footer (Styled Variables) */}
                <div className="mt-4 flex justify-center items-center font-amiri font-bold text-lg border-y border-slate-100 py-1">
                    <div className="flex gap-12 w-full justify-center">
                        <p>حرر بـ: <span className={`border-b border-dotted border-black px-6 ${VARIABLE_STYLE}`}>{institution.wilaya || '....................'}</span></p>
                        <p>في: <span className="border-b border-dotted border-black px-6 inline-flex"><DateDisplay value={signatureDate} className={VARIABLE_STYLE} /></span></p>
                        <p>تحت رقم: <span className="border-b border-dotted border-black px-12">...................</span></p>
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