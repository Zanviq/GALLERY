// Seal impressions are drawn here, off the main thread, so a stamp never costs the tray a frame.
// Message in: { id, o } (the options of makeImpression); out: { id, bmp } (an ImageBitmap).
import { makeImpression } from './ink.js';

self.onmessage = (e) => {
  const { id, o } = e.data;
  try {
    const { canvas } = makeImpression(o);
    const bmp = canvas.transferToImageBitmap();
    self.postMessage({ id, bmp }, [bmp]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
