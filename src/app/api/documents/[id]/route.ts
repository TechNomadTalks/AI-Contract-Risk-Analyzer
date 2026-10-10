import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { readFile, access, unlink } from 'fs/promises';
import { verifyAuthToken } from '@/lib/auth';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'tiff', 'tif'] as const;
type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

const MIME_TYPES: Record<AllowedExtension, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

function sanitizeDocumentId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 100);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const safeId = sanitizeDocumentId(id);
    
    if (safeId !== id) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const uploadDir = resolve(process.cwd(), 'uploads');
    
    for (const ext of ALLOWED_EXTENSIONS) {
      const fileName = `${safeId}.${ext}`;
      const filePath = resolve(uploadDir, fileName);
      
      if (!filePath.startsWith(uploadDir)) {
        continue;
      }
      
      try {
        await access(filePath);
        const buffer = await readFile(filePath);
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch {
        continue;
      }
    }
    
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('File retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const safeId = sanitizeDocumentId(id);
    
    if (safeId !== id) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const uploadDir = resolve(process.cwd(), 'uploads');
    let deleted = false;
    
    for (const ext of ALLOWED_EXTENSIONS) {
      const fileName = `${safeId}.${ext}`;
      const filePath = resolve(uploadDir, fileName);
      
      if (!filePath.startsWith(uploadDir)) {
        continue;
      }
      
      try {
        await access(filePath);
        await unlink(filePath);
        deleted = true;
      } catch {
        continue;
      }
    }
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}