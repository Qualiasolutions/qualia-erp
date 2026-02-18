import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createReadStream } from 'fs';

const VIDEO_PATH = '/home/qualia/Downloads/AI in Pediatric Pharmacovigilance_1080p_caption (3).mp4';

export async function POST() {
  try {
    const videoPath = VIDEO_PATH;

    const stream = createReadStream(videoPath);

    const blob = await put('pharmacovigilance.mp4', stream as unknown as ReadableStream, {
      access: 'public',
      contentType: 'video/mp4',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
