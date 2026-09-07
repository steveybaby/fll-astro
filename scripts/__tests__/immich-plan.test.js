import { describe, it, expect } from 'vitest';
import { planAssetDownload } from '../immich.js';

describe('planAssetDownload', () => {
  it('pulls Immich preview JPEG for a HEIC image (local libheif cannot decode HEVC)', () => {
    const plan = planAssetDownload({ id: 'a1', type: 'IMAGE', originalFileName: 'IMG_5235.HEIC' });
    expect(plan).toEqual({
      path: '/api/assets/a1/thumbnail?size=preview',
      outName: 'IMG_5235.jpg',
    });
  });

  it('treats HEIF the same as HEIC', () => {
    const plan = planAssetDownload({ id: 'a2', type: 'IMAGE', originalFileName: 'pic.heif' });
    expect(plan.path).toBe('/api/assets/a2/thumbnail?size=preview');
    expect(plan.outName).toBe('pic.jpg');
  });

  it('downloads the original for a normal JPEG image', () => {
    const plan = planAssetDownload({ id: 'b1', type: 'IMAGE', originalFileName: 'camphoto_1.jpg' });
    expect(plan).toEqual({
      path: '/api/assets/b1/original',
      outName: 'camphoto_1.jpg',
    });
  });

  it('pulls the Immich playback stream + poster for a video (box has no ffmpeg/HEVC)', () => {
    const plan = planAssetDownload({ id: 'c1', type: 'VIDEO', originalFileName: 'IMG_5197.MOV' });
    expect(plan).toEqual({
      path: '/api/assets/c1/video/playback',
      outName: 'IMG_5197.mp4',
      posterPath: '/api/assets/c1/thumbnail?size=preview',
    });
  });
});
