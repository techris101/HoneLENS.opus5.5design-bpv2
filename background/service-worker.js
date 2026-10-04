/**
 * HoneLENS Background Service Worker (Manifest V3)
 * Orchestrates side panel behavior, context menus, and periodic license validation.
 */

import { revalidate } from '../modules/license/license.js';

// Open side panel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  // Set side panel to open on action button click
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Could not set side panel behavior:', err);
    });
  }

  // Create context menus
  chrome.contextMenus.create({
    id: 'honelens_open',
    title: 'Open HoneLENS Side Panel',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'honelens_clip',
    title: 'Clip Selection to HoneLENS',
    contexts: ['selection']
  });

  // Daily license revalidation alarm
  chrome.alarms.create('license_revalidate', { periodInMinutes: 1440 });
});

// Context menu click handling
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'honelens_open') {
    if (chrome.sidePanel && chrome.sidePanel.open && tab) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    }
  } else if (info.menuItemId === 'honelens_clip') {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'clip_selected_text' }).catch(() => {});
      // Open panel if not open
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    }
  }
});

// Periodic license check
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'license_revalidate') {
    revalidate().catch(() => {});
  }
});

chrome.runtime.onStartup.addListener(() => {
  revalidate().catch(() => {});
});
