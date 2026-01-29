import React, { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, Search, Filter, Calendar as CalendarIcon, Download, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getOrders, getBrands, getSettings } from '../services/dataService';
import { ServiceOrder, Brand } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from '../services/i18n';

export const Reports: React.FC = () => {
  const { t, language } = useTranslation();
  const safeLanguage = language || 'pt-BR';
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [isSummaryOnly, setIsSummaryOnly] = useState(false);
  
  // Grouping
  const [groupBy, setGroupBy] = useState<'NONE' | 'BRAND' | 'PERIOD'>('NONE');

  // Filtered Result
  const [reportData, setReportData] = useState<ServiceOrder[]>([]);
  const [totals, setTotals] = useState({ service: 0, commission: 0, count: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, brandsData] = await Promise.all([getOrders(), getBrands()]);
        setOrders(ordersData);
        setBrands(brandsData);
        setThisMonth(); // Mantém a lógica de data
      } catch (error) {
        console.error("Erro ao carregar relatórios", error);
      }
    };
    fetchData();
  }, []);

  const setThisMonth = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }

  const setLastMonth = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }

  useEffect(() => {
    let result = orders;

    // Date Range
    if (startDate) {
      result = result.filter(o => o.entryDate >= startDate);
    }
    if (endDate) {
      result = result.filter(o => o.entryDate <= endDate);
    }

    // Brand
    if (brandFilter !== 'ALL') {
      result = result.filter(o => o.brand === brandFilter);
    }

    // Status
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Sort by Date Asc
    result.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    setReportData(result);
    
    const service = result.reduce((acc, curr) => acc + Number(curr.serviceValue || 0), 0);
    const commission = result.reduce((acc, curr) => acc + Number(curr.commissionValue || 0), 0);
    setTotals({ service, commission, count: result.length });

  }, [orders, startDate, endDate, brandFilter, statusFilter]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(safeLanguage, { style: 'currency', currency: 'BRL' }).format(val);

  const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Relatorio_Comissao");

    // Define Columns with Styling Logic setup
    worksheet.columns = [
      { header: "Data", key: "date", width: 15, style: { alignment: { horizontal: 'center' } } },
      { header: "Número da O.S", key: "osNumber", width: 15, style: { alignment: { horizontal: 'center' } } },
      { header: "Cliente", key: "customer", width: 35 },
      { header: "Marca", key: "brand", width: 20, style: { alignment: { horizontal: 'center' } } },
      { header: "Valor (R$)", key: "service", width: 18, style: { numFmt: '"R$"#,##0.00' } },
      { header: "Comissão (R$)", key: "commission", width: 18, style: { numFmt: '"R$"#,##0.00' } },
      { header: "Status", key: "status", width: 15, style: { alignment: { horizontal: 'center' } } },
    ];

    // Header Styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6366F1' } // Indigo 500
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    reportData.forEach(o => {
      worksheet.addRow({
        date: new Date(o.entryDate).toLocaleDateString('pt-BR'),
        osNumber: o.osNumber,
        customer: o.customerName,
        brand: o.brand,
        service: Number(o.serviceValue),
        commission: Number(o.commissionValue),
        status: t(`status.${o.status}`).toUpperCase(),
      });
    });

    // Totals Row - Clean, only relevant columns
    const totalRow = worksheet.addRow({
        date: "TOTAL",
        commission: totals.commission,
        service: totals.service // Add service total for completeness in value column, or keep empty if strict requirements?
        // Prompt says: "Remova linhas de totalizadores intermediários". This is the FINAL total row.
        // It says "O arquivo deve conter apenas as colunas: Data, Número da O.S, Cliente, Marca, Valor, Comissão e Status."
        // And "Remova o preenchimento de células desnecessárias".
        // I will keep the final Total row but ensure it matches columns.
    });
    totalRow.font = { bold: true };
    totalRow.getCell('commission').numFmt = '"R$"#,##0.00';
    totalRow.getCell('service').numFmt = '"R$"#,##0.00'; // Format service too if included
    totalRow.getCell('date').alignment = { horizontal: 'right' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `comissao_${startDate}_a_${endDate}.xlsx`);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const settings = await getSettings().catch(() => ({}) as any);

    // -- Dimensions (A4) --
    const marginLeft = 15;
    const marginRight = 15;
    const pageWidth = doc.internal.pageSize.width;
    
    // -- Content Generators --
    
    // Header Section
    let cursorY = 20;

    const primaryColorHex = settings.primaryColor || '#6366f1';

    // Header Line with Primary Color
    doc.setDrawColor(primaryColorHex);
    doc.setLineWidth(1.5);
    doc.line(marginLeft, cursorY - 8, pageWidth - marginRight, cursorY - 8);

    // Company Name (Left)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const systemName = (settings.companyName || import.meta.env.VITE_APP_NAME || "Commission System").toUpperCase();
    doc.text(systemName, marginLeft, cursorY);
    
    // CNPJ (Left)
    if (settings.companyCnpj) {
        cursorY += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`CNPJ: ${settings.companyCnpj}`, marginLeft, cursorY);
    }

    // Address (Left)
    if (settings.companyAddress) {
        cursorY += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(settings.companyAddress, marginLeft, cursorY);
    }

    // Contact (Left)
    if (settings.companyContact) {
        cursorY += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Contato: ${settings.companyContact}`, marginLeft, cursorY);
    }

    // Report Title (Right)
    const titleY = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("RELATÓRIO DE COMISSÃO", pageWidth - marginRight, titleY, { align: 'right' });

    // Period (Right)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const periodText = `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;
    doc.text(`Período: ${periodText}`, pageWidth - marginRight, titleY + 6, { align: 'right' });

    // Generated At (Right)
    const genDate = new Date().toLocaleString(safeLanguage);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${genDate}`, pageWidth - marginRight, titleY + 11, { align: 'right' });

    // Divider
    cursorY = Math.max(cursorY, titleY + 11) + 8;
    doc.setDrawColor(primaryColorHex);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, pageWidth - marginRight, cursorY);
    
    // -- Summary Section (Plain Text) --
    cursorY += 10;
    
    const drawStat = (label: string, value: string, x: number) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(label.toUpperCase(), x, cursorY);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(value, x, cursorY + 6);
    };

    drawStat("TOTAL DE ORDENS", totals.count.toString(), marginLeft);
    drawStat("COMISSÃO TOTAL", formatCurrency(totals.commission), marginLeft + 50);

    cursorY += 15; // Spacing before table

    if (isSummaryOnly) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("*** Fim do Resumo Executivo ***", pageWidth / 2, cursorY + 20, { align: 'center' });
    } else {
        // Table Data Preparation
        let finalData: any[] = reportData;
        if (groupBy === 'BRAND' || groupBy === 'PERIOD') {
             const sorted = [...reportData].sort((a: any, b: any) => {
                const valA = groupBy === 'BRAND' ? a.brand : a.entryDate;
                const valB = groupBy === 'BRAND' ? b.brand : b.entryDate;
                return valA.localeCompare(valB);
            });
            finalData = sorted;
        }

        const tableBody = finalData.map(o => [
            new Date(o.entryDate).toLocaleDateString(safeLanguage),
            o.osNumber.toString(),
            o.customerName,
            o.brand,
            formatCurrency(o.serviceValue),
            formatCurrency(o.commissionValue),
            t(`status.${o.status}`).toUpperCase()
        ]);

        // Footer Row for Totals (Strictly aligned)
        const tableFoot = [
            { 
                content: "TOTAL DE COMISSÃO NO PERÍODO", 
                colSpan: 5,
                styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: [60, 60, 60] } 
            },
            { 
                content: formatCurrency(totals.commission), 
                styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: [0, 0, 0], fontSize: 10 } 
            },
            { content: "" }
        ];

        // -- Table Drawing --
        autoTable(doc, {
            startY: cursorY,
            head: [[
                "Data",
                "Número da O.S",
                "Cliente",
                "Marca",
                "Valor (R$)",
                "Comissão (R$)",
                "Status"
            ]],
            body: tableBody,
            foot: [tableFoot],
            theme: 'plain',
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 3,
                textColor: [60, 60, 60],
                lineWidth: 0,
                overflow: 'visible' // Prevent truncation logic
            },
            headStyles: {
                fillColor: primaryColorHex,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center', // Centered headers
                cellPadding: 4
            },
            footStyles: {
                fillColor: [248, 248, 248],
                cellPadding: 4,
                lineColor: [220, 220, 220],
                lineWidth: { top: 0.1 }
            },
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' }, // Data (Centered)
                1: { cellWidth: 28, halign: 'center' }, // Número da O.S (Centered)
                2: { cellWidth: 'auto', halign: 'left' }, // Cliente
                3: { cellWidth: 25, halign: 'center' }, // Marca (Centered)
                4: { cellWidth: 28, halign: 'right' }, // Valor (R$)
                5: { cellWidth: 28, halign: 'right' }, // Comissão (R$)
                6: { cellWidth: 25, halign: 'center' } // Status
            },
            didParseCell: (data) => {
                // Zebra stripes
                if (data.section === 'body' && data.row.index % 2 === 1) {
                    data.cell.styles.fillColor = [250, 250, 250];
                }
                
                // Status Styling (Plain Text, No Wrap)
                if (data.section === 'body' && data.column.index === 6) {
                    const status = data.cell.raw as string;
                    if (status === 'PAGO' || status === 'PAID') {
                         data.cell.styles.textColor = [20, 120, 60]; // Dark Green
                    } else {
                         data.cell.styles.textColor = [180, 100, 0]; // Dark Amber
                    }
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: marginLeft, right: marginRight },
            didDrawPage: (data) => {
                // Header on subsequent pages
                if (data.pageNumber > 1) {
                     // Simplified Header
                     doc.setFontSize(8);
                     doc.setTextColor(150, 150, 150);
                     doc.text("Relatório de Comissão - " + systemName, marginLeft, 10);
                }
                
                // Footer (Page X of Y)
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                
                const sysName = import.meta.env.VITE_APP_NAME || "Commission System";
                doc.text(sysName, marginLeft, doc.internal.pageSize.height - 10);
                
                doc.text(
                    `${t('reports.page')} ${data.pageNumber} ${t('reports.of')} ${pageCount}`, 
                    pageWidth - marginRight, 
                    doc.internal.pageSize.height - 10, 
                    { align: "right" }
                );
            }
        });
    }

    const fileName = isSummaryOnly ? `Resumo_Executivo_${startDate}.pdf` : `Relatorio_Comissao_${startDate}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('reports.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t('reports.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-2 mb-4">
             <button onClick={setThisMonth} className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 transition-colors">
                 {t('reports.thisMonth')}
             </button>
             <button onClick={setLastMonth} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 transition-colors">
                 {t('reports.lastMonth')}
             </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <Input 
                label={t('reports.startDate')} 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
            />
            <Input 
                label={t('reports.endDate')} 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
            />
            
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">{t('common.brands')}</label>
                <div className="relative">
                    <select 
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        value={brandFilter}
                        onChange={e => setBrandFilter(e.target.value)}
                    >
                        <option value="ALL">{t('orders.allBrands')}</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Status</label>
                <div className="relative">
                    <select 
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="ALL">{t('status.ALL')}</option>
                        <option value="PENDING">{t('status.PENDING')}</option>
                        <option value="PAID">{t('status.PAID')}</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">{t('reports.sortBy')}</label>
                <div className="relative">
                    <select 
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as any)}
                    >
                        <option value="NONE">{t('reports.defaultSort')}</option>
                        <option value="BRAND">{t('reports.brandSort')}</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
            <input 
                type="checkbox" 
                id="summaryOnly" 
                checked={isSummaryOnly} 
                onChange={e => setIsSummaryOnly(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="summaryOnly" className="text-sm text-slate-600 dark:text-slate-300">{t('reports.summaryOnly')}</label>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <FileText size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.totalOrders')}</p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white">{totals.count}</h4>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Download size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.totalVolume')}</p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(totals.service)}</h4>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <DollarSign size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.totalCommission')}</p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(totals.commission)}</h4>
            </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={generatePDF} icon={<FileText size={18} />}>
            {t('reports.genPdf')}
        </Button>
        <Button onClick={generateExcel} variant="secondary" icon={<FileSpreadsheet size={18} />}>
            {t('reports.exportExcel')}
        </Button>
      </div>

      {/* Preview Table */}
      {!isSummaryOnly && (
      <Card title={t('reports.preview')} className="overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">{t('orders.date')}</th>
                <th className="px-6 py-4 font-medium">{t('orders.osNumber')}</th>
                <th className="px-6 py-4 font-medium">{t('orders.customer')}</th>
                <th className="px-6 py-4 font-medium">{t('orders.brand')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('common.value')}</th>
                <th className="px-6 py-4 font-medium text-right">{t('dashboard.commission')}</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {reportData.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        {t('reports.noData')}
                    </td>
                </tr>
              ) : (
                reportData.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(order.entryDate).toLocaleDateString(language)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">#{order.osNumber}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.customerName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.brand}</td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(order.serviceValue)}</td>
                        <td className="px-6 py-4 text-right font-medium text-indigo-600 dark:text-indigo-400">{formatCurrency(order.commissionValue)}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                order.status === 'PAID' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                                {t(`status.${order.status}`)}
                            </span>
                        </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
};