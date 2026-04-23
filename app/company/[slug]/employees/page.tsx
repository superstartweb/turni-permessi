"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, Users, Trash2, ChevronLeft, Loader2, Briefcase, Store as StoreIcon, Copy } from 'lucide-react';
import Link from 'next/link';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  store_id: string;
  phone_number: string | null;
  access_token: string;
  mng_stores: { name: string } | null;
}

interface Company { id: string; name: string; }
interface Store { id: string; name: string; }

export default function EmployeesPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Staff');
  const [phone, setPhone] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data: comp, error: compErr } = await supabase.from('mng_companies').select('id, name').eq('slug', slug).single();
        if (compErr) throw compErr;
        setCompany(comp);

        const { data: stors } = await supabase.from('mng_stores').select('id, name').eq('company_id', comp.id);
        setStores(stors || []);

        const { data: emps } = await supabase.from('mng_employees').select('*, mng_stores(name)').eq('company_id', comp.id);
        setEmployees(emps || []);
      } catch (err) { console.error(err); } finally { setFetching(false); }
    }
    init();
  }, [slug]);

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedStore || !company) return;
    setLoading(true);

    // Generiamo un token unico lato client per sicurezza extra
    const newToken = crypto.randomUUID();

    const { error } = await supabase.from('mng_employees').insert([{ 
      full_name: name, 
      role, 
      store_id: selectedStore, 
      company_id: company.id, 
      phone_number: phone,
      access_token: newToken // Inseriamo il token appena generato
    }]);

    if (error) {
      alert("Errore aggiunta: " + error.message);
    } else {
      setName(''); setRole('Staff'); setPhone(''); setSelectedStore('');
      fetchEmployees(company.id);
    }
    setLoading(false);
  };

  const fetchEmployees = async (companyId: string) => {
    const { data, error } = await supabase
      .from('mng_employees')
      .select('*, mng_stores(name)')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true });
    if (!error) setEmployees(data || []);
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Eliminare il dipendente?")) return;
    await supabase.from('mng_employees').delete().eq('id', id);
    fetchEmployees(company?.id || '');
  };

  const copyEmployeeLink = (token: string) => {
    const link = `${window.location.origin}/staff/${token}`;
    navigator.clipboard.writeText(link);
    alert("Link di accesso copiato! Invialo al dipendente.");
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!company) return <div className="p-10 text-center">Azienda non trovata</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-600" /></Link>
        <h1 className="text-xl font-bold text-gray-800">{company.name} - Dipendenti</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-blue-600" /> Nuovo Dipendente</h2>
          <form onSubmit={addEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e Cognome" className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Cellulare (es. 39347...)" className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Staff">Staff</option>
              <option value="Manager">Manager</option>
              <option value="Part-time">Part-time</option>
            </select>
            <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Seleziona Negozio...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" disabled={loading} className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all">
              {loading ? '...' : 'Aggiungi Dipendente'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold text-lg">{emp.full_name.charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-gray-800">{emp.full_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {emp.role}</span>
                    <span className="flex items-center gap-1"><StoreIcon className="w-3 h-3" /> {emp.mng_stores?.name}</span>
                    <span className="flex items-center gap-1">📱 {emp.phone_number || 'No tel'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyEmployeeLink(emp.access_token)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Copia Link Accesso">
                  <Copy className="w-5 h-5" />
                </button>
                <button onClick={() => deleteEmployee(emp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}