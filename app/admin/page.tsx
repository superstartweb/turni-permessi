"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Copy, 
  PlusCircle, 
  RefreshCw, 
  Power,
  Settings2,
  CalendarDays,
  MessageSquareText
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  is_active: boolean;
  turns_enabled: boolean;
  requests_enabled: boolean;
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchCompanies = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('mng_companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Errore:', error);
    else setCompanies(data || []);
    setFetching(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const generatedSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const { error } = await supabase
      .from('mng_companies')
      .insert([{ name, logo_url: logo, slug: generatedSlug }]);

    if (error) alert('Errore: ' + error.message);
    else { setName(''); setLogo(''); fetchCompanies(); }
    setLoading(false);
  };

  // Funzione universale per cambiare qualsiasi impostazione (Stato, Turni o Richieste)
  const toggleSetting = async (id: string, column: keyof Company, currentValue: any) => {
    const { error } = await supabase
      .from('mng_companies')
      .update({ [column]: !currentValue })
      .eq('id', id);

    if (error) alert(error.message);
    else fetchCompanies();
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Eliminare definitivamente l\'azienda?')) return;
    const { error } = await supabase.from('mng_companies').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchCompanies();
  };

  const copyLink = (slug: string) => {
    const link = `${window.location.origin}/company/${slug}`;
    navigator.clipboard.writeText(link);
    alert(`Link copiato: ${link}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
        <button onClick={fetchCompanies} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* FORM CREAZIONE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" /> Crea Nuova Azienda
        </h2>
        <form onSubmit={createCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome Azienda" className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="text" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="URL Logo (opzionale)" className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all">
            {loading ? 'Creazione...' : 'Aggiungi Azienda'}
          </button>
        </form>
      </div>

      {/* TABELLA GESTIONE */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Azienda</th>
              <th className="p-4 text-center">Stato</th>
              <th className="p-4 text-center">Moduli (Turni | Richieste)</th>
              <th className="p-4">Link</th>
              <th className="p-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fetching ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">Caricamento...</td></tr>
            ) : companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                {/* INFO AZIENDA */}
                <td className="p-4 flex items-center gap-3">
                  {company.logo_url ? <img src={company.logo_url} className="w-10 h-10 rounded object-cover border" /> : <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-[10px]">No Logo</div>}
                  <span className="font-semibold">{company.name}</span>
                </td>

                {/* STATO (ON/OFF) */}
                <td className="p-4 text-center">
                  <button 
                    onClick={() => toggleSetting(company.id, 'is_active', company.is_active)}
                    className={`flex items-center gap-1 mx-auto px-3 py-1 rounded-full text-xs font-medium transition-all ${company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    <Power className="w-3 h-3" /> {company.is_active ? 'Attiva' : 'Disattiva'}
                  </button>
                </td>

                {/* MODULI (SWITCH RAPIDI) */}
                <td className="p-4">
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => toggleSetting(company.id, 'turns_enabled', company.turns_enabled)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${company.turns_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      <CalendarDays className="w-3 h-3" /> TURNI
                    </button>
                    <button 
                      onClick={() => toggleSetting(company.id, 'requests_enabled', company.requests_enabled)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${company.requests_enabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      <MessageSquareText className="w-3 h-3" /> RICHIESTE
                    </button>
                  </div>
                </td>

                {/* LINK */}
                <td className="p-4">
                  <button onClick={() => copyLink(company.slug)} className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
                    <Copy className="w-4 h-4" /> Copia
                  </button>
                </td>

                {/* AZIONI */}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => deleteCompany(company.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}