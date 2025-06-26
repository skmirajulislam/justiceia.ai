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

        // Create PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Page settings with reduced spacing
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 5;
        const bulletIndent = 5;

        let yPosition = margin;

        // Clean and prepare content
        const cleanedContent = cleanContent(content);

        // Add title
        doc.setFont('times', 'bold');
        doc.setFontSize(12);

        const title = type === 'translated' ? `Translated Document: ${fileName}` : fileName;
        const safeTitle = normalizeText(title);

        const titleLines = doc.splitTextToSize(safeTitle, maxWidth);
        titleLines.forEach((titleLine: string) => {
            doc.text(titleLine, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
        });

        // Add separator line
        yPosition += 3;
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;

        // Process content with proper formatting
        const formattedContent = parseAndFormatContent(cleanedContent);

        for (const element of formattedContent) {
            // Check for page break
            if (yPosition > pageHeight - 30) {
                doc.addPage();
                yPosition = margin;
            }

            if (element.type === 'header') {
                // Header formatting
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                yPosition += 3;

                const headerLines = doc.splitTextToSize(element.text, maxWidth);
                headerLines.forEach((line: string) => {
                    if (yPosition > pageHeight - 30) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += lineHeight;
                });

                yPosition += 2;

            } else if (element.type === 'paragraph') {
                // Regular paragraph with proper text wrapping
                doc.setFont('times', 'normal');
                doc.setFontSize(10);

                const paragraphLines = doc.splitTextToSize(element.text, maxWidth);
                paragraphLines.forEach((line: string) => {
                    if (yPosition > pageHeight - 30) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += lineHeight;
                });

                yPosition += 3;

            } else if (element.type === 'mixed') {
                // Handle mixed content with bold and normal text - improved wrapping
                doc.setFontSize(10);
                let currentY = yPosition;

                // Process each part and handle wrapping properly
                let combinedText = '';
                let hasBoldParts = false;

                // Check if we have bold parts to determine rendering method
                for (const part of element.parts) {
                    if (part.bold) {
                        hasBoldParts = true;
                        break;
                    }
                }

                if (hasBoldParts) {
                    // For mixed content with bold, render part by part
                    let currentX = margin;
                    let lineText = '';

                    for (const part of element.parts) {
                        if (currentY > pageHeight - 30) {
                            doc.addPage();
                            currentY = margin;
                            currentX = margin;
                            lineText = '';
                        }

                        if (part.bold) {
                            doc.setFont('times', 'bold');
                        } else {
                            doc.setFont('times', 'normal');
                        }

                        const partText = part.text.trim();
                        if (partText) {
                            // Check if adding this part would exceed line width
                            const testText = lineText + (lineText ? ' ' : '') + partText;
                            const testWidth = doc.getTextWidth(testText);

                            if (testWidth > maxWidth && lineText) {
                                // Move to next line
                                currentY += lineHeight;
                                currentX = margin;
                                lineText = '';

                                if (currentY > pageHeight - 30) {
                                    doc.addPage();
                                    currentY = margin;
                                }
                            }

                            // Add space if not at start of line
                            if (currentX > margin) {
                                currentX += doc.getTextWidth(' ');
                            }

                            doc.text(partText, currentX, currentY);
                            currentX += doc.getTextWidth(partText);
                            lineText += (lineText ? ' ' : '') + partText;
                        }
                    }
                    yPosition = currentY + lineHeight + 3;
                } else {
                    // For content without bold, use simple text splitting
                    combinedText = element.parts.map(p => p.text).join(' ');
                    doc.setFont('times', 'normal');
                    const textLines = doc.splitTextToSize(combinedText, maxWidth);

                    textLines.forEach((line: string) => {
                        if (yPosition > pageHeight - 30) {
                            doc.addPage();
                            yPosition = margin;
                        }
                        doc.text(line, margin, yPosition);
                        yPosition += lineHeight;
                    });
                    yPosition += 3;
                }

            } else if (element.type === 'bullet') {
                // Handle bullet points with proper text wrapping
                doc.setFont('times', 'normal');
                doc.setFontSize(10);

                // Add bullet symbol
                doc.text('•', margin, yPosition);

                // Add bullet text with proper indentation and wrapping
                const bulletLines = doc.splitTextToSize(element.text, maxWidth - bulletIndent);
                bulletLines.forEach((line: string, index: number) => {
                    if (yPosition > pageHeight - 30) {
                        doc.addPage();
                        yPosition = margin;
                        // Re-add bullet symbol on new page if continuing
                        if (index > 0) {
                            doc.text('•', margin, yPosition);
                        }
                    }

                    const xPosition = margin + bulletIndent;
                    doc.text(line, xPosition, yPosition);
                    if (index < bulletLines.length - 1) {
                        yPosition += lineHeight;
                    }
                });

                yPosition += lineHeight + 2;
            }
        }

        // Add page numbers
        const totalPages = doc.getNumberOfPages();
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            doc.setPage(pageNum);
            doc.setFont('times', 'normal');
            doc.setFontSize(9);
            doc.text(
                `Page ${pageNum} of ${totalPages}`,
                pageWidth - margin,
                pageHeight - 8,
                { align: 'right' }
            );
        }

        // Generate and return PDF
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}.pdf"`,
                'Cache-Control': 'no-cache',
                'Content-Length': pdfBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Clean HTML content and remove unwanted elements
 */
function cleanContent(content: string): string {
    return content
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/\{[^}]*\}/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .trim();
}

/**
 * Normalize text to handle Unicode characters safely
 */
function normalizeText(text: string): string {
    return text
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/[^\x20-\x7E\n\r\t]/g, (char) => {
            const code = char.charCodeAt(0);
            if (code >= 160 && code <= 255) return char;
            return ' ';
        })
        .trim();
}

/**
 * Parse content and handle bold formatting and bullet points correctly
 */
function parseAndFormatContent(content: string): Array<{
    type: 'header' | 'paragraph' | 'mixed' | 'bullet',
    text?: string,
    parts?: Array<{ text: string, bold: boolean }>
}> {
    const elements: Array<{
        type: 'header' | 'paragraph' | 'mixed' | 'bullet',
        text?: string,
        parts?: Array<{ text: string, bold: boolean }>
    }> = [];

    // Split by paragraph breaks but preserve line structure
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) continue;

        // Check if this line starts with a bullet point marker
        const startsWithBullet = /^[•*]\s+/.test(trimmedParagraph);

        // Remove bullet markers for processing
        let cleanParagraph = trimmedParagraph
            .replace(/^[•*]\s+/, '')
            .trim();

        // Check if paragraph contains bold formatting
        const hasBoldFormatting = /\*\*[^*]+\*\*/.test(cleanParagraph);

        if (startsWithBullet && !hasBoldFormatting) {
            // Simple bullet point without bold formatting
            elements.push({
                type: 'bullet',
                text: normalizeText(cleanParagraph)
            });
        } else if (hasBoldFormatting) {
            // Handle content with bold formatting
            const parts: Array<{ text: string, bold: boolean }> = [];

            // Split by ** but keep the delimiters
            const segments = cleanParagraph.split(/(\*\*[^*]*\*\*)/);

            for (const segment of segments) {
                if (!segment.trim()) continue;

                if (segment.startsWith('**') && segment.endsWith('**')) {
                    // Bold text - remove the ** markers
                    const boldText = segment.slice(2, -2).trim();
                    if (boldText) {
                        parts.push({ text: normalizeText(boldText), bold: true });
                    }
                } else {
                    // Normal text
                    const normalText = segment.trim();
                    if (normalText) {
                        parts.push({ text: normalizeText(normalText), bold: false });
                    }
                }
            }

            if (parts.length > 0) {
                if (startsWithBullet) {
                    // Bullet point with mixed formatting - combine into single bullet text
                    const combinedText = parts.map(p => p.text).join(' ');
                    elements.push({ type: 'bullet', text: combinedText });
                } else {
                    elements.push({ type: 'mixed', parts });
                }
            }
        } else {
            // No bold formatting
            const isHeader = isHeaderLine(cleanParagraph);
            const normalizedText = normalizeText(cleanParagraph);

            if (startsWithBullet) {
                elements.push({ type: 'bullet', text: normalizedText });
            } else if (isHeader) {
                elements.push({ type: 'header', text: normalizedText });
            } else {
                elements.push({ type: 'paragraph', text: normalizedText });
            }
        }
    }

    return elements;
}

/**
 * Determine if a line is a header
 */
function isHeaderLine(line: string): boolean {
    const trimmedLine = line.trim();

    return (
        (trimmedLine.length < 100 && trimmedLine.length > 5) &&
        (
            /^\d+\.?\s+[A-Z]/.test(trimmedLine) ||
            /^[A-Z\s]{10,}[A-Z]$/.test(trimmedLine) ||
            /^[A-Z][^.]*:$/.test(trimmedLine) ||
            /^(LEGAL NOTICE|NOTICE|WHEREAS|THEREFORE|JURISDICTION|PURPOSE|PARTIES|REMEDY|GOVERNING|DISCLAIMER|WITNESS|SIGNATURE|ANNEXURE|NOTE|FOR THE ISSUER)/i.test(trimmedLine) ||
            /^[A-Z][A-Z\s]+[A-Z]:?\s*$/.test(trimmedLine)
        )
    );
}