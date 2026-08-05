export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Extracts Google Drive Folder ID from a URL or raw ID string.
 * Example: https://drive.google.com/drive/folders/1TPg14mpTyGvRSpHM2_VsFegSnk6Yu5YA?usp=sharing
 * Returns: 1TPg14mpTyGvRSpHM2_VsFegSnk6Yu5YA
 */
export function extractFolderId(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  const idMatch = trimmed.match(/^([a-zA-Z0-9_-]{15,})$/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return null;
}

/**
 * List files from a target Google Drive folder or root.
 */
export async function listDriveFiles(
  folderUrlOrId: string,
  accessToken: string
): Promise<DriveFileItem[]> {
  const folderId = extractFolderId(folderUrlOrId);
  let q = "trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }

  const queryParams = new URLSearchParams({
    q,
    fields: "files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Échec de la récupération des fichiers Google Drive (${response.status})`
    );
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Upload a JSON or CSV file to Google Drive (in target folder if provided).
 */
export async function uploadDriveFile(
  fileName: string,
  content: string,
  mimeType: string,
  folderUrlOrId: string,
  accessToken: string
): Promise<DriveFileItem> {
  const folderId = extractFolderId(folderUrlOrId);
  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " +
    mimeType +
    "\r\n\r\n" +
    content +
    closeDelimiter;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Échec de l'envoi du fichier sur Google Drive (${response.status})`
    );
  }

  return await response.json();
}

/**
 * Download text content of a file from Google Drive.
 */
export async function downloadDriveFile(
  fileId: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Échec de téléchargement du fichier depuis Google Drive (${response.status})`
    );
  }

  return await response.text();
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteDriveFile(
  fileId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(
      `Échec de la suppression du fichier sur Google Drive (${response.status})`
    );
  }
}
