import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'rtf', 'odt', 'txt', 'png', 'jpg', 'jpeg', 'tiff', 'tif'] as const;

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

    // Find the file by checking each possible extension
    for (const ext of ALLOWED_EXTENSIONS) {
      const fileName = `${safeId}.${ext}`;
      const filePath = `documents/${user.uid}/${fileName}`;
      const fileRef = ref(storage, filePath);
      
      try {
        const downloadURL = await getDownloadURL(fileRef);
        // Fetch the file and stream it
        const response = await fetch(downloadURL);
        if (!response.ok) continue;
        
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
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

    let deleted = false;
    
    for (const ext of ALLOWED_EXTENSIONS) {
      const fileName = `${safeId}.${ext}`;
      const filePath = `documents/${user.uid}/${fileName}`;
      const fileRef = ref(storage, filePath);
      
      try {
        await deleteObject(fileRef);
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