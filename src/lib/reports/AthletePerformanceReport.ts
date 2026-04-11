import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PerformanceAssessment } from '@/hooks/usePerformanceResults';
import { getImageDimensions } from '../utils';

export interface ReportData {
    athleteName: string;
    organization: string;
    organizationLogo?: string;
    organizationAddress?: string;
    assessments: PerformanceAssessment[];
    personalBests: Record<string, PerformanceAssessment>;
}

export const generateAthletePerformanceReport = async (data: ReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = format(new Date(), 'dd MMM yyyy');

    // Header Background
    doc.setFillColor(14, 165, 233); // Primary Sky Blue
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    let titleY = 25;

    if (data.organizationLogo) {
        try {
            const { width, height, img } = await getImageDimensions(data.organizationLogo);
            const aspectRatio = width / height;
            const topMargin = 5; // 0.5cm from top
            const maxLogoHeight = 20; 
            
            if (aspectRatio > 2) {
                // Horizontal Header
                const targetWidth = pageWidth - 40;
                const targetHeight = targetWidth / aspectRatio;
                const finalHeight = Math.min(targetHeight, maxLogoHeight);
                const finalWidth = finalHeight * aspectRatio;
                
                doc.addImage(img, 'PNG', (pageWidth - finalWidth) / 2, topMargin, finalWidth, finalHeight);
                titleY = topMargin + finalHeight + 10;
            } else {
                // Square/Portrait logo
                const finalHeight = Math.min(25, maxLogoHeight);
                const finalWidth = finalHeight * aspectRatio;
                doc.addImage(img, 'PNG', (pageWidth - finalWidth) / 2, topMargin, finalWidth, finalHeight);
                titleY = topMargin + finalHeight + 10;
            }
        } catch (e) {
            console.error("Logo failed to load", e);
        }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ATHLETE PERFORMANCE REPORT', 20, titleY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${dateStr}`, pageWidth - 20, titleY + 10, { align: 'right' });

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
        
        if (data.organizationAddress) {
            const splitAddress = doc.splitTextToSize(data.organizationAddress, 180);
            doc.text(splitAddress, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
        }
        
        doc.text(`ISHPO Performance Module - Confidential Athlete Data • Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`${data.athleteName.replace(/\s+/g, '_')}_Performance_Report.pdf`);
};
