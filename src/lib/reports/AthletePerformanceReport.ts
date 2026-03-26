import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PerformanceAssessment } from '@/hooks/usePerformanceResults';

export interface ReportData {
    athleteName: string;
    organization: string;
    assessments: PerformanceAssessment[];
    personalBests: Record<string, PerformanceAssessment>;
}

export const generateAthletePerformanceReport = (data: ReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = format(new Date(), 'dd MMM yyyy');

    // Header
    doc.setFillColor(14, 165, 233); // Primary Sky Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ATHLETE PERFORMANCE REPORT', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${dateStr}`, pageWidth - 20, 25, { align: 'right' });

    // Athlete Info Section
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.text(`Athlete: ${data.athleteName}`, 20, 55);
    doc.setFontSize(12);
    doc.text(`Organization: ${data.organization}`, 20, 62);

    // Personal Bests Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CURRENT PERSONAL BESTS (PBs)', 20, 80);

    const pbRows = Object.values(data.personalBests).map(pb => [
        pb.category,
        pb.test_name,
        `${pb.metrics.value} ${pb.metrics.unit || ''}`,
        format(new Date(pb.recorded_at), 'dd MMM yyyy')
    ]);

    autoTable(doc, {
        startY: 85,
        head: [['Category', 'Test Name', 'Best Result', 'Date Achieved']],
        body: pbRows,
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Recent Trends Table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('RECENT ASSESSMENT HISTORY', 20, finalY);

    const historyRows = data.assessments.slice(0, 10).map(a => [
        format(new Date(a.recorded_at), 'dd MMM yyyy'),
        a.test_name,
        `${a.metrics.value} ${a.metrics.unit || ''}`,
        a.category
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Test Name', 'Result', 'Category']],
        body: historyRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [14, 165, 233] },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`ISHPO Performance Module - Confidential Athlete Data`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`${data.athleteName.replace(/\s+/g, '_')}_Performance_Report.pdf`);
};
