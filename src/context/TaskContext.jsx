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
    avatarUrl: null,
    lastLeagueReset: new Date().toISOString()
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
          last_task_date: new Date().toISOString(),
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

        // --- STREAK LOGIC (Task Based) ---
        const today = new Date();
        const lastTaskDate = data.last_task_date ? new Date(data.last_task_date) : new Date(0); // Default to epoch if null
        
        // Reset time part to compare dates only (UTC)
        const todayStr = today.toISOString().split('T')[0];
        const lastTaskDateStr = lastTaskDate.toISOString().split('T')[0];
        
        let newStreak = data.streak;
        
        // Calculate difference in days
        const diffTime = Math.abs(new Date(todayStr) - new Date(lastTaskDateStr));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let shouldUpdate = false;

        // Reset check: If more than 1 day difference, reset streak
        if (diffDays > 1) {
            newStreak = 0;
            shouldUpdate = true;
        }
            
        if (shouldUpdate) {
             // Update DB with reset streak (streak increment happens in completeTask now)
             await supabase.from('profiles').update({ 
                streak: newStreak
            }).eq('id', authUser.id);
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
            avatarUrl: data.avatar_url,
            lastTaskDate: data.last_task_date,
            lastLeagueReset: data.last_league_reset || new Date().toISOString()
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

  // Email Notification Helper
  const sendEmailNotification = async (type, payload) => {
    if (!session?.user?.email) return;
    
    console.log(`Attempting to send email [${type}] to ${session.user.email}`);
    
    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                type,
                email: session.user.email,
                name: user.name,
                ...payload
            }
        });

        if (error) throw error;
        console.log(`Email sent successfully: ${type}`);
    } catch (err) {
        console.error('Failed to send email notification:', err);
    }
  };

  // Check for Streak Risk & Inactivity
  useEffect(() => {
    if (!isProfileLoaded || !user) return;
    
    requestNotificationPermission();

    const checkStatus = () => {
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];
        
        // Key for local storage to prevent multiple notifications per day
        const NOTIF_KEY = `taskquest_notif_${todayStr}`;
        const sentNotifications = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');

        // Check if user has done a task today
        const lastTaskDate = user.lastTaskDate ? new Date(user.lastTaskDate) : null;
        const lastTaskDateStr = lastTaskDate ? lastTaskDate.toISOString().split('T')[0] : '';
        const hasDoneTaskToday = lastTaskDateStr === todayStr;

        // 1. Streak Risk (After 8 PM)
        if (hour >= 20 && user.streak > 0 && !hasDoneTaskToday) {
             if (!sentNotifications.streak_risk) {
                 const msg = "🔥 Keep the flame alive! Don't lose your streak!";
                 sendNotification("Streak Risk!", msg);
                 sendEmailNotification('streak_risk', { streak: user.streak });
                 
                 // Mark as sent
                 localStorage.setItem(NOTIF_KEY, JSON.stringify({ ...sentNotifications, streak_risk: true }));
             }
        }

        // 2. Inactivity (Mid-day check, e.g., 2 PM)
        if (hour >= 14 && hour < 20 && !hasDoneTaskToday) {
             if (!sentNotifications.nudge) {
                 const msgs = [
                     "Lacking consistency I see you 👀",
                     "Try doing a task today 💪",
                     "Small steps lead to big goals! 🚀"
                 ];
                 const msg = msgs[Math.floor(Math.random() * msgs.length)];
                 sendNotification("TaskQuest", msg);
                 
                 localStorage.setItem(NOTIF_KEY, JSON.stringify({ ...sentNotifications, nudge: true }));
             }
        }
    };

    // Run check once on load
    checkStatus();
    
    // Set interval to check every hour
    const interval = setInterval(checkStatus, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [isProfileLoaded, user.streak, user.lastTaskDate]); // Correct dependencies

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
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.last_task_date !== undefined) dbUpdates.last_task_date = updates.last_task_date;
    if (updates.lastLeagueReset !== undefined) dbUpdates.last_league_reset = updates.lastLeagueReset;

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

    await updateProfileInSupabase(updates);

    // 5. Mark as processed for this week in DB
    const now = new Date();
    await updateProfileInSupabase({ lastLeagueReset: now.toISOString() });
    
    setHasLeagueUpdate(true); // Notify user of league update
    setMotivation(notification);
    sendEmailNotification('league_update', { league: newLeague }); // Send email summary
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
      if (!user.lastLeagueReset) return;

      const lastResetDate = new Date(user.lastLeagueReset);
      const today = new Date();
      
      const lastResetWeek = getWeekNumber(lastResetDate);
      const currentWeek = getWeekNumber(today);
      const lastResetYear = lastResetDate.getFullYear();
      const currentYear = today.getFullYear();
      
      // Check if it's a new week and we haven't reset yet
      // Logic: If current year > last reset year OR (same year AND current week > last reset week)
      // Note: week 1 of new year handles automatically if getWeekNumber is standard ISO
      if (currentYear > lastResetYear || (currentYear === lastResetYear && currentWeek !== lastResetWeek)) {
          console.log(`Weekly Reset Triggered: Last ${lastResetWeek}, Current ${currentWeek}`);
          processWeeklyReset();
      }
    };
    checkWeeklyReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isProfileLoaded, user.lastLeagueReset]); // Run when session, profile, or reset date changes

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
      // Calculate new stats (Handle NULL XP)
      const currentXp = user.xp || 0;
      const currentCompletedTasks = user.completedTasks || 0;
      
      const newXp = currentXp + (task.xp_value || 50);
      const newCompletedTasks = currentCompletedTasks + 1;
      const newTotalXp = newCompletedTasks * 50; // Update total XP
      
      // --- ACHIEVEMENT: Night Owl ---
      const currentHour = new Date().getHours();
      let newNightOwlCount = user.nightOwlCount;
      // Check if between 10 PM (22) and 4 AM (4)
      if (currentHour >= 22 || currentHour < 4) {
          newNightOwlCount += 1;
          setHasNewAchievement(true); // Notify user
          sendNotification("Achievement Unlocked!", "Night Owl 🌙");
          sendEmailNotification('achievement', { achievement: "Night Owl 🌙" });
      }
      
      // --- ACHIEVEMENT: Early Bird ---
      let newEarlyBirdCount = user.earlyBirdCount;
      // Check if between 5 AM (5) and 9 AM (9)
      if (currentHour >= 5 && currentHour < 9) {
          newEarlyBirdCount += 1;
          setHasNewAchievement(true); // Notify user
          sendNotification("Achievement Unlocked!", "Early Bird 🌅");
          sendEmailNotification('achievement', { achievement: "Early Bird 🌅" });
      }
      // ------------------------------

      // 2. STREAK UPDATE LOGIC
      const today = new Date();
      const lastTaskDate = user.lastTaskDate ? new Date(user.lastTaskDate) : new Date(0);
      const todayStr = today.toISOString().split('T')[0];
      const lastTaskDateStr = lastTaskDate.toISOString().split('T')[0];
      
      let newStreak = user.streak;
      let newStreak7Count = user.streak7Count;

      // If last task was NOT today (i.e. yesterday or older, or never)
      if (todayStr !== lastTaskDateStr) {
          // If streak was reset to 0 (because of >1 day gap), this sets it to 1.
          // If streak is active (meaning last task was yesterday), increment it.
          // Note: fetchOrCreateProfile handles the Reset to 0 if >1 day gap. 
          // However, if we are in the same session without refresh, user.streak might allow increment.
          // Let's re-verify the "yesterday" condition.

          const diffTime = Math.abs(new Date(todayStr) - new Date(lastTaskDateStr));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
             newStreak += 1;
          } else if (newStreak === 0 || diffDays > 1) {
             // Restart streak
             newStreak = 1;
          }
          // If diffDays == 0, we already did a task today, don't increment.
      } else if (newStreak === 0) {
          // If for some reason streak is 0 but date says today (maybe reset by bug?), set to 1
          newStreak = 1;
      }
      
      // Streak Achievements
      if (newStreak % 7 === 0 && newStreak > user.streak && newStreak > 0) {
           newStreak7Count += 1;
           setHasNewAchievement(true);
           sendNotification("Achievement Unlocked!", "On Fire 🔥");
           sendEmailNotification('achievement', { achievement: "streak_7 (7 Day Streak) 🔥" });
      }

      // 3. Optimistic UI Updates
      // Update User Stats
      setUser(prev => ({ 
          ...prev, 
          xp: newXp,
          completedTasks: newCompletedTasks,
          totalXp: newTotalXp,
          nightOwlCount: newNightOwlCount,
          earlyBirdCount: newEarlyBirdCount,
          streak: newStreak,
          streak7Count: newStreak7Count,
          lastTaskDate: today.toISOString()
      }));

      // Update Tasks List (Move to completed)
      setTasks(prev => prev.map(t => 
          t.id === id ? { ...t, completed: true, proofUrl: proofUrl || t.proofUrl } : t
      ));

      // 4. Update Supabase Profile
      await updateProfileInSupabase({ 
          xp: newXp, 
          completedTasks: newCompletedTasks,
          nightOwlCount: newNightOwlCount,
          earlyBirdCount: newEarlyBirdCount,
          streak: newStreak,
          streak7Count: newStreak7Count,
          last_task_date: today.toISOString()
      });

      // 5. Update Task in Supabase
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
        hasNewAchievement, hasLeagueUpdate, clearAchievementNotification, clearLeagueNotification,
        updateProfileInSupabase
    }}>
      {children}
    </TaskContext.Provider>
  );
};
