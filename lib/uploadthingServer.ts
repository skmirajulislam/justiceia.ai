import { UTApi } from 'uploadthing/server';

export function extractUploadThingKey(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        if (url.includes('/f/')) {
            return url.split('/f/')[1].split('?')[0];
        }
        const segments = url.split('/');
        const last = segments[segments.length - 1];
        return last ? last.split('?')[0] : null;
    } catch {
        return null;
    }
}

export async function deleteUploadThingFiles(urlsOrKeys: (string | null | undefined)[]): Promise<void> {
    const keys = urlsOrKeys
        .map(item => (item && !item.includes('http') ? item : extractUploadThingKey(item)))
        .filter((k): k is string => Boolean(k && k.length > 3));

    if (keys.length === 0) return;

    try {
        const utapi = new UTApi();
        await utapi.deleteFiles(keys);
        console.log(`Deleted ${keys.length} file(s) from UploadThing storage:`, keys);
    } catch (error) {
        console.warn('Failed to delete UploadThing files:', error);
    }
}
