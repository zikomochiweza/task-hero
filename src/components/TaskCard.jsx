import { supabase } from '../supabaseClient';
import { useState } from 'react';
import { useTask } from '../context/TaskContext';

const TaskCard = ({ task }) => {
  const { toggleTask, deleteTask, editTask, completeTask, user } = useTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [uploading, setUploading] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editTitle.trim()) {
      editTask(task.id, editTitle);
      setIsEditing(false);
    }
  };

  const isCompleted = task.completed;

  const handleProofUpload = async (e) => {
    try {
        setUploading(true);
        if (!e.target.files || e.target.files.length === 0) {
            throw new Error('You must select an image to upload.');
        }

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.email}-${task.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('task-proofs')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('task-proofs')
            .getPublicUrl(filePath);

        // Complete the task with proof
        completeTask(task.id, publicUrl);
        setShowProofUpload(false);
    } catch (error) {
        alert(error.message);
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className={`
      group bg-white dark:bg-dark-800 p-4 rounded-2xl border border-gray-100 dark:border-dark-700 shadow-sm transition-all
      ${isCompleted ? 'opacity-75' : 'hover:shadow-md hover:scale-[1.01]'}
    `}>
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        {/* Checkbox / Proof Button */}
        {/* Camera Button (Primary Action) */}
        <div className="relative">
            <label 
                htmlFor={`proof-upload-${task.id}`}
                className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm
                    ${isCompleted 
                    ? 'bg-green-500 text-white scale-105 shadow-green-500/30' 
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20'}
                    ${uploading ? 'animate-pulse' : ''}
                `}
                title={isCompleted ? "Update Proof" : "Upload Proof to Complete"}
            >
                {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <span className="text-xl">{uploading ? '⏳' : '📷'}</span>
                )}
            </label>
        </div>

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
            <div className="flex flex-col">
                <div 
                className={`text-base font-medium truncate transition-all cursor-pointer select-none ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}
                onDoubleClick={() => setIsEditing(true)}
                >
                {task.title}
                </div>
                {task.proofUrl && (
                    <a href={task.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        <span>📎</span> View Proof
                    </a>
                )}
                
                {/* Hidden File Input for Seamless Upload */}
                <input 
                    type="file" 
                    id={`proof-upload-${task.id}`}
                    accept="image/*"
                    onChange={handleProofUpload}
                    disabled={uploading}
                    className="hidden"
                />
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
