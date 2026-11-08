const DB_NAME = "MAX_SOVEREIGN_KEYSTORE";
const KEY_ALIAS = "sovereign_session_key";
const STORE_NAME = "keys";

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open the sovereign key store."));
    request.onblocked = () => reject(new Error("The sovereign key store upgrade is blocked by another tab."));
  });
}

/** Retrieves the browser's non-extractable P-256 signing key, creating it once when needed. */
export async function getOrCreateSessionKeyPair(): Promise<CryptoKeyPair> {
  const db = await openKeyStore();
  try {
    const existing = await new Promise<CryptoKeyPair | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY_ALIAS);
      request.onsuccess = () => resolve(request.result as CryptoKeyPair | undefined);
      request.onerror = () => reject(request.error ?? new Error("Unable to read the signing key."));
    });
    if (existing) return existing;

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign", "verify"],
    );
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(keyPair, KEY_ALIAS);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Unable to persist the signing key."));
      tx.onabort = () => reject(tx.error ?? new Error("Persisting the signing key was aborted."));
    });
    return keyPair;
  } finally {
    db.close();
  }
}

export async function getSovereignPublicKeyHex(keyPair: CryptoKeyPair): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  return toHex(new Uint8Array(exported));
}

export async function signPayload(payload: object, privateKey: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data,
  );
  return toHex(new Uint8Array(signature));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
