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
  const [tasks, setTasks] = useState([]);

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
    earlyBirdCount: 0,
    streak7Count: 0,
    name: 'TaskHero User',
    email: 'user@taskhero.app',
    avatarUrl: null
  });

  // 1. Handle Auth & Initial Profile Fetch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
          fetchOrCreateProfile(session.user);
          fetchTasks(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
          fetchOrCreateProfile(session.user);
          fetchTasks(session.user.id);
      } else {
          setTasks([]); // Clear tasks on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async (userId) => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching tasks:', error);
    else setTasks(data || []);
  };

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
          early_bird_count: 0,
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

        let shouldUpdate = false;

        if (todayStr !== lastLoginStr) {
            if (diffDays === 1) {
                // Logged in yesterday -> Increment streak
                newStreak += 1;
            } else {
                // Missed a day (or more) -> Reset streak
                newStreak = 1;
            }
            shouldUpdate = true;
        } else if (data.streak < 1) {
            // Same day, but streak is 0 (should be 1)
            newStreak = 1;
            shouldUpdate = true;
        }
            
        if (shouldUpdate) {
            // --- ACHIEVEMENT: On Fire (7 Day Streak) ---
            let newStreak7Count = data.streak_7_count || 0;
            if (newStreak % 7 === 0 && newStreak > 0) {
                newStreak7Count += 1;
                setHasNewAchievement(true); // Notify user
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
            earlyBirdCount: data.early_bird_count || 0,
            streak7Count: data.streak_7_count || 0, // Use the updated count
            finalsWon: data.finals_won || 0,
            finalsWon: data.finals_won || 0,
            top3Finishes: data.top_3_finishes || 0,
            avatarUrl: data.avatar_url
        }));
      }
      setIsProfileLoaded(true); // Profile is fully loaded
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Notification State
  const [hasNewAchievement, setHasNewAchievement] = useState(false);
  const [hasLeagueUpdate, setHasLeagueUpdate] = useState(false);
  // Loading State to prevent race conditions
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const clearAchievementNotification = () => setHasNewAchievement(false);
  const clearLeagueNotification = () => setHasLeagueUpdate(false);

  // --- NOTIFICATIONS ---
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  };

  const sendNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/vite.svg' });
    }
  };

  // Check for Streak Risk & Inactivity
  useEffect(() => {
    if (!isProfileLoaded || !user) return;
    
    requestNotificationPermission();

    const checkStatus = () => {
        const now = new Date();
        const hour = now.getHours();
        const tasksDoneToday = tasks.some(t => {
            const taskDate = new Date(t.created_at); // Assuming created_at is completion time for completed tasks, or check updated_at if available. 
            // Actually, for simplicity, let's check user.completedTasks vs stored count or just check if any task in list is completed today.
            // Better: Check if last_login was today AND if completedTasks increased. 
            // Simplest for now: Check if any task in `tasks` array is completed and updated today.
            return t.completed; // We need a better "done today" check, but let's rely on user.last_login for "visited" and local state for "done".
        });
        
        // We really need a "tasks_completed_today" flag or check. 
        // Let's assume if user.xp hasn't changed from a stored "start of day" value? 
        // Or simpler: Just check if they have 0 completed tasks in the `tasks` list that are marked completed today.
        // For this implementation, let's just check if they have ANY completed tasks for today.
        
        // 1. Streak Risk (After 8 PM)
        if (hour >= 20 && user.streak > 0) {
             // Logic: If they haven't done a task today. 
             // Since we don't track "done today" explicitly in profile, we'll approximate.
             // If last_login is today but we want to know if they DID a task.
             // Let's just send a generic nudge if it's late.
             const random = Math.random();
             const msg = random > 0.5 
                ? "Losing your streak after so long would suck 😢" 
                : "🔥 Keep the flame alive! Don't lose your streak!";
             sendNotification("Streak Risk!", msg);
        }

        // 2. Inactivity (Mid-day check, e.g., 2 PM)
        if (hour === 14) {
             const msgs = [
                 "Lacking consistency I see you 👀",
                 "Try doing a task today 💪",
                 "Small steps lead to big goals! 🚀"
             ];
             const msg = msgs[Math.floor(Math.random() * msgs.length)];
             sendNotification("TaskQuest", msg);
        }
    };

    // Run check once on load (if appropriate time)
    try {
        checkStatus();
    } catch (e) {
        console.error("Error in notification check:", e);
    }
    
    // Set interval to check every hour
    const interval = setInterval(() => {
        try {
            checkStatus();
        } catch (e) {
            console.error("Error in notification interval:", e);
        }
    }, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [isProfileLoaded, user.streak, tasks]); // Added tasks to dependency

  // Real-time League Monitoring (Overtaken)
  useEffect(() => {
      if (!user.league || !user.cohortId) return;

      const channel = supabase
        .channel('league_updates')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `league=eq.${user.league}` 
        }, (payload) => {
            const updatedUser = payload.new;
            // Check if this user is in my cohort and NOT me
            if (updatedUser.cohort_id === user.cohortId && updatedUser.id !== user.id) {
                // Check if they just overtook me
                if (updatedUser.xp > user.xp && payload.old.xp <= user.xp) {
                    sendNotification("Overtaken! 🏎️", `${updatedUser.name} just passed you on the leaderboard!`);
                }
            }
        })
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [user.league, user.cohortId, user.xp]);

  // 3. Sync XP Updates to Supabase
  // 3. Sync XP Updates to Supabase
  const updateProfileInSupabase = async (updates) => {
    if (!session?.user) return;
    
    // Optimistic UI Update
    setUser(prev => ({ ...prev, ...updates }));

    // Map local camelCase to DB snake_case
    const dbUpdates = {};
    if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
    if (updates.completedTasks !== undefined) dbUpdates.completed_tasks = updates.completedTasks;
    if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
    if (updates.nightOwlCount !== undefined) dbUpdates.night_owl_count = updates.nightOwlCount;
    if (updates.earlyBirdCount !== undefined) dbUpdates.early_bird_count = updates.earlyBirdCount;
    if (updates.streak7Count !== undefined) dbUpdates.streak_7_count = updates.streak7Count;
    if (updates.finalsWon !== undefined) dbUpdates.finals_won = updates.finalsWon;
    if (updates.top3Finishes !== undefined) dbUpdates.top_3_finishes = updates.top3Finishes;
    if (updates.league !== undefined) dbUpdates.league = updates.league;
    if (updates.league !== undefined) dbUpdates.league = updates.league;
    if (updates.cohortId !== undefined) dbUpdates.cohort_id = updates.cohortId;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

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
    
    setHasLeagueUpdate(true); // Notify user of league update
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
    if (!session?.user || !isProfileLoaded) return; // Wait for login AND profile load

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
  }, [session, isProfileLoaded]); // Run when session OR profile loaded status changes

  // Local Storage Backup (Legacy/Offline support)
  useEffect(() => {
    localStorage.setItem('taskquest_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Task Management
  const addTask = async (title) => {
    if (!session?.user) return;

    const newTask = {
      user_id: session.user.id,
      title,
      completed: false,
      xp_value: 50
    };

    // Optimistic Update (Temporary ID)
    const tempId = Date.now().toString();
    setTasks(prev => [{ ...newTask, id: tempId, created_at: new Date().toISOString() }, ...prev]);

    const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

    if (error) {
        console.error('Error adding task:', error);
        // Revert optimistic update if needed, or just let it fail silently for now (could add toast)
        setTasks(prev => prev.filter(t => t.id !== tempId));
    } else {
        // Replace temp ID with real ID
        setTasks(prev => prev.map(t => t.id === tempId ? data : t));
    }
  };

  const deleteTask = async (id) => {
    // Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) console.error('Error deleting task:', error);
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

  const completeTask = async (id, proofUrl = null) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Case 1: Task is already completed, just adding proof
    if (task.completed && proofUrl) {
        // Update local state
        setTasks(prev => prev.map(t => 
            t.id === id ? { ...t, proofUrl: proofUrl } : t
        ));
        
        // Update Supabase
        supabase.from('tasks').update({ proof_url: proofUrl }).eq('id', id).then(({ error }) => {
            if (error) console.error('Error adding proof:', error);
        });

        setMotivation("Proof added! 📸");
        setTimeout(() => setMotivation(null), 3000);
        return;
    }

    // Case 2: Completing the task for the first time
    if (!task.completed) {
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
          setHasNewAchievement(true); // Notify user
      }
      
      // --- ACHIEVEMENT: Early Bird ---
      let newEarlyBirdCount = user.earlyBirdCount;
      // Check if between 5 AM (5) and 9 AM (9)
      if (currentHour >= 5 && currentHour < 9) {
          newEarlyBirdCount += 1;
          setHasNewAchievement(true); // Notify user
      }
      // ------------------------------

      // Update Supabase & Local State
      await updateProfileInSupabase({ 
          xp: newXp, 
          completedTasks: newCompletedTasks,
          nightOwlCount: newNightOwlCount,
          earlyBirdCount: newEarlyBirdCount
      });
      
      // Optimistically update totalXp in local state
      setUser(prev => ({ ...prev, totalXp: newTotalXp }));

      // Update Task Status in Supabase
      // We do this AFTER the profile update logic to ensure UI feels fast
      const updateData = { completed: true };
      if (proofUrl) updateData.proof_url = proofUrl;

      const { error: taskError } = await supabase.from('tasks').update(updateData).eq('id', id);
      if (taskError) console.error('Error completing task:', taskError);

      // Trigger Motivation
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setMotivation(randomQuote);
      setTimeout(() => setMotivation(null), 3000);
    }
  };

  const editTask = async (id, newTitle) => {
    // Optimistic Update
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, title: newTitle } : t
    ));

    const { error } = await supabase
        .from('tasks')
        .update({ title: newTitle })
        .eq('id', id);

    if (error) console.error('Error editing task:', error);
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

      // Optimistic Task Update
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: false } : t
      ));

      // Supabase Update
      supabase.from('tasks').update({ completed: false }).eq('id', id).then(({ error }) => {
          if (error) console.error('Error un-completing task:', error);
      });
    }
  };

  return (
    <TaskContext.Provider value={{ 
        session, tasks, user, addTask, deleteTask, toggleTask, completeTask, editTask, motivation,
        hasNewAchievement, hasLeagueUpdate, clearAchievementNotification, clearLeagueNotification
    }}>
      {children}
    </TaskContext.Provider>
  );
};
