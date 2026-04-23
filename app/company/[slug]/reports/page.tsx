"use client";
import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, FileText, Download, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, parseISO, differenceInHours } from 'date-fns';

export default function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data: comp } = await supabase.from('mng_companies').select('*').eq('slug', slug).single();
        setCompany(comp);
        const { data: emps } = await supabase.from('mng_employees').select('*').eq('company_id', comp?.id);
        setEmployees(emps || []);
      } catch (err) { console.error(err); } finally { setFetching(false); }
    }
    init();
  }, [slug]);

  const generatePDF = async () => {
    setLoading(true);
    try {
      // 1. Definiamo l'intervallo del mese scelto
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(start);

      // 2. Recuperiamo tutti i turni di quell'intervallo per l'azienda
      const { data: shifts, error } = await supabase
        .from('mng_shifts')
        .select('*, mng_employees(full_name)')
        .gte('start_time', start.toISOString())
        .lte('end_time', end.toISOString());

      if (error) throw error;

      // 3. Calcolo ore e domeniche per ogni dipendente
      const reportData = employees.map(emp => {
        const empShifts = shifts.filter(s => s.employee_id === emp.id);
        
        let totalHours = 0;
        let sundayCount = 0;

        empShifts.forEach(s => {
          // Somma ore
          const diff = differenceInHours(parseISO(s.end_time), parseISO(s.start_time));
          totalHours += diff;
          // Conta domeniche
          if (s.is_sunday) sundayCount++;
        });

        return {
          name: emp.full_name,
          hours: totalHours,
          sundays: sundayCount
        };
      });

      // 4. CREAZIONE DEL PDF
      const doc = new jsPDF();
      
      // Intestazione
      doc.setFontSize(20);
      doc.text(company?.name || "Report Turni", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report Mensile: ${selectedMonth}`, 14, 30);
      doc.text(`Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 36);

      // Tabella
      autoTable(doc, {
        startY: 45,
        head: [['Dipendente', 'Totale Ore', 'Domeniche Lavorate', 'Stato']],
        body: reportData.map(r => [
          r.name, 
          `${r.hours} ore`, 
          `${r.sundays} ${r.sundays === 1 ? 'Domenica' : 'Domeniche'}`, 
          'Verificato'
        ]),
        headStyles: { fillColor: [37, 99, 235] }, // Blu come l'app
        theme: 'grid',
      });

      // Footer per firme
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.text("Firma Titolare: ____________________", 14, finalY);
      doc.text("Firma Dipendente: ____________________", 110, finalY);

      doc.save(`Report_${company?.name}_${selectedMonth}.pdf`);

    } catch (err: any) {
      alert("Errore generazione PDF: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/company/${slug}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-gray-600" /></Link>
        <h1 className="text-xl font-bold text-gray-800">{company?.name} - Report Mensili</h1>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-sm border text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Esporta Report PDF</h2>
          <p className="text-gray-500 mb-8">Seleziona il mese di riferimento per generare il riepilogo ore e domeniche di tutti i dipendenti.</p>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <Calendar className="text-gray-400" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-3 border rounded-xl text-black outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <button 
              onClick={generatePDF} 
              disabled={loading}
              className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
              Scarica PDF Mensile
            </button>
          </div>
        </div>

        <div className="mt-10 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
          <strong>Nota:</strong> Il report calcola automaticamente le ore totali e conta quante domeniche sono state lavorate per ogni dipendente in base ai turni salvati.
        </div>
      </main>
    </div>
  );
}