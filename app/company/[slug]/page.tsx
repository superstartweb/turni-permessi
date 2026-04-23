"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Store, Users, 
  CalendarDays, MessageSquareText, FileText 
} from 'lucide-react';
import Link from 'next/link';

export default function CompanyDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompany() {
      const { data } = await supabase.from('mng_companies').select('*').eq('slug', slug).single();
      setCompany(data);
      setLoading(false);
    }
    fetchCompany();
  }, [slug]);

  if (loading) return <div className="flex h-screen items-center justify-center">Caricamento...</div>;
  if (!company) return <div className="flex h-screen items-center justify-center">Azienda non trovata.</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          {company.logo_url ? (
            <img src={company.logo_url} className="w-12 h-12 rounded-lg object-cover border" alt="Logo" />
          ) : (
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              {company.name.charAt(0)}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800">{company.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CARD NEGOZI */}
          <Link href={`/company/${slug}/stores`} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800">Negozi</h3>
            <p className="text-sm text-gray-500">Gestisci i punti vendita della catena.</p>
          </Link>

          {/* CARD DIPENDENTI */}
          <Link href={`/company/${slug}/employees`} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800">Dipendenti</h3>
            <p className="text-sm text-gray-500">Crea profili e invia link di accesso.</p>
          </Link>

          {/* CARD TURNI */}
          {company.turns_enabled && (
            <Link href={`/company/${slug}/shifts`} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-800">Turni</h3>
              <p className="text-sm text-gray-500">Organizza i turni di lavoro.</p>
            </Link>
          )}

          {/* CARD RICHIESTE */}
          {company.requests_enabled && (
            <Link href={`/company/${slug}/requests`} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquareText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-800">Richieste</h3>
              <p className="text-sm text-gray-500">Gestisci ferie e malattie.</p>
            </Link>
          )}

          {/* CARD REPORT PDF (L'AGGIUNTA!) */}
          <Link href={`/company/${slug}/reports`} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800">Report PDF</h3>
            <p className="text-sm text-gray-500">Genera i riepiloghi mensili ore e domeniche.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}