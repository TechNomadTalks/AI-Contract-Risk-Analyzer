import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, access } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const uploadDir = join(process.cwd(), 'uploads');
    
    const extensions = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'tiff', 'tif'];
    
    for (const ext of extensions) {
      const filePath = join(uploadDir, `${id}.${ext}`);
      try {
        await access(filePath);
        const buffer = await readFile(filePath);
        
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          txt: 'text/plain',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          tiff: 'image/tiff',
          tif: 'image/tiff',
        };
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
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
