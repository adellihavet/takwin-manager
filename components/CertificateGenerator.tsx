
import React, { useState, useEffect } from 'react';
import { Printer, Filter, Calendar } from 'lucide-react';
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

        const today = new Date();
        const formattedDate = new Intl.DateTimeFormat('ar-DZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(today);
        setSignatureDate(formattedDate);
    }, []);

    const filteredTrainees = trainees.filter(t => filterSpecialty === 'all' || t.specialtyId === filterSpecialty);
    
    // --- DYNAMIC PRINT HANDLER (Fixes the issue) ---
    const handlePrint = () => {
        const content = document.getElementById('certificates-print-template');
        let printSection = document.getElementById('print-section');
        
        // Ensure the global print section exists
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }
        
        if (content && printSection) {
            // 1. Clear stale content from other sections
            printSection.innerHTML = '';
            
            // 2. Clone the certificates template
            const clone = content.cloneNode(true) as HTMLElement;
            clone.classList.remove('hidden');
            
            // 3. Append and Print
            printSection.appendChild(clone);
            window.print();
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Inject Google Fonts for the Certificate */}
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa:wght@400;700&display=swap');
                    .font-amiri { font-family: 'Amiri', serif; }
                    .font-aref { font-family: 'Aref Ruqaa', serif; }
                `}
            </style>

            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">إصدار الشهادات</h2>
                        <p className="text-slate-400 text-sm">طباعة شهادات نهاية التكوين وفق النموذج الرسمي المحين</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        طباعة الكل ({filteredTrainees.length})
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <div className="space-y-2">
                        <label className="text-slate-300 font-bold text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            تاريخ محضر المداولات (يكتب يدوياً):
                        </label>
                        <input 
                            type="text" 
                            placeholder="مثال: 25 جويلية 2026"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-500 text-right"
                            value={deliberationDate}
                            onChange={e => setDeliberationDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-slate-300 font-bold text-sm flex items-center gap-2">
                            <Filter className="w-4 h-4 text-blue-400" />
                            تصفية حسب التخصص:
                        </label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                            value={filterSpecialty}
                            onChange={e => setFilterSpecialty(e.target.value)}
                        >
                            <option value="all">الكل</option>
                            {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Print Preview Area (Screen) */}
            <div className="grid grid-cols-1 gap-8 print:hidden opacity-75 pointer-events-none select-none transform scale-90 origin-top">
                <div className="text-center text-slate-500 mb-2 font-bold bg-slate-800/50 p-2 rounded">
                    -- معاينة تقريبية (اضغط زر الطباعة في الأعلى لعرض النسخة الرسمية) --
                </div>
                {filteredTrainees.slice(0, 1).map(t => (
                    <CertificateCard 
                        key={t.id} 
                        trainee={t} 
                        institution={institution} 
                        specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} 
                        deliberationDate={deliberationDate}
                        signatureDate={signatureDate}
                    />
                ))}
            </div>

            {/* Actual Print Content - HIDDEN TEMPLATE */}
            {/* ID changed to avoid conflicts. It is cloned by handlePrint. */}
            <div id="certificates-print-template" className="hidden">
                {filteredTrainees.map(t => (
                    <div key={t.id} className="page-break" style={{ pageBreakAfter: 'always' }}>
                        <CertificateCard 
                            trainee={t} 
                            institution={institution} 
                            specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} 
                            deliberationDate={deliberationDate}
                            signatureDate={signatureDate}
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
}

const CertificateCard: React.FC<CertificateProps> = ({ trainee, institution, specialtyName, deliberationDate, signatureDate }) => {
    const FLAG_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Flag_of_Algeria.svg/320px-Flag_of_Algeria.svg.png";
    const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg/960px-%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9.svg.png?20230207012220";

    return (
        <div className="w-[297mm] h-[210mm] relative bg-white text-black mx-auto flex flex-col p-4 overflow-hidden" style={{ direction: 'rtl' }}>
            
            {/* Background Pattern / Watermark */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <img src={LOGO_URL} alt="watermark" className="w-[600px] grayscale" />
            </div>

            {/* Ornamental Borders */}
            <div className="absolute inset-4 border-[4px] border-double border-slate-900 rounded-lg pointer-events-none z-20"></div>
            <div className="absolute inset-[10px] border-[1px] border-slate-400 rounded-xl pointer-events-none z-20"></div>
            
            {/* Corner Ornaments */}
            <div className="absolute top-4 right-4 w-24 h-24 border-t-[8px] border-r-[8px] border-green-800/80 rounded-tr-3xl z-20"></div>
            <div className="absolute top-4 left-4 w-24 h-24 border-t-[8px] border-l-[8px] border-red-800/80 rounded-tl-3xl z-20"></div>
            <div className="absolute bottom-4 right-4 w-24 h-24 border-b-[8px] border-r-[8px] border-red-800/80 rounded-br-3xl z-20"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 border-b-[8px] border-l-[8px] border-green-800/80 rounded-bl-3xl z-20"></div>

            {/* Content Container */}
            <div className="relative z-30 flex flex-col h-full px-16 py-6">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start mb-4">
                    {/* Right: Flag */}
                    <div className="w-24 flex justify-center pt-2">
                        <img src={FLAG_URL} alt="Algerian Flag" className="h-14 shadow-sm rounded-sm" />
                    </div>

                    {/* Center: Text */}
                    <div className="text-center flex-1 pt-1">
                        <h3 className="text-lg font-bold font-amiri tracking-wide mb-1">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                        <h3 className="text-lg font-bold font-amiri text-slate-800 mb-2">وزارة التربية الوطنية</h3>
                        
                        <div className="flex justify-between px-4 text-sm font-bold font-amiri mt-1 border-t border-slate-300 pt-1 w-full">
                            <span>مديرية التربية لولاية {institution.wilaya}</span>
                            <span>مصلحة الموظفين والتفتيش</span>
                        </div>
                    </div>

                    {/* Left: Ministry Logo */}
                    <div className="w-24 flex justify-center">
                         <img src={LOGO_URL} alt="Ministry Logo" className="h-16" />
                    </div>
                </div>

                {/* 2. Certificate Title */}
                <div className="text-center mb-4 relative">
                    <h1 className="text-4xl font-aref text-green-800 drop-shadow-sm leading-normal py-1">
                        شهــــــادة نـهــايــة الـتـكــويــن الـبـيـداغــوجــي الـتـحـضـيـري
                    </h1>
                    <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto mt-1 opacity-50"></div>
                </div>

                {/* 3. Legal References */}
                <div className="text-sm space-y-1 font-amiri text-justify font-medium text-slate-900 leading-tight px-4 tracking-tight">
                    <p className="flex items-start gap-2">
                        <span className="text-red-600 font-bold text-lg">•</span>
                        بمقتضى المرسوم التنفيذي رقم 54/25 المؤرخ في 21 رجب عام 1446 هـــ الموافق لــ 21 جانفي 2025 والمتضمن القــــــانون الأساسي الخــــــــاص بالموظفين المنتمين للأسلاك الخاصة بالتربية.
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-green-600 font-bold text-lg">•</span>
                        بناء على القرار الوزاري المؤرخ في 24 أوت 2015 الذي يحدد كيفيات تنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي لموظفي التعليم ومدته وكذا محتوى برامجه.
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-green-600 font-bold text-lg">•</span>
                        بناء على المنشور الوزاري رقم 355 المؤرخ في 2025/11/23 الذي يحدد كيفيات تنظيم التكوين البيداغوجي التحضيري أثناء التربص التجريبي والتكوين المسبق للتعيين للأساتذة المتعاقدين المدمجين بعنوان سنة: 2025.
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-red-600 font-bold text-lg">•</span>
                        بناء على محضر مداولات نهاية التكوين المؤرخ في: <span className="font-aref text-lg px-4 border-b border-dotted border-black min-w-[120px] inline-block text-center text-blue-900">{deliberationDate || '........................'}</span>
                    </p>
                </div>

                {/* 4. Certification Body */}
                <div className="text-center mt-4">
                    <h2 className="text-2xl font-bold font-amiri mb-4 underline decoration-wavy decoration-slate-300 decoration-1 underline-offset-8">
                        يشهد مدير التربية لولاية {institution.wilaya || '....................'}
                    </h2>

                    <div className="px-2 text-xl leading-relaxed font-amiri space-y-2 text-right">
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span>بأن السيد(ة):</span>
                            <span className="font-aref font-bold text-2xl min-w-[280px] border-b-2 border-slate-400 text-center px-4 text-blue-900">{trainee.surname} {trainee.name}</span>
                            <span>المولود(ة) في:</span>
                            <span className="font-aref font-bold text-xl min-w-[160px] border-b-2 border-slate-400 text-center px-4 text-blue-900">{trainee.dob}</span>
                            <span>بـــ:</span>
                            <span className="font-aref font-bold text-xl min-w-[120px] border-b-2 border-slate-400 text-center px-4 text-blue-900">{trainee.pob}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span>أستاذ(ة) التعلــــــــــــيم الابتدائي، التخصص:</span>
                            <span className="font-aref font-bold text-2xl flex-grow border-b-2 border-slate-400 text-center px-4 text-blue-900">{specialtyName}</span>
                        </div>

                        <div className="flex flex-wrap items-baseline gap-2 mt-2">
                            <span className="text-slate-800">قد أنهى(ت) تكوينه(ها) البيداغوجي التحضيري بنجاح بمركز التكوين:</span>
                            <span className="font-aref font-bold text-2xl flex-grow border-b-2 border-slate-400 text-center px-4 text-blue-900">{institution.center || '.......................................'}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Footer Signature (Moved to Visual Left -> Justify End in RTL) */}
                <div className="flex justify-end mt-auto pt-4 px-4">
                    <div className="text-center relative">
                        <p className="mb-2 font-bold font-amiri text-lg">حرر بتاريخ: {signatureDate}</p>
                        <div className="border-t-2 border-black w-64 pt-2">
                            <p className="font-black text-2xl font-aref mb-10">مــــــــــدير التربية</p>
                        </div>
                        {/* Invisible box to reserve space for stamp */}
                        <div className="h-20 w-40 mx-auto"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CertificateGenerator;