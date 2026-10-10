import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import { verifyAuthToken } from '@/lib/auth';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/tiff',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'tiff', 'tif']);

function sanitizeDocumentId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 100);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    
    if (!file || !documentId) {
      return NextResponse.json(
        { error: 'Missing file or document ID' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedType = await fileTypeFromBuffer(buffer);
    const mimeType = detectedType?.mime || file.type;
    const extension = detectedType?.ext || file.name.split('.').pop()?.toLowerCase() || 'bin';

    if (!ALLOWED_MIME_TYPES.has(mimeType) || !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: PDF, DOCX, TXT, PNG, JPG, TIFF` },
        { status: 400 }
      );
    }

    const uploadDir = join(process.cwd(), 'uploads');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const safeDocumentId = sanitizeDocumentId(documentId);
    const safeFileName = sanitizeFileName(`${safeDocumentId}.${extension}`);
    
    const resolvedUploadDir = join(process.cwd(), 'uploads');
    const resolvedFilePath = join(resolvedUploadDir, safeFileName);
    
    if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }
    
    await writeFile(resolvedFilePath, buffer);
    
    return NextResponse.json({
      success: true,
      documentId: safeDocumentId,
      fileName: safeFileName,
      mimeType,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}