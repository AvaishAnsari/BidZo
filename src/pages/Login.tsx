import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, Gavel, AlertCircle, Eye, EyeOff, ShieldCheck, TrendingUp, Users, Sparkles, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  email:    z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormVals = z.infer<typeof schema>;

const Particle = ({ style }: { style: React.CSSProperties }) => (
  <motion.div className="absolute rounded-full pointer-events-none" style={style}
    animate={{ y:[0,-110,0], opacity:[0,1,0], scale:[0.4,1.3,0.4] }}
    transition={{ duration: Math.random()*6+5, repeat:Infinity, delay:Math.random()*4, ease:'easeInOut' }}
  />
);

const PARTICLES = Array.from({length:18},(_,i)=>({
  id:i,
  style:{
    width:`${Math.random()*6+2}px`, height:`${Math.random()*6+2}px`,
    left:`${Math.random()*100}%`, bottom:`${Math.random()*30}%`,
    background: i%3===0 ? 'rgba(99,102,241,0.9)' : i%3===1 ? 'rgba(168,85,247,0.9)' : 'rgba(236,72,153,0.9)',
    filter:'blur(1px)',
  } as React.CSSProperties
}));

const REVIEWS = [
  { name:'Alex M.', text:'Won my first auction in 10 mins!', stars:5 },
  { name:'Sarah K.', text:'Best bidding platform, period.', stars:5 },
  { name:'Raj P.', text:'Selling is super easy here.', stars:5 },
];

export const Login = () => {
  const { signIn, signInWithGoogle, isConfigured } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  const [showPw, setShowPw]     = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  const { register, handleSubmit, formState:{errors} } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email:'', password:'' },
  });

  const from = (location.state as any)?.from?.pathname ?? '/';

  const onSubmit = async (data: FormVals) => {
    setErrorMsg(null); setLoading(true);
    const { error } = await signIn(data.email.trim(), data.password);
    setLoading(false);
    if (error) { setErrorMsg(error); return; }
    toast.success('Welcome back! 👋');
    navigate(from, { replace:true });
  };

  const onGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { toast.error(error); setLoading(false); }
  };

  const inp = (err:boolean) => `
    w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all
    border ${err ? 'border-red-500/50 bg-red-900/10' : 'border-white/8 bg-white/5 focus:border-brand-500/60 focus:bg-white/8'}
  `;

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden"
      style={{ background:'linear-gradient(135deg,#04021a 0%,#070420 40%,#0a0320 70%,#060215 100%)' }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <motion.div animate={{scale:[1,1.2,1],opacity:[0.3,0.5,0.3]}} transition={{duration:8,repeat:Infinity}}
          className="absolute -top-64 -right-64 w-[700px] h-[700px] rounded-full"
          style={{background:'radial-gradient(circle,rgba(99,102,241,0.35) 0%,transparent 70%)',filter:'blur(80px)'}}/>
        <motion.div animate={{scale:[1,1.15,1],opacity:[0.2,0.4,0.2]}} transition={{duration:11,repeat:Infinity,delay:2}}
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full"
          style={{background:'radial-gradient(circle,rgba(168,85,247,0.35) 0%,transparent 70%)',filter:'blur(80px)'}}/>
        <motion.div animate={{x:[0,-40,0],y:[0,30,0]}} transition={{duration:13,repeat:Infinity,ease:'easeInOut'}}
          className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full opacity-12"
          style={{background:'radial-gradient(circle,rgba(236,72,153,0.35) 0%,transparent 70%)',filter:'blur(60px)'}}/>
      </div>

      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {PARTICLES.map(p=><Particle key={p.id} style={p.style}/>)}
      </div>

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{backgroundImage:'linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>

      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] flex-col justify-between p-12 xl:p-16 relative">
        <div className="absolute right-0 top-[10%] bottom-[10%] w-px"
          style={{background:'linear-gradient(180deg,transparent,rgba(99,102,241,0.5) 30%,rgba(168,85,247,0.5) 70%,transparent)'}}/>

        {/* Logo */}
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
          className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-md bg-brand-500/50"/>
            <div className="relative bg-gradient-to-br from-brand-500 to-accent-600 p-2.5 rounded-xl">
              <Gavel className="w-6 h-6 text-white"/>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">
            Bid<span className="gradient-text">Zo</span>
          </span>
        </motion.div>

        {/* Hero */}
        <motion.div initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} transition={{duration:0.7,delay:0.2}}
          className="space-y-8">
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:0.4}}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-300"
            style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.3)'}}>
            <Sparkles className="w-3.5 h-3.5"/> Trusted by 12,000+ bidders worldwide
          </motion.div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            The smarter way<br/>to <span className="relative inline-block">
              <span className="gradient-text">bid & win</span>
              <motion.span animate={{scaleX:[0,1]}} transition={{delay:0.9,duration:0.6}}
                className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left"
                style={{background:'linear-gradient(90deg,#6366f1,#a855f7)'}}/>
            </span>
          </h1>

          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Real-time auctions, instant notifications, and secure payments — all in one place.
          </p>

          {/* Stats */}
          <div className="flex gap-8">
            {([['12K+','Active Bidders',Users],['38K+','Auctions Won',TrendingUp]] as [string,string,React.ElementType][]).map(([val,label,Icon])=>{
              return (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold gradient-text">{val}</span>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Icon className="w-3 h-3"/>{label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Animated review card */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div key={reviewIdx}
                initial={{opacity:0,y:12,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:0.97}}
                transition={{duration:0.4}}
                className="rounded-2xl p-5 max-w-xs"
                style={{background:'linear-gradient(145deg,rgba(20,15,60,0.7),rgba(10,8,30,0.8))',border:'1px solid rgba(99,102,241,0.18)',boxShadow:'0 10px 40px rgba(0,0,0,0.4)'}}>
                <div className="flex gap-0.5 mb-2">
                  {Array.from({length:REVIEWS[reviewIdx].stars}).map((_,i)=>(
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"/>
                  ))}
                </div>
                <p className="text-sm text-gray-300 italic mb-3">"{REVIEWS[reviewIdx].text}"</p>
                <p className="text-xs font-bold text-gray-500">— {REVIEWS[reviewIdx].name}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-1.5 mt-3">
              {REVIEWS.map((_,i)=>(
                <button key={i} onClick={()=>setReviewIdx(i)}
                  className="h-1 rounded-full transition-all"
                  style={{width: i===reviewIdx?'24px':'8px', background: i===reviewIdx?'rgba(99,102,241,0.8)':'rgba(255,255,255,0.15)'}}/>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Trust */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}
          className="flex items-center gap-2 text-xs text-gray-700">
          <ShieldCheck className="w-4 h-4 text-brand-600"/>
          <span>Bank-grade encryption · 2FA supported · Zero fees</span>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{opacity:0,y:28,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
          transition={{duration:0.6,type:'spring',bounce:0.3}} className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="bg-gradient-to-br from-brand-500 to-accent-600 p-2 rounded-xl">
              <Gavel className="w-5 h-5 text-white"/>
            </div>
            <span className="text-xl font-extrabold text-white">Bid<span className="gradient-text">Zo</span></span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1.5">
              Welcome back 👋
            </h2>
            <p className="text-sm text-gray-500">Sign in to continue your bidding journey</p>
            {!isConfigured && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-300"
                style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)'}}>
                🔌 Offline mode
              </div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                className="mb-5 overflow-hidden">
                <div className="flex gap-2.5 px-4 py-3 rounded-xl text-sm text-red-300"
                  style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)'}}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400"/>
                  {errorMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google */}
          <motion.button whileHover={{scale:1.01,boxShadow:'0 0 25px rgba(99,102,241,0.25)'}} whileTap={{scale:0.98}}
            onClick={onGoogle} disabled={loading || !isConfigured}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm text-white mb-5 transition-all disabled:opacity-50"
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8"/>
            <span className="text-xs text-gray-600 font-medium shrink-0">or with email</span>
            <div className="flex-1 h-px bg-white/8"/>
          </div>

          {/* Form card */}
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.25}}
            className="rounded-2xl p-6 space-y-4"
            style={{background:'linear-gradient(145deg,rgba(20,15,60,0.7) 0%,rgba(12,8,35,0.8) 100%)',border:'1px solid rgba(99,102,241,0.15)',backdropFilter:'blur(24px)',boxShadow:'0 25px 80px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05)'}}>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-400 transition-colors"/>
                  <input id="login-email" type="email" autoComplete="email" {...register('email')} placeholder="you@example.com" className={inp(!!errors.email)}/>
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Password</label>
                  <a href="#" className="text-xs text-brand-500 hover:text-brand-400 transition-colors font-medium">Forgot?</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-brand-400 transition-colors"/>
                  <input id="login-pw" type={showPw?'text':'password'} autoComplete="current-password" {...register('password')} placeholder="••••••••" className={`${inp(!!errors.password)} pr-11`}/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-brand-400 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.password.message}</p>}
              </div>

              {/* Remember */}
              <div className="flex items-center gap-2">
                <input id="remember" type="checkbox" className="h-4 w-4 rounded accent-brand-500 cursor-pointer"/>
                <label htmlFor="remember" className="text-sm text-gray-500 cursor-pointer select-none">Keep me signed in</label>
              </div>

              {/* Submit */}
              <motion.button type="submit" id="login-submit" disabled={loading}
                whileHover={{scale:loading?1:1.02, boxShadow:'0 0 35px rgba(99,102,241,0.6)'}}
                whileTap={{scale:loading?1:0.97}}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white tracking-wide transition-all disabled:opacity-60 relative overflow-hidden"
                style={{background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a21caf 100%)',boxShadow:'0 0 25px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.15)'}}>
                <motion.div animate={{x:['-100%','200%']}} transition={{duration:2.5,repeat:Infinity,repeatDelay:1.5}}
                  className="absolute inset-0" style={{background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)'}}/>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Signing in…</> : <><Zap className="w-4 h-4"/>Sign in to BidZo</>}
                </span>
              </motion.button>
            </form>
          </motion.div>

          <p className="mt-6 text-center text-sm text-gray-600">
            New to BidZo?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">Create free account →</Link>
          </p>
          <div className="mt-4 flex justify-center items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-700"/>
            <span className="text-xs text-gray-700">256-bit SSL encrypted</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
