import { ArrowLeft, CheckCircle2, Download, FileArchive, RefreshCw, Smartphone } from 'lucide-react';
import type { PublicApk } from '../types';
import type { Translations } from '../i18n';
import { formatBytes, formatDateShort } from '../utils/format';

interface DownloadSectionProps {
  apps: PublicApk[];
  loading: boolean;
  error: string | null;
  t: Translations;
  onRefresh: () => void;
  onBack: () => void;
}

export function DownloadSection({
  apps,
  loading,
  error,
  t,
  onRefresh,
  onBack,
}: DownloadSectionProps) {
  const handleDownloadClick = (appId: string) => {
    window.setTimeout(() => {
      onRefresh();
    }, 1200);
    const link = document.createElement('a');
    link.href = `/api/apps/${encodeURIComponent(appId)}/download`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t.download.backHome}</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{t.download.refresh}</span>
        </button>
      </div>

      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t.download.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t.download.subtitle}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading && apps.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">{t.download.loading}</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Smartphone className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {t.download.emptyTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            {t.download.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <article
              key={app.id}
              className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
                    <FileArchive className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                      {app.appName}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 sm:text-sm">
                      <span className="font-mono tabular-nums">v{app.version}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatBytes(app.sizeBytes)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[220px] font-mono">{app.originalFilename}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateShort(app.publishedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{t.download.downloadsCount(app.downloadCount)}</span>
                    </div>
                  </div>
                </div>

                {app.description && (
                  <p className="pl-[62px] text-sm leading-relaxed text-slate-600">
                    {app.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 sm:pl-4">
                <button
                  type="button"
                  onClick={() => handleDownloadClick(app.id)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t.download.downloadBtn}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Clear Android APK Installation Guide */}
      <div id="install-guide" className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">
            {t.download.guideTitle}
          </h3>
        </div>
        <ol className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <li className="space-y-1">
            <span className="font-mono text-xs font-semibold text-blue-900">{t.download.step1Label}</span>
            <p className="leading-relaxed">{t.download.step1Text}</p>
          </li>
          <li className="space-y-1">
            <span className="font-mono text-xs font-semibold text-blue-900">{t.download.step2Label}</span>
            <p className="leading-relaxed">{t.download.step2Text}</p>
          </li>
          <li className="space-y-1">
            <span className="font-mono text-xs font-semibold text-blue-900">{t.download.step3Label}</span>
            <p className="leading-relaxed">{t.download.step3Text}</p>
          </li>
        </ol>
      </div>
    </section>
  );
}
