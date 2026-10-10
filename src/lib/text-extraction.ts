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
    
    const ocrPromise = Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      },
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
  onProgress?: (progress: number) => void
): Promise<ExtractionResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|tiff|tif|gif|bmp)$/)) {
    return extractTextFromImage(file, onProgress);
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
