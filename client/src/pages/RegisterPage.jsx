import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || 'paruluniversity.ac.in';

export default function RegisterPage() {
  const { register, sendOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    if (!form.email.toLowerCase().endsWith(`@${DOMAIN}`)) return `Only @${DOMAIN} emails allowed`;
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    if (otpSent && form.otp.length !== 6) return 'OTP must be 6 digits';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setError('');
    setLoading(true);
    try {
      if (!otpSent) {
        await sendOtp(form.email);
        setOtpSent(true);
      } else {
        await register(form.email, form.password, form.name, form.otp);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || (otpSent ? 'Registration failed' : 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        {error && <p className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</p>}
        {otpSent && <p className="bg-green-50 text-green-600 text-sm p-2 rounded mb-4">OTP sent to your email!</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!otpSent && [
            { key: 'name',     label: 'Full Name',        type: 'text',     autocomplete: 'name' },
            { key: 'email',    label: `Email (@${DOMAIN})`, type: 'email',  autocomplete: 'email' },
            { key: 'password', label: 'Password',         type: 'password', autocomplete: 'new-password' },
            { key: 'confirm',  label: 'Confirm Password', type: 'password', autocomplete: 'new-password' },
          ].map(({ key, label, type, autocomplete }) => {
            const isPassword = type === 'password';
            const inputType = isPassword && showPassword ? 'text' : type;

            return (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <div className={isPassword ? "relative" : ""}>
                  <input
                    type={inputType}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-blue ${isPassword ? 'pr-14' : ''}`}
                    required
                    autoComplete={autocomplete}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {otpSent && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  className="w-full border rounded px-3 py-2 text-sm bg-gray-100 text-gray-500 focus:outline-none"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enter OTP</label>
                <input
                  type="text"
                  value={form.otp}
                  onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-campus-blue"
                  required
                  maxLength={6}
                  placeholder="123456"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-campus-blue text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (otpSent ? 'Verifying…' : 'Sending OTP…') : (otpSent ? 'Verify & Register' : 'Send OTP')}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          Already have an account? <Link to="/login" className="text-campus-blue hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
