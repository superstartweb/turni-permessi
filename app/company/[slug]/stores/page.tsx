"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, Store as StoreIcon, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  zone: string | null;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
}

export default function StoresPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreZone, setNewStoreZone] = useState(''); // NUOVO: Stato per la zona
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: comp, error: compErr } = await supabase
          .from('mng_companies')
          .select('id, name')
          .eq('slug', slug)
          .single();

        if (compErr) throw compErr;
        if (comp) {
          setCompany(comp);
          fetchStores(comp.id);
        }
      } catch (err) {
        console.error("Errore inizializzazione:", err);
      } finally {
        setFetching(false);
      }
    }
    init();
  }, [slug]);

  const fetchStores = async (companyId: string) => {
    const { data, error } = await supabase
      .from('mng_stores')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) console.error("Errore caricamento negozi:", error);
    else setStores(data || []);
  };

  const addStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !company) return;

    setLoading(true);
    const { error } = await supabase
      .from('mng_stores')
      .insert([{ 
        name: newStoreName, 
        zone: newStoreZone, // INSERIAMO LA ZONA
        company_id: company.id 
      }]);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      setNewStoreName('');
      setNewStoreZone('');
      fetchStores(company.id);
    }
    setLoading(false);
  };

  const deleteStore = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questo negozio?")) return;
    const { error } = await supabase.from('mng_stores').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchStores(company?.id || '');
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!company) return <div className="p-10 text-center">Azienda non trovata</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">{company.name} - Negozi</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" /> Nuovo Negozio
          </h2>
          <form onSubmit={addStore} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Nome Negozio" className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" required 
            />
            <input 
              type="text" value={newStoreZone} onChange={(e) => setNewStoreZone(e.target.value)}
              placeholder="Zona (es. Milano Centro)" className="p-2 border rounded-lg text-black outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all">
              {loading ? '...' : 'Aggiungi'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {stores.map((store) => (
            <div key={store.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{store.name}</h3>
                  <p className="text-sm text-gray-500">{store.zone || 'Nessuna zona'}</p>
                </div>
              </div>
              <button onClick={() => deleteStore(store.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}