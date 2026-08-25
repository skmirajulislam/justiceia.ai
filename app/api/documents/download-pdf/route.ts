import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

interface StyledToken {
    text: string;
    bold: boolean;
    italic: boolean;
}

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

        // Page layout metrics
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 18;
        const maxWidth = pageWidth - (margin * 2);
        const topMargin = 22;
        const bottomMargin = 22;

        let yPosition = topMargin;

        // Clean initial raw HTML if any
        const cleanedRaw = cleanHtml(content);

        // Document Title Banner at top of page 1
        const docTitle = type === 'translated' ? `TRANSLATED DOCUMENT: ${fileName.toUpperCase()}` : fileName.toUpperCase();
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42); // slate-900

        const titleLines = doc.splitTextToSize(normalizeText(docTitle), maxWidth);
        for (const tLine of titleLines) {
            doc.text(tLine, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
        }

        // Elegant double separator rule
        yPosition += 2;
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.6);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 1.2;
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 6;

        // Parse content into distinct blocks
        const blocks = parseContentToBlocks(cleanedRaw);

        for (const block of blocks) {
            // Ensure we aren't near page bottom before starting a block
            if (yPosition > pageHeight - bottomMargin - 10) {
                doc.addPage();
                yPosition = topMargin;
            }

            switch (block.type) {
                case 'h1': {
                    yPosition += 3;
                    if (yPosition > pageHeight - bottomMargin - 15) {
                        doc.addPage();
                        yPosition = topMargin;
                    }
                    doc.setFont('times', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(15, 23, 42);

                    const lines = doc.splitTextToSize(block.text, maxWidth);
                    for (const line of lines) {
                        doc.text(line, margin, yPosition);
                        yPosition += 5.5;
                    }
                    yPosition += 2;
                    break;
                }

                case 'h2': {
                    yPosition += 2.5;
                    if (yPosition > pageHeight - bottomMargin - 12) {
                        doc.addPage();
                        yPosition = topMargin;
                    }
                    doc.setFont('times', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(15, 23, 42);

                    const lines = doc.splitTextToSize(block.text, maxWidth);
                    for (const line of lines) {
                        doc.text(line, margin, yPosition);
                        yPosition += 5.2;
                    }
                    yPosition += 1.5;
                    break;
                }

                case 'h3': {
                    yPosition += 2;
                    if (yPosition > pageHeight - bottomMargin - 10) {
                        doc.addPage();
                        yPosition = topMargin;
                    }
                    doc.setFont('times', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(30, 41, 59);

                    const lines = doc.splitTextToSize(block.text, maxWidth);
                    for (const line of lines) {
                        doc.text(line, margin, yPosition);
                        yPosition += 5.0;
                    }
                    yPosition += 1;
                    break;
                }

                case 'divider': {
                    yPosition += 2;
                    if (yPosition > pageHeight - bottomMargin - 8) {
                        doc.addPage();
                        yPosition = topMargin;
                    }
                    doc.setDrawColor(203, 213, 225); // slate-300
                    doc.setLineWidth(0.3);
                    doc.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 4;
                    break;
                }

                case 'disclaimer': {
                    yPosition += 2;
                    doc.setFont('times', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(71, 85, 105); // slate-600

                    const discLines = doc.splitTextToSize(block.text, maxWidth - 8);
                    const boxHeight = discLines.length * 4.5 + 4;

                    if (yPosition + boxHeight > pageHeight - bottomMargin) {
                        doc.addPage();
                        yPosition = topMargin;
                    }

                    // Background box for disclaimer
                    doc.setFillColor(248, 250, 252); // slate-50
                    doc.setDrawColor(226, 232, 240); // slate-200
                    doc.roundedRect(margin, yPosition, maxWidth, boxHeight, 1.5, 1.5, 'FD');

                    let lineY = yPosition + 4;
                    for (const line of discLines) {
                        doc.text(line, margin + 4, lineY);
                        lineY += 4.5;
                    }
                    yPosition += boxHeight + 3;
                    break;
                }

                case 'list-item': {
                    const bulletIndent = 6;
                    doc.setFontSize(10);
                    doc.setTextColor(15, 23, 42);

                    // Render bullet prefix
                    const bulletPrefix = block.prefix || '•';
                    doc.setFont('times', 'bold');
                    doc.text(bulletPrefix, margin + 1, yPosition);

                    // Render text body with hanging indent
                    yPosition = renderStyledText(
                        doc,
                        block.text,
                        margin + bulletIndent,
                        yPosition,
                        maxWidth - bulletIndent,
                        5.0,
                        pageHeight,
                        topMargin,
                        bottomMargin,
                        10
                    );
                    yPosition += 1.5;
                    break;
                }

                case 'paragraph':
                default: {
                    doc.setFontSize(10);
                    doc.setTextColor(15, 23, 42);

                    yPosition = renderStyledText(
                        doc,
                        block.text,
                        margin,
                        yPosition,
                        maxWidth,
                        5.2,
                        pageHeight,
                        topMargin,
                        bottomMargin,
                        10
                    );
                    yPosition += 2.5;
                    break;
                }
            }
        }

        // Add professional running header and footer with page numbers
        const totalPages = doc.getNumberOfPages();
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            doc.setPage(pageNum);

            // Running Header (pages 2+)
            if (pageNum > 1) {
                doc.setFont('times', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(
                    normalizeText(fileName).toUpperCase(),
                    margin,
                    12
                );
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.2);
                doc.line(margin, 14, pageWidth - margin, 14);
            }

            // Running Footer (all pages)
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

            doc.setFont('times', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(
                'Justiceia.ai • Legal Document Processing System',
                margin,
                pageHeight - 9
            );
            doc.text(
                `Page ${pageNum} of ${totalPages}`,
                pageWidth - margin,
                pageHeight - 9,
                { align: 'right' }
            );
        }

        // Generate PDF buffer
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
 * Strips HTML tags and unescapes entities safely
 */
function cleanHtml(content: string): string {
    if (!content) return '';

    let inTag = false;
    let text = '';
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '<') {
            inTag = true;
        } else if (char === '>') {
            inTag = false;
            text += ' ';
        } else if (!inTag) {
            text += char;
        }
    }

    const htmlEntities: Record<string, string> = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#39;': "'",
    };

    let cleaned = text;
    for (const [entity, replacement] of Object.entries(htmlEntities)) {
        cleaned = cleaned.replaceAll(entity, replacement);
    }

    return cleaned.trim();
}

/**
 * Normalizes Unicode characters to standard printable ASCII / Latin-1 for jsPDF Times Roman
 */
function normalizeText(text: string): string {
    if (!text) return '';
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
        });
}

interface ContentBlock {
    type: 'h1' | 'h2' | 'h3' | 'divider' | 'disclaimer' | 'list-item' | 'paragraph';
    text: string;
    prefix?: string;
}

/**
 * Parses markdown/legal text into semantic blocks while removing raw markdown tokens
 */
function parseContentToBlocks(content: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const lines = content.split('\n');

    let currentParagraphLines: string[] = [];

    const flushParagraph = () => {
        if (currentParagraphLines.length > 0) {
            const text = currentParagraphLines.join('\n').trim();
            if (text) {
                blocks.push({ type: 'paragraph', text });
            }
            currentParagraphLines = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();

        if (!trimmed) {
            flushParagraph();
            continue;
        }

        // Divider (---, ***, ___)
        if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
            flushParagraph();
            blocks.push({ type: 'divider', text: '' });
            continue;
        }

        // H1 Heading (# Heading)
        if (/^#\s+/.test(trimmed)) {
            flushParagraph();
            const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
            blocks.push({ type: 'h1', text: normalizeText(headingText) });
            continue;
        }

        // H2 Heading (## Heading)
        if (/^##\s+/.test(trimmed)) {
            flushParagraph();
            const headingText = trimmed.replace(/^##+\s*/, '').replace(/\*\*/g, '').trim();
            blocks.push({ type: 'h2', text: normalizeText(headingText) });
            continue;
        }

        // H3 / H4 Heading (### Heading, #### Heading)
        if (/^###+\s+/.test(trimmed)) {
            flushParagraph();
            const headingText = trimmed.replace(/^###+\s*/, '').replace(/\*\*/g, '').trim();
            blocks.push({ type: 'h3', text: normalizeText(headingText) });
            continue;
        }

        // Disclaimer block (> Note or DISCLAIMER:)
        if (/^(>|DISCLAIMER:)/i.test(trimmed)) {
            flushParagraph();
            const disclaimerText = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '').replace(/^\*|\*$/g, '').trim();
            blocks.push({ type: 'disclaimer', text: normalizeText(disclaimerText) });
            continue;
        }

        // Numbered list item (1. Item, (a) Item)
        const numberedMatch = trimmed.match(/^(\d+\.|\([a-zA-Z0-9]+\))\s+(.*)/);
        if (numberedMatch) {
            flushParagraph();
            blocks.push({
                type: 'list-item',
                prefix: numberedMatch[1],
                text: numberedMatch[2]
            });
            continue;
        }

        // Bullet list item (* Item, - Item, • Item)
        const bulletMatch = trimmed.match(/^([*\-•])\s+(.*)/);
        if (bulletMatch && !trimmed.startsWith('***')) {
            flushParagraph();
            blocks.push({
                type: 'list-item',
                prefix: '•',
                text: bulletMatch[2]
            });
            continue;
        }

        // Standalone bold all-caps header lines like **STATEMENT OF FACTS** or **COMPLAINT NO. [___]**
        if (/^\*\*[A-Z0-9\s.,:\-_/\[\]\(\)]+\*\*$/.test(trimmed) && trimmed.length < 100) {
            flushParagraph();
            const cleanHeader = trimmed.slice(2, -2).trim();
            blocks.push({ type: 'h2', text: normalizeText(cleanHeader) });
            continue;
        }

        currentParagraphLines.push(rawLine);
    }

    flushParagraph();
    return blocks;
}

/**
 * Tokenizes markdown paragraph with inline bold (**text**) and italics (*text*)
 */
function tokenizeFormattedText(text: string): StyledToken[] {
    const tokens: StyledToken[] = [];
    const normalized = normalizeText(text);

    // Regex to split by bold (**bold**) or italic (*italic* or _italic_)
    const parts = normalized.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            const inner = part.slice(2, -2);
            const words = inner.split(/(\s+)/);
            for (const w of words) {
                if (w) tokens.push({ text: w, bold: true, italic: false });
            }
        } else if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
            (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
            const inner = part.slice(1, -1);
            const words = inner.split(/(\s+)/);
            for (const w of words) {
                if (w) tokens.push({ text: w, bold: false, italic: true });
            }
        } else {
            const words = part.split(/(\s+)/);
            for (const w of words) {
                if (w) tokens.push({ text: w, bold: false, italic: false });
            }
        }
    }

    return tokens;
}

/**
 * Mathematical word-by-word line packing & rendering engine for jsPDF
 * Guarantees zero text overlap, correct styling per word, and flawless multi-page breaks.
 */
function renderStyledText(
    doc: jsPDF,
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
    pageHeight: number,
    topMargin: number,
    bottomMargin: number,
    fontSize: number = 10
): number {
    let currentY = startY;

    // Handle multiline paragraph preserved breaks
    const subParagraphs = text.split('\n');

    for (const subPara of subParagraphs) {
        const trimmedSub = subPara.trim();
        if (!trimmedSub) {
            currentY += lineHeight * 0.6;
            continue;
        }

        const tokens = tokenizeFormattedText(trimmedSub);

        // Group tokens into lines fitting maxWidth
        const lines: StyledToken[][] = [];
        let currentLine: StyledToken[] = [];
        let currentLineWidth = 0;

        for (const token of tokens) {
            doc.setFont('times', token.bold ? 'bold' : token.italic ? 'italic' : 'normal');
            doc.setFontSize(fontSize);

            const tokenWidth = doc.getTextWidth(token.text);

            if (token.text === ' ' || token.text === '\t') {
                if (currentLine.length > 0) {
                    currentLine.push(token);
                    currentLineWidth += tokenWidth;
                }
                continue;
            }

            if (currentLine.length > 0 && (currentLineWidth + tokenWidth) > maxWidth) {
                lines.push(currentLine);
                currentLine = [token];
                currentLineWidth = tokenWidth;
            } else {
                currentLine.push(token);
                currentLineWidth += tokenWidth;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // Render packed lines on canvas
        for (const line of lines) {
            if (currentY > pageHeight - bottomMargin) {
                doc.addPage();
                currentY = topMargin;
            }

            let currentX = x;

            for (const token of line) {
                doc.setFont('times', token.bold ? 'bold' : token.italic ? 'italic' : 'normal');
                doc.setFontSize(fontSize);

                if (token.text.trim()) {
                    doc.text(token.text, currentX, currentY);
                }

                currentX += doc.getTextWidth(token.text);
            }

            currentY += lineHeight;
        }
    }

    return currentY;
}