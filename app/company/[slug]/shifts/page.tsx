"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, PlusCircle, CalendarDays, Clock, 
  Store as StoreIcon, Trash2, Loader2, 
  AlertTriangle, CheckCircle2, Search, X
} from 'lucide-react';
import Link from 'next/link';
import { 
  format as fmt, 
  areIntervalsOverlapping as checkOverlap, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { it } from 'date-fns/locale';

interface Employee { id: string; full_name: string; }
interface Store { id: string; name: string; }
interface Shift {
  id: string;
  employee_id: string;
  store_id: string;
  company_id: string;
  start_time: string;
  end_time: string;
  start_time_2?: string | null;
  end_time_2?: string | null;
  is_split_shift: boolean;
  is_holiday: boolean;
  is_sunday: boolean;
  mng_employees: { full_name: string } | null;
  mng_stores: { name: string } | null;
}

export default function ShiftsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // STATI NAVIGAZIONE E FILTRI
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchTerm, setSearchTerm] = useState('');

  // STATI FORM (Nuovo/Modifica)
  const [empId, setEmpId] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [date, setDate] = useState(fmt(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [startTime2, setStartTime2] = useState('14:00');
  const [endTime2, setEndTime2] = useState('18:00');
  const [isSplit, setIsSplit] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);

  // STATO MODAL
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
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
      .select('*, mng_employees(full_name), mng_stores(name)')
      .eq('company_id', companyId)
      .order('start_time', { ascending: true });
    if (!error) setShifts(data || []);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !selectedStore || !company) return;

    setLoading(true);
    setErrorMsg(null);

    const start1 = new Date(`${date}T${startTime}`);
    const end1 = new Date(`${date}T${endTime}`);
    if (start1 >= end1) { setErrorMsg("Fine 1 deve essere dopo Inizio 1!"); setLoading(false); return; }

    let start2: Date | null = null;
    let end2: Date | null = null;
    if (isSplit) {
      start2 = new Date(`${date}T${startTime2}`);
      end2 = new Date(`${date}T${endTime2}`);
      if (start2 >= end2) { setErrorMsg("Fine 2 deve essere dopo Inizio 2!"); setLoading(false); return; }
      if (start2 <= end1) { setErrorMsg("La seconda fascia deve iniziare dopo la prima!"); setLoading(false); return; }
    }

    const payload = {
      employee_id: empId,
      store_id: selectedStore,
      company_id: company.id,
      start_time: start1.toISOString(),
      end_time: end1.toISOString(),
      start_time_2: isSplit && start2 ? start2.toISOString() : null,
      end_time_2: isSplit && end2 ? end2.toISOString() : null,
      is_split_shift: isSplit,
      is_holiday: isHoliday,
      is_sunday: fmt(start1, 'EEEE', { locale: it }) === 'domenica',
    };

    const { error } = editingShift 
      ? await supabase.from('mng_shifts').update(payload).eq('id', editingShift.id)
      : await supabase.from('mng_shifts').insert([payload]);

    if (error) setErrorMsg(error.message);
    else {
      setEmpId(''); setSelectedStore(''); setIsSplit(false);
      setEditingShift(null);
      fetchShifts(company.id);
    }
    setLoading(false);
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Eliminare questo turno?")) return;
    await supabase.from('mng_shifts').delete().eq('id', id);
    setEditingShift(null);
    fetchShifts(company.id);
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setEmpId(shift.employee_id);
    setSelectedStore(shift.store_id);
    setDate(fmt(parseISO(shift.start_time), 'yyyy-MM-dd'));
    setStartTime(fmt(parseISO(shift.start_time), 'HH:mm'));
    setEndTime(fmt(parseISO(shift.end_time), 'HH:mm'));
    setIsSplit(shift.is_split_shift);
    setIsHoliday(shift.is_holiday);
    if (shift.is_split_shift && shift.start_time_2) {
      setStartTime2(fmt(parseISO(shift.start_time_2), 'HH:mm'));
      setEndTime2(fmt(parseISO(shift.end_time_2!), 'HH:mm'));
    }
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!company) return <div className="p-10 text-center">Azienda non trovata</div>;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-600" /></Link>
          <h1 className="text-xl font-bold text-gray-800">{company.name} - Gestione Turni</h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cerca dipendente..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-sm w-48"
          />
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-blue-600" /> Assegna Nuovo Turno</h2>
          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200"><AlertTriangle className="w-4 h-4" /> {errorMsg}</div>}
          <form onSubmit={handleSaveShift} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-xs font-bold text-gray-500 uppercase">Inizio 1</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Fine 1</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Opzioni</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} /> Spezzato</label>
                <label className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={isHoliday} onChange={(e) => setIsHoliday(e.target.checked)} /> Festivo</label>
              </div>
            </div>
            {isSplit && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-blue-600 uppercase">Inizio 2</label>
                  <input type="time" value={startTime2} onChange={(e) => setStartTime2(e.target.value)} className="p-2 border-2 border-blue-100 rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-blue-600 uppercase">Fine 2</label>
                  <input type="time" value={endTime2} onChange={(e) => setEndTime2(e.target.value)} className="p-2 border-2 border-blue-100 rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} Assegna Turno
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} className="p-2 hover:bg-white rounded-full border shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-bold text-gray-700">{fmt(currentWeekStart, 'dd MMM', { locale: it })} - {fmt(addDays(currentWeekStart, 6), 'dd MMM', { locale: it })}</span>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} className="p-2 hover:bg-white rounded-full border shadow-sm"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase border-b w-64">Dipendente</th>
                  {weekDays.map(day => (
                    <th key={day.toString()} className="p-3 text-center text-xs font-bold text-gray-500 uppercase border-b min-w-[120px]">
                      {fmt(day, 'eee dd', { locale: it })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 border-b last:border-0">
                    <td className="p-3 font-medium text-gray-800 border-r">{emp.full_name}</td>
                    {weekDays.map(day => {
                      const shift = shifts.find(s => s.employee_id === emp.id && isSameDay(parseISO(s.start_time), day));
                      return (
                        <td key={day.toString()} className="p-2 text-center align-middle">
                          {shift ? (
                            <div 
                              onClick={() => openEditModal(shift)}
                              className="p-2 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors text-left"
                            >
                              <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {fmt(parseISO(shift.start_time), 'HH:mm')} - {fmt(parseISO(shift.end_time), 'HH:mm')}
                              </div>
                              {shift.is_split_shift && shift.start_time_2 && (
                                <div className="text-[11px] font-bold text-blue-500 mt-1">
                                  {fmt(parseISO(shift.start_time_2), 'HH:mm')} - {fmt(parseISO(shift.end_time_2!), 'HH:mm')}
                                </div>
                              )}
                              <div className="text-[9px] text-gray-400 uppercase mt-1 truncate">{shift.mng_stores?.name}</div>
                            </div>
                          ) : (
                            <div className="h-12" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editingShift && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" /> Modifica Turno</h3>
              <button onClick={() => setEditingShift(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveShift} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dipendente</label>
                  <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Negozio</label>
                  <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} /> Spezzato</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={isHoliday} onChange={(e) => setIsHoliday(e.target.checked)} /> Festivo</label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-gray-50 rounded-xl border">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Fascia Oraria 1</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded-lg w-full" required />
                    <span className="text-gray-400">-</span>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="p-2 border rounded-lg w-full" required />
                  </div>
                </div>
                {isSplit && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-400 uppercase mb-3">Fascia Oraria 2</p>
                    <div className="flex items-center gap-2">
                      <input type="time" value={startTime2} onChange={(e) => setStartTime2(e.target.value)} className="p-2 border border-blue-200 rounded-lg w-full" required />
                      <span className="text-blue-300">-</span>
                      <input type="time" value={endTime2} onChange={(e) => setEndTime2(e.target.value)} className="p-2 border border-blue-200 rounded-lg w-full" required />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => deleteShift(editingShift.id)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-5 h-5" /> Elimina Turno
                </button>
                <button type="submit" disabled={loading} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}