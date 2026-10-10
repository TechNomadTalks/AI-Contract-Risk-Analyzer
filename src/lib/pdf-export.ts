import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { ContractDocument, OllamaAnalysis } from '@/types';

export async function generateAnalysisPDF(
  document: ContractDocument,
  analysis: OllamaAnalysis | undefined
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  let y = pageHeight - margin;
  
  const addText = (page: PDFPage, text: string, x: number, y: number, size: number, font: typeof font, color = rgb(0, 0, 0)) => {
    page.drawText(text, { x, y, size, font, color, maxWidth: contentWidth });
  };
  
  const wrapText = (text: string, maxWidth: number, font: typeof font, size: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Title
  addText(page, 'Contract Risk Analysis Report', margin, y, 24, fontBold);
  y -= 40;
  
  // Document info
  addText(page, `Document: ${document.fileName}`, margin, y, 12, font);
  y -= 18;
  addText(page, `Uploaded: ${document.uploadedAt.toLocaleString()}`, margin, y, 12, font);
  y -= 18;
  addText(page, `Overall Risk Score: ${document.riskScore}/100`, margin, y, 12, fontBold);
  y -= 18;
  addText(page, `Clauses Analyzed: ${document.clauses.length}`, margin, y, 12, font);
  y -= 30;
  
  // Summary
  if (analysis?.summary) {
    addText(page, 'Executive Summary', margin, y, 16, fontBold);
    y -= 24;
    const summaryLines = wrapText(analysis.summary, contentWidth, font, 11);
    for (const line of summaryLines) {
      if (y < margin + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      addText(page, line, margin, y, 11, font);
      y -= 16;
    }
    y -= 20;
  }
  
  // Top Risks
  if (analysis?.topRisks && analysis.topRisks.length > 0) {
    addText(page, 'Top Risks Identified', margin, y, 16, fontBold);
    y -= 24;
    for (const risk of analysis.topRisks) {
      if (y < margin + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const riskLines = wrapText(`• ${risk}`, contentWidth - 20, font, 11);
      for (const line of riskLines) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        addText(page, line, margin + 20, y, 11, font);
        y -= 16;
      }
    }
    y -= 20;
  }
  
  // Recommendations
  if (analysis?.recommendations && analysis.recommendations.length > 0) {
    addText(page, 'Recommendations', margin, y, 16, fontBold);
    y -= 24;
    for (const rec of analysis.recommendations) {
      if (y < margin + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const recLines = wrapText(`• ${rec}`, contentWidth - 20, font, 11);
      for (const line of recLines) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        addText(page, line, margin + 20, y, 11, font);
        y -= 16;
      }
    }
    y -= 20;
  }
  
  // Detailed Clause Analysis
  if (document.clauses.length > 0) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    addText(page, 'Detailed Clause Analysis', margin, y, 18, fontBold);
    y -= 30;
    
    for (const clause of document.clauses) {
      if (y < margin + 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      
      const riskColor = clause.riskLevel === 'high' ? rgb(1, 0, 0) : clause.riskLevel === 'medium' ? rgb(1, 0.6, 0) : rgb(0, 0.5, 0);
      
      addText(page, `${clause.type.replace(/_/g, ' ')} — ${clause.riskLevel.toUpperCase()} RISK`, margin, y, 13, fontBold, riskColor);
      y -= 20;
      
      const clauseLines = wrapText(clause.text.substring(0, 500), contentWidth, fontMono, 9);
      for (const line of clauseLines) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        addText(page, line, margin, y, 9, fontMono, rgb(0.3, 0.3, 0.3));
        y -= 13;
      }
      
      if (clause.riskFactors.length > 0) {
        addText(page, 'Risk Factors:', margin, y, 10, fontBold);
        y -= 16;
        for (const factor of clause.riskFactors) {
          if (y < margin + 20) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          const factorLines = wrapText(`  • ${factor}`, contentWidth - 20, font, 9);
          for (const line of factorLines) {
            if (y < margin + 20) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            addText(page, line, margin + 10, y, 9, font);
            y -= 13;
          }
        }
      }
      
      y -= 15;
    }
  }
  
  // Footer
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i);
    p.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: pageWidth - 100,
      y: 30,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    p.drawText(`Contract Sentinel — Confidential`, {
      x: margin,
      y: 30,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  return pdfDoc.save();
}

export async function downloadAnalysisPDF(
  document: ContractDocument,
  analysis: OllamaAnalysis | undefined,
  fileName?: string
): Promise<void> {
  const pdfBytes = await generateAnalysisPDF(document, analysis);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `${document.fileName.replace(/\.[^/.]+$/, '')}-analysis.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}