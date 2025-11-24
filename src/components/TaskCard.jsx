import { useState } from 'react';
import { useTask } from '../context/TaskContext';

const TaskCard = ({ task }) => {
  const { completeTask, deleteTask, toggleTask, editTask } = useTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleComplete = (e) => {
    e.stopPropagation();
    if (!task.completed) {
      completeTask(task.id);
    } else {
        toggleTask(task.id);
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editTitle.trim()) {
      editTask(task.id, editTitle);
      setIsEditing(false);
    }
  };

  const isCompleted = task.completed;

  return (
    <div className={`
      group bg-white dark:bg-dark-800 p-4 rounded-2xl border border-gray-100 dark:border-dark-700 shadow-sm transition-all
      ${isCompleted ? 'opacity-75' : 'hover:shadow-md hover:scale-[1.01]'}
    `}>
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={() => toggleTask(task.id)}
          className={`
            w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
            ${isCompleted 
              ? 'bg-green-500 border-green-500 text-white scale-110' 
              : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-green-500'}
          `}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-dark-900 border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-300"
                autoFocus
                onBlur={handleSaveEdit}
              />
            </form>
          ) : (
            <div 
              className={`text-base font-medium truncate transition-all cursor-pointer select-none ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}
              onDoubleClick={() => setIsEditing(true)}
            >
              {task.title}
            </div>
          )}
        </div>

        {/* Actions / XP */}
        <div className="flex items-center gap-3">
          {isCompleted && (
             <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">+50 XP</span>
          )}
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              ✏️
            </button>
            <button 
              onClick={() => deleteTask(task.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
