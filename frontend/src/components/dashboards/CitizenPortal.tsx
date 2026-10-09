import React, { useState, useEffect } from 'react';
import { CitizenReport, InfrastructureAsset } from '../../types';
import { apiRequest } from '../../api/client';
import { Send, Upload, ShieldCheck, AlertCircle, Clock, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react';

interface CitizenPortalProps {
  assets: InfrastructureAsset[];
  onReportCreated: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({ assets, onReportCreated }) => {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(2);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadMyReports = () => {
    setLoading(true);
    apiRequest<CitizenReport[]>('/civic/reports')
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMyReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('description', description);
    formData.append('severity', String(severity));
    if (selectedAssetId) {
      formData.append('asset_id', selectedAssetId);
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await apiRequest('/civic/reports', {
        method: 'POST',
        body: formData,
      });

      setSuccess('Incident report submitted successfully and analyzed by AI classifier.');
      setDescription('');
      setSeverity(2);
      setSelectedAssetId('');
      setImageFile(null);
      loadMyReports();
      onReportCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Citizen Submission Box */}
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-electric-500/15 text-electric-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Report Urban Infrastructure Issue</h2>
            <p className="text-xs text-slate-400">
              Submit power disruptions, damaged cables, broken streetlights, or road hazards. Reports are automatically classified and clustered.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              ISSUE DESCRIPTION <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Overhead power line sparking near Medical Hub transformer vault on Elm St..."
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-electric-400 resize-none font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                AFFECTED INFRASTRUCTURE ASSET (OPTIONAL)
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-electric-400"
              >
                <option value="">Select linked infrastructure asset...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_code} - {a.name} ({a.asset_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                SEVERITY LEVEL: <span className="text-amber-400 font-bold">{severity} / 5</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-amber-400 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              ATTACH PHOTO (MIME/MAGIC VERIFIED, MAX 5MB)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-xs font-mono text-slate-300 cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-electric-400" />
                <span>{imageFile ? imageFile.name : 'Choose Image File'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="text-xs text-slate-400 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white shadow-lg shadow-electric-500/25 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting & Classifying...' : 'SUBMIT REPORT'}</span>
          </button>
        </form>
      </div>

      {/* Citizen Report History Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          MY SUBMITTED REPORTS ({reports.length})
        </h3>

        {loading ? (
          <div className="text-xs font-mono text-slate-400 py-6 text-center">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-8 text-center text-xs text-slate-400">
            No incident reports submitted yet. Submit an issue above to track its status in real time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-charcoal-900 border border-charcoal-700/80 rounded-xl p-4 space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-electric-400 uppercase">#{rep.id} {rep.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rep.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : rep.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>

                <p className="text-xs text-slate-200 line-clamp-2">{rep.description}</p>

                <div className="pt-2 border-t border-charcoal-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-charcoal-800 text-slate-300">
                    Source: {rep.classification_source}
                  </span>
                  <span>Priority: {rep.priority_score.toFixed(1)} / 100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
