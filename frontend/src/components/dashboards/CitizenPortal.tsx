import React, { useState, useRef, useCallback } from 'react';
import { CitizenReport, InfrastructureAsset, User } from '../../types';
import { useReports, createReport, restoreSession } from '../../hooks/useReports';
import { useToast } from '../ui/Toast';
import { StatusBadge } from '../ui/StatusBadge';
import { SourceBadge } from '../ui/SourceBadge';
import { CivicMapView } from './CivicMapView';
import { CityScene } from '../CityScene';
import {
  AlertTriangle, Zap, Droplets, Trash2, Construction, HelpCircle,
  MapPin, Camera, Mic, MicOff, ChevronRight, ChevronLeft, Check,
  FileText, RefreshCw, AlertCircle, Volume2, VolumeX
} from 'lucide-react';

/* ─── Step types ─── */
type Step = 'category' | 'describe' | 'location' | 'photo' | 'review' | 'done';

const CATEGORIES = [
  { key: 'pothole',    label: 'Pothole / Road Damage',  icon: Construction, color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { key: 'streetlight',label: 'Streetlight Issue',       icon: Zap,          color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { key: 'garbage',    label: 'Garbage / Waste',          icon: Trash2,       color: 'bg-green-50 border-green-200 text-green-800' },
  { key: 'water',      label: 'Water Leakage',            icon: Droplets,     color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'electrical', label: 'Electrical / Cable',       icon: AlertTriangle,color: 'bg-red-50 border-red-200 text-red-800' },
  { key: 'other',      label: 'Other Issue',               icon: HelpCircle,   color: 'bg-stone-50 border-stone-200 text-stone-800' },
];

const SEVERITY_LABELS = ['', 'Low – Minor inconvenience', 'Moderate – Affects some', 'Significant – Many affected', 'Serious – Safety risk', 'Critical – Immediate danger'];

const STEPS: Step[] = ['category', 'describe', 'location', 'photo', 'review', 'done'];
const STEP_LABELS = ['Problem', 'Describe', 'Location', 'Photo', 'Review', 'Done'];

/* ─── Speech Recognition types ─── */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

function getSR() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* ─── Idempotency key ─── */
function makeIdempotencyKey() {
  return `cg-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/* ─── Data Quality & Category Consistency Check ─── */
interface ConsistencyCheck {
  inconsistent: boolean;
  keyword?: string;
  suggestion?: string;
}

function checkCategoryConsistency(cat: string, desc: string): ConsistencyCheck {
  const text = desc.toLowerCase();
  const patterns: Record<string, { keywords: string[]; label: string }> = {
    pothole: { keywords: ['pothole', 'road damage', 'crater', 'asphalt', 'pavement broken', 'uneven road', 'tarmac'], label: 'Pothole / Road Damage' },
    streetlight: { keywords: ['streetlight', 'street light', 'lamp post', 'dark street', 'pole light', 'flickering light', 'no light'], label: 'Streetlight Issue' },
    water: { keywords: ['water leak', 'pipe burst', 'drainage', 'sewage', 'flooding', 'overflowing pipe', 'water main'], label: 'Water Leakage' },
    electrical: { keywords: ['electrical', 'spark', 'sparks', 'live wire', 'transformer', 'power line', 'short circuit', 'exposed wire'], label: 'Electrical / Cable' },
    garbage: { keywords: ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish', 'dustbin overflow'], label: 'Garbage / Waste' },
  };

  for (const [key, cfg] of Object.entries(patterns)) {
    if (key !== cat) {
      for (const kw of cfg.keywords) {
        if (text.includes(kw)) {
          return {
            inconsistent: true,
            keyword: kw,
            suggestion: cfg.label,
          };
        }
      }
    }
  }
  return { inconsistent: false };
}

interface CitizenPortalProps {
  assets: InfrastructureAsset[];
  onReportCreated: () => void;
  currentUser?: User | null;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({ assets, onReportCreated, currentUser }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('category');
  const [loadingReports, setLoadingReports] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdReport, setCreatedReport] = useState<CitizenReport | null>(null);
  const idempotencyKey = useRef(makeIdempotencyKey());

  // Form state
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(2);
  const [assetId, setAssetId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const srRef = useRef<any>(null);
  const srSupported = !!getSR();

  // View toggle: stepper vs my-reports
  const [view, setView] = useState<'home' | 'report' | 'my-reports' | 'map'>('home');

  const activeUser = currentUser || restoreSession();
  const { reports: allReports } = useReports();
  // Data Isolation: Citizen strictly sees only their own reports matching their user ID
  const reports = activeUser
    ? allReports.filter(r => String(r.reporterId) === String(activeUser.id))
    : [];

  /* ── Voice recognition ── */
  const startListening = () => {
    const SR = getSR();
    if (!SR) return;
    setVoiceError(null);
    setVoiceState('listening');
    setTranscript('');
    const sr = new SR();
    sr.lang = voiceLang;
    sr.interimResults = true;
    sr.continuous = false;
    sr.onresult = (evt: any) => {
      const t = Array.from(evt.results as any[]).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
      if (evt.results[evt.results.length - 1].isFinal) {
        setDescription(prev => (prev.trim() ? prev + ' ' : '') + t.trim());
        setTranscript('');
        setVoiceState('idle');
      }
    };
    sr.onerror = (evt: any) => {
      setVoiceState('error');
      const msgs: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow mic access in your browser and try again.',
        'no-speech': 'No speech detected. Please speak clearly and try again.',
        'network': 'Network error during speech recognition. Check your connection.',
        'service-not-allowed': 'Speech service not allowed. Use Chrome or Edge on HTTPS/localhost.',
      };
      setVoiceError(msgs[evt.error] || `Speech error: ${evt.error}. Try typing instead.`);
    };
    sr.onend = () => { if (voiceState === 'listening') setVoiceState('idle'); };
    srRef.current = sr;
    try { sr.start(); } catch { setVoiceState('error'); setVoiceError('Could not start microphone.'); }
  };

  const stopListening = () => {
    srRef.current?.stop();
    setVoiceState('idle');
  };

  /* ── Geolocation ── */
  const requestLocation = () => {
    setLocationLabel('Requesting location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocationLabel(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        toast('success', 'Location captured.');
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location access denied. Please allow location permission.',
          2: 'Location unavailable. Try again later.',
          3: 'Location request timed out.',
        };
        setLocationLabel(null);
        toast('error', msgs[err.code] || 'Could not get location.');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  /* ── Image handler ── */
  const handleImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string || null);
    reader.readAsDataURL(file);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 5) {
      toast('error', 'Please describe the problem with at least 5 characters.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('description', description.trim());
    if (category) fd.append('category', category);
    fd.append('severity', String(severity));
    if (assetId) fd.append('asset_id', assetId);
    if (latitude != null) {
      fd.append('x_coord', String(latitude));
      fd.append('latitude', String(latitude));
    }
    if (longitude != null) {
      fd.append('y_coord', String(longitude));
      fd.append('longitude', String(longitude));
    }
    if (imageFile) fd.append('image', imageFile);
    fd.append('idempotency_key', idempotencyKey.current);

    try {
      const activeSession = currentUser || restoreSession();
      const payload = {
        description: description.trim(),
        category,
        severity,
        asset_id: assetId,
        x_coord: latitude,
        y_coord: longitude,
        latitude,
        longitude,
        locationLabel: locationLabel || (latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Roorkee Sector'),
        image_filename: imageFile ? imageFile.name : undefined,
        reporterId: activeSession?.id,
        username: activeSession?.username || 'Citizen',
      };
      
      const created = createReport(payload);
      setCreatedReport(created as any);
      setStep('done');
      onReportCreated();
      idempotencyKey.current = makeIdempotencyKey(); // reset for next report
      toast('success', `Report #${created.id} submitted successfully!`);
    } catch (err: any) {
      toast('error', err.message || 'Submission failed. Please check your information and try again.');
    } finally {
      setSubmitting(false);
    }
  };


  /* ── Reset stepper ── */
  const resetForm = () => {
    setStep('category'); setCategory(''); setDescription(''); setSeverity(2);
    setAssetId(''); setLatitude(null); setLongitude(null); setLocationLabel(null);
    setImageFile(null); setImagePreview(null); setCreatedReport(null);
    setVoiceState('idle'); setVoiceError(null); setTranscript('');
  };

  const canProgress = () => {
    if (step === 'category') return !!category;
    if (step === 'describe') return description.trim().length >= 5;
    return true;
  };

  const goPrev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1] as Step);
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (step === 'review') { handleSubmit(); return; }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1] as Step);
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="citizen-view min-h-screen bg-[var(--bg-light)]">

      <div className={`${view === 'home' ? 'w-full max-w-6xl' : 'max-w-2xl'} mx-auto px-4 py-8 space-y-6`}>
        {/* Home view: 3 large actions */}
        {view === 'home' && (
          <>
            <div className="max-w-2xl mx-auto text-center space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Report a Problem</h1>
              <p className="text-[var(--text-secondary)]">Help us fix issues in your neighbourhood. Simple, quick, and tracked.</p>
            </div>
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 civic-cards-grid">
              {[
                { icon: AlertTriangle, label: 'Report a Problem', desc: 'Submit a new issue', action: () => { resetForm(); setView('report'); }, id: 'home-report-btn', color: 'border-[var(--coral)] bg-[var(--coral-light)]' },
                { icon: FileText, label: 'My Reports', desc: 'Track your submissions', action: () => setView('my-reports'), id: 'home-myreports-btn', color: 'border-[var(--sage-light)] bg-[var(--sage-light)]' },
                { icon: MapPin, label: 'View on Map', desc: 'See incidents near you', action: () => setView('map'), id: 'home-map-btn', color: 'border-[var(--stone-border)] bg-[var(--stone-light)]' },
              ].map(({ icon: Icon, label, desc, action, id, color }) => (
                <button
                  key={id}
                  id={id}
                  onClick={action}
                  className={`btn-citizen civic-action-card border-2 ${color} rounded-xl flex flex-col items-center gap-3 p-6 text-[var(--text-primary)]`}
                >
                  <Icon className="w-8 h-8 text-[var(--coral-strong)] civic-action-icon" aria-hidden="true" />
                  <div className="text-center">
                    <div className="font-bold">{label}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* 3D Isometric City Digital Twin (Task 3: purely decorative, aria-hidden, pointer-events: none) */}
            <div className="w-full mt-6">
              <CityScene />
            </div>
          </>
        )}

        {/* Report stepper */}
        {view === 'report' && step !== 'done' && (
          <div>
            <button onClick={() => setView('home')} className="text-sm text-[var(--sage-text)] hover:text-[var(--espresso)] mb-4 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back to home
            </button>

            {/* Step progress */}
            <div className="flex items-center gap-1 mb-8" role="progressbar" aria-valuenow={stepIdx + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Report progress">
              {STEPS.slice(0, -1).map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`step-indicator ${
                      i < stepIdx ? 'step-done' : i === stepIdx ? 'step-active' : 'step-pending'
                    }`} aria-current={i === stepIdx ? 'step' : undefined}>
                      {i < stepIdx ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-semibold hidden sm:block ${
                      i === stepIdx ? 'text-[var(--coral-strong)]' : 'text-[var(--text-muted)]'
                    }`}>{STEP_LABELS[i]}</span>
                  </div>
                  {i < STEPS.length - 2 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-[var(--status-healthy)]' : 'bg-[var(--stone-border)]'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="card" role="main" aria-label={`Step ${stepIdx + 1}: ${STEP_LABELS[stepIdx]}`}>
              {/* STEP 1: Category */}
              {step === 'category' && (
                <fieldset>
                  <legend className="text-xl font-bold text-[var(--text-primary)] mb-2">What is the problem?</legend>
                  <p className="text-[var(--text-muted)] text-sm mb-6">Choose the type of issue you want to report.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.key}
                          id={`cat-${cat.key}`}
                          onClick={() => setCategory(cat.key)}
                          className={`border-2 rounded-xl p-4 flex flex-col items-center gap-3 min-h-[var(--touch-min)] text-center transition-all hover:scale-[1.02] ${
                            category === cat.key
                              ? 'border-[var(--coral-strong)] bg-[var(--coral-light)] ring-2 ring-[var(--coral-strong)]/20'
                              : `${cat.color} border-2 hover:border-[var(--coral)]`
                          }`}
                          aria-pressed={category === cat.key}
                        >
                          <Icon className="w-7 h-7" aria-hidden="true" />
                          <span className="text-sm font-semibold leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* STEP 2: Describe */}
              {step === 'describe' && (
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Describe the problem</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6">Type what you see, or press the microphone to speak.</p>

                  {/* Voice controls */}
                  {srSupported ? (
                    <div className="mb-4 p-4 rounded-xl bg-[var(--sage-light)] border border-[var(--stone-border)]">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-[var(--sage-text)] text-sm">🎤 Speak your complaint</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Chrome/Edge on HTTPS or localhost sends audio to Google's servers.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={voiceLang}
                            onChange={e => setVoiceLang(e.target.value)}
                            className="field-input text-sm py-1.5 px-2 h-9 min-h-0"
                            aria-label="Voice language"
                          >
                            <option value="en-IN">English (India)</option>
                            <option value="en-US">English (US)</option>
                            <option value="hi-IN">Hindi</option>
                            <option value="mr-IN">Marathi</option>
                            <option value="ta-IN">Tamil</option>
                            <option value="te-IN">Telugu</option>
                            <option value="bn-IN">Bengali</option>
                          </select>
                          <button
                            id="voice-btn"
                            onClick={voiceState === 'listening' ? stopListening : startListening}
                            disabled={voiceState === 'processing'}
                            className={`btn min-h-[44px] px-4 ${
                              voiceState === 'listening'
                                ? 'bg-[var(--status-faulted)] text-white border-[var(--status-faulted)] animate-pulse'
                                : 'btn-secondary'
                            }`}
                            aria-label={voiceState === 'listening' ? 'Stop recording' : 'Start voice recording'}
                            aria-pressed={voiceState === 'listening'}
                          >
                            {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            <span className="sr-only">{voiceState === 'listening' ? 'Stop' : 'Speak'}</span>
                            <span aria-hidden>{voiceState === 'listening' ? 'Stop' : 'Speak'}</span>
                          </button>
                        </div>
                      </div>
                      {voiceState === 'listening' && (
                        <p className="mt-3 text-sm text-[var(--sage-text)] font-medium" aria-live="polite">
                          🔴 Listening… {transcript && <span className="italic text-[var(--text-muted)]">"{transcript}"</span>}
                        </p>
                      )}
                      {voiceError && (
                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[var(--status-faulted-bg)] text-[var(--status-faulted)] text-sm" role="alert">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{voiceError}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 p-4 rounded-xl bg-[var(--stone-light)] border border-[var(--stone-border)] text-sm text-[var(--text-muted)]">
                      Voice input requires Chrome or Edge browser on HTTPS or localhost.
                    </div>
                  )}

                  <div>
                    <label htmlFor="describe-text" className="field-label">
                      Description <span className="text-[var(--status-faulted)]">*</span>
                    </label>
                    <textarea
                      id="describe-text"
                      rows={4}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. There is a large pothole on Main Street near the bus stop. Water is pooling inside it…"
                      className="field-input resize-none"
                      aria-required="true"
                      aria-describedby="describe-hint"
                      minLength={5}
                    />
                    <p id="describe-hint" className="text-xs text-[var(--text-muted)] mt-1">Minimum 5 characters. Voice adds text here — you can edit it.</p>
                    {description.length > 0 && description.length < 5 && (
                      <p className="field-error" role="alert">Please write at least 5 characters.</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label htmlFor="severity-range" className="field-label">
                      How serious is it?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="severity-range"
                        type="range" min="1" max="5" value={severity}
                        onChange={e => setSeverity(Number(e.target.value))}
                        className="flex-1 accent-[var(--coral-strong)]"
                        aria-label={`Severity: ${SEVERITY_LABELS[severity]}`}
                      />
                      <span className={`badge ${['', 'badge-healthy', 'badge-sage', 'badge-warning', 'badge-faulted', 'badge-critical'][severity]}`}>
                        {severity}/5
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{SEVERITY_LABELS[severity]}</p>
                  </div>
                </div>
              )}

              {/* STEP 3: Location */}
              {step === 'location' && (
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Where is it?</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6">Help us find the exact location of the issue.</p>

                  <button
                    id="use-location-btn"
                    onClick={requestLocation}
                    className="btn btn-secondary w-full mb-4 gap-3"
                    disabled={!!latitude}
                  >
                    <MapPin className="w-5 h-5 text-[var(--coral-strong)]" />
                    {latitude ? '✓ Location captured' : 'Use my current location'}
                  </button>
                  {locationLabel && (
                    <div className="p-3 rounded-lg bg-[var(--stone-light)] border border-[var(--stone-border)] text-sm font-mono text-[var(--text-secondary)] flex items-center gap-2" aria-live="polite">
                      <MapPin className="w-4 h-4 text-[var(--coral-strong)] shrink-0" />
                      {locationLabel}
                    </div>
                  )}
                  {latitude && (
                    <button onClick={() => { setLatitude(null); setLongitude(null); setLocationLabel(null); }} className="mt-2 text-sm text-[var(--text-muted)] hover:text-[var(--status-faulted)]">
                      Remove location
                    </button>
                  )}

                  <div className="mt-6">
                    <label htmlFor="asset-select" className="field-label">Nearby infrastructure asset (optional)</label>
                    <select
                      id="asset-select"
                      value={assetId}
                      onChange={e => setAssetId(e.target.value)}
                      className="field-input"
                    >
                      <option value="">— Select if you know the asset —</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>
                      ))}
                    </select>
                  </div>

                  {!latitude && !assetId && (
                    <p className="mt-4 text-sm text-[var(--text-muted)] italic">
                      Location is optional but helps us respond faster. You can skip this step.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 4: Photo */}
              {step === 'photo' && (
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Add a photo (optional)</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6">A photo helps us understand the issue better. PNG, JPEG, or WebP, up to 5 MB.</p>

                  {!imageFile ? (
                    <label
                      htmlFor="photo-upload"
                      className="flex flex-col items-center justify-center gap-4 w-full h-40 border-2 border-dashed border-[var(--stone-border)] rounded-xl cursor-pointer hover:border-[var(--coral)] hover:bg-[var(--coral-light)] transition-colors"
                    >
                      <Camera className="w-10 h-10 text-[var(--text-muted)]" aria-hidden="true" />
                      <span className="text-[var(--text-muted)] font-medium">Tap to choose a photo</span>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }}
                        className="sr-only"
                        aria-label="Upload photo of the problem"
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-[var(--stone-border)]">
                        {imagePreview && <img src={imagePreview} alt="Preview of uploaded file" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)] truncate">{imageFile.name}</span>
                        <button
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="text-sm text-[var(--status-faulted)] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Review */}
              {step === 'review' && (() => {
                const consistency = checkCategoryConsistency(category, description);
                return (
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Review and submit</h2>
                    <p className="text-[var(--text-muted)] text-sm mb-4">Please check your report details before submitting.</p>

                    {consistency.inconsistent && (
                      <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5" role="alert">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-amber-900 dark:text-amber-100">Category Consistency Notice</p>
                          <p className="text-amber-800 dark:text-amber-300">
                            Your description mentions <em>"{consistency.keyword}"</em>, which usually corresponds to <strong>{consistency.suggestion}</strong>, but <strong>{CATEGORIES.find(c => c.key === category)?.label || category}</strong> is currently selected.
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            You can proceed with your report as-is, or click <strong>Back</strong> to adjust the problem type.
                          </p>
                        </div>
                      </div>
                    )}

                    <dl className="space-y-3">
                      {[
                        { dt: 'Problem type', dd: CATEGORIES.find(c => c.key === category)?.label || category },
                        { dt: 'Description', dd: description },
                        { dt: 'Severity', dd: `${severity}/5 – ${SEVERITY_LABELS[severity]}` },
                        { dt: 'Location', dd: locationLabel || (assetId ? `Asset #${assetId}` : 'No location recorded') },
                        { dt: 'Photo', dd: imageFile ? imageFile.name : 'No photo attached' },
                      ].map(({ dt, dd }) => (
                        <div key={dt} className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-sm font-semibold text-[var(--text-secondary)] w-36 shrink-0">{dt}</dt>
                          <dd className="text-sm text-[var(--text-primary)] mt-0.5 sm:mt-0">{dd}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })()}


              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--stone-border)] gap-3">
                {step !== 'category' ? (
                  <button id="step-back-btn" onClick={goPrev} className="btn btn-secondary gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : <div />}
                {step === 'photo' && (
                  <button onClick={goNext} className="text-sm text-[var(--sage-text)] hover:underline">
                    Skip (no photo)
                  </button>
                )}
                <button
                  id="step-next-btn"
                  onClick={goNext}
                  disabled={!canProgress() || submitting}
                  className="btn btn-primary gap-2 ml-auto"
                >
                  {step === 'review' ? (submitting ? 'Submitting…' : 'Submit Report') : 'Continue'}
                  {step !== 'review' && <ChevronRight className="w-4 h-4" />}
                  {step === 'review' && !submitting && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DONE screen */}
        {view === 'report' && step === 'done' && createdReport && (
          <div className="card text-center space-y-6" role="main" aria-live="polite">
            <div className="w-16 h-16 rounded-full bg-[var(--status-healthy-bg)] flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-[var(--status-healthy)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Report Submitted!</h2>
              <p className="text-[var(--text-muted)] mt-2">Your report has been received and is being reviewed.</p>
            </div>
            <div className="bg-[var(--stone-light)] rounded-xl p-4 text-left space-y-2">
              <p className="text-sm text-[var(--text-muted)]">Reference number</p>
              <p className="text-2xl font-mono font-bold text-[var(--espresso)]">#{createdReport.id}</p>
              <div className="flex gap-2 flex-wrap mt-2">
                <StatusBadge status={createdReport.status} />
                <SourceBadge source={createdReport.classification_source} confidence={createdReport.classification_confidence} />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">You can track your report in <strong>My Reports</strong>.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setView('my-reports')} className="btn btn-secondary">
                <FileText className="w-4 h-4" /> My Reports
              </button>
              <button id="report-another-btn" onClick={() => { resetForm(); setView('report'); }} className="btn btn-primary">
                <AlertTriangle className="w-4 h-4" /> Report Another
              </button>
            </div>
          </div>
        )}

        {/* Map View */}
        {view === 'map' && (
          <div>
            <button onClick={() => setView('home')} className="text-sm text-[var(--sage-text)] hover:text-[var(--espresso)] flex items-center gap-1 mb-6">
              <ChevronLeft className="w-4 h-4" /> Back to home
            </button>
            <CivicMapView initialReports={reports.length ? reports : undefined} />
          </div>
        )}

        {/* My Reports */}
        {view === 'my-reports' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setView('home')} className="text-sm text-[var(--sage-text)] hover:text-[var(--espresso)] flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Home
              </button>
              <button
                onClick={() => {
                  setLoadingReports(true);
                  setTimeout(() => setLoadingReports(false), 300);
                }}
                className="btn btn-ghost text-sm gap-2"
                disabled={loadingReports}
                aria-label="Refresh reports"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">My Reports <span className="text-lg font-normal text-[var(--text-muted)]">({reports.length})</span></h1>

            {loadingReports ? (
              <div className="space-y-3" aria-busy="true">
                {[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" aria-hidden="true" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="card text-center py-12 space-y-4">
                <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto" aria-hidden="true" />
                <p className="text-[var(--text-muted)]">No reports submitted yet.</p>
                <button onClick={() => { resetForm(); setView('report'); }} className="btn btn-primary">Submit your first report</button>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Your submitted reports">
                {reports.map(rep => {
                  const catCfg = CATEGORIES.find(c => c.key === rep.category);
                  const Icon = catCfg?.icon || HelpCircle;
                  return (
                    <div key={rep.id} className="card card-sm" role="listitem">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${catCfg?.color || 'bg-stone-50'} shrink-0`}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[var(--espresso)]">#{rep.id}</span>
                            <StatusBadge status={rep.status} size="xs" />
                            <SourceBadge source={rep.classification_source} confidence={rep.classification_confidence} />
                          </div>
                          <p className="text-sm text-[var(--text-primary)] mt-1 line-clamp-2">{rep.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
                            <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                            {(rep.locationLabel || (rep.x_coord && rep.y_coord)) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[var(--coral-strong)]" />
                                {rep.locationLabel || `${Number(rep.x_coord).toFixed(4)}, ${Number(rep.y_coord).toFixed(4)}`}
                              </span>
                            )}
                            <span className={`badge ${['', 'badge-healthy', 'badge-sage', 'badge-warning', 'badge-faulted', 'badge-critical'][rep.severity]} text-[9px]`}>
                              Severity {rep.severity}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
