import React from 'react';

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_OMNICHANNEL_API_BASE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/+$/, '');
  }
  return `${window.location.origin}/api`;
}

function getPreviewTarget(pathname: string) {
  const apiBaseUrl = getApiBaseUrl();
  const previewOrigin = apiBaseUrl.replace(/\/api$/, '');
  const slug = pathname.replace(/^\/lens\/?/, '').replace(/\/+$/, '');

  return {
    isIndex: slug.length === 0,
    src: slug.length === 0 ? `${previewOrigin}/preview` : `${previewOrigin}/preview/lens/${slug}`,
  };
}

export const LensPreviewApp: React.FC = () => {
  const { isIndex, src } = getPreviewTarget(window.location.pathname);

  return (
    <div className="min-h-screen bg-[#f6f0e7] text-slate-900">
      <div className="border-b border-slate-300 bg-slate-950 px-4 py-3 text-sm text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="font-medium">Greybrainer Cloudflare Preview</div>
          <div className="text-xs text-slate-300">
            UAT surface only. This Pages site is separate from the live Netlify and greybrain.ai setup.
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-4 rounded-2xl border border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-sm">
          {isIndex
            ? 'Published preview index'
            : 'Published preview article rendered from the Cloudflare publishing pipeline'}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl">
          <iframe
            title="Greybrainer Lens Preview"
            src={src}
            className="h-[calc(100vh-11rem)] w-full border-0"
          />
        </div>
      </main>
    </div>
  );
};
