import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import 'dotenv/config';

const videoPath = '/home/qualia/Downloads/AI in Pediatric Pharmacovigilance_1080p_caption (3).mp4';
const videoData = readFileSync(videoPath);

async function upload() {
  const blob = await put('pharmacovigilance.mp4', videoData, {
    access: 'public',
    contentType: 'video/mp4',
  });

  console.log('Video URL:', blob.url);
  console.log('Video player URL:', 'https://qualia-erp.vercel.app/video-player/pharmacovigilance');
}

upload().catch(console.error);
