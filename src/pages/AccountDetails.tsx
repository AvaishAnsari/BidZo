import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BadgeCheck, Loader2, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAuthHeaders, handleAuthError } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function readApiResponse(response: Response) {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    const isHtml = body.trimStart().startsWith('<');
    return {
      success: false,
      error: isHtml
        ? `Django returned an error (HTTP ${response.status}). Check that PostgreSQL is running and apply pending migrations.`
        : `The backend returned an invalid response (HTTP ${response.status}).`,
    };
  }
}

interface AccountDetails {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  email_verified: boolean;
  phone_verified: boolean;
  role: string;
}

type ContactChannel = 'email' | 'sms';

function AccountContactEditor({
  channel,
  currentValue,
  verified,
  onUpdated,
}: {
  channel: ContactChannel;
  currentValue: string;
  verified: boolean;
  onUpdated: (profile: AccountDetails) => void;
}) {
  const { isDark } = useTheme();
  const [value, setValue] = useState(currentValue);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const isEmail = channel === 'email';
  const label = isEmail ? 'Email address' : 'Mobile number';
  const Icon = isEmail ? Mail : Phone;
  const normalizedValue = value.trim();
  const changed = normalizedValue !== currentValue;
  const fieldStyle = {
    color: isDark ? '#f3f4f6' : '#172033',
    background: isDark ? 'rgba(2,6,23,0.55)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(148,163,184,.25)' : '#cbd5e1'}`,
  };

  useEffect(() => {
    setValue(currentValue);
    setCode('');
    setCodeSent(false);
  }, [currentValue]);

  const requestCode = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/contact/request/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel, identifier: normalizedValue }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        handleAuthError(response, result);
        throw new Error(result.error || 'Could not send verification code.');
      }
      setCodeSent(true);
      setCode('');
      toast.success(result.message || `Verification code sent to your new ${isEmail ? 'email' : 'phone'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/contact/verify/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel, identifier: normalizedValue, code: code.trim() }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) {
        handleAuthError(response, result);
        throw new Error(result.error || 'Could not verify this contact detail.');
      }
      onUpdated(result.profile);
      setCodeSent(false);
      setCode('');
      toast.success(isEmail ? 'Email verified and updated.' : 'Mobile number verified and updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#b98342]/10 text-[#9a672e]"><Icon size={20} /></span>
          <div>
            <h2 className="font-bold" style={{ color: isDark ? '#f3f4f6' : '#172033' }}>{label}</h2>
            <p className="mt-1 text-sm" style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
              {currentValue ? verified ? 'Changes are saved only after verification.' : 'Verify this contact detail or replace it. It will be saved after verification.' : 'Add and verify this contact detail for your account.'}
            </p>
          </div>
        </div>
        {currentValue && verified && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600"><BadgeCheck size={14} /> Verified</span>}
        {currentValue && !verified && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700"><ShieldCheck size={14} /> Verify</span>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          type={isEmail ? 'email' : 'tel'}
          value={value}
          onChange={(event) => { setValue(event.target.value); setCodeSent(false); setCode(''); }}
          placeholder={isEmail ? 'you@example.com' : '+919876543210'}
          autoComplete={isEmail ? 'email' : 'tel'}
          className="min-h-12 min-w-0 w-full rounded-xl px-4 py-3 outline-none transition focus:border-[#b98342] focus:ring-2 focus:ring-[#b98342]/20"
          style={fieldStyle}
        />
        {!codeSent && (!verified || changed) && (
          <button
            type="button"
            onClick={requestCode}
            disabled={busy || !normalizedValue || (!changed && verified)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8e5f2d] px-4 py-3 font-semibold text-white transition hover:bg-[#765026] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            {currentValue ? changed ? `Verify new ${isEmail ? 'email' : 'number'}` : `Verify ${isEmail ? 'email' : 'number'}` : `Add ${isEmail ? 'email' : 'number'}`}
          </button>
        )}
      </div>

      {codeSent && (
      <form onSubmit={verifyCode} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit verification code"
            aria-label={`${label} verification code`}
            className="min-h-12 min-w-0 w-full rounded-xl px-4 py-3 tracking-[0.25em] outline-none focus:border-[#b98342] focus:ring-2 focus:ring-[#b98342]/20"
            style={fieldStyle}
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b98342] px-5 py-3 font-bold text-white transition hover:bg-[#9a672e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <BadgeCheck size={17} />}
            Verify and save
          </button>
          <button type="button" onClick={() => { setCodeSent(false); setCode(''); }} className="min-h-11 px-3 py-2 text-sm font-semibold text-[#9a672e]">Cancel</button>
        </form>
      )}

      {!isEmail && codeSent && (
        <p className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
          In local development, SMS codes are printed in the Django server terminal.
        </p>
      )}
    </section>
  );
}

export function AccountDetailsPage() {
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<AccountDetails | null>(null);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/profile/`, { headers: getAuthHeaders() });
        const result = await readApiResponse(response);
        if (!response.ok || !result.success) {
          handleAuthError(response, result);
          throw new Error(result.error || 'Could not load account details.');
        }
        setProfile(result.profile);
        setUsername(result.profile.username || '');
        setFirstName(result.profile.first_name || '');
        setLastName(result.profile.last_name || '');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const updateProfile = (updated: AccountDetails) => {
    setProfile(updated);
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...storedUser, username: updated.username, email: updated.email, role: updated.role }));
    refreshUser();
  };

  const saveNameDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/profile/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, first_name: firstName, last_name: lastName }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) {
        handleAuthError(response, result);
        throw new Error(result.error || 'Could not save account details.');
      }
      updateProfile(result.profile);
      toast.success('Account details saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  const headingColor = isDark ? '#f3f4f6' : '#172033';
  const mutedColor = isDark ? '#9ca3af' : '#64748b';
  const fieldStyle = {
    color: headingColor,
    background: isDark ? 'rgba(2,6,23,0.55)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(148,163,184,.25)' : '#cbd5e1'}`,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[#9a672e] hover:underline"><ArrowLeft size={17} /> Back to profile</Link>
        <span className="text-sm" style={{ color: mutedColor }}>Account · {profile?.role || user.role}</span>
      </div>

      <header className="mb-8 border-b pb-6" style={{ borderColor: isDark ? 'rgba(148,163,184,.18)' : '#e2e8f0' }}>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9a672e]">Your account</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: headingColor }}>Account details</h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-6" style={{ color: mutedColor }}>Manage your personal information and contact details. Email and phone changes take effect after verification.</p>
      </header>

      {loading ? (
        <div className="glass-card flex min-h-52 items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-[#9a672e]" size={28} /></div>
      ) : loadError ? (
        <div className="glass-card rounded-2xl border border-rose-500/20 p-6 text-center text-rose-600">{loadError}</div>
      ) : profile ? (
        <div className="space-y-5">
          <form onSubmit={saveNameDetails} className="glass-card rounded-2xl p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#b98342]/10 text-[#9a672e]"><UserRound size={20} /></span>
              <div>
                <h2 className="font-bold" style={{ color: headingColor }}>Personal information</h2>
                <p className="mt-1 text-sm" style={{ color: mutedColor }}>Update the name shown on your account.</p>
              </div>
            </div>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2" style={{ color: mutedColor }}>
                Username
                <input value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={150} autoComplete="username" className="mt-2 min-h-12 w-full rounded-xl px-4 py-3 font-normal outline-none focus:border-[#b98342] focus:ring-2 focus:ring-[#b98342]/20" style={fieldStyle} />
              </label>
              <label className="text-sm font-semibold" style={{ color: mutedColor }}>
                First name
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={150} autoComplete="given-name" className="mt-2 min-h-12 w-full rounded-xl px-4 py-3 font-normal outline-none focus:border-[#b98342] focus:ring-2 focus:ring-[#b98342]/20" style={fieldStyle} />
              </label>
              <label className="text-sm font-semibold" style={{ color: mutedColor }}>
                Last name
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={150} autoComplete="family-name" className="mt-2 min-h-12 w-full rounded-xl px-4 py-3 font-normal outline-none focus:border-[#b98342] focus:ring-2 focus:ring-[#b98342]/20" style={fieldStyle} />
              </label>
            </div>
            <div className="mt-6 flex justify-end border-t pt-5" style={{ borderColor: isDark ? 'rgba(148,163,184,.18)' : '#e2e8f0' }}>
              <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8e5f2d] px-6 py-3 font-bold text-white transition hover:bg-[#765026] disabled:opacity-60">
                {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Save details
              </button>
            </div>
          </form>

          <AccountContactEditor channel="email" currentValue={profile.email || ''} verified={profile.email_verified} onUpdated={updateProfile} />
          <AccountContactEditor channel="sms" currentValue={profile.phone_number || ''} verified={profile.phone_verified} onUpdated={updateProfile} />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center" style={{ color: mutedColor }}>Account details are unavailable. Please reload and try again.</div>
      )}
    </main>
  );
}
