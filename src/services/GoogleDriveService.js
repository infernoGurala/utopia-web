/**
 * GoogleDriveService.js
 * 
 * Provides real-time Google Drive folder tree navigation and note fetching
 * using the service account and Web Crypto API.
 */

const SERVICE_ACCOUNT = {
  client_email: "utopia-drive-reader@seventh-sensor-506706-k7.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDU4ysDrPhD3rDI\nVb6uKzRIurQIZHFxzEy/gCQzSKnTTxL5Jv0AX/qk4gHmLbcBh5q9F8LB+X+8YjZ9\nPqLmCUWGvsj1zOkmMU8a9q1JFqxBQyZ0Redvj2YkwNQ3U1NDueg+fw7fN///5U1O\nURuMQ0RPl8yJ2tYqBbxyTOAsMQbpiXNG95NjQ8+srTlDwIC/nOZPCzJPrYsrOUYn\nC0ngYJ4m2BkPQYF+M8Uou+Mo9HNDxUkPS13yFjBnuEcRYeNutkRF2K9Y8BBIIRTf\ntUp4q+9CQYPH/IDl9L1RK4tTs3LtHYet8/RyxLZmKnO5Xu3ntrz85cpR49MG1sYd\nVYZGVw7lAgMBAAECggEAJWD5pXySXsBUA+jiQQx+8qItiCeyr4tyklE6ifKhNuP0\nbeDFnXI8vQSd1r+CGXeo2Li6TnqzTe1kqdr8mS1Zks4e1OG0sisIO7DCPkoH1rGm\np9W6TCE+iwd8e3Za8VJMD+UZRGI9xb2KNE0TbC5HaT47AJ126wv0yZDr73ZwQ0K3\nzaFkTH0JtqtqmAMfO4B7Pt+zbQ8XvwxQoHEmh0wI8ta+jN2XKpsTdPFMPC/8AfyX\ngewvkMm4m3AmXQ64wgNV8H/uqJ1wB7FfUeLKuzD0cMrZ6FIVrMPBLb3J+aDL0OAY\nKZPc4outYGMIPYAeczxdAvTfgybbCF+kWI+FxNQw5QKBgQD8AkwqwN7/iwWnN+l7\nT/t/XRH5Qq0eLBg7iKiKHUB1ZUYHT9s14okhoDyODd8g98+VLCGXM827shbKavNF\nks5fh7OTXbkT2SeymyM5TNHBAMVxTo+8vnGMoCgSm3YueukpB3CGPI3JFWoxQz+u\nxAozzDvggVq7ifwSn82fjqqOawKBgQDYQkM0LYVmnm/beaMGFu/OrTVOZC1qCNmL\nubAroSnl59109QjmfVaK4ftKZN9vIUD6BZB7PIe9ofg2HxmGU8W5AhdVrb9ZC9TD\ntJVYkDeJ5e4vdXFZaj6xIvFeWOokN5AHIwJGRMvaNBwPdWylbLdSAnVmMueu65By\nH4nwz1iL7wKBgQClWfiSANUQxS4jZvtKjtNM4UteypH+fx4zSdqULNdTb+y/9XS2\n6Xni11mEN7PU1OSeU0ODC1mNMy/jBsOyPb4tTkPUiKVcUZrLhSFagn4KbjAexVZo\nmGi2xYslkl2756e+5QO/AFJjwypXQnGxgS3UiMgs6ZMYBFSh/7qSW7CrGwKBgQDJ\nzJNvhibcim3wzMGedhrSrnh2rS5fquBt7RmCrQIu4j2Z3OmwQzdVo+hdFGIXDl3W\nsQiQpvw3rYOz5TNpUJTJvjTOI7LRwiOJd+KA4RqiWGf560qZWHYlz2iSVMAwiZSh\nxD5kGeBrvoKMvlNizl8GbPrmIgxmArUoeVu71ZBYCwKBgQCK2eqBhtnU5itd57K9\nwboXhvcR0uJqEU0aP04dN9nFpaRroOHmiXWAoJzQ4WG+TKNumBMi9UWMegJSjvHP\nQgrLBx3MWBeybcn7WUlaZWWhuS0PiEoATfXVah6OdPU+OJgKv4ShL3nuxUU5ytKd\nINay/5ufqLvUEveCLzkeFkZqrA==\n-----END PRIVATE KEY-----\n"
};

export const ROOT_FOLDER_ID = "14CISCXb1IXYXr5z9DbGIGAcgMelsxfAp";

let cachedToken = null;
let tokenExpiresAt = 0;

// Helper: Convert PEM string to ArrayBuffer (PKCS#8)
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } else {
    // Node.js fallback
    return Buffer.from(b64, 'base64');
  }
}

// Helper: Base64Url encode ArrayBuffer
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof window !== 'undefined' && typeof window.btoa === 'function'
    ? window.btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function stringToBase64Url(str) {
  const encoded = new TextEncoder().encode(str);
  return arrayBufferToBase64Url(encoded);
}

/**
 * Get a valid Google OAuth2 Access Token for Drive API (Cached for ~55 mins)
 */
export async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiresAt - 300) {
    return cachedToken;
  }

  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : globalThis.crypto;
  const subtle = cryptoObj?.subtle;

  if (!subtle) {
    throw new Error("Web Crypto API is not supported in this browser environment.");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedClaimSet = stringToBase64Url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const binaryKey = pemToArrayBuffer(SERVICE_ACCOUNT.private_key);
  const cryptoKey = await subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64Url = arrayBufferToBase64Url(signature);
  const jwt = `${signatureInput}.${signatureB64Url}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google Drive token exchange failed: ${data.error_description || JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600);
  return cachedToken;
}

export class GoogleDriveService {
  static getRootFolderId() {
    return ROOT_FOLDER_ID;
  }

  /**
   * List files and folders inside a specific parent folder in Google Drive
   * @param {string} folderId 
   */
  static async getDirectoryContents(folderId = ROOT_FOLDER_ID) {
    const token = await getAccessToken();
    const cleanId = (folderId || ROOT_FOLDER_ID).trim();
    
    const query = encodeURIComponent(`'${cleanId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)&orderBy=folder,name&pageSize=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to fetch Drive directory contents.");
    }

    const files = data.files || [];

    // Map to Utopia web item structure
    return files.map(file => {
      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
      return {
        id: file.id,
        name: file.name,
        type: isFolder ? 'dir' : 'file',
        mimeType: file.mimeType,
        updated_at: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
        parentId: cleanId
      };
    });
  }

  /**
   * Fetch raw file content (Markdown, text, etc.)
   * @param {string} fileId 
   */
  static async getFileContent(fileId) {
    if (!fileId) return '';
    const token = await getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to load file content (${res.status} ${res.statusText})`);
    }

    return await res.text();
  }

  /**
   * Fetch file metadata
   * @param {string} fileId 
   */
  static async getFileMetadata(fileId) {
    if (!fileId) return null;
    const token = await getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,size,webViewLink`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return null;
    return await res.json();
  }
}
