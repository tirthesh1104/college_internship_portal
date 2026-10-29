import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportData {
  title: string;
  scopeInfo?: string;
  dateStr?: string;
  metrics: Array<{ label: string; value: string | number }>;
  pieChartsData?: Array<{
    title: string;
    items: Array<{ name: string; value: number; color: string }>;
  }>;
  elementIdToCapture?: string;
}

export async function exportAnalyticsToPDF(data: PDFExportData): Promise<void> {
  const currentDate = data.dateStr || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // If a DOM element ID is provided, attempt html2canvas capture first for high fidelity
  if (data.elementIdToCapture) {
    const targetEl = document.getElementById(data.elementIdToCapture);
    if (targetEl) {
      try {
        const canvas = await html2canvas(targetEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        return;
      } catch (err) {
        console.warn('html2canvas export fallback to vector PDF generation:', err);
      }
    }
  }

  // Pure jsPDF Vector Document Generation
  const pdf = new jsPDF('p', 'mm', 'a4');
  let y = 15;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // #0f172a
  pdf.rect(0, 0, 210, 28, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text("MAEER's MIT College of Railway Engineering & Research", 14, 11);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('IPTS - Internship Performance Tracking System Analytics Report', 14, 18);

  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184); // #94a3b8
  pdf.text(`Generated: ${currentDate}`, 14, 24);

  y = 36;

  // Report Title & Scope
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.title, 14, y);
  y += 6;

  if (data.scopeInfo) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Scope: ${data.scopeInfo}`, 14, y);
    y += 8;
  } else {
    y += 4;
  }

  // Summary Metrics Grid
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(14, y, 182, 28, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, y, 182, 28, 2, 2, 'S');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(37, 99, 235);
  pdf.text('EXECUTIVE KPI SUMMARY METRICS', 18, y + 6);

  let mx = 18;
  let my = y + 14;
  pdf.setFontSize(9);

  data.metrics.slice(0, 6).forEach((m, idx) => {
    if (idx === 3) {
      mx = 18;
      my += 8;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${m.label}:`, mx, my);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(37, 99, 235);
    pdf.text(` ${m.value}`, mx + pdf.getTextWidth(`${m.label}:`), my);
    mx += 60;
  });

  y += 36;

  // Pie Chart Summaries Section
  if (data.pieChartsData && data.pieChartsData.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Institutional Status & Distribution Breakdowns', 14, y);
    y += 8;

    data.pieChartsData.forEach((chart) => {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(14, y, 182, 38, 2, 2, 'S');

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text(chart.title, 18, y + 7);

      const totalVal = chart.items.reduce((sum, item) => sum + item.value, 0);

      let itemY = y + 14;
      let itemX = 18;

      chart.items.forEach((item, i) => {
        if (i % 2 === 0 && i !== 0) {
          itemX = 18;
          itemY += 8;
        }

        const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : '0.0';

        // Colored badge square
        const hex = item.color || '#3b82f6';
        const r = parseInt(hex.slice(1, 3), 16) || 59;
        const g = parseInt(hex.slice(3, 5), 16) || 130;
        const b = parseInt(hex.slice(5, 7), 16) || 246;

        pdf.setFillColor(r, g, b);
        pdf.rect(itemX, itemY - 3, 3, 3, 'F');

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(` ${item.name}:`, itemX + 4, itemY);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(` ${item.value} (${pct}%)`, itemX + 4 + pdf.getTextWidth(` ${item.name}:`), itemY);

        itemX += 88;
      });

      y += 44;
    });
  }

  // Footer Disclaimer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(148, 163, 184);
  pdf.text('This is an official accredited report generated directly from live MITCORER IPTS relational records.', 14, 287);

  const fileName = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
