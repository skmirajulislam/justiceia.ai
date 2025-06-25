import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: NextRequest) {
    try {
        const { content, fileName, type } = await request.json();

        if (!content || !fileName) {
            return NextResponse.json(
                { error: 'Content and fileName are required' },
                { status: 400 }
            );
        }

        // Create a new PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set font and size
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        // Clean content and handle formatting
        const cleanContent = content
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold syntax
            .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic syntax
            .replace(/#{1,6}\s/g, '') // Remove markdown headers
            .trim();

        // Split content into lines
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 6;
        const maxLinesPerPage = Math.floor((pageHeight - (margin * 2)) / lineHeight);

        // Split text into words and create lines
        const words = cleanContent.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = doc.getTextWidth(testLine);

            if (textWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        // Add title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const title = type === 'translated' ? `Translated Document: ${fileName}` : fileName;
        doc.text(title, margin, margin + 10);

        // Add content
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        let yPosition = margin + 25;
        let currentPage = 1;
        let linesOnCurrentPage = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if we need a new page
            if (linesOnCurrentPage >= maxLinesPerPage) {
                doc.addPage();
                yPosition = margin + 10;
                linesOnCurrentPage = 0;
                currentPage++;
            }

            // Handle bold text formatting
            if (line.includes('**')) {
                // Split line by bold markers
                const parts = line.split(/(\*\*.*?\*\*)/);
                let xPosition = margin;

                for (const part of parts) {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        // Bold text
                        doc.setFont('helvetica', 'bold');
                        const boldText = part.slice(2, -2);
                        doc.text(boldText, xPosition, yPosition);
                        xPosition += doc.getTextWidth(boldText);
                    } else if (part.trim()) {
                        // Normal text
                        doc.setFont('helvetica', 'normal');
                        doc.text(part, xPosition, yPosition);
                        xPosition += doc.getTextWidth(part);
                    }
                }
            } else {
                // Regular line
                doc.setFont('helvetica', 'normal');
                doc.text(line, margin, yPosition);
            }

            yPosition += lineHeight;
            linesOnCurrentPage++;
        }

        // Add footer with page numbers
        const totalPages = currentPage;
        for (let page = 1; page <= totalPages; page++) {
            doc.setPage(page);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Page ${page} of ${totalPages}`,
                pageWidth - margin - 30,
                pageHeight - 10
            );
        }

        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Return PDF as response
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}