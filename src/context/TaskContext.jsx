import { createContext, useContext, useState, useEffect } from 'react';
import { LEAGUES, getLeagueThresholds } from '../data/mockData';
import { supabase } from '../supabaseClient';

const TaskContext = createContext();

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('taskquest_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // User State (synced with Supabase)
  const [user, setUser] = useState({
    xp: 0,
    totalXp: 0,
    league: 'Bronze',
    streak: 0,
    lastLogin: new Date().toISOString(),
    completedTasks: 0,
    top3Finishes: 0,
    finalsWon: 0,
    nightOwlCount: 0,
    streak7Count: 0,
    name: 'TaskHero User',
    email: 'user@taskhero.app'
  });

  // 1. Handle Auth & Initial Profile Fetch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchOrCreateProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchOrCreateProfile(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch or Create Profile in Supabase
  const fetchOrCreateProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        // Get an open cohort first
        const { data: cohortId } = await supabase.rpc('get_open_cohort', { user_league: 'Bronze' });
        
        const newProfile = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0],
          xp: 0,
          league: 'Bronze',
          cohort_id: cohortId,
          streak: 1,
          last_login: new Date().toISOString(),
          night_owl_count: 0,
          streak_7_count: 0,
          finals_won: 0,
          top_3_finishes: 0
        };
        const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
        if (!insertError) {
            setUser(prev => ({ ...prev, ...newProfile }));
        }
      } else if (data) {
        // Profile exists, check for cohort assignment
        let cohortId = data.cohort_id;

        // Auto-assign cohort if missing (migration for existing users)
        if (!cohortId) {
            const { data: newCohortId } = await supabase.rpc('get_open_cohort', { user_league: data.league || 'Bronze' });
            if (newCohortId) {
                await supabase.from('profiles').update({ cohort_id: newCohortId }).eq('id', authUser.id);
                cohortId = newCohortId;
            }
        }

        // --- STREAK LOGIC ---
        const today = new Date();
        const lastLogin = new Date(data.last_login);
        
        // Reset time part to compare dates only (UTC)
        const todayStr = today.toISOString().split('T')[0];
        const lastLoginStr = lastLogin.toISOString().split('T')[0];
        
        let newStreak = data.streak;
        
        // Calculate difference in days
        const diffTime = Math.abs(new Date(todayStr) - new Date(lastLoginStr));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (todayStr !== lastLoginStr) {
            if (diffDays === 1) {
                // Logged in yesterday -> Increment streak
                newStreak += 1;
            } else {
                // Missed a day (or more) -> Reset streak
                newStreak = 1;
            }
            
            // --- ACHIEVEMENT: On Fire (7 Day Streak) ---
            let newStreak7Count = data.streak_7_count || 0;
            if (newStreak % 7 === 0 && newStreak > 0) {
                newStreak7Count += 1;
            }
            
            // Update DB with new streak, last_login, and achievement
            await supabase.from('profiles').update({ 
                streak: newStreak,
                last_login: today.toISOString(),
                streak_7_count: newStreak7Count
            }).eq('id', authUser.id);
            
            // Update local state for streak achievement immediately
            data.streak_7_count = newStreak7Count;
        }
        // --------------------

        // Update local state
        const completedTasksCount = data.completed_tasks || 0;
        setUser(prev => ({
            ...prev,
            name: data.name,
            email: data.email,
            xp: data.xp,
            totalXp: completedTasksCount * 50, // Calculate total XP from completed tasks
            league: data.league,
            cohortId: cohortId,
            streak: newStreak,
            completedTasks: completedTasksCount,
            nightOwlCount: data.night_owl_count || 0,
            streak7Count: data.streak_7_count || 0, // Use the updated count
            finalsWon: data.finals_won || 0,
            top3Finishes: data.top_3_finishes || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // 3. Sync XP Updates to Supabase
  const updateProfileInSupabase = async (updates) => {
    if (!session?.user) return;
    
    // Optimistic UI Update
    setUser(prev => ({ ...prev, ...updates }));

    // Map local camelCase to DB snake_case
    const dbUpdates = {
        xp: updates.xp !== undefined ? updates.xp : user.xp,
        completed_tasks: updates.completedTasks !== undefined ? updates.completedTasks : user.completedTasks,
        streak: updates.streak !== undefined ? updates.streak : user.streak,
        night_owl_count: updates.nightOwlCount !== undefined ? updates.nightOwlCount : user.nightOwlCount,
        streak_7_count: updates.streak7Count !== undefined ? updates.streak7Count : user.streak7Count,
        finals_won: updates.finalsWon !== undefined ? updates.finalsWon : user.finalsWon,
        top_3_finishes: updates.top3Finishes !== undefined ? updates.top3Finishes : user.top3Finishes,
        league: updates.league !== undefined ? updates.league : user.league,
        cohort_id: updates.cohortId !== undefined ? updates.cohortId : user.cohortId
    };

    // DB Update
    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', session.user.id);

    if (error) console.error('Error updating profile:', error);
  };

  // Weekly Reset Logic (Client-Side Check)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processWeeklyReset = async () => {
    console.log("Processing Weekly Reset...");
    
    // 1. Fetch current leaderboard to determine rank
    const { data: leagueUsers } = await supabase
        .from('profiles')
        .select('*')
        .eq('league', user.league)
        .order('xp', { ascending: false });

    if (!leagueUsers) return;

    // 2. Calculate Rank
    const myRank = leagueUsers.findIndex(u => u.id === session.user.id) + 1;
    const thresholds = getLeagueThresholds(user.league);
    const totalInLeague = leagueUsers.length;

    let newLeague = user.league;
    let notification = "Weekly League Reset! 🏆";

    // 3. Determine Promotion/Relegation
    if (myRank <= thresholds.promote && thresholds.promote > 0) {
        // Promote
        if (user.league === LEAGUES.BRONZE) newLeague = LEAGUES.SILVER;
        else if (user.league === LEAGUES.SILVER) newLeague = LEAGUES.GOLD;
        else if (user.league === LEAGUES.GOLD) newLeague = LEAGUES.DIAMOND;
        notification = `Promoted to ${newLeague}! 🎉`;
    } else if (myRank > totalInLeague - thresholds.relegate && totalInLeague > thresholds.relegate) {
        // Relegate
        if (user.league === LEAGUES.DIAMOND) newLeague = LEAGUES.GOLD;
        else if (user.league === LEAGUES.GOLD) newLeague = LEAGUES.SILVER;
        else if (user.league === LEAGUES.SILVER) newLeague = LEAGUES.BRONZE;
        notification = `Relegated to ${newLeague} 📉`;
    } else {
        notification = `Stayed in ${newLeague} League 🛡️`;
    }

    // 4. Update Supabase (Reset XP, Update League, Assign New Cohort)
    // Get new cohort for the new league
    const { data: newCohortId } = await supabase.rpc('get_open_cohort', { user_league: newLeague });

    const updates = {
        xp: 0,
        league: newLeague,
        cohortId: newCohortId, // Update local state
        finalsWon: myRank === 1 ? (user.finalsWon || 0) + 1 : (user.finalsWon || 0),
        top3Finishes: myRank <= 3 ? (user.top3Finishes || 0) + 1 : (user.top3Finishes || 0)
    };
    
    await updateProfileInSupabase(updates);

    // 5. Mark as processed for this week
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    localStorage.setItem('taskquest_last_league_update', JSON.stringify({ week: currentWeek, year: today.getFullYear() }));
    
    setMotivation(notification);
    setTimeout(() => setMotivation(null), 5000);
  };

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  };

  useEffect(() => {
    if (!session?.user) return; // Wait for login

    const checkWeeklyReset = () => {
      const lastUpdate = localStorage.getItem('taskquest_last_league_update');
      const today = new Date();
      const currentWeek = getWeekNumber(today);
      
      if (!lastUpdate) {
          // First run, set current week
          localStorage.setItem('taskquest_last_league_update', JSON.stringify({ week: currentWeek, year: today.getFullYear() }));
      } else if (JSON.parse(lastUpdate).week !== currentWeek) {
        // It's a new week!
        processWeeklyReset();
      }
    };
    checkWeeklyReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // Run when session is ready

  // Local Storage Backup (Legacy/Offline support)
  useEffect(() => {
    localStorage.setItem('taskquest_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Task Management
  const addTask = (title) => {
    const newTask = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      xpValue: 50
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const [motivation, setMotivation] = useState(null);

  const MOTIVATIONAL_QUOTES = [
    "Great job! Keep the momentum going! 🚀",
    "One step closer to your goals! ⭐",
    "You're on fire! 🔥",
    "Consistency is key, and you're nailing it! 🗝️",
    "Small progress is still progress! 🌱",
    "Unstoppable! 💥",
    "Task crushed! What's next? 💪",
    "Leveling up, one task at a time! 📈"
  ];

  const completeTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      // Calculate new stats
      const newXp = user.xp + task.xpValue;
      const newCompletedTasks = user.completedTasks + 1;
      const newTotalXp = newCompletedTasks * 50; // Update total XP
      
      // --- ACHIEVEMENT: Night Owl ---
      const currentHour = new Date().getHours();
      let newNightOwlCount = user.nightOwlCount;
      // Check if between 10 PM (22) and 4 AM (4)
      if (currentHour >= 22 || currentHour < 4) {
          newNightOwlCount += 1;
      }
      // ------------------------------

      // Update Supabase & Local State
      updateProfileInSupabase({ 
          xp: newXp, 
          completedTasks: newCompletedTasks,
          nightOwlCount: newNightOwlCount 
      });
      
      // Optimistically update totalXp in local state
      setUser(prev => ({ ...prev, totalXp: newTotalXp }));

      // Update Task Status
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: true } : t
      ));

      // Trigger Motivation
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setMotivation(randomQuote);
      setTimeout(() => setMotivation(null), 3000);
    }
  };

  const editTask = (id, newTitle) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, title: newTitle } : t
    ));
  };

  const toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (!task.completed) {
      completeTask(id);
    } else {
      // Un-completing (Revert XP)
      const newXp = Math.max(0, user.xp - 50);
      const newCompletedTasks = Math.max(0, user.completedTasks - 1);
      const newTotalXp = newCompletedTasks * 50; // Update total XP
      
      updateProfileInSupabase({ xp: newXp, completedTasks: newCompletedTasks });
      
      // Optimistically update totalXp in local state
      setUser(prev => ({ ...prev, totalXp: newTotalXp }));

      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: false } : t
      ));
    }
  };

  return (
    <TaskContext.Provider value={{ session, tasks, user, addTask, deleteTask, toggleTask, completeTask, editTask, motivation }}>
      {children}
    </TaskContext.Provider>
  );
};
