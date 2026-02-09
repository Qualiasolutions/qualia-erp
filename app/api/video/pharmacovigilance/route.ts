import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const VIDEO_PATH = '/home/qualia/Downloads/AI in Pediatric Pharmacovigilance_1080p_caption (3).mp4';

export async function GET(request: Request) {
  try {
    const videoPath = VIDEO_PATH;

    // Get file stats
    const stats = await stat(videoPath);
    const fileSize = stats.size;
    const range = request.headers.get('range');

    if (range) {
      // Handle range request for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0]!, 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(videoPath, { start, end });

      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    }

    // No range, serve whole file
    const stream = createReadStream(videoPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      },
    });
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
}
