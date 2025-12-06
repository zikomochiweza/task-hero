import { useState, useEffect } from 'react';
import { useTask } from '../context/TaskContext';
import { supabase } from '../supabaseClient';
import { getLeagueThresholds } from '../data/mockData';

const LeagueView = () => {
  const { user, clearLeagueNotification } = useTask();
  const [leagueUsers, setLeagueUsers] = useState([]);
  
  // Clear notification when viewing league
  useEffect(() => {
      clearLeagueNotification();
  }, []);
  
  // Fetch Leaderboard Data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('league', user.league)
        .eq('cohort_id', user.cohortId) // Only show users in my cohort
        .order('xp', { ascending: false })
        .limit(50);

      if (data) {
        setLeagueUsers(data);
      }
    };

    fetchLeaderboard();

    // Real-time Subscription
    const subscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user.league]);

  // Get promotion/relegation thresholds for the current league
  const thresholds = getLeagueThresholds(user.league);

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 space-y-6">
      
      {/* Top Section: Header & Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Header Icon */}
        <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center text-4xl text-white shadow-xl shadow-orange-500/30 mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
            🏆
            </div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Leaderboard</h2>
            <p className="text-gray-600 dark:text-gray-400 font-bold">Top players in {user.league} League</p>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 h-full flex flex-col justify-center">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-xl">
                <div className="text-green-600 dark:text-green-400 font-bold mb-1">Top {thresholds.promote}</div>
                <div className="text-green-600/70 dark:text-green-400/70 font-medium">Promote</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
                <div className="text-gray-700 dark:text-gray-400 font-bold mb-1">Middle</div>
                <div className="text-gray-600 dark:text-gray-500 font-medium">Stay</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-xl">
                <div className="text-red-600 dark:text-red-400 font-bold mb-1">Bottom {thresholds.relegate}</div>
                <div className="text-red-600/70 dark:text-red-400/70 font-medium">Relegate</div>
            </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 font-bold">
            League resets every Monday at 00:00
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {leagueUsers.map((u, index) => {
          const rank = index + 1;
          const isMe = u.email === user.email;
          // Determine status based on rank and thresholds
          const isPromoting = rank <= thresholds.promote;
          // Only relegate if league is full (25 users)
          const isRelegating = leagueUsers.length >= 25 && rank > leagueUsers.length - thresholds.relegate;
          
          return (
            <div 
              key={u.id} 
              className={`
                p-4 flex items-center justify-between rounded-2xl border transition-all duration-300
                ${isMe 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 transform scale-[1.02]' 
                    : 'bg-white dark:bg-dark-800 border-gray-100 dark:border-dark-700 hover:border-gray-200'}
              `}
            >
              <div className="flex items-center gap-4">
                <span className={`
                  w-8 h-8 flex items-center justify-center font-black text-lg
                  ${isMe ? 'text-blue-200' : 'text-gray-500'}
                  ${rank <= 3 && !isMe ? 'text-2xl' : ''}
                `}>
                  {rank === 1 && '🥇'}
                  {rank === 2 && '🥈'}
                  {rank === 3 && '🥉'}
                  {rank > 3 && rank}
                </span>
                
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden
                        ${isMe ? 'bg-white text-blue-600' : 'bg-gray-100 dark:bg-dark-700 text-gray-600'}
                    `}>
                        {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                            u.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <div className={`font-bold text-sm ${isMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                            {u.name} {isMe && <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded ml-1">You</span>}
                        </div>
                        <div className={`text-xs ${isMe ? 'text-blue-100' : 'text-gray-600 font-medium'}`}>
                            {u.xp} XP
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                {isPromoting && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isMe ? 'bg-green-400 text-white' : 'bg-green-100 text-green-600'}`}>Promoting</span>}
                {isRelegating && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isMe ? 'bg-red-400 text-white' : 'bg-red-100 text-red-600'}`}>Relegating</span>}
              </div>
            </div>
          );
        })}
        {leagueUsers.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                No players in this league yet. Be the first! 🚀
            </div>
        )}
      </div>
    </div>
  );
};

export default LeagueView;
