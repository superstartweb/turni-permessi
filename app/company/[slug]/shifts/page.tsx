"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, PlusCircle, CalendarDays, Clock, 
  Users, Store as StoreIcon, Trash2, Loader2, 
  AlertTriangle, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { format, areIntervalsOverlapping } from 'date-fns';
import { it } from 'date-fns/locale';

interface Employee { id: string; full_name: string; }
interface Store { id: string; name: string; }
interface Shift {
  id: string;
  employee_id: string;
  store_id: string;
  start_time: string;
  end_time: string;
  is_split_shift: boolean;
  is_holiday: boolean;
  is_overtime: boolean;
  is_sunday: boolean;
  mng_employees: { full_name: string } | null;
  mng_stores: { name: string } | null;
}

export default function ShiftsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [empId, setEmpId] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isSplit, setIsSplit] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: comp } = await supabase.from('mng_companies').select('*').eq('slug', slug).single();
        if (comp) {
          setCompany(comp);
          const { data: stors } = await supabase.from('mng_stores').select('id, name').eq('company_id', comp.id);
          const { data: emps } = await supabase.from('mng_employees').select('id, full_name').eq('company_id', comp.id);
          setStores(stors || []);
          setEmployees(emps || []);
          fetchShifts(comp.id);
        }
      } catch (err) { console.error(err); } finally { setFetching(false); }
    }
    init();
  }, [slug]);

  const fetchShifts = async (companyId: string) => {
    const { data, error } = await supabase
      .from('mng_shifts')
      .select('*, mng_employees(full_// etc... no, this time for real!C_employees(full_name), mng_stores(name)')
      .eq('company_id', companyId)
      .order('start_time', { ascending: true });
    
    // Fix for the select query
    const { data: fixedData, error: fixedErr } = await supabase
      .from('mng_shifts')
      .select('*, mng_employees(full_name), mng_stores(name)')
      .eq('company_id', companyId)
      .order('start_time', { ascending: true });

    if (!fixedErr) setShifts(fixedData || []);
  };

  const addShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !selectedStore || !company) return;

    setLoading(true);
    setErrorMsg(null);

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (startDateTime >= endDateTime) {
      setErrorMsg("L'orario di fine deve essere dopo l'inizio!");
      setLoading(false);
      return;
    }

    const { data: absence } = await supabase
      .from('mng_requests')
      .select('*')
      .eq('employee_id', empId)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date);

    if (absence && absence.length > 0) {
      const req = absence[0];
      setErrorMsg(`ATTENZIONE: Il dipendente è in ${req.type.toUpperCase()} approvata dal ${req.start_date} al ${req.end_date}!`);
      setLoading(false);
      return;
    }

    const conflict = shifts.find(s => {
      const sStart = new Date(s.start_time);
      const sEnd = new Date(s.end_time);
      return s.employee_id === empId && areIntervalsOverlapping(
        { start: startDateTime, end: endDateTime },
        { start: sStart, end: sEnd }
      );
    });

    if (conflict) {
      setErrorMsg(`CONFLITTO! Il dipendente è già occupato in questo orario!`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('mng_shifts').insert([{
      employee_id: empId,
      store_id: selectedStore,
      company_id: company.id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      is_split_shift: isSplit,
      is_holiday: isHoliday,
      is_sunday: format(startDateTime, 'EEEE', { locale: it }) === 'domenica',
    }]);

    if (error) setErrorMsg(error.message);
    else {
      setEmpId('');
      setSelectedStore('');
      fetchShifts(company.id);
    }
    setLoading(false);
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Eliminare questo turno?")) return;
    await supabase.from('mng_shifts').delete().eq('id', id);
    fetchShifts(company.id);
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!company) return <div className="p-10 text-center">Azienda non trovata</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-600" /></Link>
        <h1 className="text-xl font-bold text-gray-800">{company.name} - Gestione Turni</h1>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-blue-600" /> Assegna Nuovo Turno</h2>
          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200"><AlertTriangle className="w-4 h-4" /> {errorMsg}</div>}
          <form onSubmit={addShift} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Dipendente</label>
              <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleziona...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Negozio</label>
              <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleziona...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Inizio</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Fine</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Opzioni</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} /> Spezzato</label>
                <label className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={isHoliday} onChange={(e) => setIsHoliday(e.target.checked)} /> Festivo</label>
              </div>
            </div>
            <div className="md:col-span-3">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} Assegna Turno
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 px-1">Turni Programmati</h2>
          {shifts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-500">Nessun turno inserito.</div>
          ) : (
            shifts.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${s.is_sunday ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}><CalendarDays className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">{s.mng_employees?.full_name || 'Sconosciuto'}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(s.start_time), 'dd/MM HH:mm')} - {format(new Date(s.end_time), 'HH:mm')}</span>
                      <span className="flex items-center gap-1"><StoreIcon className="w-3 h-3" /> {s.mng_stores?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteShift(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}