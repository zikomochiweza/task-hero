import { useState } from 'react';
import { useTask } from '../context/TaskContext';
import TaskCard from './TaskCard';

const Dashboard = () => {
  const { tasks, addTask, user, motivation } = useTask();
  const [newTask, setNewTask] = useState('');

  // Handle adding a new task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      addTask(newTask);
      setNewTask('');
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 space-y-6">
      {/* Motivation Toast */}
      {motivation && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-lg z-50 animate-bounce text-sm">
          {motivation}
        </div>
      )}

      {/* Stats Cards - Grid on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total XP Card */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex justify-between items-center transition-transform hover:scale-[1.02]">
          <div>
            <div className="text-gray-600 dark:text-gray-400 text-sm font-bold mb-1">Total XP</div>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{user.totalXp || 0}</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-2xl">
            ⚡
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex justify-between items-center transition-transform hover:scale-[1.02]">
          <div>
            <div className="text-gray-600 dark:text-gray-400 text-sm font-bold mb-1">Daily Streak</div>
            <div className="text-3xl font-black text-orange-500 dark:text-orange-400">{user.streak} days</div>
          </div>
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-2xl">
            🔥
          </div>
        </div>

        {/* League Card */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex justify-between items-center transition-transform hover:scale-[1.02]">
          <div>
            <div className="text-gray-600 dark:text-gray-400 text-sm font-bold mb-2">Current League</div>
            <div className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold shadow-sm text-sm
                ${user.league === 'Bronze' ? 'bg-gradient-to-r from-orange-700 to-orange-500' : ''}
                ${user.league === 'Silver' ? 'bg-gradient-to-r from-gray-400 to-gray-300' : ''}
                ${user.league === 'Gold' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : ''}
                ${user.league === 'Diamond' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : ''}
            `}>
                <span>{user.league === 'Bronze' && '🥉'}
                    {user.league === 'Silver' && '🥈'}
                    {user.league === 'Gold' && '👑'}
                    {user.league === 'Diamond' && '💎'}</span>
                <span>{user.league}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Side by Side on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start pb-20 md:pb-0">
        
        {/* Left Column: Tasks List (Takes up 2/3 space on desktop) */}
        <div className="md:col-span-2 space-y-6 order-2 md:order-1">
            {/* Pending Tasks */}
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    Pending Tasks
                    </h3>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {tasks.filter(t => !t.completed).length}
                    </span>
                </div>
                <div className="space-y-3">
                {tasks.filter(t => !t.completed).map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {tasks.filter(t => !t.completed).length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-dark-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-700">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-gray-500 font-bold">All caught up!</p>
                    </div>
                )}
                </div>
            </div>

            {/* Completed Tasks */}
            {tasks.some(t => t.completed) && (
                <div className="pt-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 px-2 opacity-50">
                    Completed
                </h3>
                <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                    {tasks.filter(t => t.completed).map(task => (
                    <TaskCard key={task.id} task={task} />
                    ))}
                </div>
                </div>
            )}
        </div>

        {/* Right Column: Add Task (Takes up 1/3 space on desktop, Sticky) */}
        <div className="md:col-span-1 order-1 md:order-2 md:sticky md:top-4">
            <div className="bg-white dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Add New Task</h3>
                <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="What's your goal?"
                    className="w-full p-3 bg-gray-50 dark:bg-dark-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder-gray-500 font-medium"
                />
                <button 
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
                >
                    + Add Task
                </button>
                </form>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
