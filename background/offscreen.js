/**
 * HoneLENS Offscreen Document Handler
 * Handles canvas resizing and image stitching operations off the main thread.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'stitch-canvas') {
    const canvas = document.getElementById('offscreen-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = message.width || 1280;
    canvas.height = message.height || 800;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      sendResponse({ dataUrl: canvas.toDataURL('image/png') });
    };
    img.src = message.dataUrl;
    return true; // asynchronous response
  }
});
