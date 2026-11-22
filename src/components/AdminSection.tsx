import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileArchive,
  Lock,
  LogOut,
  Rocket,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AdminApk } from '../types';
import type { Translations } from '../i18n';
import { formatBytes, formatDateShort } from '../utils/format';

interface AdminSectionProps {
  authToken: string | null;
  adminUsername: string | null;
  t: Translations;
  onLoginSuccess: (token: string, username: string) => void;
  onLogout: () => void;
  onPublicDataChanged: () => void;
  onBack: () => void;
}

export function AdminSection({
  authToken,
  adminUsername,
  t,
  onLoginSuccess,
  onLogout,
  onPublicDataChanged,
  onBack,
}: AdminSectionProps) {
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin workspace state
  const [apps, setApps] = useState<AdminApk[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Upload workflow state (File select -> Upload 1%-100% -> Publish)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [readyToPublishApp, setReadyToPublishApp] = useState<AdminApk | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAdminApps = useCallback(async () => {
    if (!authToken) return;
    setLoadingApps(true);
    setWorkspaceError(null);
    try {
      const res = await fetch('/api/admin/apps', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as { apps?: AdminApk[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || t.admin.fetchAppsError);
      }
      setApps(data.apps || []);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : t.admin.unknownError);
    } finally {
      setLoadingApps(false);
    }
  }, [authToken, onLogout, t.admin.fetchAppsError, t.admin.unknownError]);

  useEffect(() => {
    if (authToken) {
      void fetchAdminApps();
    }
  }, [authToken, fetchAdminApps]);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!username.trim() || !password) {
      setLoginError(t.admin.missingCredsError);
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { token?: string; username?: string; error?: string };
      if (!res.ok || !data.token || !data.username) {
        throw new Error(data.error || t.admin.loginFailedError);
      }
      setPassword('');
      onLoginSuccess(data.token, data.username);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t.admin.loginFailedError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWorkspaceError(null);
    setStatusMessage(null);
    setReadyToPublishApp(null);
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setWorkspaceError(t.admin.onlyApkError);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    setUploadedBytes(0);
    const cleanName = file.name.replace(/\.apk$/i, '').replace(/[_-]+/g, ' ').trim();
    setAppName(cleanName || t.admin.defaultAppName);
  };

  const handleStartUpload = () => {
    if (!selectedFile || !authToken || uploading) return;

    setWorkspaceError(null);
    setStatusMessage(null);
    setReadyToPublishApp(null);
    setUploading(true);
    setUploadProgress(1);
    setUploadedBytes(0);

    const formData = new FormData();
    formData.append('apk', selectedFile);
    formData.append('appName', appName.trim() || selectedFile.name.replace(/\.apk$/i, ''));
    formData.append('version', version.trim() || '1.0');
    formData.append('description', description.trim());

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload', true);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.max(1, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        setUploadProgress(pct);
        setUploadedBytes(event.loaded);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 401) {
        onLogout();
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText) as { app?: AdminApk; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.app) {
          setUploadProgress(100);
          setUploadedBytes(selectedFile.size);
          setReadyToPublishApp(data.app);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          void fetchAdminApps();
        } else {
          setWorkspaceError(data.error || t.admin.unknownError);
        }
      } catch {
        setWorkspaceError(t.admin.serverParseError);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setWorkspaceError(t.admin.networkError);
    };

    xhr.send(formData);
  };

  const handlePublishApp = async (id: string) => {
    if (!authToken) return;
    setPublishingId(id);
    setWorkspaceError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(id)}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as { app?: AdminApk; error?: string };
      if (!res.ok || !data.app) {
        throw new Error(data.error || t.admin.unknownError);
      }
      setReadyToPublishApp(null);
      setStatusMessage(t.admin.publishedSuccess(data.app.appName));
      await fetchAdminApps();
      onPublicDataChanged();
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : t.admin.unknownError);
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublishApp = async (id: string) => {
    if (!authToken) return;
    setPublishingId(id);
    setWorkspaceError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(id)}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || t.admin.unknownError);
      }
      setStatusMessage(t.admin.unpublishedSuccess);
      await fetchAdminApps();
      onPublicDataChanged();
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : t.admin.unknownError);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!authToken) return;
    setPublishingId(id);
    setWorkspaceError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || t.admin.unknownError);
      }
      setConfirmDeleteId(null);
      if (readyToPublishApp?.id === id) setReadyToPublishApp(null);
      setStatusMessage(t.admin.deletedSuccess);
      await fetchAdminApps();
      onPublicDataChanged();
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : t.admin.unknownError);
    } finally {
      setPublishingId(null);
    }
  };

  // Unauthenticated Admin Login Screen
  if (!authToken) {
    return (
      <section className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10">
        <div className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t.admin.backHome}</span>
          </button>
        </div>

        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t.admin.loginTitle}</h1>
              <p className="text-xs text-slate-500">{t.schoolName}</p>
            </div>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            {t.admin.loginDesc}
          </p>

          {loginError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-slate-800">
                {t.admin.usernameLabel}
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.admin.usernamePlaceholder}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-slate-800">
                {t.admin.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.admin.passwordPlaceholder}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.admin.hidePassword : t.admin.showPassword}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2"
            >
              {loginLoading ? t.admin.verifying : t.admin.loginBtn}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Authenticated Admin Workspace
  return (
    <section className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t.admin.backHome}</span>
        </button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {t.admin.adminLabel}: <strong className="font-semibold text-slate-900">{adminUsername}</strong>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t.admin.logout}</span>
          </button>
        </div>
      </div>

      {workspaceError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{workspaceError}</span>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Upload & Publish Panel */}
      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {t.admin.uploadTitle}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t.admin.uploadDesc}
          </p>
        </div>

        {/* Hidden file input targeting Android/desktop storage */}
        <input
          ref={fileInputRef}
          id="apk-file-input"
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          onChange={handleFileChange}
          className="sr-only"
        />

        {/* Step 1: Select APK from internal storage */}
        {!selectedFile && !uploading && !readyToPublishApp && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center transition-colors hover:border-blue-800 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900 text-white">
              <Upload className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="text-base font-bold text-slate-900 sm:text-lg">
              {t.admin.pickFileTitle}
            </span>
            <span className="mt-1.5 text-sm text-slate-500">
              {t.admin.pickFileHint}
            </span>
          </button>
        )}

        {/* Step 2: File selected -> Review & Tap Upload */}
        {selectedFile && !uploading && !readyToPublishApp && (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white">
                  <FileArchive className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-slate-900">
                    {selectedFile.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500 tabular-nums">
                    {t.admin.sizePrefix} {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
              >
                {t.admin.changeFile}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="apk-app-name" className="mb-1.5 block text-sm font-medium text-slate-800">
                  {t.admin.appNameLabel}
                </label>
                <input
                  id="apk-app-name"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>
              <div>
                <label htmlFor="apk-version" className="mb-1.5 block text-sm font-medium text-slate-800">
                  {t.admin.versionLabel}
                </label>
                <input
                  id="apk-version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="apk-desc" className="mb-1.5 block text-sm font-medium text-slate-800">
                {t.admin.descLabel}
              </label>
              <input
                id="apk-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.admin.descPlaceholder}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleStartUpload}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 active:scale-[0.98]"
              >
                <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.admin.uploadBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
              >
                {t.admin.cancelBtn}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Real 1% to 100% upload progress */}
        {uploading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-6">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {t.admin.uploadingTitle}
                </p>
                {selectedFile && (
                  <p className="mt-0.5 font-mono text-xs text-slate-600 tabular-nums">
                    {formatBytes(uploadedBytes)} / {formatBytes(selectedFile.size)}
                  </p>
                )}
              </div>
              <span className="font-mono text-3xl font-bold text-blue-900 tabular-nums">
                {uploadProgress}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={1}
              aria-valuemax={100}
              className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full origin-left bg-blue-900 transition-transform duration-150 ease-out"
                style={{ transform: `scaleX(${uploadProgress / 100})` }}
              />
            </div>

            <div className="mt-2 flex justify-between font-mono text-xs text-slate-500 tabular-nums">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Step 4: 100% Complete -> Prominent Publish button */}
        {readyToPublishApp && !uploading && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {t.admin.uploadCompleteBadge}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {readyToPublishApp.appName}
                </h2>
                <p className="text-sm text-slate-700">
                  {t.admin.publishPrompt}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled={publishingId === readyToPublishApp.id}
                  onClick={() => handlePublishApp(readyToPublishApp.id)}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white whitespace-nowrap transition-colors hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60"
                >
                  <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {publishingId === readyToPublishApp.id ? t.admin.publishingBtn : t.admin.publishBtn}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReadyToPublishApp(null);
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
                >
                  {t.admin.uploadAnotherBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded & Published APKs List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {t.admin.listTitle(apps.length)}
          </h2>
          {loadingApps && <span className="text-xs text-slate-500">{t.admin.refreshing}</span>}
        </div>

        {apps.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t.admin.listEmpty}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">{app.appName}</h3>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    {app.status === 'published' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.admin.statusPublished}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.admin.statusStaged}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">v{app.version}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatBytes(app.sizeBytes)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{app.originalFilename}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateShort(app.uploadedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{t.admin.downloadsShort(app.downloadCount)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {app.status === 'staged' ? (
                    <button
                      type="button"
                      disabled={publishingId === app.id}
                      onClick={() => handlePublishApp(app.id)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.admin.publishBtn}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={publishingId === app.id}
                      onClick={() => handleUnpublishApp(app.id)}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 disabled:opacity-60"
                    >
                      {t.admin.unpublishBtn}
                    </button>
                  )}

                  {confirmDeleteId === app.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={publishingId === app.id}
                        onClick={() => handleDeleteApp(app.id)}
                        className="inline-flex min-h-[44px] items-center rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-red-700 disabled:opacity-60"
                      >
                        {t.admin.confirmDeleteYes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50"
                      >
                        {t.admin.confirmDeleteNo}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(app.id)}
                      aria-label={`${app.appName} ${t.admin.deleteBtn}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 whitespace-nowrap hover:border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.admin.deleteBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
