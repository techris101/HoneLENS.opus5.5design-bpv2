/**
 * Q1 & Q2: Source Clipper & Page Capture Module
 * Saves excerpts and visible screenshots locally to IndexedDB.
 */

import { addItem, logActivity } from '../storage/db.js';

export async function clipSelection(sourceId = null, tags = []) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active browser tab found.');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection().toString().trim();
        return {
          text: selection,
          title: document.title,
          url: window.location.href
        };
      }
    });

    if (!result || !result.text) {
      return { ok: false, message: 'No text was selected on the active page.' };
    }

    // Generate scroll-to-text fragment if URL permits
    const encodedFragment = encodeURIComponent(result.text.slice(0, 100));
    const urlWithFragment = result.url.includes('#') ? result.url : `${result.url}#:~:text=${encodedFragment}`;

    const clip = {
      sourceId,
      text: result.text,
      title: result.title,
      url: urlWithFragment,
      tags: tags || [],
      createdAt: Date.now()
    };

    const saved = await addItem('clips', clip);
    logActivity('Saved clip', result.text.slice(0, 50));
    return { ok: true, clip: saved };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export async function captureVisiblePage(sourceId = null) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active browser tab found.');

    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const clip = {
      sourceId,
      text: `[Page Screenshot] ${tab.title || 'Web Page'}`,
      title: tab.title,
      url: tab.url,
      screenshot: dataUrl,
      tags: ['screenshot'],
      createdAt: Date.now()
    };

    const saved = await addItem('clips', clip);
    logActivity('Captured visible tab', tab.title);
    return { ok: true, clip: saved };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
