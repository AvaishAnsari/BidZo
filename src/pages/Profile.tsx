import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuctions } from '../hooks/useAuctions';
import { getAuthHeaders, API_BASE_URL as API } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, MapPin, Shield, Heart, Gavel, Trophy,
  Edit2, Plus, Trash2, Check, ChevronRight, Loader2,
  Clock, TrendingUp, Package, Home, Briefcase, AlertCircle,
  Save, ArrowRight, BarChart2, BadgeCheck,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(amount));
}

function timeLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 3) + ' XXXXX ' + phone.slice(-2);
}

function completionScore(profile: any): { pct: number; items: { label: string; done: boolean; required: boolean }[] } {
  const items = [
    { label: 'Username',        done: !!profile?.username,    required: true },
    { label: 'Email',           done: !!profile?.email,       required: true },
    { label: 'First Name',      done: !!profile?.first_name,  required: false },
    { label: 'Phone Number',    done: !!profile?.phone,       required: false },
    { label: 'Delivery Address',done: (profile?.total_addresses ?? 0) > 0, required: false },
  ];
  const done = items.filter(i => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}

type Tab = 'overview' | 'info' | 'addresses' | 'bids' | 'history' | 'won' | 'watchlist' | 'security';

interface Address {
  id: number;
  full_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  address_type: 'home' | 'work' | 'other';
  is_default: boolean;
}

interface BidRecord {
  id: number;
  amount: string;
  timestamp: string;
  auction_item: number;
  auction_title: string;
  auction_image_url: string;
  auction_end_time: string;
  auction_status: string;
  auction_current_highest_bid: string;
}

interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  total_bids: number;
  total_addresses: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TabBtn: React.FC<{ id: Tab; active: Tab; label: string; icon: React.ReactNode; onClick: (t: Tab) => void }> = ({ id, active, label, icon, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm w-full transition-all border-l-2 ${
      active === id
        ? 'bg-[var(--primary)]/15 text-[var(--primary)] font-bold border-l-[var(--primary)]'
        : 'bg-transparent text-[var(--text-muted)] font-medium border-l-transparent hover:bg-[var(--elevated)]'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="market-card rounded-2xl p-6 mb-5">
    <div className="flex items-center justify-between mb-5">
      <h3 className="m-0 text-[var(--text-main)] font-bold text-base">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-5">
      {icon}
    </div>
    <h3 className="text-[var(--text-main)] text-lg font-bold m-0 mb-2">{title}</h3>
    <p className="text-[var(--text-muted)] max-w-xs leading-relaxed m-0 mb-5 text-sm">{subtitle}</p>
    {action}
  </div>
);

const Pill: React.FC<{ color?: string; children: React.ReactNode; variant?: 'success' | 'warning' | 'primary' | 'danger' | 'muted' }> = ({ color, children, variant = 'primary' }) => {
  const bg = variant === 'success' ? 'bg-[var(--success)]/10' : variant === 'warning' ? 'bg-[var(--warning)]/10' : variant === 'danger' ? 'bg-[var(--danger)]/10' : variant === 'muted' ? 'bg-[var(--elevated)]' : 'bg-[var(--primary)]/10';
  const text = variant === 'success' ? 'text-[var(--success)]' : variant === 'warning' ? 'text-[var(--warning)]' : variant === 'danger' ? 'text-[var(--danger)]' : variant === 'muted' ? 'text-[var(--text-muted)]' : 'text-[var(--primary)]';
  const border = variant === 'success' ? 'border-[var(--success)]/25' : variant === 'warning' ? 'border-[var(--warning)]/25' : variant === 'danger' ? 'border-[var(--danger)]/25' : variant === 'muted' ? 'border-[var(--border)]' : 'border-[var(--primary)]/25';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${bg} ${text} ${border}`} style={color ? { color, borderColor: color } : undefined}>
      {children}
    </span>
  );
};

// ── ADDRESS FORM ──────────────────────────────────────────────────────────────

const EMPTY_ADDR = { full_name: '', address_line_1: '', address_line_2: '', city: '', state: '', postal_code: '', country: 'India', phone: '', address_type: 'home' as const, is_default: false };

const AddressForm: React.FC<{ initial?: Partial<Address>; onSave: (data: any) => Promise<void>; onCancel: () => void }> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...EMPTY_ADDR, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.address_line_1.trim() || !form.city.trim() || !form.state.trim() || !form.postal_code.trim() || !form.phone.trim()) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0.9rem', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(75,85,99,0.5)', borderRadius: '0.6rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label style={labelStyle}>Phone *</label>
          <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Address Line 1 *</label>
        <input style={inputStyle} value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} placeholder="Street address" />
      </div>
      <div>
        <label style={labelStyle}>Address Line 2</label>
        <input style={inputStyle} value={form.address_line_2 || ''} onChange={e => set('address_line_2', e.target.value)} placeholder="Apt, suite, etc. (optional)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>City *</label>
          <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
        </div>
        <div>
          <label style={labelStyle}>State *</label>
          <input style={inputStyle} value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
        </div>
        <div>
          <label style={labelStyle}>PIN Code *</label>
          <input style={inputStyle} value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="560001" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Address Type</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.address_type} onChange={e => set('address_type', e.target.value)}>
            <option value="home">🏠 Home</option>
            <option value="work">💼 Work</option>
            <option value="other">📍 Other</option>
          </select>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db', fontSize: '0.875rem' }}>
        <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} />
        Set as default address
      </label>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" onClick={onCancel} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid rgba(75,85,99,0.5)', borderRadius: '0.6rem', color: '#9ca3af', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
        <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '0.6rem', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 style={{ width: '0.9rem', height: '0.9rem', animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: '0.9rem', height: '0.9rem' }} />}
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </div>
    </form>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { auctions } = useAuctions();
  const { watchlist, toggleWatchlist } = useWatchlist();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [bids, setBids] = useState<BidRecord[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ first_name: '', last_name: '', phone: '', avatar_url: '' });
  const [infoSaving, setInfoSaving] = useState(false);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'active' | 'won' | 'outbid'>('all');

  if (!user) return <Navigate to="/login" replace />;

  // ── Fetch profile ────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/users/me/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setInfoForm({ first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '', avatar_url: data.avatar_url || '' });
      }
    } catch (e) { console.error('Profile fetch error', e); }
    finally { setProfileLoading(false); }
  }, []);

  // ── Fetch bids ───────────────────────────────────────────────────────────
  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(`${API}/users/me/bids/`, { headers: getAuthHeaders() });
      if (res.ok) setBids(await res.json());
    } catch (e) { console.error('Bids fetch error', e); }
    finally { setBidsLoading(false); }
  }, []);

  // ── Fetch addresses ──────────────────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch(`${API}/users/me/addresses/`, { headers: getAuthHeaders() });
      if (res.ok) setAddresses(await res.json());
    } catch (e) { console.error('Address fetch error', e); }
    finally { setAddrLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); fetchBids(); fetchAddresses(); }, [fetchProfile, fetchBids, fetchAddresses]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const activeBids = bids.filter(b => b.auction_status === 'live' || b.auction_status === 'upcoming');
  const wonBids = bids.filter(b => {
    const ended = b.auction_status === 'ended';
    const isHighest = Number(b.amount) >= Number(b.auction_current_highest_bid);
    return ended && isHighest;
  });
  const watchedAuctions = auctions.filter(a => watchlist.includes(a.id));

  // Deduplicate active bids: keep highest bid per auction
  const latestActiveBidMap = new Map<number, BidRecord>();
  activeBids.forEach(b => {
    const existing = latestActiveBidMap.get(b.auction_item);
    if (!existing || Number(b.amount) > Number(existing.amount)) latestActiveBidMap.set(b.auction_item, b);
  });
  const uniqueActiveBids = Array.from(latestActiveBidMap.values());

  // ── Address handlers ─────────────────────────────────────────────────────
  const saveAddress = async (data: any) => {
    const url = editingAddr ? `${API}/users/me/addresses/${editingAddr.id}/` : `${API}/users/me/addresses/`;
    const method = editingAddr ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (res.ok) {
        toast.success(editingAddr ? 'Address updated' : 'Address added');
        setShowAddrForm(false); setEditingAddr(null);
        fetchAddresses(); fetchProfile();
      } else {
        const err = await res.json();
        toast.error(JSON.stringify(err));
      }
    } catch { toast.error('Failed to save address'); }
  };

  const deleteAddress = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    try {
      const res = await fetch(`${API}/users/me/addresses/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.status === 204) { toast.success('Address removed'); fetchAddresses(); fetchProfile(); }
      else toast.error('Failed to delete address');
    } catch { toast.error('Failed to delete address'); }
  };

  const setDefault = async (addr: Address) => {
    try {
      const res = await fetch(`${API}/users/me/addresses/${addr.id}/`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) { toast.success('Default address updated'); fetchAddresses(); }
    } catch { toast.error('Failed to update address'); }
  };

  // ── Profile info save ────────────────────────────────────────────────────
  const saveInfo = async () => {
    setInfoSaving(true);
    try {
      const res = await fetch(`${API}/users/me/`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ first_name: infoForm.first_name, last_name: infoForm.last_name, phone: infoForm.phone || null, avatar_url: infoForm.avatar_url || null }),
      });
      if (res.ok) { toast.success('Profile updated'); setEditingInfo(false); fetchProfile(); }
      else { const err = await res.json(); toast.error(JSON.stringify(err)); }
    } catch { toast.error('Failed to update profile'); }
    finally { setInfoSaving(false); }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalBids = profileData?.total_bids ?? 0;
  const stats = [
    { label: 'Total Bids', value: totalBids, icon: <Gavel style={{ width: '1.1rem', height: '1.1rem', color: '#818cf8' }} />, color: '#6366f1' },
    { label: 'Active Bids', value: uniqueActiveBids.length, icon: <TrendingUp style={{ width: '1.1rem', height: '1.1rem', color: '#34d399' }} />, color: '#10b981' },
    { label: 'Auctions Won', value: wonBids.length, icon: <Trophy style={{ width: '1.1rem', height: '1.1rem', color: '#fbbf24' }} />, color: '#f59e0b' },
    { label: 'Watchlist', value: watchlist.length, icon: <Heart style={{ width: '1.1rem', height: '1.1rem', color: '#f87171' }} />, color: '#ef4444' },
  ];

  const { pct, items: completionItems } = completionScore(profileData);

  const addrTypeIcon = (t: string) => t === 'home' ? <Home style={{ width: '0.8rem', height: '0.8rem' }} /> : t === 'work' ? <Briefcase style={{ width: '0.8rem', height: '0.8rem' }} /> : <MapPin style={{ width: '0.8rem', height: '0.8rem' }} />;

  // ── History filter ───────────────────────────────────────────────────────
  const filteredHistory = bids.filter(b => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'active') return b.auction_status === 'live' || b.auction_status === 'upcoming';
    if (historyFilter === 'won') return b.auction_status === 'ended' && Number(b.amount) >= Number(b.auction_current_highest_bid);
    if (historyFilter === 'outbid') return Number(b.amount) < Number(b.auction_current_highest_bid);
    return true;
  });

  // ── Sidebar nav ──────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: 'Overview',           icon: <BarChart2 style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'info',       label: 'Personal Info',       icon: <User style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'addresses',  label: 'My Addresses',        icon: <MapPin style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'bids',       label: 'Active Bids',         icon: <Gavel style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'history',    label: 'Bid History',         icon: <Clock style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'won',        label: 'Auctions Won',        icon: <Trophy style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'watchlist',  label: 'Watchlist',           icon: <Heart style={{ width: '1rem', height: '1rem' }} /> },
    { id: 'security',   label: 'Security',            icon: <Shield style={{ width: '1rem', height: '1rem' }} /> },
  ];

  const displayName = profileData?.first_name
    ? `${profileData.first_name} ${profileData.last_name || ''}`.trim()
    : user.username?.split('@')[0] || 'User';

  const avatarInitial = displayName.charAt(0).toUpperCase();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem 0', width: '100%', minHeight: '80vh' }}>

      {/* PROFILE HEADER */}
      <div style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '1.25rem', padding: '1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {profileData?.avatar_url ? (
            <img src={profileData.avatar_url} alt="Avatar" style={{ width: '5rem', height: '5rem', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.5)' }} />
          ) : (
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'white', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              {avatarInitial}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: '#10b981', border: '2px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check style={{ width: '0.55rem', height: '0.55rem', color: 'white' }} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="m-0 text-[var(--text-main)] text-2xl font-extrabold">{displayName}</h1>
            <Pill variant={user?.role === 'seller' ? 'warning' : 'primary'}>
              {user?.role === 'seller' ? 'Seller Account' : 'Buyer Account'}
            </Pill>
          </div>
          <p className="m-0 mb-2.5 text-[var(--text-muted)] text-sm flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {user.email}
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <Pill variant="success"><BadgeCheck className="w-3 h-3" /> Email Verified</Pill>
            {profileData?.phone
              ? <Pill variant="primary"><Phone className="w-3 h-3" /> Phone Added</Pill>
              : <Pill variant="muted"><Phone className="w-3 h-3" /> Phone Not Added</Pill>
            }
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginLeft: 'auto', paddingLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center', minWidth: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                {s.icon}
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f3f4f6', lineHeight: 1 }}>{s.value}</div>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* SIDEBAR */}
        <div style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '1rem', padding: '1rem', position: 'sticky', top: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {navItems.map(n => <TabBtn key={n.id} id={n.id} active={activeTab} label={n.label} icon={n.icon} onClick={setActiveTab} />)}
          </div>
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* ── OVERVIEW ───────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div>


                {/* Profile Completion */}
                <Section title="Complete Your Profile">
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ color: '#d1d5db', fontSize: '0.875rem', fontWeight: 600 }}>Profile Strength</span>
                      <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(55,65,81,0.6)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {completionItems.map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: item.done ? '#34d399' : '#9ca3af' }}>
                        {item.done
                          ? <Check style={{ width: '0.9rem', height: '0.9rem', color: '#34d399', flexShrink: 0 }} />
                          : <div style={{ width: '0.9rem', height: '0.9rem', borderRadius: '50%', border: '2px solid #4b5563', flexShrink: 0 }} />}
                        {item.label}
                        {item.required && !item.done && <span style={{ color: '#f87171', fontSize: '0.65rem' }}>REQUIRED</span>}
                      </div>
                    ))}
                  </div>
                  {pct < 100 && (
                    <button onClick={() => setActiveTab('info')} style={{ marginTop: '1rem', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '0.6rem', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Complete Profile <ArrowRight style={{ width: '0.9rem', height: '0.9rem' }} />
                    </button>
                  )}
                </Section>

                {/* Quick active bids preview */}
                {uniqueActiveBids.length > 0 && (
                  <Section title="Active Bids" action={<button onClick={() => setActiveTab('bids')} style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>View All <ChevronRight style={{ width: '0.85rem', height: '0.85rem' }} /></button>}>
                    {uniqueActiveBids.slice(0, 3).map(bid => (
                      <div key={bid.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(31,41,55,0.5)', borderRadius: '0.75rem', marginBottom: '0.6rem', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, color: '#e5e7eb', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bid.auction_title}</p>
                          <p style={{ margin: '0.2rem 0 0', color: '#9ca3af', fontSize: '0.75rem' }}>Your bid: {fmt(bid.amount)}</p>
                        </div>
                        {Number(bid.amount) >= Number(bid.auction_current_highest_bid)
                          ? <Pill color="#34d399">Winning</Pill>
                          : <Pill color="#f87171">Outbid</Pill>}
                      </div>
                    ))}
                  </Section>
                )}
              </div>
            )}

            {/* ── PERSONAL INFO ───────────────────────────────────────── */}
            {activeTab === 'info' && (
              <Section title="Personal Information" action={
                !editingInfo
                  ? <button onClick={() => setEditingInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.6rem', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}><Edit2 style={{ width: '0.8rem', height: '0.8rem' }} /> Edit</button>
                  : <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingInfo(false)} style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid rgba(75,85,99,0.5)', borderRadius: '0.6rem', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Cancel</button>
                      <button onClick={saveInfo} disabled={infoSaving} style={{ padding: '0.45rem 0.9rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '0.6rem', color: 'white', cursor: infoSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: infoSaving ? 0.7 : 1 }}>
                        {infoSaving ? <Loader2 style={{ width: '0.8rem', height: '0.8rem', animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: '0.8rem', height: '0.8rem' }} />}
                        Save
                      </button>
                    </div>
              }>
                {profileLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {[
                      { label: 'Username', value: profileData?.username, editable: false, icon: <User style={{ width: '0.9rem', height: '0.9rem' }} /> },
                      { label: 'Email', value: profileData?.email, editable: false, icon: <Mail style={{ width: '0.9rem', height: '0.9rem' }} />, badge: <Pill color="#34d399"><BadgeCheck style={{ width: '0.6rem', height: '0.6rem' }} /> Verified</Pill> },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>{f.icon}{f.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{f.value || '—'}</span>
                          {f.badge}
                        </div>
                      </div>
                    ))}

                    {/* Editable: first name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>First Name</span>
                      {editingInfo
                        ? <input value={infoForm.first_name} onChange={e => setInfoForm(f => ({ ...f, first_name: e.target.value }))} style={{ padding: '0.4rem 0.7rem', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        : <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{profileData?.first_name || <span style={{ color: '#6b7280' }}>Not set</span>}</span>}
                    </div>

                    {/* Last name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>Last Name</span>
                      {editingInfo
                        ? <input value={infoForm.last_name} onChange={e => setInfoForm(f => ({ ...f, last_name: e.target.value }))} style={{ padding: '0.4rem 0.7rem', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        : <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{profileData?.last_name || <span style={{ color: '#6b7280' }}>Not set</span>}</span>}
                    </div>

                    {/* Phone */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}><Phone style={{ width: '0.9rem', height: '0.9rem' }} />Phone</div>
                      {editingInfo
                        ? <input value={infoForm.phone} onChange={e => setInfoForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" style={{ padding: '0.4rem 0.7rem', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{profileData?.phone ? maskPhone(profileData.phone) : <span style={{ color: '#6b7280' }}>Not added</span>}</span>
                            {!profileData?.phone && <Pill color="#6b7280">Not Verified</Pill>}
                          </div>}
                    </div>

                    {/* Role */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>Account Type</span>
                      <Pill color={user?.role === 'seller' ? '#f59e0b' : '#818cf8'}>
                        {user?.role === 'seller' ? 'Seller' : 'Buyer'}
                      </Pill>
                    </div>

                    {/* Avatar URL */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.6rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>Avatar URL</span>
                      {editingInfo
                        ? <input value={infoForm.avatar_url} onChange={e => setInfoForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://example.com/avatar.jpg" style={{ padding: '0.4rem 0.7rem', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                        : <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{profileData?.avatar_url ? 'Set (Custom URL)' : <span style={{ color: '#6b7280' }}>Not set</span>}</span>}
                    </div>

                    {!editingInfo && (
                      <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.6rem', fontSize: '0.8rem', color: '#93c5fd', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <AlertCircle style={{ width: '0.9rem', height: '0.9rem', flexShrink: 0, marginTop: '0.05rem' }} />
                        Phone numbers are masked for privacy and never shared publicly.
                      </div>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* ── ADDRESSES ───────────────────────────────────────────── */}
            {activeTab === 'addresses' && (
              <Section title="My Delivery Addresses" action={
                !showAddrForm && !editingAddr && (
                  <button onClick={() => setShowAddrForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '0.6rem', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Plus style={{ width: '0.85rem', height: '0.85rem' }} /> Add Address
                  </button>
                )
              }>
                {(showAddrForm || editingAddr) ? (
                  <div>
                    <h4 style={{ color: '#d1d5db', marginBottom: '1rem', fontWeight: 700 }}>{editingAddr ? 'Edit Address' : 'New Address'}</h4>
                    <AddressForm initial={editingAddr || undefined} onSave={saveAddress} onCancel={() => { setShowAddrForm(false); setEditingAddr(null); }} />
                  </div>
                ) : addrLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
                ) : addresses.length === 0 ? (
                  <EmptyState icon={<MapPin style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />} title="No Delivery Address" subtitle="Add an address to make future deliveries easier." action={<button onClick={() => setShowAddrForm(true)} style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '0.75rem', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>Add Address</button>} />
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {addresses.map(addr => (
                      <div key={addr.id} style={{ padding: '1.25rem', background: 'rgba(31,41,55,0.5)', border: `1px solid ${addr.is_default ? 'rgba(99,102,241,0.5)' : 'rgba(55,65,81,0.5)'}`, borderRadius: '0.875rem', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <Pill color={addr.address_type === 'home' ? '#818cf8' : addr.address_type === 'work' ? '#34d399' : '#fbbf24'}>
                            {addrTypeIcon(addr.address_type)} {addr.address_type}
                          </Pill>
                          {addr.is_default && <Pill color="#34d399"><Check style={{ width: '0.6rem', height: '0.6rem' }} /> Default</Pill>}
                        </div>
                        <p style={{ margin: '0 0 0.2rem', color: '#e5e7eb', fontWeight: 700 }}>{addr.full_name}</p>
                        <p style={{ margin: '0 0 0.1rem', color: '#9ca3af', fontSize: '0.85rem' }}>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                        <p style={{ margin: '0 0 0.1rem', color: '#9ca3af', fontSize: '0.85rem' }}>{addr.city}, {addr.state} — {addr.postal_code}</p>
                        <p style={{ margin: '0 0 0.75rem', color: '#9ca3af', fontSize: '0.85rem' }}>{addr.country}</p>
                        <p style={{ margin: '0 0 0.75rem', color: '#9ca3af', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone style={{ width: '0.75rem', height: '0.75rem' }} />{maskPhone(addr.phone)}</p>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                          {!addr.is_default && <button onClick={() => setDefault(addr)} style={{ padding: '0.35rem 0.85rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Set Default</button>}
                          <button onClick={() => { setEditingAddr(addr); setShowAddrForm(false); }} style={{ padding: '0.35rem 0.85rem', background: 'rgba(55,65,81,0.4)', border: '1px solid rgba(75,85,99,0.4)', borderRadius: '0.5rem', color: '#d1d5db', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Edit2 style={{ width: '0.7rem', height: '0.7rem' }} />Edit</button>
                          <button onClick={() => deleteAddress(addr.id)} style={{ padding: '0.35rem 0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 style={{ width: '0.7rem', height: '0.7rem' }} />Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── ACTIVE BIDS ─────────────────────────────────────────── */}
            {activeTab === 'bids' && (
              <Section title="Active Bids">
                {bidsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
                ) : uniqueActiveBids.length === 0 ? (
                  <EmptyState icon={<Gavel style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />} title="No Active Bids" subtitle="You haven't placed any active bids yet. Head to the auctions page to start bidding!" action={<Link to="/auctions" style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '0.75rem', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>Explore Auctions <ArrowRight style={{ width: '0.9rem', height: '0.9rem' }} /></Link>} />
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {uniqueActiveBids.map(bid => {
                      const isWinning = Number(bid.amount) >= Number(bid.auction_current_highest_bid);
                      return (
                        <div key={bid.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1.1rem', background: 'rgba(31,41,55,0.5)', border: `1px solid ${isWinning ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '0.875rem' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '0.6rem', background: 'rgba(55,65,81,0.5)', overflow: 'hidden', flexShrink: 0 }}>
                            {bid.auction_image_url
                              ? <img src={bid.auction_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} /></div>}
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.3rem', color: '#e5e7eb', fontWeight: 700, fontSize: '0.925rem' }}>{bid.auction_title}</p>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                              <span style={{ color: '#9ca3af' }}>Current: <strong style={{ color: '#f3f4f6' }}>{fmt(bid.auction_current_highest_bid)}</strong></span>
                              <span style={{ color: '#9ca3af' }}>Your bid: <strong style={{ color: isWinning ? '#34d399' : '#f87171' }}>{fmt(bid.amount)}</strong></span>
                              <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock style={{ width: '0.75rem', height: '0.75rem' }} />{timeLeft(bid.auction_end_time)}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            {isWinning ? <Pill color="#34d399"><Trophy style={{ width: '0.65rem', height: '0.65rem' }} /> Winning</Pill> : <Pill color="#f87171"><TrendingUp style={{ width: '0.65rem', height: '0.65rem' }} /> Outbid</Pill>}
                            <Link to={`/auction/${bid.auction_item}`} style={{ padding: '0.35rem 0.85rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', color: '#a5b4fc', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}>View</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {/* ── BID HISTORY ─────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <Section title="Bid History">
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {(['all', 'active', 'won', 'outbid'] as const).map(f => (
                    <button key={f} onClick={() => setHistoryFilter(f)} style={{ padding: '0.35rem 0.9rem', borderRadius: '9999px', border: `1px solid ${historyFilter === f ? 'rgba(99,102,241,0.5)' : 'rgba(75,85,99,0.4)'}`, background: historyFilter === f ? 'rgba(99,102,241,0.15)' : 'transparent', color: historyFilter === f ? '#a5b4fc' : '#9ca3af', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {f}
                    </button>
                  ))}
                </div>
                {bidsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
                ) : filteredHistory.length === 0 ? (
                  <EmptyState icon={<Clock style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />} title="No Bid History" subtitle="Your complete bidding history will appear here." />
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {filteredHistory.map(bid => {
                      const ended = bid.auction_status === 'ended';
                      const isWinning = Number(bid.amount) >= Number(bid.auction_current_highest_bid);
                      let statusColor = '#818cf8'; let statusLabel = 'Active';
                      if (ended && isWinning) { statusColor = '#fbbf24'; statusLabel = 'Won'; }
                      else if (ended && !isWinning) { statusColor = '#6b7280'; statusLabel = 'Lost'; }
                      else if (!isWinning) { statusColor = '#f87171'; statusLabel = 'Outbid'; }
                      return (
                        <div key={bid.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.75rem', border: '1px solid rgba(55,65,81,0.4)' }}>
                          <div>
                            <p style={{ margin: '0 0 0.2rem', color: '#e5e7eb', fontWeight: 600, fontSize: '0.875rem' }}>{bid.auction_title}</p>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                              <span>Bid: <strong style={{ color: '#f3f4f6' }}>{fmt(bid.amount)}</strong></span>
                              <span>Current: <strong>{fmt(bid.auction_current_highest_bid)}</strong></span>
                              <span>{new Date(bid.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                            <Pill color={statusColor}>{statusLabel}</Pill>
                            <Link to={`/auction/${bid.auction_item}`} style={{ color: '#818cf8', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 600 }}>View →</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {/* ── WON AUCTIONS ────────────────────────────────────────── */}
            {activeTab === 'won' && (
              <Section title="Auctions Won">
                {bidsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
                ) : wonBids.length === 0 ? (
                  <EmptyState icon={<Trophy style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />} title="No Auctions Won Yet" subtitle="Win an auction by placing the highest bid before it closes. Keep bidding!" action={<Link to="/auctions" style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '0.75rem', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>Explore Auctions <ArrowRight style={{ width: '0.9rem', height: '0.9rem' }} /></Link>} />
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {wonBids.map(bid => (
                      <div key={bid.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1.1rem', background: 'rgba(31,41,55,0.5)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '0.875rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '0.6rem', background: 'rgba(55,65,81,0.5)', overflow: 'hidden' }}>
                          {bid.auction_image_url ? <img src={bid.auction_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} /></div>}
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.3rem', color: '#e5e7eb', fontWeight: 700 }}>{bid.auction_title}</p>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                            <span>Winning bid: <strong style={{ color: '#fbbf24' }}>{fmt(bid.amount)}</strong></span>
                            <span>Ended: {new Date(bid.auction_end_time).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                          <Pill color="#fbbf24"><Trophy style={{ width: '0.65rem', height: '0.65rem' }} /> Won</Pill>
                          <Link to={`/auction/${bid.auction_item}`} style={{ padding: '0.35rem 0.85rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', color: '#a5b4fc', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}>View</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── WATCHLIST ────────────────────────────────────────────── */}
            {activeTab === 'watchlist' && (
              <Section title="My Watchlist">
                {watchedAuctions.length === 0 ? (
                  <EmptyState icon={<Heart style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />} title="Your Watchlist Is Empty" subtitle="Tap the heart icon on any auction card to save it here for quick access." action={<Link to="/auctions" style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '0.75rem', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>Explore Auctions <ArrowRight style={{ width: '0.9rem', height: '0.9rem' }} /></Link>} />
                ) : (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {watchedAuctions.map(auction => (
                      <div key={auction.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(31,41,55,0.5)', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '0.875rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '0.6rem', overflow: 'hidden', background: 'rgba(55,65,81,0.5)' }}>
                          {auction.image_url ? <img src={auction.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package style={{ color: '#6b7280', width: '1.5rem', height: '1.5rem' }} /></div>}
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.25rem', color: '#e5e7eb', fontWeight: 700, fontSize: '0.9rem' }}>{auction.title}</p>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                            <span>Current: <strong style={{ color: '#f3f4f6' }}>{fmt(auction.current_price)}</strong></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock style={{ width: '0.7rem', height: '0.7rem' }} />{timeLeft(auction.end_time)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                          <Link to={`/auction/${auction.id}`} style={{ padding: '0.35rem 0.85rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', color: '#a5b4fc', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}>View</Link>
                          <button onClick={() => toggleWatchlist(auction.id)} style={{ padding: '0.35rem 0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── SECURITY ─────────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div>
                <Section title="Login & Authentication">
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {[
                      { label: 'Password Login', desc: 'Sign in with email and password', status: 'Active', color: '#34d399' },
                      { label: 'Google Login', desc: 'Sign in with your Google account', status: 'Supported', color: '#818cf8' },
                      { label: 'Two-Factor Auth', desc: 'Add an extra layer of security', status: 'Not Available', color: '#6b7280' },
                      { label: 'OTP Login', desc: 'One-time password via email', status: 'Not Available', color: '#6b7280' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.75rem', border: '1px solid rgba(55,65,81,0.4)' }}>
                        <div>
                          <p style={{ margin: '0 0 0.2rem', color: '#e5e7eb', fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.78rem' }}>{item.desc}</p>
                        </div>
                        <Pill color={item.color}>{item.status}</Pill>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="Privacy Notice">
                  <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
                    {[
                      '🔒 Your delivery addresses are private and never shown to other users.',
                      '📞 Phone numbers are masked in the UI and not included in public auction data.',
                      '🛡️ JWT authentication tokens are stored only in your browser\'s localStorage.',
                      '🚫 Your email is never exposed in bid listings — only your username is shown.',
                    ].map((note, i) => <p key={i} style={{ margin: 0, padding: '0.6rem 0.8rem', background: 'rgba(31,41,55,0.4)', borderRadius: '0.5rem' }}>{note}</p>)}
                  </div>
                </Section>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
