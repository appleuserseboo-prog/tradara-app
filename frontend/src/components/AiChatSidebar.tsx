// ==========================================
// FILE: frontend/src/components/AiChatSidebar.tsx
// ==========================================

import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles,
  Search
} from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  date: string; // ISO string or formatted date
}

interface AiChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

export const AiChatSidebar: React.FC<AiChatSidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(id);
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions (e.g., Today vs Older - simple grouping for demo)
  const todayStr = new Date().toDateString();
  const todaySessions = filteredSessions.filter(s => new Date(s.date).toDateString() === todayStr);
  const olderSessions = filteredSessions.filter(s => new Date(s.date).toDateString() !== todayStr);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[95] md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'
        }`}
      >
        {/* Top Action Area */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            onClick={onToggle}
            title="Toggle Sidebar"
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors border border-slate-800"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Today's Chats */}
          {todaySessions.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</p>
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    currentSessionId === session.id
                      ? 'bg-slate-900 text-purple-400 font-medium border border-purple-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    {editingId === session.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {editingId === session.id ? (
                      <>
                        <button
                          onClick={(e) => handleSaveRename(session.id, e)}
                          className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 text-rose-400 hover:bg-slate-800 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          title="Rename"
                          className="p-1 text-slate-400 hover:text-white rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Older Chats */}
          {olderSessions.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Previous 7 Days</p>
              {olderSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    currentSessionId === session.id
                      ? 'bg-slate-900 text-purple-400 font-medium border border-purple-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    {editingId === session.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {editingId === session.id ? (
                      <>
                        <button
                          onClick={(e) => handleSaveRename(session.id, e)}
                          className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 text-rose-400 hover:bg-slate-800 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          title="Rename"
                          className="p-1 text-slate-400 hover:text-white rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-xs">
              No chat history yet. Start a new conversation!
            </div>
          )}
        </div>

        {/* Footer Branding */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>TRADARA AI Engine v2.5</span>
          </div>
          <span>Secure</span>
        </div>
      </aside>

      {/* Floating Open Sidebar Button when closed on desktop */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="Open Chat History"
          className="fixed top-20 left-4 z-50 hidden md:flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded-xl shadow-xl backdrop-blur-md text-xs transition-all"
        >
          <PanelLeftOpen className="w-4 h-4 text-purple-400" />
          <span>History</span>
        </button>
      )}
    </>
  );
};