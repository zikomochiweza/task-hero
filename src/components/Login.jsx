import { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-dark-900 p-4">
      <div className="bg-white dark:bg-dark-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gold rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-orange-500/20">
          🎯
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">TaskHero</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to sync your tasks across devices</p>

        {sent ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl text-green-600 dark:text-green-400 font-medium">
            ✅ Magic link sent! Check your email to log in.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full p-4 bg-gray-50 dark:bg-dark-700 border-none rounded-2xl focus:ring-2 focus:ring-gold text-gray-900 dark:text-white placeholder-gray-400 font-medium transition-all"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className="w-full py-4 bg-gold text-dark-900 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Magic Link ✨'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
