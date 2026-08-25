import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

/**
 * Language → Noto Sans font family mapping.
 * Each entry specifies the TTF files (Regular + Bold) that cover that language's script.
 * PDFKit embeds glyphs from these fonts directly into the PDF, guaranteeing correct rendering
 * of Hindi (Devanagari), Bengali, Tamil, Telugu, Chinese, and all Latin scripts.
 */
const FONT_MAP: Record<string, { regular: string; bold: string }> = {
    hindi: {
        regular: 'NotoSansDevanagari-Regular.ttf',
        bold: 'NotoSansDevanagari-Bold.ttf',
    },
    bengali: {
        regular: 'NotoSansBengali-Regular.ttf',
        bold: 'NotoSansBengali-Bold.ttf',
    },
    tamil: {
        regular: 'NotoSansTamil-Regular.ttf',
        bold: 'NotoSansTamil-Bold.ttf',
    },
    telugu: {
        regular: 'NotoSansTelugu-Regular.ttf',
        bold: 'NotoSansTelugu-Bold.ttf',
    },
    chinese: {
        regular: 'NotoSansSC-Regular.ttf',
        bold: 'NotoSansSC-Regular.ttf', // SC doesn't have a separate bold; use regular
    },
    // Latin-based languages use NotoSans base
    english: {
        regular: 'NotoSans-Regular.ttf',
        bold: 'NotoSans-Bold.ttf',
    },
    spanish: {
        regular: 'NotoSans-Regular.ttf',
        bold: 'NotoSans-Bold.ttf',
    },
    french: {
        regular: 'NotoSans-Regular.ttf',
        bold: 'NotoSans-Bold.ttf',
    },
    german: {
        regular: 'NotoSans-Regular.ttf',
        bold: 'NotoSans-Bold.ttf',
    },
};

function getFontPaths(language: string): { regular: string; bold: string } {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const mapping = FONT_MAP[language?.toLowerCase()] || FONT_MAP['english'];

    const regularPath = path.join(fontsDir, mapping.regular);
    const boldPath = path.join(fontsDir, mapping.bold);

    // Fallback to NotoSans base if specific font file not found
    const fallbackRegular = path.join(fontsDir, 'NotoSans-Regular.ttf');
    const fallbackBold = path.join(fontsDir, 'NotoSans-Bold.ttf');

    return {
        regular: fs.existsSync(regularPath) ? regularPath : fallbackRegular,
        bold: fs.existsSync(boldPath) ? boldPath : fallbackBold,
    };
}

interface ContentBlock {
    type: 'h1' | 'h2' | 'h3' | 'divider' | 'disclaimer' | 'list-item' | 'paragraph';
    text: string;
    prefix?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { content, fileName, type, language } = await request.json();

        if (!content || !fileName) {
            return NextResponse.json(
                { error: 'Content and fileName are required' },
                { status: 400 }
            );
        }

        const fonts = getFontPaths(language || 'english');

        // Create PDF document with PDFKit, using our custom font as default
        // to prevent PDFKit from trying to load built-in Helvetica.afm
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            bufferPages: true,
            font: fonts.regular, // Use custom font as default to avoid Helvetica.afm lookup
            info: {
                Title: fileName,
                Author: 'Justiceia.ai',
                Subject: type === 'translated' ? 'Translated Legal Document' : 'Generated Legal Document',
                Creator: 'Justiceia.ai Legal Document Processing System',
            },
        });

        // Register named font aliases
        doc.registerFont('NotoRegular', fonts.regular);
        doc.registerFont('NotoBold', fonts.bold);

        // For translated documents that use non-Latin scripts, also register the Latin font
        const latinFonts = getFontPaths('english');
        if (fonts.regular !== latinFonts.regular) {
            doc.registerFont('LatinRegular', latinFonts.regular);
            doc.registerFont('LatinBold', latinFonts.bold);
        }

        // Collect PDF output into buffer
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));

        const pdfPromise = new Promise<Buffer>((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });

        // Page dimensions
        const pageWidth = 595.28; // A4
        const contentWidth = pageWidth - 100; // 50mm margins each side

        // ── Document Title Banner ──
        const docTitle = type === 'translated'
            ? `TRANSLATED DOCUMENT: ${fileName.toUpperCase()}`
            : fileName.toUpperCase();

        doc.font('NotoBold').fontSize(13).fillColor('#0f172a');
        doc.text(docTitle, 50, 50, { align: 'center', width: contentWidth });
        doc.moveDown(0.3);

        // Double separator line
        const titleEndY = doc.y;
        doc.moveTo(50, titleEndY).lineTo(pageWidth - 50, titleEndY)
            .lineWidth(1.2).strokeColor('#1e293b').stroke();
        doc.moveTo(50, titleEndY + 2.5).lineTo(pageWidth - 50, titleEndY + 2.5)
            .lineWidth(0.4).stroke();
        doc.y = titleEndY + 12;

        // ── Parse and render content blocks ──
        const cleanedContent = cleanHtml(content);
        const blocks = parseContentToBlocks(cleanedContent);

        for (const block of blocks) {
            // Check if we need a new page (leave room for at least 30pt)
            if (doc.y > 750) {
                doc.addPage();
            }

            switch (block.type) {
                case 'h1': {
                    doc.moveDown(0.5);
                    doc.font('NotoBold').fontSize(12).fillColor('#0f172a');
                    doc.text(block.text, { width: contentWidth });
                    doc.moveDown(0.3);
                    break;
                }
                case 'h2': {
                    doc.moveDown(0.4);
                    doc.font('NotoBold').fontSize(11).fillColor('#0f172a');
                    doc.text(block.text, { width: contentWidth });
                    doc.moveDown(0.2);
                    break;
                }
                case 'h3': {
                    doc.moveDown(0.3);
                    doc.font('NotoBold').fontSize(10.5).fillColor('#1e293b');
                    doc.text(block.text, { width: contentWidth });
                    doc.moveDown(0.15);
                    break;
                }
                case 'divider': {
                    doc.moveDown(0.3);
                    const divY = doc.y;
                    doc.moveTo(50, divY).lineTo(pageWidth - 50, divY)
                        .lineWidth(0.4).strokeColor('#cbd5e1').stroke();
                    doc.y = divY + 8;
                    break;
                }
                case 'disclaimer': {
                    doc.moveDown(0.3);
                    // Draw disclaimer box background
                    const boxY = doc.y;
                    const textHeight = doc.font('NotoRegular').fontSize(9)
                        .heightOfString(block.text, { width: contentWidth - 16 });
                    const boxHeight = textHeight + 12;

                    doc.save();
                    doc.roundedRect(50, boxY, contentWidth, boxHeight, 3)
                        .fillAndStroke('#f8fafc', '#e2e8f0');
                    doc.restore();

                    doc.font('NotoRegular').fontSize(9).fillColor('#475569');
                    doc.text(block.text, 58, boxY + 6, { width: contentWidth - 16 });
                    doc.y = boxY + boxHeight + 6;
                    break;
                }
                case 'list-item': {
                    const bulletPrefix = block.prefix || '•';
                    doc.font('NotoBold').fontSize(10).fillColor('#0f172a');
                    const bulletWidth = doc.widthOfString(bulletPrefix + '  ');

                    doc.text(bulletPrefix, 50, doc.y, { continued: true });
                    doc.text('  ', { continued: true });
                    // Render the rest with mixed styling
                    renderInlineFormatted(doc, block.text, contentWidth - bulletWidth);
                    doc.moveDown(0.15);
                    break;
                }
                case 'paragraph':
                default: {
                    renderInlineFormatted(doc, block.text, contentWidth);
                    doc.moveDown(0.35);
                    break;
                }
            }
        }

        // ── Add running headers/footers ──
        const pages = doc.bufferedPageRange();
        const totalPages = pages.count;

        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);

            // Footer separator line
            doc.save();
            doc.moveTo(50, 790).lineTo(pageWidth - 50, 790)
                .lineWidth(0.3).strokeColor('#e2e8f0').stroke();

            // Footer text
            doc.font('NotoRegular').fontSize(8).fillColor('#64748b');
            doc.text('Justiceia.ai • Legal Document Processing System', 50, 798, {
                width: contentWidth / 2,
                align: 'left',
            });
            doc.text(`Page ${i + 1} of ${totalPages}`, pageWidth / 2, 798, {
                width: contentWidth / 2,
                align: 'right',
            });
            doc.restore();

            // Running header on pages 2+
            if (i > 0) {
                doc.save();
                doc.font('NotoRegular').fontSize(8).fillColor('#64748b');
                doc.text(fileName.toUpperCase(), 50, 30, {
                    width: contentWidth,
                    align: 'left',
                });
                doc.moveTo(50, 42).lineTo(pageWidth - 50, 42)
                    .lineWidth(0.2).strokeColor('#e2e8f0').stroke();
                doc.restore();
            }
        }

        doc.end();

        const pdfBuffer = await pdfPromise;

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}.pdf"`,
                'Cache-Control': 'no-cache',
                'Content-Length': pdfBuffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF. Details: ' + (error?.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

/**
 * Renders text with inline **bold** and *italic* markdown formatting using PDFKit.
 */
function renderInlineFormatted(doc: PDFKit.PDFDocument, text: string, maxWidth: number) {
    const segments = parseInlineFormatting(text);
    let isFirst = true;

    for (const seg of segments) {
        if (seg.bold) {
            doc.font('NotoBold');
        } else if (seg.italic) {
            doc.font('NotoRegular'); // PDFKit doesn't always have italic variant; use regular
        } else {
            doc.font('NotoRegular');
        }
        doc.fontSize(10).fillColor('#0f172a');

        if (isFirst) {
            doc.text(seg.text, { width: maxWidth, continued: segments.indexOf(seg) < segments.length - 1 });
            isFirst = false;
        } else {
            doc.text(seg.text, { continued: segments.indexOf(seg) < segments.length - 1 });
        }
    }
}

interface TextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
}

function parseInlineFormatting(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    // Split by bold (**text**) and italic (*text*)
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            segments.push({ text: part.slice(2, -2), bold: true, italic: false });
        } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            segments.push({ text: part.slice(1, -1), bold: false, italic: true });
        } else {
            segments.push({ text: part, bold: false, italic: false });
        }
    }

    // If no segments were created, return the original text
    if (segments.length === 0) {
        segments.push({ text, bold: false, italic: false });
    }

    return segments;
}

/**
 * Strips HTML tags and unescapes entities
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
 * Parses markdown/legal text into semantic blocks while removing raw markdown tokens.
 * Unlike the old jsPDF version, this does NOT strip non-ASCII characters —
 * Hindi, Bengali, Tamil, Telugu, Chinese, etc. are all preserved exactly as-is.
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
            blocks.push({ type: 'h1', text: headingText });
            continue;
        }

        // H2 Heading (## Heading)
        if (/^##\s+/.test(trimmed)) {
            flushParagraph();
            const headingText = trimmed.replace(/^##+\s*/, '').replace(/\*\*/g, '').trim();
            blocks.push({ type: 'h2', text: headingText });
            continue;
        }

        // H3+ Heading (### Heading, #### Heading)
        if (/^###+\s+/.test(trimmed)) {
            flushParagraph();
            const headingText = trimmed.replace(/^###+\s*/, '').replace(/\*\*/g, '').trim();
            blocks.push({ type: 'h3', text: headingText });
            continue;
        }

        // Disclaimer block (> Note or DISCLAIMER:)
        if (/^(>|DISCLAIMER:)/i.test(trimmed)) {
            flushParagraph();
            const disclaimerText = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '').replace(/^\*|\*$/g, '').trim();
            blocks.push({ type: 'disclaimer', text: disclaimerText });
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

        // Standalone bold all-caps header lines like **STATEMENT OF FACTS**
        if (/^\*\*[A-Z0-9\s.,:\-_/\[\]\(\)]+\*\*$/.test(trimmed) && trimmed.length < 100) {
            flushParagraph();
            const cleanHeader = trimmed.slice(2, -2).trim();
            blocks.push({ type: 'h2', text: cleanHeader });
            continue;
        }

        currentParagraphLines.push(rawLine);
    }

    flushParagraph();
    return blocks;
}