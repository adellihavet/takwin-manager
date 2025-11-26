import React, { useState, useEffect } from 'react';
import { Printer, Filter } from 'lucide-react';
import { Trainee, Specialty, InstitutionConfig } from '../types';
import { SPECIALTIES as DEFAULT_SPECIALTIES } from '../constants';

const CertificateGenerator: React.FC = () => {
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
    const [institution, setInstitution] = useState<InstitutionConfig>({ wilaya: '', institute: '', center: '', director: '' });
    
    const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
    
    useEffect(() => {
        const savedTrainees = localStorage.getItem('takwin_trainees_db');
        if (savedTrainees) try { setTrainees(JSON.parse(savedTrainees)); } catch(e) {}
        
        const savedSpec = localStorage.getItem('takwin_specialties_db');
        if (savedSpec) try { setSpecialties(JSON.parse(savedSpec)); } catch(e) {}

        const savedInst = localStorage.getItem('takwin_institution_db');
        if (savedInst) try { setInstitution(JSON.parse(savedInst)); } catch(e) {}
    }, []);

    const filteredTrainees = trainees.filter(t => filterSpecialty === 'all' || t.specialtyId === filterSpecialty);

    const handlePrint = () => window.print();

    return (
        <div className="animate-fadeIn">
            <div className="bg-slate-900/80 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-800/60 mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">إصدار الشهادات</h2>
                        <p className="text-slate-400 text-sm">طباعة شهادات نهاية التكوين البيداغوجي التحضيري</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        طباعة الكل ({filteredTrainees.length})
                    </button>
                </div>

                <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <Filter className="text-slate-400" />
                    <label className="text-slate-300 font-bold">تصفية حسب التخصص:</label>
                    <select 
                        className="bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white outline-none"
                        value={filterSpecialty}
                        onChange={e => setFilterSpecialty(e.target.value)}
                    >
                        <option value="all">الكل</option>
                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Print Preview Area (Screen) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden opacity-50 pointer-events-none">
                <div className="text-center col-span-2 text-slate-500 mb-4">
                    -- معاينة (اضغط طباعة لعرض النسخة النهائية) --
                </div>
                {/* Just show one example */}
                {filteredTrainees.slice(0, 1).map(t => (
                    <CertificateCard key={t.id} trainee={t} institution={institution} specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} />
                ))}
            </div>

            {/* Actual Print Content (Visible only in Print) */}
            <div id="print-section" className="hidden print:block fixed inset-0 bg-white z-[9999]">
                {filteredTrainees.map(t => (
                    <div key={t.id} className="page-break">
                        <CertificateCard 
                            trainee={t} 
                            institution={institution} 
                            specialtyName={specialties.find(s=>s.id === t.specialtyId)?.name || ''} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const CertificateCard: React.FC<{ trainee: Trainee, institution: InstitutionConfig, specialtyName: string }> = ({ trainee, institution, specialtyName }) => {
    return (
        <div className="w-[297mm] h-[210mm] border-[10px] border-double border-gray-800 p-12 relative bg-white text-black mx-auto flex flex-col items-center justify-between" style={{ direction: 'rtl' }}>
            {/* Header */}
            <div className="text-center w-full">
                <h3 className="text-xl font-bold mb-2">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
                <h3 className="text-xl font-bold mb-6">وزارة التربية الوطنية</h3>
                <div className="flex justify-between w-full px-10 text-sm font-bold">
                    <span>مديرية التربية لولاية: {institution.wilaya}</span>
                    <span>المعهد الوطني لتكوين مستخدمي التربية: {institution.institute}</span>
                </div>
                <div className="mt-2 text-right px-10 text-sm font-bold">
                    مركز التكوين: {institution.center}
                </div>
            </div>

            {/* Title */}
            <div className="text-center mt-8">
                <h1 className="text-5xl font-black mb-4 font-serif" style={{ fontFamily: "'Traditional Arabic', serif" }}>شــهــادة نـهــايــة الـتـكــويــن</h1>
                <h2 className="text-2xl font-bold text-gray-700">البيداغوجي التحضيري</h2>
            </div>

            {/* Content */}
            <div className="w-full px-16 text-xl leading-loose mt-8 text-right">
                <p>
                    يشهد السيد مدير التربية / مدير مركز التكوين، أن السيد(ة): <span className="font-bold text-2xl mx-2">{trainee.surname} {trainee.name}</span>
                </p>
                <p>
                    المولود(ة) بتاريخ: <span className="font-bold mx-2">{trainee.dob}</span> بـ: <span className="font-bold mx-2">{trainee.pob}</span>
                </p>
                <p>
                    بصفته(ا): <span className="font-bold mx-2">أستاذ المدرسة الابتدائية</span> تخصص: <span className="font-bold mx-2">{specialtyName}</span>
                </p>
                <p className="mt-4">
                    قد تابع(ت) بنجاح دورة التكوين البيداغوجي التحضيري للأساتذة المدمجين، المنظمة خلال السنة التكوينية: <span className="font-bold">2025 / 2026</span>.
                </p>
                <p className="mt-4">
                    وسلمت له(ا) هذه الشهادة لاستعمالها في حدود ما يسمح به القانون.
                </p>
            </div>

            {/* Footer / Signatures */}
            <div className="flex justify-between w-full px-20 mt-16 mb-12">
                <div className="text-center">
                    <p className="font-bold mb-16">حرر بـ: {institution.wilaya} في: ....................</p>
                    <p className="font-bold text-xl">مدير المركز</p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-xl mt-8">مدير التربية</p>
                </div>
            </div>
        </div>
    );
};

export default CertificateGenerator;