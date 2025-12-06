import { useEffect } from 'react';
import { useTask } from '../context/TaskContext';
import { supabase } from '../supabaseClient';
import { useState } from 'react';

const ProfileView = () => {
  const { user, clearAchievementNotification, updateProfileInSupabase } = useTask();
  const [uploading, setUploading] = useState(false);

  // Clear notification when viewing profile
  useEffect(() => {
      clearAchievementNotification();
  }, []);

  // List of achievements with unlock conditions
  const achievements = [
    { id: 1, icon: '🥉', title: 'Podium Finish', desc: 'Finish in Top 3', unlocked: user.top3Finishes > 0, count: user.top3Finishes },
    { id: 2, icon: '👑', title: 'Champion', desc: 'Win the Finals', unlocked: user.finalsWon > 0, count: user.finalsWon },
    { id: 3, icon: '🔥', title: 'On Fire', desc: '7 Day Streak', unlocked: user.streak7Count > 0, count: user.streak7Count },
    { id: 4, icon: '💯', title: 'Centurion', desc: '100 Tasks Done', unlocked: user.completedTasks >= 100, count: Math.floor(user.completedTasks / 100) },
    { id: 5, icon: '🌙', title: 'Night Owl', desc: 'Login after 10PM', unlocked: user.nightOwlCount > 0, count: user.nightOwlCount },
    { id: 6, icon: '💎', title: 'Diamond', desc: 'Reach Diamond League', unlocked: user.league === 'Diamond', count: user.league === 'Diamond' ? 1 : 0 },
    { id: 7, icon: '🌅', title: 'Early Bird', desc: 'Task 5AM-9AM', unlocked: user.earlyBirdCount > 0, count: user.earlyBirdCount },
  ];

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 space-y-6">
      
      {/* Top Section: User Card & Stats Grid - Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* User Info Card */}
        <div className="bg-white dark:bg-dark-800 rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col items-center text-center relative overflow-hidden h-full justify-center">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10"></div>
            
            <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-xl relative z-10 mb-4 group">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl text-white overflow-hidden relative">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        '👤'
                    )}
                    
                    {/* Upload Overlay */}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-xs text-white font-bold">{uploading ? '...' : 'Change'}</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                                try {
                                    setUploading(true);
                                    if (!e.target.files || e.target.files.length === 0) {
                                        throw new Error('You must select an image to upload.');
                                    }

                                    const file = e.target.files[0];
                                    const fileExt = file.name.split('.').pop();
                                    // Sanitize filename: remove special chars from email, use timestamp
                                    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9]/g, '');
                                    const fileName = `${sanitizedEmail}-${Date.now()}.${fileExt}`;
                                    const filePath = `${fileName}`;

                                    const { error: uploadError } = await supabase.storage
                                        .from('avatars')
                                        .upload(filePath, file);

                                    if (uploadError) {
                                        throw uploadError;
                                    }

                                    const { data: { publicUrl } } = supabase.storage
                                        .from('avatars')
                                        .getPublicUrl(filePath);

                                    await updateProfileInSupabase({ avatarUrl: publicUrl });
                                } catch (error) {
                                    alert(error.message);
                                } finally {
                                    setUploading(false);
                                }
                            }}
                            disabled={uploading}
                        />
                    </label>
                </div>
                <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
            </div>
            
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-1 relative z-10">{user.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 relative z-10 font-medium">{user.email}</p>
            
            <div className={`relative z-10 px-6 py-2.5 rounded-2xl text-white font-bold shadow-lg shadow-orange-500/20 flex items-center gap-2
                ${user.league === 'Bronze' ? 'bg-gradient-to-r from-orange-700 to-orange-500' : ''}
                ${user.league === 'Silver' ? 'bg-gradient-to-r from-gray-400 to-gray-300' : ''}
                ${user.league === 'Gold' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : ''}
                ${user.league === 'Diamond' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : ''}
            `}>
                <span>
                    {user.league === 'Bronze' && '🥉'}
                    {user.league === 'Silver' && '🥈'}
                    {user.league === 'Gold' && '👑'}
                    {user.league === 'Diamond' && '💎'}
                </span>
                <span>{user.league} League</span>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-4">
            {/* Blue Card - Total XP */}
            <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="relative z-10">
                    <div className="text-4xl font-black mb-1">{user.totalXp || 0}</div>
                    <div className="text-blue-100 font-medium">Total XP</div>
                    <div className="h-1 w-full bg-blue-500/50 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-white/50 w-3/4 rounded-full"></div>
                    </div>
                    <p className="text-blue-100/80 text-xs mt-2 font-medium">Top 5% of players this week</p>
                </div>
                <div className="absolute -right-4 -top-4 text-9xl opacity-10 rotate-12">⚡</div>
            </div>

            {/* Orange Card - Streak */}
            <div className="bg-orange-500 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="relative z-10">
                    <div className="text-4xl font-black mb-1">{user.streak}</div>
                    <div className="text-orange-100 font-medium">Day Streak</div>
                    <div className="flex gap-1 mt-4">
                        {[1,2,3,4,5,6,7].map(d => (
                            <div key={d} className={`h-2 flex-1 rounded-full ${d <= (user.streak % 7 || 7) ? 'bg-white' : 'bg-white/20'}`}></div>
                        ))}
                    </div>
                    <p className="text-orange-100/80 text-xs mt-2 font-medium">You're on fire! 🔥</p>
                </div>
                <div className="absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12">🔥</div>
            </div>

            {/* Green Card - Tasks */}
            <div className="bg-emerald-500 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="relative z-10">
                    <div className="text-4xl font-black mb-1">{user.completedTasks}</div>
                    <div className="text-emerald-100 font-medium">Tasks Completed</div>
                    <div className="mt-4 h-12 flex items-end gap-1.5 opacity-80">
                        <div className="w-full bg-white/20 rounded-t-sm h-[40%]"></div>
                        <div className="w-full bg-white/40 rounded-t-sm h-[60%]"></div>
                        <div className="w-full bg-white/30 rounded-t-sm h-[30%]"></div>
                        <div className="w-full bg-white rounded-t-sm h-[80%]"></div>
                        <div className="w-full bg-white/50 rounded-t-sm h-[50%]"></div>
                    </div>
                </div>
                <div className="absolute -right-4 -top-4 text-9xl opacity-10 rotate-12">✅</div>
            </div>
        </div>
      </div>

      {/* Achievements Section - Full Width */}
      <div className="bg-white dark:bg-dark-800 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-dark-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 px-2">Achievements</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
          {achievements.map((ach) => (
            <div 
                key={ach.id} 
                className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all cursor-pointer border-2 relative group
                    ${ach.unlocked 
                        ? 'bg-yellow-50 border-yellow-100 text-yellow-600' 
                        : 'bg-gray-50 border-transparent opacity-40 grayscale hover:grayscale-0 hover:opacity-70'}
                `}
                title={ach.desc}
            >
              <span className="text-4xl mb-2 transform group-hover:scale-110 transition-transform">{ach.icon}</span>
              <span className="text-[10px] text-center font-bold leading-tight uppercase tracking-wide opacity-80">{ach.title}</span>
              {ach.count > 1 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white">
                      {ach.count}
                  </span>
              )}
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default ProfileView;
