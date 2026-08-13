import { ExtractedMatchRecord } from "../types";

const DB_NAME = "SportyAnalyzerDB";
const DB_VERSION = 1;
const STORE_NAME = "extracted_matches";

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("categoryId", "categoryId", { unique: false });
        store.createIndex("roundNumber", "roundNumber", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function loadExtractedDatabaseFromIndexedDB(): Promise<ExtractedMatchRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve((req.result as ExtractedMatchRecord[]) || []);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (error) {
    console.error("Failed to load extracted database from IndexedDB:", error);
    // Fallback to localStorage if any
    try {
      const fallback = localStorage.getItem("sporty_extracted_database_cache");
      if (fallback) {
        return JSON.parse(fallback);
      }
    } catch {
      // ignore
    }
    return [];
  }
}

export async function saveExtractedDatabaseToIndexedDB(records: ExtractedMatchRecord[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.clear();
      records.forEach((record) => {
        store.put(record);
      });

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("Failed to save to IndexedDB:", error);
    // Fallback save to localStorage if small
    try {
      if (records.length <= 1000) {
        localStorage.setItem("sporty_extracted_database_cache", JSON.stringify(records));
      }
    } catch {
      // ignore
    }
  }
}

export async function clearExtractedDatabaseInIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        try {
          localStorage.removeItem("sporty_extracted_database_cache");
        } catch {
          // ignore
        }
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear IndexedDB:", error);
  }
}
