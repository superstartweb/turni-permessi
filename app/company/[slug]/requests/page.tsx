"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, CheckCircle, XCircle, MessageCircle, 
  Loader2, Calendar, FileText, Clock, Filter
} from 'lucide-react';
import Link from 'next/link';

interface Request {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  certificate_number: string | null;
  status: string;
  notes: string | null;
  mng_employees: { full_name: string, phone_number: string | null } | null;
}

export default function RequestsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [company, setCompany] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending'); // FILTRO DEFAULT: Pendenti
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data: comp } = await supabase.from('mng_companies').select('*').eq('slug', slug).single();
        setCompany(comp);
        fetchRequests(comp?.id);
      } catch (err) { console.error(err); } finally { setFetching(false); }
    }
    init();
  }, [slug]);

  const fetchRequests = async (companyId: string) => {
    const { data, error } = await supabase
      .from('mng_requests')
      .select('*, mng_employees(full_name, phone_number)')
      .eq('mng_employees.company_id', companyId)
      .order('start_date', { ascending: true });
    
    if (!error) setRequests(data || []);
  };

  const updateStatus = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    setLoading(true);
    const { error } = await supabase.from('mng_requests').update({ status: newStatus }).eq('id', requestId);
    if (error) alert(error.message);
    else fetchRequests(company.id);
    setLoading(false);
  };

  const sendWhatsApp = (emp: any, status: string) => {
    if (!emp.phone_number) return alert("Il dipendente non ha un numero di telefono.");
    const message = `Ciao ${emp.full_name}, la tua richiesta è stata ${status === 'approved' ? 'APPROVATA' : 'RIFIUTATA'}.`;
    window.open(`https://wa.me/${emp.phone_number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // LOGICA DI FILTRAGGIO
  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending') return req.status === 'pending';
    if (filter === 'approved') return req.status === 'approved';
    if (filter === 'rejected') return req.status === 'rejected';
    return true;
  });

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-600" /></Link>
        <h1 className="text-xl font-bold text-gray-800">{company?.name} - Gestione Richieste</h1>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* BARRA FILTRI */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 mr-4">
            <Filter className="w-4 h-4" /> Filtra per:
          </div>
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button 
              key={f} onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${filter === f ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'In Attesa' : f === 'approved' ? 'Approvate' : 'Rifiutate'}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-500">
              Nessuna richiesta trovata per questo filtro.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${req.type === 'ferie' ? 'bg-green-100 text-green-600' : req.type === 'malattia' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {req.type === 'ferie' ? <Calendar className="w-6 h-6" /> : req.type === 'malattia' ? <FileText className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-lg">{req.mng_employees?.full_name}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {req.status === 'pending' ? 'In Attesa' : req.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {req.start_date} → {req.end_date}</div>
                      {req.type === 'permesso' && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.start_time} - {req.end_time}</div>}
                      {req.type === 'malattia' && <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> Cert: {req.certificate_number || 'N/A'}</div>}
                      {req.notes && <div className="md:col-span-2 italic text-gray-400">"{req.notes}"</div>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(req.id, 'approved')} disabled={loading} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Approva"><CheckCircle className="w-6 h-6" /></button>
                      <button onClick={() => updateStatus(req.id, 'rejected')} disabled={loading} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Rifiuta"><XCircle className="w-6 h-6" /></button>
                    </>
                  )}
                  <button onClick={() => sendWhatsApp(req.mng_employees || {}, req.status)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="WhatsApp"><MessageCircle className="w-6 h-6" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}