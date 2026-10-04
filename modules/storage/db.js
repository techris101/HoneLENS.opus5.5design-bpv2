/**
 * HoneLENS Storage Layer - IndexedDB Client-Side Database
 * Standalone, local-first, zero-cloud storage for US nursing students.
 */

const DB_NAME = 'HoneLENSLibrary';
const DB_VERSION = 1;

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // 1. Sources store
      if (!db.objectStoreNames.contains('sources')) {
        const store = db.createObjectStore('sources', { keyPath: 'id' });
        store.createIndex('doi', 'doi', { unique: false });
        store.createIndex('pmid', 'pmid', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. Clips store
      if (!db.objectStoreNames.contains('clips')) {
        const store = db.createObjectStore('clips', { keyPath: 'id' });
        store.createIndex('sourceId', 'sourceId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 3. Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('sourceId', 'sourceId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 4. Flashcards (Leitner 5-box)
      if (!db.objectStoreNames.contains('cards')) {
        const store = db.createObjectStore('cards', { keyPath: 'id' });
        store.createIndex('box', 'box', { unique: false });
        store.createIndex('nextReview', 'nextReview', { unique: false });
      }

      // 5. Assignments (EBP Builder)
      if (!db.objectStoreNames.contains('assignments')) {
        const store = db.createObjectStore('assignments', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 6. Reading Sheets
      if (!db.objectStoreNames.contains('readingSheets')) {
        const store = db.createObjectStore('readingSheets', { keyPath: 'id' });
        store.createIndex('assignmentId', 'assignmentId', { unique: false });
        store.createIndex('sourceId', 'sourceId', { unique: false });
      }

      // 7. Matrix Rows
      if (!db.objectStoreNames.contains('matrixRows')) {
        const store = db.createObjectStore('matrixRows', { keyPath: 'id' });
        store.createIndex('assignmentId', 'assignmentId', { unique: false });
      }

      // 8. Dosage attempts & mistakes analytics
      if (!db.objectStoreNames.contains('dosageAttempts')) {
        const store = db.createObjectStore('dosageAttempts', { keyPath: 'id' });
        store.createIndex('topic', 'topic', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 9. Local Activity Log
      if (!db.objectStoreNames.contains('activityLog')) {
        const store = db.createObjectStore('activityLog', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'hl_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

// Generic transaction helper
async function tx(storeName, mode, callback) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const req = callback(store);

    transaction.oncomplete = () => resolve(req ? req.result : undefined);
    transaction.onerror = (e) => reject(e.target.error);
  });
}

// Generic CRUD operations
export async function addItem(storeName, item) {
  if (!item.id) item.id = generateUUID();
  if (!item.createdAt) item.createdAt = Date.now();
  item.updatedAt = Date.now();
  await tx(storeName, 'readwrite', (s) => s.put(item));
  
  // Log user activity if appropriate
  if (storeName !== 'activityLog') {
    logActivity('Created ' + storeName.slice(0, -1), item.title || item.id, { store: storeName });
  }
  return item;
}

export async function getItem(storeName, id) {
  return tx(storeName, 'readonly', (s) => s.get(id));
}

export async function updateItem(storeName, item) {
  item.updatedAt = Date.now();
  await tx(storeName, 'readwrite', (s) => s.put(item));
  if (storeName !== 'activityLog') {
    logActivity('Updated ' + storeName.slice(0, -1), item.title || item.id, { store: storeName });
  }
  return item;
}

export async function deleteItem(storeName, id) {
  await tx(storeName, 'readwrite', (s) => s.delete(id));
  if (storeName !== 'activityLog') {
    logActivity('Deleted ' + storeName.slice(0, -1), id, { store: storeName });
  }
  return true;
}

export async function getAllItems(storeName) {
  return tx(storeName, 'readonly', (s) => s.getAll());
}

export async function getByIndex(storeName, indexName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Activity Logging (Local Only)
export async function logActivity(action, target, details = {}) {
  try {
    const entry = {
      id: generateUUID(),
      action,
      target: target ? String(target).slice(0, 100) : '',
      details,
      timestamp: Date.now()
    };
    await tx('activityLog', 'readwrite', (s) => s.put(entry));
  } catch (err) {
    console.warn('Could not log activity:', err);
  }
}

// Universal Normalized Search
export async function searchLibrary(query, filterStore = null) {
  if (!query || !query.trim()) {
    const stores = filterStore ? [filterStore] : ['sources', 'clips', 'notes', 'cards', 'assignments'];
    const results = {};
    for (const st of stores) {
      results[st] = await getAllItems(st);
    }
    return results;
  }

  const q = query.trim().toLowerCase();
  const stores = filterStore ? [filterStore] : ['sources', 'clips', 'notes', 'cards', 'assignments'];
  const results = {};

  for (const st of stores) {
    const all = await getAllItems(st);
    results[st] = all.filter((item) => {
      const serialized = JSON.stringify(item).toLowerCase();
      return serialized.includes(q);
    });
  }

  return results;
}

// Wipe all data (for user privacy & testing)
export async function clearAllData() {
  const stores = ['sources', 'clips', 'notes', 'cards', 'assignments', 'readingSheets', 'matrixRows', 'dosageAttempts', 'activityLog'];
  const db = await getDB();
  for (const st of stores) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([st], 'readwrite');
      transaction.objectStore(st).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }
  logActivity('Cleared all library data', 'Full reset');
  return true;
}
