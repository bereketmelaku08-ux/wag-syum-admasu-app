import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Download, GraduationCap, Languages, ShieldCheck } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { DownloadSection } from './components/DownloadSection';
import { AdminSection } from './components/AdminSection';
import { TRANSLATIONS } from './i18n';
import type { Locale } from './i18n';
import type { AppView, PublicApk } from './types';

const CREST_IMAGE = '/assets/aistudio/file_00000000aa54821197f0d52e4e3fe801_57393726.png';
const CAMPUS_IMAGE = '/src/assets/images/wag_siyu_campus_1795336223673.jpg';
const LANG_STORAGE_KEY = 'wagsiyum_locale';

function getInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'am';
  } catch {
    return 'am';
  }
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [publishedApps, setPublishedApps] = useState<PublicApk[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Admin Bearer token kept strictly in JS memory
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  const [crestFailed, setCrestFailed] = useState(false);
  const [campusFailed, setCampusFailed] = useState(false);

  const t = TRANSLATIONS[locale];

  const handleLocaleChange = (next: Locale) => {
    setLocale(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `${t.schoolName} — APK Portal`;
  }, [locale, t.schoolName]);

  const fetchPublishedApps = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const res = await fetch('/api/apps');
      const data = (await res.json()) as { apps?: PublicApk[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || t.admin.fetchAppsError);
      }
      setPublishedApps(data.apps || []);
    } catch (err) {
      setAppsError(err instanceof Error ? err.message : t.admin.networkError);
    } finally {
      setLoadingApps(false);
    }
  }, [t.admin.fetchAppsError, t.admin.networkError]);

  useEffect(() => {
    void fetchPublishedApps();
  }, [fetchPublishedApps]);

  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;
  }, []);

  const handleNavigate = (view: AppView, scrollToGuide = false) => {
    setCurrentView(view);
    if (scrollToGuide) {
      window.setTimeout(() => {
        document.getElementById('install-guide')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 md:pb-0 flex flex-col">
      <TopBar currentView={currentView} t={t} onNavigate={handleNavigate} />

      <main className="flex-1">
        {/* Language selector toolbar below header (keeps 3-zone Top Bar Contract clean) */}
        <div className="mx-auto flex max-w-5xl items-center justify-end px-4 pt-4 sm:px-6 sm:pt-5">
          <div
            role="group"
            aria-label={t.langSwitcher.label}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-500">
              <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t.langSwitcher.label}:</span>
            </span>
            <button
              type="button"
              onClick={() => handleLocaleChange('am')}
              aria-pressed={locale === 'am'}
              className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                locale === 'am'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.langSwitcher.amharic}
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              aria-pressed={locale === 'en'}
              className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                locale === 'en'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.langSwitcher.english}
            </button>
          </div>
        </div>

        {currentView === 'home' && (
          <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-5">
            {/* Institutional Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white">
              {!campusFailed && (
                <img
                  src={CAMPUS_IMAGE}
                  alt={t.hero.campusAlt}
                  referrerPolicy="no-referrer"
                  onError={() => setCampusFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover opacity-55"
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/65 to-slate-900/45"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-300/70 bg-blue-950 shadow-lg sm:h-28 sm:w-28">
                  {!crestFailed ? (
                    <img
                      src={CREST_IMAGE}
                      alt={t.hero.crestAlt}
                      referrerPolicy="no-referrer"
                      onError={() => setCrestFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-12 w-12 text-amber-300" aria-hidden="true" />
                  )}
                </div>

                <div className="max-w-2xl space-y-2.5">
                  <p className="text-xs font-medium tracking-wide text-amber-300 sm:text-sm">
                    {t.hero.kicker}
                  </p>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-white [text-wrap:balance] sm:text-4xl">
                    {t.schoolName}
                  </h1>
                  <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                    {t.hero.subtitle}
                  </p>
                </div>
              </div>
            </section>

            {/* Primary Two-Card Portal Grid */}
            <section aria-label={t.cards.ariaSection} className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Card 1: Download Application */}
              <button
                type="button"
                onClick={() => handleNavigate('download')}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all duration-150 hover:border-blue-900/50 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 sm:p-8"
              >
                <div>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-900 transition-colors group-hover:bg-blue-900 group-hover:text-white">
                    <Download className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    <span>{t.cards.downloadTitle}</span>{' '}
                    <span className="text-base font-bold text-blue-900 sm:text-lg">
                      {t.cards.downloadTapHint}
                    </span>
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {t.cards.downloadDesc}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="font-mono text-xs text-slate-500 tabular-nums sm:text-sm">
                    {loadingApps
                      ? t.cards.checkingApps
                      : publishedApps.length === 0
                        ? t.cards.zeroApps
                        : t.cards.readyApps(publishedApps.length)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
                    <span>{t.cards.open}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                </div>
              </button>

              {/* Card 2: Admin Portal */}
              <button
                type="button"
                onClick={() => handleNavigate('admin')}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all duration-150 hover:border-slate-400 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 sm:p-8"
              >
                <div>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                    <ShieldCheck className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {t.cards.adminTitle}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {t.cards.adminDesc}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="text-xs text-slate-500 sm:text-sm">
                    {authToken && adminUsername
                      ? t.cards.adminSignedIn(adminUsername)
                      : t.cards.adminProtected}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
                    <span>{authToken ? t.cards.goToAdmin : t.cards.login}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                </div>
              </button>
            </section>
          </div>
        )}

        {currentView === 'download' && (
          <DownloadSection
            apps={publishedApps}
            loading={loadingApps}
            error={appsError}
            t={t}
            onRefresh={() => void fetchPublishedApps()}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentView === 'admin' && (
          <AdminSection
            authToken={authToken}
            adminUsername={adminUsername}
            t={t}
            onLoginSuccess={(token, user) => {
              setAuthToken(token);
              setAdminUsername(user);
            }}
            onLogout={() => {
              setAuthToken(null);
              setAdminUsername(null);
            }}
            onPublicDataChanged={() => void fetchPublishedApps()}
            onBack={() => handleNavigate('home')}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl space-y-1.5 px-4 sm:px-6">
          <p>{t.footer.copyright(new Date().getFullYear())}</p>
          <p className="font-medium text-slate-700">@ BEREKET MELAKU(BEKI)</p>
        </div>
      </footer>
    </div>
  );
}
