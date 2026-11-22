import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Download, GraduationCap, ShieldCheck } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { DownloadSection } from './components/DownloadSection';
import { AdminSection } from './components/AdminSection';
import type { AppView, PublicApk } from './types';

const CREST_IMAGE = '/src/assets/images/wag_siyu_crest_1795336223010.jpg';
const CAMPUS_IMAGE = '/src/assets/images/wag_siyu_campus_1795336223673.jpg';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [publishedApps, setPublishedApps] = useState<PublicApk[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Admin Bearer token kept strictly in JS memory
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  const [crestFailed, setCrestFailed] = useState(false);
  const [campusFailed, setCampusFailed] = useState(false);

  const fetchPublishedApps = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const res = await fetch('/api/apps');
      const data = (await res.json()) as { apps?: PublicApk[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'አፕሊኬሽኖችን ማምጣት አልተቻለም።');
      }
      setPublishedApps(data.apps || []);
    } catch (err) {
      setAppsError(err instanceof Error ? err.message : 'የግንኙነት ስህተት ተከስቷል።');
    } finally {
      setLoadingApps(false);
    }
  }, []);

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
      <TopBar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentView === 'home' && (
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
            {/* Institutional Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white">
              {!campusFailed && (
                <img
                  src={CAMPUS_IMAGE}
                  alt="ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት ግቢ"
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
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-1.5 sm:h-24 sm:w-24">
                  {!crestFailed ? (
                    <img
                      src={CREST_IMAGE}
                      alt="የዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት አርማ"
                      referrerPolicy="no-referrer"
                      onError={() => setCrestFailed(true)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-blue-900" aria-hidden="true" />
                  )}
                </div>

                <div className="max-w-2xl space-y-2.5">
                  <p className="text-xs font-medium tracking-wide text-amber-300 sm:text-sm">
                    ይፋዊ የትምህርት ቤት መተግበሪያ ማውረጃ ድረ-ገጽ
                  </p>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-white [text-wrap:balance] sm:text-4xl">
                    ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት
                  </h1>
                  <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                    የትምህርት ቤቱን የአንድሮይድ (APK) መተግበሪያዎች ያለ ምንም ሎጊን በቀጥታ ያውርዱና በስልክዎ ላይ ይጫኑ።
                  </p>
                </div>
              </div>
            </section>

            {/* Primary Two-Card Portal Grid */}
            <section aria-label="ዋና አገልግሎቶች" className="mt-8 grid gap-6 md:grid-cols-2">
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
                    አፕሊኬሽን ለማውረድ
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                    ለተማሪዎችና ለጎብኚዎች። ምንም አይነት የይለፍ ቃል ወይም ሎጊን ሳይጠይቅ የተለቀቁትን የኤፒኬ ፋይሎች በቀጥታ ያውርዱ።
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="font-mono text-xs text-slate-500 tabular-nums sm:text-sm">
                    {loadingApps
                      ? 'በመፈለግ ላይ...'
                      : publishedApps.length === 0
                        ? '0 አፕሊኬሽኖች ተጭነዋል'
                        : `${publishedApps.length} አፕሊኬሽን ለማውረድ ዝግጁ ነው`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
                    <span>ክፈት</span>
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
                    አድሚን
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                    ለትምህርት ቤቱ አስተዳዳሪ ብቻ። ከስልክ ፋይል ማኔጀር ኤፒኬ ፋይሎችን አፕሎድ ለማድረግ እና ለተጠቃሚዎች ለመልቀቅ።
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="text-xs text-slate-500 sm:text-sm">
                    {authToken ? `ገብተዋል (${adminUsername})` : 'በተጠቃሚ ስም እና የይለፍ ቃል የተጠበቀ'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
                    <span>{authToken ? 'ወደ አድሚን ሂድ' : 'ግባ'}</span>
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
            onRefresh={() => void fetchPublishedApps()}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentView === 'admin' && (
          <AdminSection
            authToken={authToken}
            adminUsername={adminUsername}
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
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          © {new Date().getFullYear()} ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት — የመተግበሪያ ማውረጃ ፖርታል
        </div>
      </footer>
    </div>
  );
}
