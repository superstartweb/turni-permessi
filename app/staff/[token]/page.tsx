"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CalendarDays, Clock, Send, CheckCircle2, 
  ChevronLeft, ChevronRight, AlertCircle, Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// INTERFACCE AGGIORNATE PER SUPPORTARE LO SPEZZATO
interface Employee { 
  id: string; 
  full_name: string; 
  role: string;
  mng_companies: { name: string } | null;
}

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  start_time_2?: string | null; // Aggiunto
  end_time_2?: string | null;   // Aggiunto
  is_split_shift: boolean;      // Aggiunto
  mng_stores: { name: string } | null;
  mng_employees: { full_name: string } | null;
}

interface Request {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function StaffPortal({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [employee, setEmployee] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shifts' | 'requests'>('shifts');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Stati per il Form Richieste
  const [reqType, setReqType] = useState('ferie');
  const [reqStart, setReqStart] = useState('');
  const [reqEnd, setReqEnd] = useState('');
  const [reqTimeStart, setReqTimeStart] = useState('09:00');
  const [reqTimeEnd, setReqTimeEnd] = useState('18:00');
  const [cert, setCert] = useState('');
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: emp, error: empErr } = await supabase
          .from('mng_employees')
          .select('*, mng_companies(id, name, turns_enabled, requests_enabled)')
          .eq('access_token', token)
          .single();

        if (empErr || !emp) throw new Error("Accesso non valido");
        setEmployee(emp);

        const { data: shfts } = await supabase
          .from('mng_shifts')
          .select('*, mng_stores(name)')
          .eq('employee_id', emp.id)
          .order('start_time', { ascending: true });
        setShifts(shfts || []);

        const { data: reqs } = await supabase
          .from('mng_requests')
          .select('*')
          .eq('employee_id', emp.id)
          .order('created_at', { ascending: false });
        setRequests(reqs || []);

      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqStart || !reqEnd || !employee) return;
    setIsSending(true);
    setErrorMsg(null);

    const { error } = await supabase.from('mng_requests').insert([{
      employee_id: employee.id,
      type: reqType,
      start_date: reqStart,
      end_date: reqEnd,
      start_time: reqType === 'permesso' ? reqTimeStart : null,
      end_time: reqType === 'permesso' ? reqTimeEnd : null,
      certificate_number: reqType === 'malattia' ? cert : null,
      notes: notes,
      status: 'pending'
    }]);

    if (error) {
      setErrorMsg(error.message);
      setIsSending(false);
    } else {
      setSentSuccess(true);
      setIsSending(false);
      setReqStart(''); setReqEnd(''); setCert(''); setNotes('');
      const { data: updatedReqs } = await supabase
        .from('mng_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });
      setRequests(updatedReqs || []);
      setTimeout(() => setSentSuccess(false), 3000);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!employee) return <div className="flex h-screen items-center justify-center font-bold text-red-600">Accesso non valido.</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="bg-blue-600 text-white p-6 rounded-b-[2.5rem] shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {employee.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{employee.full_name}</h1>
            <p className="text-blue-100 text-xs">{employee.mng_companies?.name}</p>
          </div>
        </div>
      </div>

      <div className="flex p-4 gap-2 mt-[-25px] justify-center">
        {employee.mng_companies?.turns_enabled && (
          <button 
            onClick={() => setActiveTab('shifts')}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm shadow-md transition-all ${activeTab === 'shifts' ? 'bg-white text-blue-600 scale-105' : 'bg-gray-200 text-gray-500'}`}
          >
            <CalendarDays className="w-5 h-5 mx-auto mb-1" /> Turni
          </button>
        )}
        {employee.mng_companies?.requests_enabled && (
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm shadow-md transition-all ${activeTab === 'requests' ? 'bg-white text-blue-600 scale-105' : 'bg-gray-200 text-gray-500'}`}
          >
            <Send className="w-5 h-5 mx-auto mb-1" /> Richieste
          </button>
        )}
      </div>

      <main className="p-4">
        {activeTab === 'shifts' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-gray-700">{format(currentWeekStart, 'dd MMM', { locale: it })} - {format(addDays(currentWeekStart, 6), 'dd MMM', { locale: it })}</span>
                <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                {weekDays.map(day => {
                  const dayShift = shifts.find(s => isSameDay(parseISO(s.start_time), day));
                  return (
                    <div key={day.toString()} className={`flex items-center p-3 rounded-xl border ${isSameDay(day, new Date()) ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <div className="w-12 text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-400">{format(day, 'eee', { locale: it })}</p>
                        <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-700'}`}>{format(day, 'dd')}</p>
                      </div>
                      <div className="flex-1 ml-4">
                        {dayShift ? (
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                            <div className="flex flex-col">
                              {/* Fascia 1 */}
                              <span className="text-sm font-bold text-gray-800">
                                {format(parseISO(dayShift.start_time), 'HH:mm')} - {format(parseISO(dayShift.end_time), 'HH:mm')}
                              </span>
                              
                              {/* Fascia 2 (se è uno spezzato) */}
                              {dayShift.is_split_shift && dayShift.start_time_2 && (
                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 w-fit border border-blue-100">
                                  {format(parseISO(dayShift.start_time_2), 'HH:mm')} - {format(parseISO(dayShift.end_time_2!), 'HH:mm')}
                                </span>
                              )}
                              
                              <span className="text-[10px] text-gray-500 uppercase mt-1">{dayShift.mng_stores?.name}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Nessun turno</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold text-lg mb-4">Invia una richiesta</h2>
              <form onSubmit={handleSendRequest} className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  {['ferie', 'malattia', 'permesso'].map(t => (
                    <button type="button" key={t} onClick={() => setReqType(t)} className={`flex-1 py-2 text-xs font-bold rounded-md capitalize transition-all ${reqType === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>{t}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Dal</label><input type="date" value={reqStart} onChange={e => setReqStart(e.target.value)} className="p-2 border rounded-lg text-sm" required /></div>
                  <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Al</label><input type="date" value={reqEnd} onChange={e => setReqEnd(e.target.value)} className="p-2 border rounded-lg text-sm" required /></div>
                </div>
                {reqType === 'permesso' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Inizio</label><input type="time" value={reqTimeStart} onChange={e => setReqTimeStart(e.target.value)} className="p-2 border rounded-lg text-sm" required /></div>
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Fine</label><input type="time" value={reqTimeEnd} onChange={e => setReqTimeEnd(e.target.value)} className="p-2 border rounded-lg text-sm" required /></div>
                  </div>
                )}
                {reqType === 'malattia' && (
                  <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Numero Certificato</label><input type="text" value={cert} onChange={e => setCert(e.target.value)} placeholder="Inserisci numero certificato" className="p-2 border rounded-lg text-sm" required /></div>
                )}
                <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Note</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="p-2 border rounded-lg text-sm" rows={2} placeholder="Note opzionali..."></textarea></div>
                <button type="submit" disabled={isSending} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                  {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />} Invia Richiesta
                </button>
              </form>
              {sentSuccess && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center text-sm font-bold animate-bounce">Inviata con successo!</div>}
              {errorMsg && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-center text-sm font-bold">{errorMsg}</div>}
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold px-1">Il mio storico</h2>
              {requests.length === 0 ? (
                <div className="bg-white p-10 rounded-xl text-center text-gray-400 border border-dashed">Nessuna richiesta.</div>
              ) : (
                requests.map(r => (
                  <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800 capitalize">{r.type}</p>
                      <p className="text-xs text-gray-500">{format(parseISO(r.start_date), 'dd/MM/yyyy')} - {format(parseISO(r.end_date), 'dd/MM/yyyy')}</p>
                      <span className={`text-[10px] font-bold uppercase ${r.status === 'approved' ? 'text-green-600' : r.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{r.status}</span>
                    </div>
                    <div className={`p-2 rounded-full ${r.status === 'approved' ? 'bg-green-50 text-green-600' : r.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {r.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}