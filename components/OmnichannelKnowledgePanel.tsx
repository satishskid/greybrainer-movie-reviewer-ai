import React, { useEffect, useState } from 'react';
import {
  backfillKnowledgeUrls,
  syncDriveFolder,
  type DriveFolderSyncResult,
  type KnowledgeBackfillResult,
  type KnowledgeDocumentRecord,
  type KnowledgeImportJobRecord,
  listKnowledgeDocuments,
  listKnowledgeImportJobs,
} from '../services/omnichannelDraftService';
import { LoadingSpinner } from './LoadingSpinner';

interface OmnichannelKnowledgePanelProps {
  currentUserEmail?: string | null;
}

function parseUrls(raw: string) {
  return raw
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

export const OmnichannelKnowledgePanel: React.FC<OmnichannelKnowledgePanelProps> = ({ currentUserEmail }) => {
  const [urlInput, setUrlInput] = useState('');
  const [driveFolderInput, setDriveFolderInput] = useState('https://drive.google.com/drive/folders/1svel2q4Gg3MFS1LSnBxOCO2GIIWo907f');
  const [documents, setDocuments] = useState<KnowledgeDocumentRecord[]>([]);
  const [jobs, setJobs] = useState<KnowledgeImportJobRecord[]>([]);
  const [lastResult, setLastResult] = useState<KnowledgeBackfillResult | null>(null);
  const [lastDriveResult, setLastDriveResult] = useState<DriveFolderSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextDocuments, nextJobs] = await Promise.all([
        listKnowledgeDocuments(12),
        listKnowledgeImportJobs(12),
      ]);
      setDocuments(nextDocuments);
      setJobs(nextJobs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load knowledge archive state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleBackfill = async () => {
    const urls = parseUrls(urlInput);
    if (urls.length === 0) {
      setError('Paste at least one Medium URL.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setLastResult(null);
    setLastDriveResult(null);
    try {
      const result = await backfillKnowledgeUrls(urls, currentUserEmail ?? null);
      setLastResult(result);
      setUrlInput('');
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Backfill import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDriveSync = async () => {
    if (!driveFolderInput.trim()) {
      setError('Paste a shared Google Drive folder URL or ID.');
      return;
    }

    setIsSyncingDrive(true);
    setError(null);
    setLastResult(null);
    setLastDriveResult(null);
    try {
      const result = await syncDriveFolder(driveFolderInput.trim(), currentUserEmail ?? null);
      setLastDriveResult(result);
      await loadData();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Drive archive sync failed.');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
        <div className="mb-6 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-4">
          <div className="text-sm font-medium text-sky-100">Google Drive Archive Sync</div>
          <div className="mt-1 text-sm text-sky-200/90">
            Shared Google Docs can be imported directly from a public Drive folder without Google OAuth.
          </div>
          <div className="mt-4">
            <label className="text-sm text-slate-200">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Drive Folder URL or ID</div>
              <input
                value={driveFolderInput}
                onChange={(event) => setDriveFolderInput(event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </label>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                This importer reads the shared folder listing and exports Google Docs as text into the R2/Turso knowledge pipeline.
              </div>
              <button
                onClick={() => void handleDriveSync()}
                disabled={isSyncingDrive}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-sky-900"
              >
                {isSyncingDrive ? 'Syncing Folder...' : 'Sync Drive Folder'}
              </button>
            </div>
          </div>

          {lastDriveResult && (
            <div className="mt-4 rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              Folder {lastDriveResult.folderTitle ?? lastDriveResult.folderId}: scanned {lastDriveResult.scanned}, imported{' '}
              {lastDriveResult.imported}, duplicates{' '}
              {lastDriveResult.results.filter((item) => item.status === 'duplicate').length}, failed{' '}
              {lastDriveResult.results.filter((item) => item.status === 'failed').length}.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-100">Knowledge Backfill</h4>
            <p className="mt-1 text-sm text-slate-400">
              Paste older Medium article URLs to import archive content beyond the RSS feed window.
            </p>
          </div>
          <button
            onClick={() => void loadData()}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          RSS only covers the latest Medium items. Use this to import older URLs from your archive or Google Drive list.
        </div>

        <div className="mt-4">
          <label className="text-sm text-slate-300">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Medium Article URLs</div>
            <textarea
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              rows={8}
              placeholder="https://medium.com/@GreyBrainer/...\nhttps://medium.com/@GreyBrainer/..."
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              One URL per line or comma-separated. Existing articles are deduped by canonical URL.
            </div>
            <button
              onClick={() => void handleBackfill()}
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-900"
            >
              {isSubmitting ? 'Importing...' : 'Import Archive URLs'}
            </button>
          </div>
        </div>

        {lastResult && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Processed {lastResult.requested} URL(s):{' '}
            {lastResult.results.filter((item) => item.status === 'imported').length} imported,{' '}
            {lastResult.results.filter((item) => item.status === 'duplicate').length} duplicates,{' '}
            {lastResult.results.filter((item) => item.status === 'failed').length} failed.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-slate-100">Recent Knowledge Documents</h5>
              <p className="text-xs text-slate-500">Latest imported archive items currently available for RAG.</p>
            </div>
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="text-sm text-slate-500">No archive documents imported yet.</div>
              ) : (
                documents.map((document) => (
                  <div key={document.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                    <div className="text-sm font-medium text-slate-100">{document.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {document.storageBackend} • {document.chunkCount} chunks
                      {document.publishedAt ? ` • ${new Date(document.publishedAt).toLocaleDateString()}` : ''}
                    </div>
                    <a
                      href={document.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      {document.canonicalUrl}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-slate-100">Import Jobs</h5>
              <p className="text-xs text-slate-500">Every archive URL gets a persisted result so failures are visible.</p>
            </div>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <div className="text-sm text-slate-500">No import jobs yet.</div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-100">{job.title ?? job.sourceUrl}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{job.sourceUrl}</div>
                      </div>
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      attempts {job.attemptCount} • {new Date(job.updatedAt).toLocaleString()}
                    </div>
                    {job.errorMessage && (
                      <div className="mt-2 text-xs text-red-300">{job.errorMessage}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
