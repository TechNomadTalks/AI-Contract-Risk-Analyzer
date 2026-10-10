import Tesseract from 'tesseract.js';

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

let mammothModule: typeof import('mammoth') | null = null;
let pdfParseModule: unknown = null;

async function getMammoth() {
  if (!mammothModule) {
    mammothModule = await import('mammoth');
  }
  return mammothModule;
}

async function getPdfParse() {
  if (!pdfParseModule) {
    pdfParseModule = await import('pdf-parse');
  }
  return pdfParseModule;
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OCR timeout after 120 seconds'));
      }, 120000);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('OCR aborted'));
        }, { once: true });
      }
    });
    
    // OCR with preprocessing options for better accuracy
    const ocrPromise = Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      },
      // Preprocessing options for better OCR accuracy
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      // Image preprocessing
      image_binary: false,
      // Enhancement options
      image_grayscale: true,
      image_threshold: 128,
      // Additional enhancements
      preserve_interword_spaces: '1',
      // Font smoothing
      textord_min_linesize: '2.5',
    });
    
    const result = await Promise.race([ocrPromise, timeoutPromise]);
    
    return {
      text: result.data.text,
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        text: '',
        success: false,
        error: 'OCR aborted',
      };
    }
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const pdfModule = await getPdfParse() as { PDFParse: new (options: { data: Uint8Array }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } };
    const parser = new pdfModule.PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();
    
    return {
      text: textResult.text,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    };
  }
}

export async function extractTextFromDOCX(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const mammoth = await getMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      text: result.value,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'DOCX parsing failed',
    };
  }
}

export async function extractTextFromRTF(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text();
    
    // Basic RTF parsing - strip RTF control words
    const cleanText = text
      .replace(/\\[a-z]+\d*\s?/gi, ' ')  // Remove RTF control words
      .replace(/[{}]/g, '')               // Remove braces
      .replace(/\\par/g, '\n')            // Paragraph breaks
      .replace(/\\tab/g, '\t')            // Tabs
      .replace(/\\'[0-9a-f]{2}/gi, '')    // Hex escapes
      .replace(/\\[a-z]+/gi, ' ')         // Remaining control words
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim();
    
    return {
      text: cleanText,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'RTF parsing failed',
    };
  }
}

export async function extractTextFromODT(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // ODT is a zip file containing content.xml
    // We'll extract text from content.xml
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    
    const contentXml = zip.file('content.xml');
    if (!contentXml) {
      throw new Error('content.xml not found in ODT file');
    }
    
    const xmlText = await contentXml.async('text');
    
    // Parse XML and extract text content
    const text = xmlText
      .replace(/<[^>]*>/g, ' ')  // Remove XML tags
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/&/g, '&')
      .replace(/"/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      text,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'ODT parsing failed',
    };
  }
}

export async function extractTextFromTXT(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text();
    
    return {
      text,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'TXT parsing failed',
    };
  }
}

export async function extractText(
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<ExtractionResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|tiff|tif|gif|bmp)$/)) {
    return extractTextFromImage(file, onProgress, signal);
  }
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDOCX(file);
  }
  
  if (
    fileType === 'application/rtf' || 
    fileType === 'text/rtf' ||
    fileName.endsWith('.rtf')
  ) {
    return extractTextFromRTF(file);
  }
  
  if (
    fileType === 'application/vnd.oasis.opendocument.text' ||
    fileName.endsWith('.odt')
  ) {
    return extractTextFromODT(file);
  }
  
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTextFromTXT(file);
  }
  
  return {
    text: '',
    success: false,
    error: `Unsupported file type: ${fileType}`,
  };
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}