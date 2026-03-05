import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    
    if (!file || !documentId) {
      return NextResponse.json(
        { error: 'Missing file or document ID' },
        { status: 400 }
      );
    }
    
    const uploadDir = join(process.cwd(), 'uploads');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${documentId}.${ext}`;
    const filePath = join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);
    
    return NextResponse.json({
      success: true,
      documentId,
      fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
