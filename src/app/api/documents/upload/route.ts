import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { verifyAuthToken } from '@/lib/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'text/rtf',
  'image/png',
  'image/jpeg',
  'image/tiff',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'rtf', 'odt', 'txt', 'png', 'jpg', 'jpeg', 'tiff', 'tif']);

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
        { error: `File type not allowed. Allowed types: PDF, DOCX, RTF, ODT, TXT, PNG, JPG, TIFF` },
        { status: 400 }
      );
    }

    const safeDocumentId = sanitizeDocumentId(documentId);
    const safeFileName = sanitizeFileName(`${safeDocumentId}.${extension}`);
    const filePath = `documents/${user.uid}/${safeFileName}`;

    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, buffer, {
      contentType: mimeType,
      customMetadata: {
        originalName: file.name,
        documentId: safeDocumentId,
        userId: user.uid,
      },
    });

    const downloadURL = await getDownloadURL(fileRef);
    
    return NextResponse.json({
      success: true,
      documentId: safeDocumentId,
      fileName: safeFileName,
      mimeType,
      size: file.size,
      storagePath: filePath,
      downloadURL,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}