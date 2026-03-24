const PHOTO_DIR = 'photos';

async function getPhotosDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(PHOTO_DIR, { create: true });
}

export async function savePhoto(key: string, blob: Blob): Promise<void> {
  const dir = await getPhotosDir();
  const fileHandle = await dir.getFileHandle(key, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function getPhoto(key: string): Promise<Blob | null> {
  try {
    const dir = await getPhotosDir();
    const fileHandle = await dir.getFileHandle(key);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string): Promise<void> {
  try {
    const dir = await getPhotosDir();
    await dir.removeEntry(key);
  } catch {
    // ignore if not found
  }
}
