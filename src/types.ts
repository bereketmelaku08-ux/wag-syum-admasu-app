export type AppView = 'home' | 'download' | 'admin';

export interface PublicApk {
  id: string;
  appName: string;
  version: string;
  description: string;
  originalFilename: string;
  sizeBytes: number;
  publishedAt: string | null;
  downloadCount: number;
}

export interface AdminApk extends PublicApk {
  status: 'staged' | 'published';
  uploadedAt: string;
}
