import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ step?: string; token?: string; user?: any }>('/auth/login', { 
        data: { email: email.toLowerCase(), password } 
      });

      if (response.token) {
        // Direct Login Success (Bypassing MFA)
        localStorage.setItem('ishpo_jwt', response.token);
        await refreshAuth();
        
        const role = response.user?.role;
        switch (role) {
          case 'super_admin': navigate('/super-admin'); break;
          case 'admin':
          case 'foe': navigate('/admin'); break;
          case 'hr_manager': navigate('/hr'); break;
          case 'sports_scientist': navigate('/sports-scientist'); break;
          case 'coach': navigate('/ams/coach-dashboard'); break;
          case 'client':
          case 'athlete': navigate('/client'); break;
          case 'consultant':
          case 'sports_physician':
          case 'physiotherapist':
          case 'nutritionist':
          case 'massage_therapist': navigate('/consultant'); break;
          default: navigate('/');
        }
      } else if (response.step === 'otp') {
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ token: string; user: any }>('/auth/verify', {
        data: { email, otp }
      });
      
      // Store the JWT in localStorage
      localStorage.setItem('ishpo_jwt', response.token);
      
      // Refresh AuthContext state
      await refreshAuth();
      
      // Redirect to a protected page based on role
      const role = response.user?.role;
      switch (role) {
        case 'super_admin':
          navigate('/super-admin');
          break;
        case 'admin':
        case 'foe':
          navigate('/admin');
          break;
        case 'hr_manager':
          navigate('/hr');
          break;
        case 'sports_scientist':
          navigate('/sports-scientist');
          break;
        case 'coach':
          navigate('/ams/coach-dashboard');
          break;
        case 'client':
        case 'athlete':
          navigate('/client');
          break;
        case 'consultant':
        case 'sports_physician':
        case 'physiotherapist':
        case 'nutritionist':
        case 'massage_therapist':
          navigate('/consultant');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto flex">
      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="bg-white p-2 rounded-2xl inline-block mb-12 shadow-2xl overflow-hidden border border-white/20">
            <img 
              src="/cssh_logo.jpg" 
              alt="CSSH Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground tracking-wide">ISHPO</h1>
          </div>
          
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight mb-6">
            Integrated Sports Health & Physio Operating System
          </h2>
          <p className="text-lg text-sidebar-foreground/80 leading-relaxed mb-10">
            Streamline clinical workflows, track patient progress, and manage your practice — all in one platform built for sports health professionals.
          </p>
          <p className="text-sm text-sidebar-foreground/60">
            ISHPO is a product of CSSH (Center For Spine and Sports Health)
          </p>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">ISHPO</h1>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-100/50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground">Welcome back</h2>
                <p className="text-muted-foreground mt-2">Sign in to your account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="you@clinic.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-md bg-[#169d82] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#12826a] focus:outline-none focus:ring-2 focus:ring-[#169d82] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      Sign In <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-[#169d82] hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground">Two-Factor Auth</h2>
                <p className="text-muted-foreground mt-2">
                  We've sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-foreground">
                    Login Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-xl tracking-widest ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex w-full items-center justify-center rounded-md bg-[#169d82] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#12826a] focus:outline-none focus:ring-2 focus:ring-[#169d82] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Verifying...' : 'Verify & Complete'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError(null); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  Go back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
