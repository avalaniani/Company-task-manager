
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  LayoutDashboard, 
  Zap,
  Briefcase,
  Lock, 
  ArrowRight, 
  Plus,
  X,
  Pencil, 
  Trash2,
  UserPlus,
  Power,
  Ban,
  ClipboardList,
  StickyNote,
  LogOut,
  Key,
  Sparkles,
  Loader2,
  Building2,
  ShieldCheck,
  Globe,
  Settings,
  Users,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  UserCheck,
  History,
  Save,
  Fingerprint,
  Filter,
  Search,
  Layout,
  MessageSquare,
  HardHat,
  Circle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  Send,
  Wand2,
  Activity,
  RotateCcw,
  Copy,
  FileSpreadsheet,
  Signature,
  ShieldAlert,
  ListTodo,
  BrainCircuit,
  Calendar as CalendarIcon,
  Tag,
  MapPin,
  LayoutGrid,
  Rows3,
  Layers,
  Settings2,
  ChevronDown
} from 'lucide-react';
import { User, Task, UserRole, TaskType, TaskStatus, Company, AttendanceRecord, CalendarEvent } from './types';

// Firebase Imports
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  where,
  writeBatch,
  getDocs,
  Timestamp,
  setDoc
} from 'firebase/firestore';

/* FIX: Added Google GenAI integration for AI-powered task insights and execution */
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";

// Initialize the Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BLOCKER_REASONS = [
    "ממתין לאישור לקוח",
    "ממתין לחומרים/קבצים",
    "ממתין לאישור מנהל",
    "תקלה טכנית/תשתית",
    "תלות במשימה אחרת"
];

// --- Helper Components ---

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDurationShort = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes === 0) return "";
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
    } catch (e) {
        return dateStr;
    }
}

const getHourFromIso = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const getTimeForInput = (isoStr: string | undefined) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const styles = {
    PENDING: 'bg-slate-100 text-slate-500 border-slate-200',
    IN_PROGRESS: 'bg-sky-100 text-sky-600 border-sky-200 animate-pulse',
    PAUSED: 'bg-amber-50 text-amber-600 border-amber-100',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    BLOCKED: 'bg-rose-50 text-rose-500 border-rose-100'
  };
  
  const labels = {
    PENDING: 'ממתין',
    IN_PROGRESS: 'בעבודה',
    PAUSED: 'הפסקה',
    COMPLETED: 'הושלם',
    BLOCKED: 'תקוע'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${styles[status]} shadow-sm whitespace-nowrap`}>
      {labels[status]}
    </span>
  );
};

const StatusSelector = ({ task, onStatusChange, onBlockTask }: { task: Task, onStatusChange: (taskId: string, newStatus: TaskStatus) => void, onBlockTask: (task: Task) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const options: TaskStatus[] = ['PENDING', 'PAUSED', 'BLOCKED'];

    const handleSelect = (status: TaskStatus) => {
        if (status === task.status) {
            setIsOpen(false);
            return;
        }
        if (status === 'BLOCKED') {
            onBlockTask(task);
        } else {
            onStatusChange(task.id, status);
        }
        setIsOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    if (task.status === 'COMPLETED' || task.status === 'IN_PROGRESS') {
        return <StatusBadge status={task.status} />;
    }

    return (
        <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsOpen(!isOpen)}>
                <StatusBadge status={task.status} />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 right-0 bg-white shadow-lg rounded-lg border border-slate-100 w-28 py-1">
                    {options.map(opt => (
                        <button 
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            className="w-full text-right px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            { { PENDING: 'ממתין', PAUSED: 'הפסקה', BLOCKED: 'תקוע' }[opt] }
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  if (type === 'URGENT') return <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-100" />;
  if (type === 'LOCKED') return <Lock className="w-3.5 h-3.5 text-slate-400" />;
  return <Briefcase className="w-3.5 h-3.5 text-sky-300" />;
};

// --- Authentication Screens ---

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-50/50 via-white to-pink-50/50 p-4 sm:p-6 overflow-hidden relative" dir="rtl">
        <div className="absolute top-20 left-20 w-64 h-64 bg-pink-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float hidden sm:block"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-blue-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float hidden sm:block" style={{animationDelay: '1s'}}></div>
        
        <div className="bg-white/90 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white w-full max-md animate-fade-in-up relative z-10">
            {children}
        </div>
    </div>
);

const CompanyLoginScreen = ({ 
    companies,
    onCompanyLogin,
    onPlatformLoginClick,
    error,
    isLoading
}: { 
    companies: Company[],
    onCompanyLogin: (companyId: string, password: string) => void,
    onPlatformLoginClick: () => void,
    error: string,
    isLoading: boolean
}) => {
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCompanyId && password) {
            onCompanyLogin(selectedCompanyId, password);
        }
    };

    return (
        <AuthLayout>
            <div className="text-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-tr from-sky-400/80 to-indigo-300/80 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-sm">
                        <Building2 className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">TaskFlow Pro</h1>
                <p className="text-slate-400 mt-1.5 font-medium text-sm">
                    כניסה למערכת הארגונית
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <div className="flex justify-between items-center mb-1.5 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">חברה</label>
                    </div>
                    <div className="relative group">
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100/50 focus:bg-white text-slate-700 outline-none transition-all appearance-none cursor-pointer text-sm font-medium"
                            required
                        >
                            <option value="" disabled>בחר חברה...</option>
                            {companies.filter(c => c.status === 'ACTIVE').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-sky-400 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1.5 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סיסמת חברה</label>
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100/50 focus:bg-white text-slate-700 outline-none transition-all placeholder:text-slate-300 text-sm font-medium"
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 text-rose-500 text-[11px] font-bold rounded-xl flex items-center gap-2 border border-rose-100 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading || !selectedCompanyId}
                    className="w-full py-3.5 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>המשך לצוות</span>}
                </button>
            </form>
            
            <div className="mt-8 text-center pt-5 border-t border-slate-50">
                <button 
                    onClick={onPlatformLoginClick}
                    className="text-[10px] text-slate-300 hover:text-sky-400 transition-colors font-black flex items-center justify-center gap-1.5 mx-auto uppercase tracking-[0.1em]"
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    PLATFORM ADMIN LOGIN
                </button>
            </div>
        </AuthLayout>
    );
};

const UserLoginScreen = ({ 
    company,
    onLogin, 
    onBack,
    error,
    isLoading
}: { 
    company: Company,
    onLogin: (u: string, p: string) => void, 
    onBack: () => void,
    error: string,
    isLoading: boolean
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <AuthLayout>
            <div className="text-center mb-8">
                <div className="w-14 h-14 bg-white border border-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 shadow-sm overflow-hidden">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-slate-300">{company.name.charAt(0)}</span>
                        )}
                </div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">צוות {company.name}</h1>
                <p className="text-slate-400 mt-1 font-medium text-sm">
                    הזדהות עובד
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">שם משתמש</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100/50 focus:bg-white text-slate-700 outline-none transition-all text-sm font-medium"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">סיסמא</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100/50 focus:bg-white text-slate-700 outline-none transition-all text-sm font-medium"
                        required
                    />
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 text-rose-500 text-[11px] font-bold rounded-xl flex items-center gap-2 border border-rose-100">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-700 transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>התחברות</span>}
                </button>
            </form>
            
            <div className="mt-8 text-center">
                <button onClick={onBack} className="text-slate-300 hover:text-slate-500 text-[11px] font-black transition-colors uppercase tracking-wider">
                    חזרה לבחירת חברה
                </button>
            </div>
        </AuthLayout>
    );
};

const PlatformAdminLoginScreen = ({ 
    onLogin, 
    onBack,
    error,
    isLoading
}: { 
    onLogin: (u: string, p: string) => void, 
    onBack: () => void,
    error: string,
    isLoading: boolean
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <AuthLayout>
             <div className="text-center mb-8">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md">
                     <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Platform Admin</h1>
                <p className="text-slate-400 mt-1 font-medium text-sm">
                    ניהול גלובלי
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">משתמש מנהל</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-100 focus:bg-white text-slate-700 outline-none transition-all text-sm font-medium"
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">סיסמא</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-100 focus:bg-white text-slate-700 outline-none transition-all text-sm font-medium"
                        required
                    />
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 text-rose-500 text-[11px] font-bold rounded-xl flex items-center gap-2 border border-rose-100">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-700 transition-all mt-2"
                >
                     {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>כניסה</span>}
                </button>
            </form>
             <div className="mt-8 text-center">
                <button onClick={onBack} className="text-slate-300 hover:text-slate-500 text-[11px] font-black transition-colors uppercase tracking-wider">
                    ביטול
                </button>
            </div>
        </AuthLayout>
    );
}

// --- Modals ---

const BlockerModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (reason: string, details: string) => void }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedReason('');
            setDetails('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (selectedReason || details) {
            onSubmit(selectedReason, details);
        }
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-slate-800">דיווח על תקלה / חסם</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">בחר סיבה</label>
                        <div className="grid grid-cols-2 gap-2">
                            {BLOCKER_REASONS.map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setSelectedReason(reason)}
                                    className={`p-3 text-xs font-bold rounded-lg border-2 transition-all text-right ${selectedReason === reason ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-rose-100'}`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">פרטים נוספים (אופציונלי)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="w-full h-24 p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700 resize-none"
                            placeholder="פרט כאן על הבעיה..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">ביטול</button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedReason && !details}
                            className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-200 disabled:opacity-50"
                        >
                            שלח דיווח
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const TaskCreationModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (title: string, estimatedMinutes: number) => void }) => {
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && estimatedMinutes > 0) {
      onCreate(title, estimatedMinutes);
      setTitle('');
      setEstimatedMinutes(30);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
        <h2 className="text-lg font-black text-slate-800 mb-4">יצירת משימה חדשה</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שם המשימה</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" 
              required 
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">זמן משוער (דקות)</label>
            <input 
              type="number" 
              value={estimatedMinutes} 
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))} 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" 
              required 
              min="1"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">ביטול</button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-md">צור משימה</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AttendanceEditModal = ({ 
    isOpen, 
    onClose, 
    record, 
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    record: AttendanceRecord | null, 
    onSave: (id: string, updates: Partial<AttendanceRecord>) => void 
}) => {
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (record && isOpen) {
            setDate(record.date);
            setStartTime(getTimeForInput(record.startTime));
            setEndTime(getTimeForInput(record.endTime));
        }
    }, [record, isOpen]);

    if (!isOpen || !record) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const startIso = new Date(`${date}T${startTime}`).toISOString();
        const endIso = endTime ? new Date(`${date}T${endTime}`).toISOString() : undefined;
        let totalMinutes = 0;
        if (endIso) {
            totalMinutes = Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
        }
        onSave(record.id, { date, startTime: startIso, endTime: endIso, totalMinutes: totalMinutes > 0 ? totalMinutes : 0 });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-800">עריכת דיווח נוכחות</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">תאריך</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שעת כניסה</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שעת יציאה</label>
                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">ביטול</button>
                        <button type="submit" className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-md">עדכן שעות</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PlatformAdminSettingsModal = ({ 
    isOpen, 
    onClose, 
    user, 
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    user: User, 
    onSave: (id: string, name: string, score: number, u: string, p: string, r: UserRole) => void 
}) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState(user.password);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user.id, user.name, user.efficiencyScore, username, password, user.role);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-700">הגדרות מנהל מערכת</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שם משתמש חדש</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm text-slate-600" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">סיסמא חדשה</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-mono text-slate-600" required />
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all text-sm mt-4">
                        שמור הגדרות
                    </button>
                </form>
            </div>
        </div>
    );
};

const TaskEditModal = ({ 
    isOpen, 
    onClose, 
    task, 
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    task: Task | null, 
    onSave: (id: string, updates: Partial<Task>) => void 
}) => {
  const [title, setTitle] = useState('');
  useEffect(() => { if (task) setTitle(task.title); }, [task]);
  if (!isOpen || !task) return null;
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(task.id, { title }); onClose(); };
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
        <h2 className="text-lg font-black text-slate-800 mb-4">עריכת משימה</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שם המשימה</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700" required autoFocus />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">ביטול</button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-md">שמור שינויים</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserEditModal = ({ 
    isOpen, 
    onClose, 
    user, 
    currentUser, 
    onSave,
    isPlatformAdmin = false,
    companies = []
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    user: User | null, 
    currentUser: User, 
    onSave: (id: string, name: string, score: number, u: string, p: string, r: UserRole) => void,
    isPlatformAdmin?: boolean,
    companies?: Company[]
}) => {
    const [name, setName] = useState('');
    const [score, setScore] = useState(100);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('EMPLOYEE');

    useEffect(() => {
        if (user && isOpen) {
            setName(user.name);
            setScore(user.efficiencyScore);
            setUsername(user.username);
            setPassword(user.password);
            setRole(user.role);
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user.id, name, score, username, password, role);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-800">עריכת משתמש</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שם מלא</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">ציון יעילות</label>
                        <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" min="0" max="100" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">שם משתמש</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-mono" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">סיסמא</label>
                            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-mono" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">תפקיד</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm">
                            <option value="EMPLOYEE">עובד משרד</option>
                            <option value="WORKER">פועל שטח</option>
                            {isPlatformAdmin && <option value="SUPER_ADMIN">מנהל חברה</option>}
                        </select>
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all text-sm mt-4">
                        שמור שינויים
                    </button>
                </form>
            </div>
        </div>
    );
};

const TaskHistoryModal = ({ 
    isOpen, 
    onClose, 
    user, 
    tasks, 
    onEditTask, 
    onDeleteTask, 
    onBlockTask 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    user: User | null, 
    tasks: Task[], 
    onEditTask: (id: string, updates: Partial<Task>) => void, 
    onDeleteTask: (task: Task) => void, 
    onBlockTask: (task: Task) => void 
}) => {
    if (!isOpen || !user) return null;
    const userTasks = tasks.filter(t => t.assigneeId === user.id);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-fade-in-up flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-12 h-12 rounded-full border border-slate-100 bg-slate-50" alt="" />
                        <div>
                            <h2 className="text-xl font-black text-slate-800">משימות של {user.name}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{userTasks.length} משימות במערכת</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {userTasks.map(task => (
                        <div key={task.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-700">{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StatusBadge status={task.status} />
                                        <span className="text-[10px] text-slate-400 font-bold">{task.estimatedMinutes} דקות משוער</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {task.status !== 'BLOCKED' && <button onClick={() => onBlockTask(task)} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-lg shadow-sm border border-slate-100 transition-all" title="דווח חסימה"><Ban className="w-4 h-4" /></button>}
                                    <button onClick={() => onEditTask(task.id, { title: task.title })} className="p-2 bg-white text-slate-400 hover:text-sky-500 rounded-lg shadow-sm border border-slate-100 transition-all"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteTask(task)} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-lg shadow-sm border border-slate-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            {task.status === 'BLOCKED' && task.blockedReason && (
                                <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                    <p className="text-[10px] font-bold text-rose-600">סיבת חסימה: {task.blockedReason}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {userTasks.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <p className="text-slate-400 font-medium">אין משימות למשתמש זה</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminPersonalWorkspace = ({ 
    isOpen, 
    onClose, 
    user, 
    tasks, 
    calendarEvents,
    onAddTask, 
    onCreateTaskDirectly,
    onUpdateNotes, 
    onEditTask, 
    onDeleteTask,
    onAddEvent,
    onDeleteEvent,
    allowAiBreakdown = false // Default to false
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    user: User, 
    tasks: Task[], 
    calendarEvents: CalendarEvent[],
    onAddTask: () => void, 
    onCreateTaskDirectly: (title: string) => void,
    onUpdateNotes: (notes: string) => Promise<void>, 
    onEditTask: (task: Task) => void, 
    onDeleteTask: (task: Task) => void,
    onAddEvent: (date: string, time: string, title: string, type: 'MEETING' | 'TASK' | 'REMINDER') => void,
    onDeleteEvent: (id: string) => void,
    allowAiBreakdown?: boolean
}) => {
    // Initial state from user prop, ignoring subsequent prop updates to avoid overwrite while typing
    const [notes, setNotes] = useState(user.personalNotes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const saveTimeoutRef = useRef<any>(null);
    
    // Calendar State
    const [activeTab, setActiveTab] = useState<'NOTES' | 'CALENDAR'>('NOTES');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
    const [newEventData, setNewEventData] = useState({ time: '', title: '', type: 'MEETING' as const });

    // Handle auto-saving - Optimization: instantaneous feedback
    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNotes(newValue);
        setIsSaving(true); // User is typing, show "Saving..." immediately
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(async () => {
            // High-speed transition: Trigger the save, and if typing has stopped, switch to "Saved"
            onUpdateNotes(newValue);
            setIsSaving(false); // Reset saving status 300ms after last keypress for snappy feel
        }, 300); // Debounce reduced to 300ms for responsiveness
    };

    // Clean up timeout
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const handleAiBreakdown = async () => {
        if (!notes.trim()) return;
        setIsAiGenerating(true);
        setAiSuggestions([]);

        try {
            // Enhanced prompt for deeper breakdown
            const prompt = `You are an elite project manager and systems architect. Analyze the following management notes and creating a highly detailed, step-by-step Work Breakdown Structure (WBS) and execution plan.
            
            Rules:
            1. Break down high-level ideas into concrete, actionable steps.
            2. Be granular: instead of "Build website", use "Setup React project", "Configure Tailwind", "Create Hero Component".
            3. Return ONLY a valid JSON array of strings (e.g., ["Step 1", "Step 2"]).
            4. If the input notes are in Hebrew, the output tasks MUST be in Hebrew.
            
            Notes to analyze: "${notes}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const text = response.text || '[]';
            const suggestions = JSON.parse(text);
            if (Array.isArray(suggestions)) {
                setAiSuggestions(suggestions);
            }
        } catch (error) {
            console.error("AI Error:", error);
            setAiSuggestions([]);
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handleAddSuggestion = (suggestion: string) => {
        onCreateTaskDirectly(suggestion);
        setAiSuggestions(prev => prev.filter(s => s !== suggestion));
    };

    // Calendar Helper Functions
    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const daysInCurrentMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDayOfMonth = daysInCurrentMonth[0].getDay(); // 0 is Sunday
    const emptyDays = Array(firstDayOfMonth).fill(null);

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDate && newEventData.title && newEventData.time) {
            onAddEvent(selectedDate, newEventData.time, newEventData.title, newEventData.type);
            setNewEventData({ time: '', title: '', type: 'MEETING' });
        }
    };

    const getDayEvents = (dateStr: string) => {
        return calendarEvents.filter(ev => ev.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl p-8 animate-fade-in-up flex flex-col h-[85vh]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">המרחב האישי שלי</h2>
                        <p className="text-slate-400 text-sm font-medium">ניהול משימות ופתקי מנהל</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
                    {/* Left Column: Tasks */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList className="w-4 h-4" /> המשימות שלי</h3>
                            <button onClick={onAddTask} className="p-1.5 bg-sky-50 text-sky-500 rounded-lg hover:bg-sky-100 transition-colors shadow-sm"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                            {tasks.map(task => (
                                <div key={task.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-700">{task.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <StatusBadge status={task.status} />
                                                <span className="text-[10px] text-slate-400 font-bold">{task.estimatedMinutes} דקות</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditTask(task)} className="p-2 text-slate-300 hover:text-sky-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => onDeleteTask(task)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <LayoutDashboard className="w-12 h-12 mb-2" />
                                    <p className="font-bold">אין משימות אישיות</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Notes & Calendar Tabs */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setActiveTab('NOTES')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'NOTES' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    פתקים
                                </button>
                                <button 
                                    onClick={() => setActiveTab('CALENDAR')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'CALENDAR' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    יומן מנהל
                                </button>
                            </div>
                            
                            {activeTab === 'NOTES' && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all border shadow-sm ${isSaving ? 'bg-sky-50 text-sky-500 border-sky-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>שומר שינויים...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-3 h-3" />
                                            <span>נשמר אוטומטית</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {activeTab === 'NOTES' ? (
                            <div className="flex flex-col flex-1 gap-4 overflow-hidden animate-fade-in-up">
                                <div className={`relative ${allowAiBreakdown ? 'flex-shrink-0 h-[40%] min-h-[150px]' : 'flex-1'}`}>
                                    <textarea 
                                        value={notes} 
                                        onChange={handleNoteChange} 
                                        className="w-full h-full p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-sky-100 focus:bg-white transition-all text-slate-600 text-sm font-medium resize-none shadow-inner"
                                        placeholder="כתוב כאן הערות חשובות, רעיונות או תזכורות לעצמך..."
                                    />
                                    {allowAiBreakdown && (
                                        <div className="absolute bottom-4 left-4">
                                            <button 
                                                onClick={handleAiBreakdown}
                                                disabled={!notes.trim() || isAiGenerating}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isAiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                <span>AI Task Breakdown</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {allowAiBreakdown && (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-3xl border border-slate-100 p-4 relative">
                                        {isAiGenerating ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 animate-pulse">
                                                <BrainCircuit className="w-8 h-8 text-violet-300" />
                                                <span className="text-xs font-bold">מנתח ומפרק למשימות...</span>
                                            </div>
                                        ) : aiSuggestions.length > 0 ? (
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">הצעות AI למשימות</h4>
                                                {aiSuggestions.map((suggestion, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-violet-100 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <ListTodo className="w-4 h-4 text-violet-400" />
                                                            <span className="text-sm font-medium text-slate-700">{suggestion}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleAddSuggestion(suggestion)}
                                                            className="p-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors"
                                                            title="הפוך למשימה"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 opacity-60">
                                                <Wand2 className="w-8 h-8" />
                                                <p className="text-xs font-medium text-center max-w-[200px]">לחץ על כפתור ה-AI כדי לפרק את הפתקים שלך למשימות ביצוע</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden animate-fade-in-up">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
                                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                                    <h3 className="font-black text-slate-700 text-sm sm:text-base">
                                        {currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                                            <div key={d} className="text-[10px] font-black text-slate-400 uppercase">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
                                        {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                                        {daysInCurrentMonth.map(date => {
                                            const dateStr = date.toISOString().split('T')[0];
                                            const dayEvents = getDayEvents(dateStr);
                                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                                            
                                            return (
                                                <div 
                                                    key={dateStr}
                                                    onClick={() => { setSelectedDate(dateStr); }}
                                                    className={`aspect-square p-1 rounded-xl border transition-all cursor-pointer relative flex flex-col items-center justify-start pt-2
                                                        ${isToday ? 'bg-sky-50 border-sky-200 shadow-sm' : 'bg-white border-slate-100 hover:border-sky-200 hover:shadow-sm'}
                                                    `}
                                                >
                                                    <span className={`text-xs font-bold ${isToday ? 'text-sky-600' : 'text-slate-600'}`}>{date.getDate()}</span>
                                                    <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                                                        {dayEvents.slice(0, 3).map((ev, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className={`w-1.5 h-1.5 rounded-full 
                                                                    ${ev.type === 'MEETING' ? 'bg-indigo-400' : ev.type === 'TASK' ? 'bg-sky-400' : 'bg-amber-400'}
                                                                `} 
                                                            />
                                                        ))}
                                                        {dayEvents.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex justify-center gap-4">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400"></div>פגישה</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-400"></div>משימה</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>תזכורת</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Details Overlay */}
                {selectedDate && activeTab === 'CALENDAR' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-sm rounded-[2.5rem]">
                        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-100 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-slate-800 text-lg">
                                    {formatDate(selectedDate)}
                                </h3>
                                <button onClick={() => setSelectedDate(null)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[250px] mb-6 space-y-2">
                                {getDayEvents(selectedDate).map(ev => (
                                    <div key={ev.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ev.type === 'MEETING' ? 'bg-indigo-400' : ev.type === 'TASK' ? 'bg-sky-400' : 'bg-amber-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 break-words">{ev.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 rounded">{ev.time}</span>
                                                <span className="text-[9px] text-slate-400 uppercase">{ev.type === 'MEETING' ? 'פגישה' : ev.type === 'TASK' ? 'משימה' : 'תזכורת'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => onDeleteEvent(ev.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {getDayEvents(selectedDate).length === 0 && (
                                    <p className="text-center text-slate-400 text-xs py-4 italic">אין אירועים ליום זה</p>
                                )}
                            </div>

                            <form onSubmit={handleCreateEvent} className="space-y-3 pt-4 border-t border-slate-50">
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="כותרת האירוע..." 
                                        value={newEventData.title}
                                        onChange={(e) => setNewEventData({...newEventData, title: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="time" 
                                        value={newEventData.time}
                                        onChange={(e) => setNewEventData({...newEventData, time: e.target.value})}
                                        className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 text-center"
                                        required
                                    />
                                    <select 
                                        value={newEventData.type}
                                        onChange={(e: any) => setNewEventData({...newEventData, type: e.target.value})}
                                        className="w-2/3 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    >
                                        <option value="MEETING">פגישה</option>
                                        <option value="TASK">משימה</option>
                                        <option value="REMINDER">תזכורת</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-700 transition-all">
                                    הוסף אירוע
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, title }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, itemName: string, title: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" dir="rtl">
        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4"><AlertTriangle className="w-6 h-6" /></div>
        <h2 className="text-lg font-black text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm mb-6">האם אתה בטוח שברצונך למחוק את <span className="font-bold text-slate-700">{itemName}</span>? פעולה זו אינה ניתנת לביטול.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">ביטול</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-200">מחק לצמיתות</button>
        </div>
      </div>
    </div>
  );
};

const CompanyCreationModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (n: string, p: string, an: string, au: string, ap: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onCreate(name, pass, adminName, adminUser, adminPass); onClose(); };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800">הקמת חברה חדשה</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">שם החברה</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" required /></div>
            <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">סיסמת גישה</label><input type="text" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" required /></div>
          </div>
          <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
             <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-widest">חשבון מנהל (Super Admin)</h3>
             <input type="text" placeholder="שם מלא למנהל" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full px-4 py-2 bg-white border border-sky-100 rounded-xl outline-none text-sm" required />
             <div className="grid grid-cols-2 gap-2">
               <input type="text" placeholder="שם משתמש" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} className="w-full px-4 py-2 bg-white border border-sky-100 rounded-xl outline-none text-sm" required />
               <input type="password" placeholder="סיסמא" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full px-4 py-2 bg-white border border-sky-100 rounded-xl outline-none text-sm" required />
             </div>
          </div>
          <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all text-sm">הקם חברה</button>
        </form>
      </div>
    </div>
  );
};

const CompanyEditModal = ({ isOpen, onClose, company, onSave }: { isOpen: boolean, onClose: () => void, company: Company | null, onSave: (id: string, n: string, p: string) => void }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  useEffect(() => { if (company) { setName(company.name); setPass(company.password || ''); } }, [company]);
  if (!isOpen || !company) return null;
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(company.id, name, pass); onClose(); };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fade-in-up">
        <h2 className="text-xl font-black text-slate-800 mb-6">עריכת פרטי חברה</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">שם החברה</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" required /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">סיסמת גישה</label><input type="text" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-mono" required /></div>
          <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all text-sm">שמור שינויים</button>
        </form>
      </div>
    </div>
  );
};

const UserCreationModal = ({ isOpen, onClose, onCreate, title = "הוספת עובד חדש" }: { isOpen: boolean, onClose: () => void, onCreate: (users: {name: string, username: string, password: string, role: UserRole}[]) => void, title?: string }) => {
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  
  // Bulk state: 20 initial rows
  const initialBulkRows = Array(20).fill(null).map(() => ({ name: '', username: '', password: '', role: 'WORKER' as UserRole }));
  const [bulkRows, setBulkRows] = useState(initialBulkRows);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setBulkRows([...bulkRows, { name: '', username: '', password: '', role: 'WORKER' as UserRole }]);
  };

  const handleRemoveRow = (index: number) => {
    if (bulkRows.length > 1) {
      setBulkRows(bulkRows.filter((_, i) => i !== index));
    }
  };

  const handleUpdateRow = (index: number, field: string, value: string) => {
    const newRows = [...bulkRows];
    (newRows[index] as any)[field] = value;
    setBulkRows(newRows);
  };

  const handleGlobalRoleChange = (newRole: UserRole) => {
    const newRows = bulkRows.map(row => ({ ...row, role: newRole }));
    setBulkRows(newRows);
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
    
    // Only intercept if there's actual structured data (tabs or multiple lines)
    if (rows.length > 0 && (rows[0].includes('\t') || rows.length > 1)) {
        e.preventDefault();
        const newRows = [...bulkRows];
        
        rows.forEach((row, rOffset) => {
            const targetRowIndex = rowIndex + rOffset;
            if (targetRowIndex >= newRows.length) {
                newRows.push({ name: '', username: '', password: '', role: 'WORKER' });
            }
            
            const cols = row.split('\t');
            cols.forEach((val, cOffset) => {
                const targetColIndex = colIndex + cOffset;
                // Column mapping: 0=name, 1=username, 2=password, 3=role
                const fields = ['name', 'username', 'password', 'role'];
                if (targetColIndex < fields.length) {
                    const field = fields[targetColIndex];
                    if (field === 'role') {
                        const lowerVal = val.toLowerCase();
                        if (lowerVal.includes('worker') || lowerVal.includes('שטח')) newRows[targetRowIndex].role = 'WORKER';
                        else if (lowerVal.includes('employee') || lowerVal.includes('משרד')) newRows[targetRowIndex].role = 'EMPLOYEE';
                    } else {
                        (newRows[targetRowIndex] as any)[field] = val;
                    }
                }
            });
        });
        setBulkRows(newRows);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'SINGLE') {
      if (name.trim() && username.trim() && password.trim()) {
        onCreate([{ name, username, password, role }]);
      }
    } else {
      const validRows = bulkRows.filter(r => r.name.trim() && r.username.trim() && r.password.trim());
      if (validRows.length > 0) onCreate(validRows);
    }
    onClose();
    setName(''); setUsername(''); setPassword('');
    setBulkRows(initialBulkRows);
  };

  const validBulkCount = bulkRows.filter(r => r.name.trim() && r.username.trim() && r.password.trim()).length;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4" dir="rtl">
      <div className={`bg-white rounded-[2.5rem] shadow-2xl p-8 animate-fade-in-up relative border border-slate-100 transition-all duration-300 ${mode === 'SINGLE' ? 'w-full max-w-md' : 'w-full max-w-5xl'}`}>
        <button onClick={onClose} className="absolute top-6 left-6 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        
        <div className="flex flex-col items-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 text-center">{title}</h2>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mt-5 border border-slate-100 shadow-inner">
                <button 
                    onClick={() => setMode('SINGLE')}
                    className={`px-6 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${mode === 'SINGLE' ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <UserIcon className="w-4 h-4" />
                    עובד בודד
                </button>
                <button 
                    onClick={() => setMode('BULK')}
                    className={`px-6 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${mode === 'BULK' ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Layers className="w-4 h-4" />
                    הוספה מרוכזת (טבלה)
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'SINGLE' ? (
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">שם מלא</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white transition-all text-sm font-bold text-slate-700" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">שם משתמש</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white transition-all text-sm font-bold text-slate-700" required />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">סיסמא</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white transition-all text-sm font-bold text-slate-700" required />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-widest px-1">סוג חשבון</label>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white transition-all text-sm font-bold text-slate-700 cursor-pointer">
                  <option value="EMPLOYEE">עובד משרד (Office)</option>
                  <option value="WORKER">פועל שטח (Field)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
                <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-sky-500 shrink-0" />
                    <p className="text-[10px] text-sky-600 font-bold leading-relaxed">
                        טיפ: ניתן להעתיק טווח תאים מטבלת אקסל ולהדביק כאן בתא הראשון. המערכת תפרוס את הנתונים אוטומטית.
                    </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 sticky top-0 z-10">
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">שם מלא</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">שם משתמש</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">סיסמא</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span>תפקיד</span>
                                            <div className="relative group/global">
                                                <select 
                                                    onChange={(e) => handleGlobalRoleChange(e.target.value as UserRole)}
                                                    className="bg-sky-50 border border-sky-100 outline-none text-[8px] font-black text-sky-600 cursor-pointer rounded-md px-1.5 py-0.5 appearance-none pr-4 hover:bg-sky-100 transition-colors"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>שנה לכולם</option>
                                                    <option value="WORKER">שטח</option>
                                                    <option value="EMPLOYEE">משרד</option>
                                                </select>
                                                <ChevronDown className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 text-sky-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50">
                                {bulkRows.map((row, idx) => (
                                    <tr key={idx} className="group hover:bg-white transition-colors">
                                        <td className="p-1">
                                            <input 
                                                type="text" 
                                                value={row.name} 
                                                onPaste={(e) => handlePaste(e, idx, 0)}
                                                onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)} 
                                                className="w-full px-3 py-2 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-200 focus:bg-white rounded-lg transition-colors"
                                                placeholder="הזן שם..."
                                            />
                                        </td>
                                        <td className="p-1">
                                            <input 
                                                type="text" 
                                                value={row.username} 
                                                onPaste={(e) => handlePaste(e, idx, 1)}
                                                onChange={(e) => handleUpdateRow(idx, 'username', e.target.value)} 
                                                className="w-full px-3 py-2 bg-transparent border-none outline-none text-sm font-mono text-slate-600 placeholder:text-slate-200 focus:bg-white rounded-lg transition-colors"
                                                placeholder="משתמש..."
                                            />
                                        </td>
                                        <td className="p-1">
                                            <input 
                                                type="text" 
                                                value={row.password} 
                                                onPaste={(e) => handlePaste(e, idx, 2)}
                                                onChange={(e) => handleUpdateRow(idx, 'password', e.target.value)} 
                                                className="w-full px-3 py-2 bg-transparent border-none outline-none text-sm font-mono text-slate-600 placeholder:text-slate-200 focus:bg-white rounded-lg transition-colors"
                                                placeholder="סיסמא..."
                                            />
                                        </td>
                                        <td className="p-1">
                                            <select 
                                                value={row.role} 
                                                onChange={(e) => handleUpdateRow(idx, 'role', e.target.value)} 
                                                className="w-full px-3 py-2 bg-transparent border-none outline-none text-xs font-black text-sky-500 cursor-pointer focus:bg-white rounded-lg transition-colors"
                                            >
                                                <option value="WORKER">שטח</option>
                                                <option value="EMPLOYEE">משרד</option>
                                            </select>
                                        </td>
                                        <td className="p-1 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveRow(idx)}
                                                className="p-2 text-slate-200 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <button 
                    type="button" 
                    onClick={handleAddRow}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-sky-600 hover:bg-sky-50 rounded-2xl font-black text-xs transition-all mx-auto shadow-sm border border-slate-200"
                >
                    <Plus className="w-4 h-4" />
                    הוסף שורה חדשה
                </button>
            </div>
          )}
          
          <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-3xl font-black shadow-lg shadow-slate-200 hover:bg-slate-700 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 mt-4">
            <CheckCircle className="w-5 h-5" />
            <span>{mode === 'SINGLE' ? 'צור משתמש חדש' : `צור ${validBulkCount} משתמשים`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const CredentialsModal = ({ isOpen, onClose, users, onUpdateUser, onDeleteUser }: { isOpen: boolean, onClose: () => void, users: User[], onUpdateUser: (id: string, name: string, score: number, u: string, p: string, r: UserRole) => void, onDeleteUser: (id: string) => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const startEdit = (u: User) => { setEditingId(u.id); setEditName(u.name); setEditUsername(u.username); setEditPassword(u.password); };
  const cancelEdit = () => setEditingId(null);
  const handleSave = (u: User) => { onUpdateUser(u.id, editName, u.efficiencyScore, editUsername, editPassword, u.role); setEditingId(null); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-black text-slate-800">ניהול פרטי גישה</h2><p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">עריכת פרטי זיהוי וניהול עובדים</p></div><button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button></div>
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 rounded-xl mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100"><div className="col-span-4">שם עובד</div><div className="col-span-3">שם משתמש</div><div className="col-span-3">סיסמא</div><div className="col-span-2 text-left">פעולות</div></div>
        <div className="overflow-y-auto custom-scrollbar space-y-2 flex-1 pr-1">{users.map(u => {
            const isEditing = editingId === u.id;
            return (
              <div key={u.id} className={`grid grid-cols-12 gap-4 items-center p-3 rounded-xl border group transition-all ${isEditing ? 'bg-sky-50/50 border-sky-200 ring-1 ring-sky-100' : 'bg-white border-slate-100 hover:border-sky-100 hover:shadow-sm'}`}>
                <div className="col-span-4 flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full border border-slate-100 bg-slate-50 shrink-0" alt="" /><div className="flex-1 min-w-0">{isEditing ? <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-100 font-bold text-slate-700" placeholder="שם מלא" /> : <><p className="font-bold text-slate-700 text-sm truncate">{u.name}</p><div className="text-[8px] font-black text-sky-500 uppercase tracking-tighter mt-0.5">{u.role === 'WORKER' ? 'שטח' : 'משרד'}</div></>}</div></div>
                <div className="col-span-3">{isEditing ? <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-sky-100" placeholder="שם משתמש" /> : <p className="text-xs text-slate-500 font-mono tracking-wider truncate bg-slate-50 px-2 py-1 rounded inline-block">{u.username}</p>}</div>
                <div className="col-span-3">{isEditing ? <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-sky-100" placeholder="סיסמא" /> : <p className="text-xs text-slate-500 font-mono tracking-wider truncate bg-slate-50 px-2 py-1 rounded inline-block">{u.password}</p>}</div>
                <div className="col-span-2 flex justify-end gap-1.5">{isEditing ? <><button onClick={() => handleSave(u)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm" title="שמור שינויים"><CheckCircle className="w-4 h-4" /></button><button onClick={cancelEdit} className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm" title="ביטול"><X className="w-4 h-4" /></button></> : <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEdit(u)} className="p-2 bg-sky-50 text-sky-500 rounded-lg hover:bg-sky-100 transition-colors shadow-sm" title="עריכת פרטים"><Pencil className="w-4 h-4" /></button><button onClick={() => onDeleteUser(u.id)} className="p-2 bg-rose-50 text-rose-400 rounded-lg hover:bg-rose-100 transition-colors shadow-sm" title="מחיקת עובד"><Trash2 className="w-4 h-4" /></button></div>}</div>
              </div>
            );
          })}{users.length === 0 && <div className="py-10 text-center"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><Users className="w-6 h-6" /></div><p className="text-slate-400 text-sm font-medium">אין עובדים רשומים כרגע</p></div>}</div>
      </div>
    </div>
  );
};

const EfficiencyReportsModal = ({ isOpen, onClose, users, tasks }: { isOpen: boolean, onClose: () => void, users: User[], tasks: Task[] }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl p-6 sm:p-8 animate-fade-in-up max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">דוחות יעילות וביצועים</h2>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Team Productivity Matrix</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                {/* Header Row */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 rounded-2xl mb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 shrink-0">
                    <div className="col-span-4">עובד</div>
                    <div className="col-span-2 text-center">תפקיד</div>
                    <div className="col-span-2 text-center">משימות שבוצעו</div>
                    <div className="col-span-2 text-center">זמן עבודה כולל</div>
                    <div className="col-span-2 text-left pl-2">ציון יעילות</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
                    {users.filter(u => u.role !== 'PLATFORM_ADMIN' && !u.isDeleted).map(u => {
                        const userTasks = tasks.filter(t => t.assigneeId === u.id && !t.isDeleted);
                        const completedCount = userTasks.filter(t => t.status === 'COMPLETED').length;
                        const totalTime = userTasks.reduce((acc, t) => acc + (t.elapsedSeconds || 0), 0);
                        const isHighEfficiency = u.efficiencyScore > 90;
                        const isMidEfficiency = u.efficiencyScore > 60;

                        return (
                            <div key={u.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 sm:px-6 sm:py-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-100 transition-all group">
                                {/* Employee Info */}
                                <div className="col-span-1 sm:col-span-4 flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <img src={u.avatar} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-white shadow-sm border border-slate-50" alt="" />
                                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${u.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-700 text-sm sm:text-base truncate">{u.name}</h3>
                                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight sm:hidden">{u.role}</p>
                                    </div>
                                </div>

                                {/* Role Badge (Desktop Only) */}
                                <div className="hidden sm:flex col-span-2 justify-center items-center">
                                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider border ${u.role === 'WORKER' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>
                                        {u.role === 'WORKER' ? 'Field' : 'Office'}
                                    </span>
                                </div>

                                {/* Tasks Completed */}
                                <div className="col-span-1 sm:col-span-2 flex flex-col sm:items-center justify-center">
                                    <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">משימות שבוצעו</div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        <p className="text-sm font-black text-slate-700">{completedCount}</p>
                                    </div>
                                </div>

                                {/* Total Time */}
                                <div className="col-span-1 sm:col-span-2 flex flex-col sm:items-center justify-center">
                                    <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">זמן עבודה</div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                                        <p className="text-sm font-bold text-slate-600 font-mono">{formatTime(totalTime)}</p>
                                    </div>
                                </div>

                                {/* Efficiency Score */}
                                <div className="col-span-1 sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                                    <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">יעילות</div>
                                    <div className="text-right">
                                        <p className={`text-xl sm:text-2xl font-black tracking-tighter ${isHighEfficiency ? 'text-sky-500' : isMidEfficiency ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {u.efficiencyScore}%
                                        </p>
                                        <p className="hidden sm:block text-[8px] text-slate-300 font-black uppercase tracking-widest leading-none">Global Efficiency</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {users.filter(u => u.role !== 'PLATFORM_ADMIN' && !u.isDeleted).length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <BarChart3 className="w-8 h-8" />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest">לא נמצאו נתוני ביצועים</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AIInsightsModal = ({ 
    isOpen, 
    onClose, 
    users, 
    tasks, 
    attendanceRecords 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    users: User[], 
    tasks: Task[], 
    attendanceRecords: AttendanceRecord[]
}) => {
    const [queryText, setQueryText] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleAskAI = async () => {
        if (!queryText.trim()) return;
        setIsLoading(true);
        setResponse('');

        try {
            const contextData = {
                currentDate: getLocalDateString(),
                employees: users.filter(u => !u.isDeleted).map(u => ({ id: u.id, name: u.name, role: u.role, username: u.username, status: u.status })),
                tasks: tasks.filter(t => !t.isDeleted).map(t => ({ id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId, minutes: t.estimatedMinutes })),
                /* Added context for unsigned attendance records */
                unsignedAttendance: attendanceRecords.filter(r => !r.isSigned).map(r => ({
                    employeeName: users.find(u => u.id === r.userId)?.name || 'Unknown',
                    date: r.date,
                    minutes: r.totalMinutes || 0
                })),
                deletedItems: {
                    employees: users.filter(u => u.isDeleted).map(u => ({ id: u.id, name: u.name })),
                    tasks: tasks.filter(t => t.isDeleted).map(t => ({ id: t.id, title: t.title }))
                }
            };

            const prompt = `אתה אנליסט נתונים מומחה למערכת TaskFlow Pro. נתוני המערכת: ${JSON.stringify(contextData)}. השאלה של המנהל: ${queryText}. שים לב מיוחד לדיווחים המופיעים תחת unsignedAttendance - אלו שעות עבודה של פועלים שטרם נחתמו ואושרו על ידי מנהל אתר.`;
            const streamResult = await ai.models.generateContentStream({ model: 'gemini-3-flash-preview', contents: prompt });
            setIsLoading(false);
            let fullText = '';
            for await (const chunk of streamResult) {
                fullText += (chunk as GenerateContentResponse).text || '';
                setResponse(fullText);
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        } catch (err) {
            console.error(err);
            setResponse('חלה שגיאה במערכת ה-AI. נסה שוב.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-8 animate-fade-in-up flex flex-col h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors bg-sky-500 shadow-sky-100">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">AI תובנות ניהוליות</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Management Brain</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100" ref={scrollRef}>
                    {!response && !isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Sparkles className="w-12 h-12 text-sky-400 mb-4" />
                            <p className="text-slate-500 font-medium">
                                שאל את ה-AI לגבי ביצועי העובדים, עומסי משימות או שעות שטרם נחתמו.
                            </p>
                        </div>
                    ) : (
                        <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {isLoading && !response && <div className="flex items-center gap-3 text-sky-500 font-black animate-pulse"><Loader2 className="w-5 h-5 animate-spin" /> מנתח נתונים...</div>}
                            {response}
                        </div>
                    )}
                </div>

                <div className="relative group">
                    <input type="text" value={queryText} onChange={(e) => setQueryText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskAI()} placeholder="שאל משהו על הנתונים..." className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 transition-all text-slate-700 font-medium shadow-sm" />
                    <button onClick={handleAskAI} disabled={isLoading || !queryText.trim()} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 text-white rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-30 bg-slate-800 hover:bg-sky-500"><Send className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

const ManagerSignatureModal = ({ isOpen, onClose, users, onSignRange, fixedUserId, siteManagerPassword }: { isOpen: boolean, onClose: () => void, users: User[], onSignRange: (userId: string, startDate: string, endDate: string) => void, fixedUserId?: string, siteManagerPassword?: string }) => {
    const [selectedUserId, setSelectedUserId] = useState(fixedUserId || '');
    const [startDate, setStartDate] = useState(() => getLocalDateString());
    const [endDate, setEndDate] = useState(() => getLocalDateString());
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (fixedUserId) setSelectedUserId(fixedUserId);
    }, [fixedUserId]);

    if (!isOpen) return null;

    const selectEntireMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        setStartDate(getLocalDateString(firstDay));
        setEndDate(getLocalDateString(lastDay));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // CEO must have defined a password
        if (!siteManagerPassword) {
            setError('לא הוגדרה סיסמת מנהל אתר על ידי המנכ"ל.');
            return;
        }

        if (password !== siteManagerPassword) {
            setError('סיסמת מנהל אתר שגויה.');
            return;
        }

        if (selectedUserId && startDate && endDate) {
            onSignRange(selectedUserId, startDate, endDate);
            setPassword('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-sky-500">
                        <Signature className="w-6 h-6" />
                        <h2 className="text-xl font-black text-slate-800">חתימת מנהל אתר</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!fixedUserId && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest px-1">בחר עובד</label>
                            <select 
                                value={selectedUserId} 
                                onChange={(e) => setSelectedUserId(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100 text-slate-700 outline-none text-sm font-medium"
                                required
                            >
                                <option value="">בחר עובד...</option>
                                {users.filter(u => u.role === 'WORKER' && !u.isDeleted).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">טווח תאריכים</label>
                        <button 
                            type="button" 
                            onClick={selectEntireMonth}
                            className="flex items-center gap-1 text-[10px] font-black text-sky-500 hover:text-sky-600 transition-colors uppercase tracking-widest"
                        >
                            <CalendarIcon className="w-3 h-3" />
                            סמן חודש נוכחי
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest px-1">מתאריך</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-100/50" required />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest px-1">עד תאריך</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-100/50" required />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest px-1">סיסמת מנהל אתר לאישור</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100 text-slate-700 outline-none text-sm font-medium"
                                placeholder="••••••"
                                required 
                            />
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[11px] text-amber-700 font-bold leading-relaxed text-center">
                            שימו לב: חתימה על השעות מהווה אישור סופי לביצוע העבודה ודיוק הדיווחים. רק מנהל האתר מורשה לחתום.
                        </p>
                    </div>
                    <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        אשר וחתום על השעות
                    </button>
                </form>
            </div>
        </div>
    );
};

const SiteSettingsModal = ({ isOpen, onClose, company, onSave }: { isOpen: boolean, onClose: () => void, company: Company | null, onSave: (updates: Partial<Company>) => void }) => {
    const [pass, setPass] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (company) setPass(company.siteManagerPassword || '');
    }, [company, isOpen]);

    if (!isOpen || !company) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({ siteManagerPassword: pass });
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">הגדרות אבטחת אתר</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">CEO Control Panel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                        <p className="text-[12px] text-sky-700 font-bold leading-relaxed">
                            כמנכ"ל, עליך להגדיר סיסמא עבור מנהל האתר. סיסמא זו תידרש בכל פעם שמנהל האתר ירצה לחתום על שעות העבודה של הפועלים בשטח.
                        </p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest px-1">סיסמת חתימת מנהל אתר</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={pass} 
                                onChange={(e) => setPass(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-100 text-slate-700 outline-none text-sm font-mono"
                                placeholder="הזן סיסמא..."
                                required 
                            />
                            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        שמור הגדרות סיסמא
                    </button>
                </form>
            </div>
        </div>
    );
};

const AttendanceReportModal = ({ isOpen, onClose, users, attendanceRecords, onUpdateAttendance, onDeleteAttendance, onSignRange, activeCompany }: { isOpen: boolean, onClose: () => void, users: User[], attendanceRecords: AttendanceRecord[], onUpdateAttendance: (id: string, updates: Partial<AttendanceRecord>) => void, onDeleteAttendance: (ids: string[]) => void, onSignRange: (uid: string, s: string, e: string) => void, activeCompany: Company | null }) => {
    const [monthOffset, setMonthOffset] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [isCopied, setIsCopied] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const staff = users.filter(u => (u.role === 'EMPLOYEE' || u.role === 'WORKER') && !u.isDeleted);
    
    const attendanceMap = useMemo(() => {
        const map = new Map<string, Map<number, { mins: number, signed: boolean }>>();
        attendanceRecords.forEach(rec => {
            const d = new Date(rec.date);
            if (d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()) {
                const day = d.getDate();
                if (!map.has(rec.userId)) map.set(rec.userId, new Map());
                const userDays = map.get(rec.userId)!;
                const existing = userDays.get(day) || { mins: 0, signed: false };
                userDays.set(day, { 
                    mins: existing.mins + (rec.totalMinutes || 0), 
                    signed: existing.signed || !!rec.isSigned 
                });
            }
        });
        return map;
    }, [attendanceRecords, currentMonth]);

    const handleCopyToClipboard = () => {
        const formatAsDecimal = (mins: number) => {
            if (!mins || mins === 0) return "0";
            return Number((mins / 60).toFixed(2)).toString();
        };

        const header = ['שם', ...daysArray.map(day => `${day}.${currentMonth.getMonth() + 1}`), 'סה"כ'].join('\t');
        const rows = staff.map(user => {
            let userTotalMinutes = 0;
            const dayValues = daysArray.map(day => {
                const data = attendanceMap.get(user.id)?.get(day) || { mins: 0 };
                userTotalMinutes += data.mins;
                return formatAsDecimal(data.mins);
            });
            return [user.name, ...dayValues, formatAsDecimal(userTotalMinutes)].join('\t');
        });
        const content = [header, ...rows].join('\n');
        
        navigator.clipboard.writeText(content).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    if (!isOpen) return null;
    const tableFontSize = `${11 * zoom}px`;
    const nameColWidth = `${150 * zoom}px`;
    const totalColWidth = `${80 * zoom}px`;
    const minTableWidth = `${1000 * zoom}px`;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4" dir="rtl">
            <ManagerSignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} users={users} onSignRange={onSignRange} siteManagerPassword={activeCompany?.siteManagerPassword} />
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl p-6 sm:p-8 animate-fade-in-up max-h-[90vh] flex flex-col relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">דוח נוכחות חודשי - צוות</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Monthly Operations Overview</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSignatureModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-700 shadow-md transition-all text-[11px] h-10">
                            <Signature className="w-4 h-4" />
                            <span>חתימת מנהל</span>
                        </button>
                        <button 
                            onClick={handleCopyToClipboard}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all h-10 shadow-sm text-[11px] font-black ${isCopied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{isCopied ? 'הועתק!' : 'העתק לאקסל'}</span>
                        </button>
                        <div className="bg-white border border-slate-200 rounded-2xl flex items-center shadow-sm h-10 px-1">
                            <button onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))} className="p-2 text-slate-400 hover:text-sky-500 rounded-xl transition-all"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))} className="p-2 text-slate-400 hover:text-sky-500 rounded-xl transition-all"><ZoomIn className="w-4 h-4" /></button>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-4 h-10 shadow-sm">
                            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1 text-slate-400 hover:text-sky-500"><ChevronRight className="w-5 h-5"/></button>
                            <span className="font-black text-slate-700 min-w-[140px] text-center text-sm">{currentMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1 text-slate-400 hover:text-sky-500"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-6 left-6 p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-100 rounded-2xl bg-slate-50/20">
                    <table className="w-full text-right border-collapse table-fixed" style={{ fontSize: tableFontSize, minWidth: minTableWidth }}>
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-[#e7f3ff] text-[#2c5282]">
                                <th className="sticky right-0 z-30 bg-[#e7f3ff] px-4 py-3 border-b border-l border-slate-200 font-black" style={{ width: nameColWidth }}>שם</th>
                                {daysArray.map(day => (<th key={day} className={`px-0.5 py-3 border-b border-slate-200 text-center font-black ${day === today.getDate() && currentMonth.getMonth() === today.getMonth() ? 'bg-sky-100/50' : ''}`}>{day}.{currentMonth.getMonth() + 1}</th>))}
                                <th className="px-4 py-3 border-b border-slate-200 text-center font-black bg-[#dbeafe]" style={{ width: totalColWidth }}>סה"כ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {staff.map(user => { 
                                let userTotalMinutes = 0; 
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-2 border-b border-l border-slate-100 font-bold text-slate-700 flex items-center gap-2 overflow-hidden">
                                            <img src={user.avatar} className="rounded-full shrink-0 border border-slate-100" style={{ width: `${24 * zoom}px`, height: `${24 * zoom}px` }} />
                                            <span className="truncate">{user.name}</span>
                                        </td>
                                        {daysArray.map(day => { 
                                            const dayData = attendanceMap.get(user.id)?.get(day) || { mins: 0, signed: false }; 
                                            userTotalMinutes += dayData.mins; 
                                            return (
                                                <td key={day} className={`px-0.5 py-2 border-b border-slate-100 text-center font-mono relative ${dayData.mins > 0 ? (dayData.signed ? 'text-emerald-600 font-bold bg-emerald-50/20' : 'text-sky-600 font-bold') : 'text-slate-200'} ${day === today.getDate() && currentMonth.getMonth() === today.getMonth() ? 'bg-sky-50/30' : ''}`}>
                                                    {dayData.mins > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <span>{formatDurationShort(dayData.mins)}</span>
                                                            {dayData.signed && <UserCheck className="w-2.5 h-2.5 text-emerald-400 absolute bottom-0.5 left-0.5" />}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            ); 
                                        })}
                                        <td className="px-4 py-2 border-b border-slate-100 text-center font-black text-sky-700 bg-slate-50 group-hover:bg-sky-50/50">{formatDurationShort(userTotalMinutes) || '0:00'}</td>
                                    </tr>
                                ); 
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Sidebar Components ---

const SidebarItem: React.FC<{ icon: any, label: string, onClick: () => void, active?: boolean, variant?: 'default' | 'danger' | 'ai' }> = ({ icon: Icon, label, onClick, active = false, variant = 'default' }) => {
  const isAi = variant === 'ai';
  const styles = {
    default: active ? 'bg-sky-50 text-sky-500 border-r-2 border-sky-400' : 'text-slate-400 hover:bg-white hover:text-slate-600',
    danger: 'text-rose-500 hover:bg-rose-50 transition-colors',
    ai: active ? 'bg-sky-100/50 text-sky-600 border border-sky-400 shadow-inner rounded-xl' : 'text-sky-400 border border-sky-100 rounded-xl hover:bg-sky-50 hover:text-sky-500 shadow-sm transition-all'
  };
  return (
    <button onClick={onClick} className={`${isAi ? 'w-[65%] mx-auto my-1.5' : 'w-full'} flex items-center gap-2.5 px-4 py-3 transition-all duration-200 group text-[13px] font-bold ${styles[variant]}`}>
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-400' : 'group-hover:scale-105 transition-transform'}`} />
      <span className="truncate">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<{ user: User, onLogout: () => void, onNavigate: (view: string) => void, activeView: string, items: Array<{ id: string, label: string, icon: any, variant?: 'default' | 'danger' | 'ai' }> }> = ({ user, onLogout, onNavigate, activeView, items }) => {
  return (
    <div className="hidden md:flex w-52 bg-slate-50/80 backdrop-blur-md h-full flex-col shrink-0 border-l border-slate-100 overflow-hidden z-[50]" dir="rtl">
        <div className="p-5 border-b border-slate-100/50 flex items-center gap-2.5"><div className="w-7 h-7 bg-gradient-to-br from-sky-200 to-indigo-200 rounded flex items-center justify-center text-white shadow-sm"><Layout className="w-4 h-4" /></div><div><h1 className="text-slate-600 font-black tracking-tight text-sm leading-none">TaskFlow</h1><p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">Management</p></div></div>
        <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar flex flex-col">{items.map(item => (<SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeView === item.id} variant={item.variant} onClick={() => onNavigate(item.id)} />))}</nav>
        <div className="p-4 border-t border-slate-100/50 space-y-3"><div className="flex items-center gap-2.5 p-2.5 bg-white rounded-2xl border border-slate-50 shadow-soft"><img src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'} className="w-8 h-8 rounded-full border border-slate-100 bg-slate-50 shadow-sm" alt={user.name} /><div className="overflow-hidden leading-tight"><p className="text-slate-600 text-[11px] font-black truncate">{user.name}</p><p className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Online</p></div></div><button onClick={onLogout} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-rose-50 text-rose-500 border border-slate-100 rounded-2xl transition-all duration-200 group font-black text-xs shadow-sm hover:shadow-soft"><span>התנתק</span><LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /></button></div>
    </div>
  );
};

// --- Dashboard & Cockpits ---

const PlatformAdminDashboard = ({ 
    companies, 
    users, 
    tasks, 
    currentUser, 
    onAddCompany, 
    onToggleCompanyStatus, 
    onDeleteCompany, 
    onAddUserToCompany, 
    onUpdateUser, 
    onDeleteUser, 
    onUpdateCompany, 
    onLogout, 
    onAddTask,
    onUpdateNotes,
    onEditTask,
    onDeleteTask
}: any) => {
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [managingUsersCompanyId, setManagingUsersCompanyId] = useState<string | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [targetCompanyForUser, setTargetCompanyForUser] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

    // NEW: Local state for task modals
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [createTaskTargetId, setCreateTaskTargetId] = useState<string | null>(null);
    
    // Filter tasks for the Platform Admin
    const myTasks = tasks.filter((t:any) => t.assigneeId === currentUser.id && !t.isDeleted);

    const sidebarItems = [
        { id: 'dashboard', label: 'חברות', icon: Building2 }, 
        { id: 'workspace', label: 'מרחב עבודה', icon: StickyNote },
        { id: 'settings', label: 'הגדרות', icon: Settings }
    ];
    
    const filteredCompanies = useMemo(() => searchTerm.trim() ? companies.filter((c:any) => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : companies, [companies, searchTerm]);
    
    const handleNavigate = (view: string) => { 
        if (view === 'settings') setIsSettingsModalOpen(true); 
        if (view === 'workspace') setIsWorkspaceOpen(true);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
            <Sidebar user={currentUser} onLogout={onLogout} onNavigate={handleNavigate} activeView="dashboard" items={sidebarItems} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                <PlatformAdminSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} user={currentUser} onSave={onUpdateUser} />
                <DeleteConfirmationModal isOpen={!!companyToDelete} onClose={() => setCompanyToDelete(null)} onConfirm={() => companyToDelete && onDeleteCompany(companyToDelete.id)} itemName={companyToDelete?.name || ''} title="מחיקת חברה" />
                <CompanyCreationModal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} onCreate={onAddCompany} />
                <CompanyEditModal isOpen={!!companyToEdit} onClose={() => setCompanyToEdit(null)} company={companyToEdit} onSave={onUpdateCompany} />
                <UserEditModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} user={editingUser} currentUser={currentUser} onSave={onUpdateUser} isPlatformAdmin={true} companies={companies} />
                <UserCreationModal isOpen={isAddUserOpen} onClose={() => { setIsAddUserOpen(false); setTargetCompanyForUser(null); }} onCreate={(users) => { if (targetCompanyForUser) users.forEach(u => onAddUserToCompany(u.name, u.username, u.password, u.role, targetCompanyForUser)); }} title={`הוספת עובד ל-${companies.find((c:any) => c.id === targetCompanyForUser)?.name || ''}`} />
                <CredentialsModal isOpen={!!managingUsersCompanyId} onClose={() => setManagingUsersCompanyId(null)} users={users.filter((u:any) => u.companyId === managingUsersCompanyId && !u.isDeleted)} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />
                
                {/* NEW: Task Modals for Platform Admin */}
                <TaskCreationModal 
                  isOpen={!!createTaskTargetId} 
                  onClose={() => setCreateTaskTargetId(null)} 
                  onCreate={(title, minutes) => {
                    if (createTaskTargetId) {
                        onAddTask(createTaskTargetId, title, minutes);
                    }
                    setCreateTaskTargetId(null);
                  }} 
                />
                <TaskEditModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} task={taskToEdit} onSave={onEditTask} />
                <DeleteConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={() => taskToDelete && onDeleteTask(taskToDelete.id)} itemName={taskToDelete?.title || ''} title="מחיקת משימה" />

                <AdminPersonalWorkspace 
                    isOpen={isWorkspaceOpen}
                    onClose={() => setIsWorkspaceOpen(false)}
                    user={currentUser}
                    tasks={myTasks}
                    calendarEvents={[]}
                    onAddTask={() => setCreateTaskTargetId(currentUser.id)}
                    onCreateTaskDirectly={(title) => onAddTask(currentUser.id, title, 30)}
                    onUpdateNotes={onUpdateNotes}
                    onEditTask={(t: any) => setTaskToEdit(t)}
                    onDeleteTask={(t: any) => setTaskToDelete(t)}
                    onAddEvent={() => {}}
                    onDeleteEvent={() => {}}
                    allowAiBreakdown={false} 
                />

                <div className="max-w-7xl mx-auto"><div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"><div className="text-right w-full md:w-auto"><h1 className="text-2xl font-black text-slate-800 tracking-tight">ניהול פלטפורמה</h1><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">System Admin</p></div><div className="flex-1 max-w-sm w-full"><div className="relative group"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-sky-500 transition-colors" /><input type="text" placeholder="חיפוש חברה..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-600 text-sm font-medium transition-all shadow-sm placeholder:text-slate-300" /></div></div><div className="w-full md:w-auto"><button onClick={() => setIsCompanyModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 shadow-md transition-all text-xs"><Plus className="w-4 h-4" /><span>הקמת חברה</span></button></div></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">{filteredCompanies.map((company:any) => { const employeeCount = users.filter((u:any) => u.companyId === company.id && !u.isDeleted).length; return (<div key={company.id} className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100 flex flex-col group/comp transition-all hover:shadow-md hover:-translate-y-0.5 relative"><div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/comp:opacity-100 transition-opacity z-10"><button onClick={() => setCompanyToEdit(company)} className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-slate-400 hover:text-sky-500 border border-slate-100 shadow-sm transition-colors"><Pencil className="w-3 h-3" /></button><button onClick={() => setCompanyToDelete(company)} className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm transition-colors"><Trash2 className="w-3 h-3" /></button></div><div className="flex flex-col items-center mb-4 mt-2"><div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-400 mb-3 shadow-inner">{company.name.charAt(0)}</div><h3 className="font-black text-base text-slate-800 text-center mb-2 px-2 truncate w-full tracking-tight">{company.name}</h3><button onClick={() => onToggleCompanyStatus(company.id)} className={`text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${company.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{company.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED'}</button></div><div className="space-y-2 mb-4"><div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100/50"><Users className="w-3.5 h-3.5 text-slate-300" /><span className="text-xs font-bold text-slate-500">{employeeCount} עובדים</span></div><div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100/50"><Fingerprint className="w-3.5 h-3.5 text-slate-300" /><span className="text-xs font-bold text-slate-500 font-mono">{company.password || '---'}</span></div></div><div className="flex gap-2 items-center mt-auto"><button onClick={() => setManagingUsersCompanyId(company.id)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all shadow-sm">ניהול צוות</button><button onClick={() => { setTargetCompanyForUser(company.id); setIsAddUserOpen(true); }} className="w-8 h-8 bg-sky-50 text-sky-500 border border-sky-100 rounded-xl flex items-center justify-center hover:bg-sky-100 transition-all shadow-sm"><UserPlus className="w-4 h-4" /></button></div></div>); })}</div></div>
            </main>
        </div>
    );
};

const AdminDashboard = ({ users, tasks, attendanceRecords, calendarEvents, currentUser, onCreateUrgent, onAddTask, onUpdateUser, onAddUser, onDeleteUser, onToggleStatus, onUpdateNotes, onEditTask, onDeleteTask, onUpdateAttendance, onDeleteAttendance, onSignRange, onLogout, onExecutionAction, activeCompany, onUpdateCompany, onAddEvent, onDeleteEvent }: any) => {
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [isSiteSettingsOpen, setIsSiteSettingsOpen] = useState(false);
  const [createTaskTargetId, setCreateTaskTargetId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userForHistory, setUserForHistory] = useState<User | null>(null);
  const [isPersonalWorkspaceOpen, setIsPersonalWorkspaceOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToBlock, setTaskToBlock] = useState<Task | null>(null);
  const [filterRole, setFilterRole] = useState<'ALL' | 'EMPLOYEE' | 'WORKER'>('ALL');
  
  // New States: Search and View Mode
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  const allStaff = useMemo(() => users.filter((u:any) => (u.role === 'EMPLOYEE' || u.role === 'WORKER') && !u.isDeleted), [users]);
  const employeesCount = useMemo(() => allStaff.filter((u:any) => u.role === 'EMPLOYEE').length, [allStaff]);
  const workersCount = useMemo(() => allStaff.filter((u:any) => u.role === 'WORKER').length, [allStaff]);
  
  // Updated Filtering Logic: Includes Search
  const filteredStaff = useMemo(() => {
    let list = filterRole === 'ALL' ? allStaff : allStaff.filter((u:any) => u.role === filterRole);
    if (searchTerm.trim()) {
        list = list.filter((u:any) => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [allStaff, filterRole, searchTerm]);

  const myTasks = tasks.filter((t:any) => t.assigneeId === currentUser.id && !t.isDeleted);
  const myEvents = calendarEvents.filter((e:any) => e.userId === currentUser.id);

  const sidebarItems = [
    { id: 'dashboard', label: 'מרכז שליטה', icon: LayoutDashboard },
    { id: 'workspace', label: 'המרחב שלי', icon: StickyNote },
    { id: 'management', label: 'ניהול צוות', icon: Key },
    { id: 'add_user', label: 'הוספת עובד', icon: UserPlus },
    { id: 'attendance', label: 'נוכחות', icon: CalendarDays },
    { id: 'efficiency', label: 'דוחות', icon: BarChart3 },
    { id: 'site_settings', label: 'הגדרות אתר', icon: Settings },
    { id: 'ai', label: 'AI', icon: Bot, variant: 'ai' as const },
  ];

  const handleNavigate = (view: string) => {
    if (view === 'workspace') setIsPersonalWorkspaceOpen(true);
    if (view === 'management') setIsCredentialsOpen(true);
    if (view === 'add_user') setIsAddUserOpen(true);
    if (view === 'attendance') setIsAttendanceReportOpen(true);
    if (view === 'efficiency') setIsReportsOpen(true);
    if (view === 'ai') setIsAIInsightsOpen(true);
    if (view === 'site_settings') setIsSiteSettingsOpen(true);
  };

  const handleBlockerSubmit = (reason: string, details: string) => { if (taskToBlock) { const fullReason = details ? `${reason}: ${details}` : reason; onEditTask(taskToBlock.id, { status: 'BLOCKED', blockedReason: fullReason }); } setTaskToBlock(null); };

  return (
    <div className="flex h-screen bg-white overflow-hidden" dir="rtl">
        <Sidebar user={currentUser} onLogout={onLogout} onNavigate={handleNavigate} activeView="dashboard" items={sidebarItems} />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/30">
            <SiteSettingsModal isOpen={isSiteSettingsOpen} onClose={() => setIsSiteSettingsOpen(false)} company={activeCompany} onSave={(up) => onUpdateCompany(activeCompany.id, up)} />
            <AIInsightsModal isOpen={isAIInsightsOpen} onClose={() => setIsAIInsightsOpen(false)} users={users} tasks={tasks} attendanceRecords={attendanceRecords} />
            <BlockerModal isOpen={!!taskToBlock} onClose={() => setTaskToBlock(null)} onSubmit={handleBlockerSubmit} />
            <TaskCreationModal 
              isOpen={!!createTaskTargetId} 
              onClose={() => setCreateTaskTargetId(null)} 
              onCreate={(title, minutes) => {
                if (createTaskTargetId) {
                    onAddTask(createTaskTargetId, title, minutes);
                }
                setCreateTaskTargetId(null);
              }} 
            />
            <TaskEditModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} task={taskToEdit} onSave={onEditTask} /><DeleteConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={() => taskToDelete && onDeleteTask(taskToDelete.id)} itemName={taskToDelete?.title || ''} title="מחיקת משימה" /><CredentialsModal isOpen={isCredentialsOpen} onClose={() => setIsCredentialsOpen(false)} users={allStaff} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} /><EfficiencyReportsModal isOpen={isReportsOpen} onClose={() => setIsReportsOpen(false)} users={users} tasks={tasks} /><AttendanceReportModal isOpen={isAttendanceReportOpen} onClose={() => setIsAttendanceReportOpen(false)} users={users} attendanceRecords={attendanceRecords} onUpdateAttendance={onUpdateAttendance} onDeleteAttendance={onDeleteAttendance} onSignRange={onSignRange} activeCompany={activeCompany} /><TaskHistoryModal isOpen={!!userForHistory} onClose={() => setUserForHistory(null)} user={userForHistory} tasks={tasks.filter(t => !t.isDeleted)} onEditTask={(tid, up) => up.title ? setTaskToEdit(tasks.find((tk:any) => tk.id === tid) || null) : onEditTask(tid, up)} onDeleteTask={(t) => setTaskToDelete(t)} onBlockTask={setTaskToBlock} /><UserEditModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} user={editingUser} currentUser={currentUser} onSave={onUpdateUser} /><UserCreationModal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} onCreate={(newUsers) => newUsers.forEach(u => onAddUser(u.name, u.username, u.password, u.role))} /><DeleteConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={() => userToDelete && onDeleteUser(userToDelete.id)} itemName={userToDelete?.name || ''} title="מחיקת עובד" />
            
            <AdminPersonalWorkspace 
                isOpen={isPersonalWorkspaceOpen} 
                onClose={() => setIsPersonalWorkspaceOpen(false)} 
                user={currentUser} 
                tasks={myTasks} 
                calendarEvents={myEvents}
                onAddTask={() => setCreateTaskTargetId(currentUser.id)}
                onCreateTaskDirectly={(title) => onAddTask(currentUser.id, title, 30)}
                onUpdateNotes={onUpdateNotes} 
                onEditTask={(t:any) => setTaskToEdit(t)} 
                onDeleteTask={(t:any) => setTaskToDelete(t)}
                onAddEvent={onAddEvent}
                onDeleteEvent={onDeleteEvent}
                allowAiBreakdown={false}
            />
            
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-700 tracking-tight">מרכז שליטה</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Team Performance</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Role Filters */}
                        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-soft">
                            <button onClick={() => setFilterRole('ALL')} className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${filterRole === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><span className="shrink-0">{allStaff.length}</span><Users className="w-3.5 h-3.5" /><span>הכל</span></button>
                            <button onClick={() => setFilterRole('EMPLOYEE')} className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${filterRole === 'EMPLOYEE' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><span className="shrink-0">{employeesCount}</span><UserIcon className="w-3.5 h-3.5" /><span>משרד</span></button>
                            <button onClick={() => setFilterRole('WORKER')} className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${filterRole === 'WORKER' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}><span className="shrink-0">{workersCount}</span><HardHat className="w-3.5 h-3.5" /><span>שטח</span></button>
                        </div>

                        {/* Search Input */}
                        <div className="relative group min-w-[200px]">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-sky-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="חיפוש עובד..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-4 pr-9 py-2 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-100 text-slate-600 text-xs font-bold transition-all shadow-soft placeholder:text-slate-300"
                            />
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center p-1.5 bg-white border border-slate-100 rounded-2xl shadow-soft">
                            <button 
                                onClick={() => setViewMode('GRID')} 
                                className={`p-1.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-sky-50 text-sky-500' : 'text-slate-300 hover:bg-slate-50'}`}
                                title="תצוגת קלפים"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode('TABLE')} 
                                className={`p-1.5 rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-sky-50 text-sky-500' : 'text-slate-300 hover:bg-slate-50'}`}
                                title="תצוגת טבלה"
                            >
                                <Rows3 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStaff.map((emp:any) => { 
                            const empTasks = tasks.filter((t:any) => t.assigneeId === emp.id && !t.isDeleted); 
                            const inProgressTask = empTasks.find((t:any) => t.status === 'IN_PROGRESS'); 
                            const blockedTask = empTasks.find((t:any) => t.status === 'BLOCKED'); 
                            const activeTask = inProgressTask || blockedTask; 
                            const isSuspended = emp.status === 'OFFLINE'; 
                            const isBlocked = activeTask?.status === 'BLOCKED'; 
                            const isWorker = emp.role === 'WORKER'; 
                            
                            return (
                                <div key={emp.id} className={`bg-white rounded-2xl shadow-soft border border-white overflow-hidden flex flex-col group/card transition-all hover:translate-y-[-2px] ${isSuspended ? 'opacity-60 grayscale' : ''} ${isBlocked ? 'ring-1 ring-rose-100' : ''}`}>
                                    <div className="p-4 border-b border-slate-50 flex items-center justify-between relative bg-white">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="relative shrink-0">
                                                <img src={emp.avatar} className="w-9 h-9 rounded-full border border-slate-100 shadow-sm relative z-10" alt={emp.name} />
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white z-20 ${isBlocked ? 'bg-rose-400' : emp.status === 'ONLINE' ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="font-bold text-[13px] text-slate-700 truncate" title={emp.name}>{emp.name}</h3>
                                                    <div className="flex opacity-0 group-hover/card:opacity-100 transition-opacity gap-0.5">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingUser(emp); }} className="p-1 hover:bg-slate-50 rounded text-slate-300 hover:text-sky-400 transition-colors"><Pencil className="w-3 h-3" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onToggleStatus(emp.id); }} className={`p-1 hover:bg-slate-50 rounded transition-colors ${emp.status === 'ONLINE' ? 'text-slate-300 hover:text-amber-400' : 'text-sky-400 hover:text-sky-600'}`}><Power className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Efficiency: <span className={emp.efficiencyScore > 90 ? 'text-emerald-400' : 'text-amber-400'}>{emp.efficiencyScore}%</span></div>
                                                    <span className={`text-[7px] font-black uppercase px-1.5 rounded-full ${isWorker ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>{isWorker ? 'Field' : 'Office'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {!isWorker && (
                                            <button onClick={() => setCreateTaskTargetId(emp.id)} disabled={isSuspended} className="p-1.5 bg-sky-50 text-sky-400 rounded-lg hover:bg-sky-100 disabled:opacity-50 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 bg-slate-50/20">
                                        {isSuspended ? (
                                            <div className="h-full flex items-center justify-center text-slate-300 font-black text-[9px] uppercase border border-dashed border-slate-100 rounded-xl min-h-[100px]">Offline</div>
                                        ) : isWorker ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 min-h-[100px]">
                                                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-400"><HardHat className="w-5 h-5" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Field Operations</p>
                                                    <p className="text-[9px] text-slate-400">פועל שטח - נוכחות בלבד</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <div className="text-[8px] uppercase tracking-widest text-slate-300 font-black mb-1.5">Active Job</div>
                                                    {activeTask ? (
                                                        <div className={`${isBlocked ? 'bg-rose-50/50 border-rose-100' : 'bg-white border-sky-50'} border rounded-xl p-3 relative overflow-hidden shadow-sm`}>
                                                            <h4 className={`font-bold ${isBlocked ? 'text-rose-800' : 'text-slate-600'} text-[12px] line-clamp-1 mb-1`}>{activeTask.title}</h4>
                                                            {isBlocked && activeTask.blockedReason && (<p className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md mt-1.5 line-clamp-1 flex items-center gap-1" title={activeTask.blockedReason}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{activeTask.blockedReason}</span></p>)}
                                                            <div className={`text-lg font-mono ${isBlocked ? 'text-rose-500' : 'text-sky-400'} font-black tracking-tight mt-1`}>{isBlocked ? formatTime(activeTask.waitSeconds || 0) : formatTime(activeTask.elapsedSeconds)}</div>
                                                            <div className={`absolute bottom-0 left-0 h-0.5 ${isBlocked ? 'bg-rose-100' : 'bg-slate-50'} w-full`}>
                                                                <div className={`h-full ${isBlocked ? 'bg-rose-400' : 'bg-sky-300'}`} style={{ width: isBlocked ? '100%' : `${Math.min(100, (activeTask.elapsedSeconds / (activeTask.estimatedMinutes * 60)) * 100)}%`}}></div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-50/50 border border-slate-50 border-dashed rounded-xl p-3 text-center text-slate-300 text-[10px] font-bold uppercase">Ready</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[8px] uppercase tracking-widest text-slate-300 font-black mb-1.5">Queue</div>
                                                    <div className="space-y-1.5">
                                                        {empTasks.filter((t:any) => t.status === 'PENDING' || t.status === 'PAUSED').slice(0, 2).map((t:any) => (
                                                            <div key={t.id} className="flex items-center justify-between text-[11px] p-2 bg-white border border-slate-100 rounded-lg shadow-sm group/q relative overflow-hidden">
                                                                <span className="truncate max-w-[90px] text-slate-500 font-bold">{t.title}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[8px] text-slate-300 font-mono bg-slate-50 px-1 rounded transition-opacity group-hover/q:opacity-0">{t.estimatedMinutes}m</span>
                                                                    <button onClick={(e) => { e.stopPropagation(); setTaskToDelete(t); }} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-rose-300 hover:text-rose-500 opacity-0 group-hover/q:opacity-100 transition-all bg-white/80 rounded"><Trash2 className="w-3 h-3" /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {empTasks.filter((t:any) => t.status === 'PENDING' || t.status === 'PAUSED').length === 0 && <span className="text-[9px] text-slate-200 italic block text-center">Empty queue</span>}
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setUserForHistory(emp); }} className="w-full mt-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 text-slate-400 rounded-lg transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest">View Tasks</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ); 
                        })}
                    </div>
                ) : (
                    /* Table View Implementation */
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-soft overflow-hidden animate-fade-in-up">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">עובד</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">תפקיד</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">יעילות</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">סטטוס</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">משימה פעילה</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredStaff.map((emp:any) => {
                                        const empTasks = tasks.filter((t:any) => t.assigneeId === emp.id && !t.isDeleted);
                                        const activeTask = empTasks.find((t:any) => t.status === 'IN_PROGRESS' || t.status === 'BLOCKED');
                                        const isSuspended = emp.status === 'OFFLINE';
                                        
                                        return (
                                            <tr key={emp.id} className={`hover:bg-slate-50/30 transition-colors group ${isSuspended ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <img src={emp.avatar} className="w-9 h-9 rounded-full border border-slate-100 shadow-sm" alt="" />
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-700 text-sm truncate">{emp.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">@{emp.username}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${emp.role === 'WORKER' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>
                                                        {emp.role === 'WORKER' ? 'Field' : 'Office'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${emp.efficiencyScore > 90 ? 'bg-emerald-400' : emp.efficiencyScore > 70 ? 'bg-sky-400' : 'bg-amber-400'}`} style={{ width: `${emp.efficiencyScore}%` }} />
                                                        </div>
                                                        <span className={`text-xs font-black ${emp.efficiencyScore > 90 ? 'text-emerald-500' : emp.efficiencyScore > 70 ? 'text-sky-500' : 'text-amber-500'}`}>
                                                            {emp.efficiencyScore}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex justify-center">
                                                        <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${activeTask?.status === 'BLOCKED' ? 'bg-rose-400' : emp.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                                                    {activeTask ? (
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold ${activeTask.status === 'BLOCKED' ? 'text-rose-600' : 'text-slate-600'} truncate max-w-[150px]`}>
                                                                {activeTask.title}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {activeTask.status === 'BLOCKED' ? formatTime(activeTask.waitSeconds || 0) : formatTime(activeTask.elapsedSeconds)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 uppercase font-black">---</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isSuspended && emp.role !== 'WORKER' && (
                                                            <button onClick={() => setCreateTaskTargetId(emp.id)} className="p-1.5 bg-sky-50 text-sky-500 hover:bg-sky-100 rounded-lg shadow-sm border border-sky-100" title="משימה חדשה"><Plus className="w-4 h-4" /></button>
                                                        )}
                                                        <button onClick={() => setUserForHistory(emp)} className="p-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg shadow-sm border border-slate-100" title="היסטוריה"><History className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingUser(emp)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-sky-500 rounded-lg shadow-sm border border-slate-100" title="עריכה"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => onToggleStatus(emp.id)} className={`p-1.5 rounded-lg shadow-sm border ${emp.status === 'ONLINE' ? 'bg-amber-50 text-amber-500 border-amber-100 hover:bg-amber-100' : 'bg-sky-50 text-sky-500 border-sky-100 hover:bg-sky-100'}`} title={emp.status === 'ONLINE' ? 'כיבוי' : 'הפעלה'}><Power className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {filteredStaff.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-4 shadow-soft">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500">לא נמצאו עובדים</h3>
                        <p className="text-slate-400 text-sm">נסה לשנות את הסינון או את מילות החיפוש</p>
                    </div>
                )}
            </div>
        </main>
      </div>
    );
};

const EmployeeCockpit = ({ user, tasks, onUpdateTask, onLogout, onAddTask }: any) => {
    const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToBlock, setTaskToBlock] = useState<Task | null>(null);
    const inProgressTask = tasks.find((t:any) => t.status === 'IN_PROGRESS' && !t.isDeleted);
    const firstBlockedTask = tasks.find((t:any) => t.status === 'BLOCKED' && !t.isDeleted);
    const displayedTask = inProgressTask || firstBlockedTask;
    const queue = tasks.filter((t:any) => !t.isDeleted && t.id !== displayedTask?.id && ['PENDING', 'PAUSED', 'BLOCKED'].includes(t.status));
    const handleAction = (task: Task | undefined) => {
        if (!task || task.status === 'BLOCKED') return;
        if (task.status === 'IN_PROGRESS') { onUpdateTask(task.id, { status: 'PAUSED' }); } else {
            if (inProgressTask) { onUpdateTask(inProgressTask.id, { status: 'PAUSED' }); }
            onUpdateTask(task.id, { status: 'IN_PROGRESS' });
        }
    };
    const handleCreateTask = (title: string, estimatedMinutes: number) => { onAddTask(title, estimatedMinutes); setAddTaskModalOpen(false); };
    const handleBlockerSubmit = (reason: string, details: string) => { if (taskToBlock) { const fullReason = details ? `${reason}: ${details}` : reason; onUpdateTask(taskToBlock.id, { status: 'BLOCKED', blockedReason: fullReason }); } setTaskToBlock(null); };
    const handleResumeTask = () => { if (displayedTask && displayedTask.status === 'BLOCKED') { if (inProgressTask) { onUpdateTask(inProgressTask.id, { status: 'PAUSED' }); } onUpdateTask(displayedTask.id, { status: 'IN_PROGRESS', blockedReason: '', waitSeconds: 0 }); } };
    return (
        <div className="flex h-screen bg-white" dir="rtl">
            <BlockerModal isOpen={!!taskToBlock} onClose={() => setTaskToBlock(null)} onSubmit={handleBlockerSubmit} /><TaskCreationModal isOpen={isAddTaskModalOpen} onClose={() => setAddTaskModalOpen(false)} onCreate={handleCreateTask} /><TaskEditModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} task={taskToEdit} onSave={onUpdateTask} />
            <Sidebar user={user} onLogout={onLogout} onNavigate={() => {}} activeView="cockpit" items={[{ id: 'cockpit', label: 'שולחן עבודה', icon: LayoutDashboard }]} />
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto"><div className="flex md:hidden items-center justify-between p-3 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl mb-6 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white"><UserIcon className="w-5 h-5" /></div><div className="leading-tight"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">עובד צוות</p><p className="text-[14px] font-black text-slate-700">{user.name}</p></div></div><button onClick={onLogout} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><LogOut className="w-5 h-5" /></button></div><div className="max-w-4xl mx-auto space-y-6 sm:space-y-8"><header className="flex justify-between items-center"><div><h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">שלום, {user.name.split(' ')[0]}</h1><p className="text-sm text-slate-400 font-medium">הנה המשימות שלך להיום</p></div><button onClick={() => setAddTaskModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-100 shadow-sm border border-slate-100 transition-all text-xs sm:text-sm"><Plus className="w-4 h-4" />הוסף משימה</button></header><div className={`p-1 rounded-3xl transition-all shadow-glow ${displayedTask ? (displayedTask.status === 'BLOCKED' ? 'bg-rose-100' : 'bg-emerald-100') : 'bg-transparent'}`}><div className="bg-white p-5 sm:p-6 rounded-2xl min-h-[200px] flex flex-col justify-center relative">{displayedTask ? (displayedTask.status === 'BLOCKED' ? (<div className="flex flex-col h-full text-center sm:text-right"><div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0" /><span className="font-black text-rose-500 text-xs sm:text-sm uppercase tracking-wider">משימה תקועה</span></div><div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start"><h2 className="text-2xl sm:text-4xl font-black text-slate-800 truncate order-2 sm:order-1">{displayedTask.title}</h2><button onClick={() => setTaskToEdit(displayedTask)} className="p-1 text-slate-300 hover:text-sky-500 order-1 sm:order-2"><Pencil className="w-5 h-5" /></button></div></div>{displayedTask.blockedReason && (<div className="self-center sm:self-start mb-6"><span className="text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" />{displayedTask.blockedReason}</span></div>)}<div className="flex flex-col items-center gap-6 mt-auto"><div className="text-5xl sm:text-7xl font-mono font-black text-slate-700 tracking-tighter drop-shadow-sm">{formatTime(displayedTask.waitSeconds || 0)}</div><button onClick={handleResumeTask} className="w-full sm:w-auto px-10 py-3.5 bg-emerald-50 text-emerald-600 rounded-2xl font-black transition-all shadow-sm text-base hover:bg-emerald-100 border border-emerald-100">המשך במשימה</button></div></div>) : (<><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></div><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">משימה בביצוע</span></div><button onClick={() => onUpdateTask(displayedTask.id, { status: 'COMPLETED' })} className="px-5 py-2 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white rounded-xl font-black text-xs shadow-lg hover:scale-105 transition-transform">סיום משימה</button></div><div className="flex items-center gap-3 mb-6"><h2 className="text-2xl sm:text-4xl font-black text-slate-800">{displayedTask.title}</h2><button onClick={() => setTaskToEdit(displayedTask)} className="p-1 text-slate-300 hover:text-sky-500"><Pencil className="w-5 h-5" /></button></div><div className="flex flex-col items-center gap-6"><div className="text-5xl sm:text-7xl font-mono font-black text-slate-700 tracking-tighter">{formatTime(displayedTask.elapsedSeconds)}</div><div className="flex items-center gap-4"><button onClick={() => handleAction(displayedTask)} className="p-4 bg-amber-50 text-amber-500 rounded-full hover:bg-amber-100 transition-all border border-amber-100"><Pause className="w-8 h-8 fill-current" /></button><button onClick={() => setTaskToBlock(inProgressTask)} className="p-4 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 transition-all border border-rose-100"><Ban className="w-8 h-8" /></button></div></div></>)) : (<div className="text-center py-10"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><ClipboardList className="w-8 h-8 text-slate-300" /></div><h3 className="text-lg font-bold text-slate-400">אין משימה פעילה</h3><p className="text-slate-300 text-sm">בחר משימה מהתור למטה כדי להתחיל לעבוד</p></div>)}</div></div><section><div className="flex items-center justify-between mb-4 px-1"><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard className="w-3 h-3" />תור משימות ({queue.length})</h3></div><div className="space-y-3 pb-8">{queue.map((t:any) => (<div key={t.id} onClick={() => handleAction(t)} className={`p-4 rounded-2xl border flex flex-col group relative transition-all active:scale-[0.99] ${t.status === 'BLOCKED' ? 'border-rose-200 bg-rose-50/40 cursor-not-allowed' : 'bg-white border-slate-100 hover:shadow-soft cursor-pointer hover:border-sky-100'}`}><div className="flex items-center justify-between w-full"><div className="flex items-center gap-3 overflow-hidden"><div className={`p-2.5 rounded-xl shrink-0 ${t.creatorRole === 'SUPER_ADMIN' ? 'bg-sky-50 text-sky-500' : 'bg-indigo-50 text-indigo-500'}`}>{t.creatorRole === 'SUPER_ADMIN' ? <Briefcase className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}</div><div className="overflow-hidden"><h4 className="font-bold text-slate-700 text-sm sm:text-base truncate leading-tight mb-0.5">{t.title}</h4><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-bold">{t.estimatedMinutes} דקות משוער</span><StatusSelector task={t} onStatusChange={(taskId, newStatus) => onUpdateTask(taskId, { status: newStatus })} onBlockTask={setTaskToBlock} /></div></div></div><button onClick={(e) => { e.stopPropagation(); setTaskToEdit(t); }} className="p-2 text-slate-300 hover:text-sky-500 rounded-lg hover:bg-slate-50 transition-all"><Pencil className="w-4 h-4" /></button></div>{t.status === 'BLOCKED' && t.blockedReason && (<div className="mt-3 px-3 py-2 bg-white rounded-xl flex items-center gap-2 border border-rose-100 shadow-sm animate-fade-in-up"><AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /><span className="text-[11px] font-bold text-rose-600 truncate">סיבת החסימה: {t.blockedReason}</span></div>)}</div>))}{queue.length === 0 && (<div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">אין משימות נוספות בתור</p></div>)}</div></section></div></main>
        </div>
    );
};

const WorkerCockpit = ({ user, attendanceRecords, onUpdateAttendance, onDeleteAttendance, onSignRange, onLogout, activeCompany }: any) => {
    const [monthOffset, setMonthOffset] = useState(0);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [deletingRecords, setDeletingRecords] = useState<AttendanceRecord[] | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => { const day = i + 1; const monthStr = (currentMonth.getMonth() + 1).toString().padStart(2, '0'); const dayStr = day.toString().padStart(2, '0'); return `${currentMonth.getFullYear()}-${monthStr}-${dayStr}`; });
    const sortedDays = [...daysArray];
    const monthlyRecords = attendanceRecords.filter((rec: AttendanceRecord) => { const d = new Date(rec.date); return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear(); });
    const aggregatedDailyData = useMemo(() => { const map = new Map<string, any>(); monthlyRecords.forEach((rec:any) => { const existing = map.get(rec.date) || { totalMinutes: 0, earliestStart: rec.startTime, latestEnd: rec.endTime || rec.startTime, originalRecords: [], isSigned: false }; const updatedTotal = existing.totalMinutes + (rec.totalMinutes || 0); const updatedStart = rec.startTime < existing.earliestStart ? rec.startTime : existing.earliestStart; const recEndTime = rec.endTime || rec.startTime; const updatedEnd = recEndTime > existing.latestEnd ? recEndTime : existing.latestEnd; map.set(rec.date, { totalMinutes: updatedTotal, earliestStart: updatedStart, latestEnd: updatedEnd, originalRecords: [...existing.originalRecords, rec], isSigned: existing.isSigned || !!rec.isSigned }); }); return map; }, [monthlyRecords]);
    
    const handleEditEmptyDay = (dateStr: string) => { setEditingRecord({ id: '', userId: user.id, companyId: user.companyId, date: dateStr, startTime: new Date(`${dateStr}T08:00:00`).toISOString(), endTime: new Date(`${dateStr}T17:00:00`).toISOString(), status: 'COMPLETED', totalMinutes: 540 }); }
    const handleEditExistingDay = (dateStr: string, dayData: any) => { setEditingRecord({ ...dayData.originalRecords[0], startTime: dayData.earliestStart, endTime: dayData.latestEnd }); }
    const handleDeleteClick = (records: AttendanceRecord[]) => { setDeletingRecords(records); }
    const confirmDelete = () => { if (deletingRecords) { onDeleteAttendance(deletingRecords.map(r => r.id)); setDeletingRecords(null); } }
    const totalMinutes = monthlyRecords.reduce((acc: number, curr: AttendanceRecord) => acc + (curr.totalMinutes || 0), 0);
    const todayIsoString = getLocalDateString();

    return (
        <div className="flex h-screen bg-white overflow-hidden" dir="rtl">
            <Sidebar user={user} onLogout={onLogout} onNavigate={() => {}} activeView="hours" items={[{ id: 'hours', label: 'דוח שעות', icon: CalendarDays }]} />
            <main className="flex-1 p-2 sm:p-8 bg-slate-50/30 overflow-y-auto">
                <div className="flex md:hidden items-center justify-between p-3 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl mb-4 shadow-sm"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white"><UserIcon className="w-5 h-5" /></div><div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none">העובד</p><p className="text-[13px] font-black text-slate-700 leading-tight">{user.name}</p></div></div><button onClick={onLogout} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"><LogOut className="w-5 h-5" /></button></div>
                
                <AttendanceEditModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} record={editingRecord} onSave={onUpdateAttendance} />
                <DeleteConfirmationModal isOpen={!!deletingRecords} onClose={() => setDeletingRecords(null)} onConfirm={confirmDelete} itemName={`דיווח שעות לתאריך ${deletingRecords?.[0] ? formatDate(deletingRecords[0].date) : ''}`} title="מחיקת דיווח יומי" />
                <ManagerSignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} users={[]} fixedUserId={user.id} onSignRange={onSignRange} siteManagerPassword={activeCompany?.siteManagerPassword} />

                <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 sm:mb-8">
                    <div className="hidden sm:block">
                        <h1 className="text-2xl font-black text-slate-700 tracking-tight">השעות שלי</h1>
                        <p className="text-slate-400 text-sm">פרופיל פועל שטח</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => setIsSignatureModalOpen(true)} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-700 shadow-lg shadow-slate-200 transition-all text-[13px] h-11"
                        >
                            <Signature className="w-5 h-5" />
                            <span>חתימת מנהל אתר</span>
                        </button>
                        <div className="bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 w-full sm:w-fit justify-between sm:justify-start h-11">
                            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                            <span className="font-bold text-slate-700 min-w-[120px] sm:min-w-[140px] text-center text-[13px] sm:text-sm">{currentMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
                    <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-soft">
                        <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">סה"כ שעות</div>
                        <div className="text-xl sm:text-3xl font-black text-sky-500 tracking-tighter">{Math.floor(totalMinutes / 60)}:{(totalMinutes % 60).toString().padStart(2, '0')}</div>
                    </div>
                    <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-soft">
                        <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">ימי עבודה</div>
                        <div className="text-xl sm:text-3xl font-black text-slate-700 tracking-tighter">{Array.from(new Set(monthlyRecords.map((r:any) => r.date))).length}</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-soft overflow-hidden">
                    <table className="w-full text-right text-[12px] sm:text-sm border-collapse">
                        <thead className="bg-slate-50/50 text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-1 py-3 sm:p-4 border-b border-slate-100">תאריך</th>
                                <th className="px-1 py-3 sm:p-4 border-b border-slate-100">כניסה</th>
                                <th className="px-1 py-3 sm:p-4 border-b border-slate-100">יציאה</th>
                                <th className="px-1 py-3 sm:p-4 border-b border-slate-100">סה"כ</th>
                                <th className="px-1 py-3 sm:p-4 border-b border-slate-100 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedDays.map((dateStr) => { 
                                const isToday = dateStr === todayIsoString; 
                                const dayData = aggregatedDailyData.get(dateStr); 
                                if (!dayData) { 
                                    return (
                                        <tr key={dateStr} className={`hover:bg-slate-50/10 transition-colors group ${isToday ? 'bg-sky-50/40 border-r-2 border-r-sky-400' : ''}`}>
                                            <td className={`px-1 py-2 sm:p-4 font-bold ${isToday ? 'text-sky-600' : 'text-slate-300'}`}>{formatDate(dateStr)}</td>
                                            <td className="px-1 py-2 sm:p-4 text-slate-200 text-[11px] sm:text-xs italic">--:--</td>
                                            <td className="px-1 py-2 sm:p-4 text-slate-200 text-[11px] sm:text-xs italic">--:--</td>
                                            <td className="px-1 py-2 sm:p-4 text-slate-200 font-bold">0:00</td>
                                            <td className="px-1 py-2 sm:p-4 text-center">
                                                <button onClick={() => handleEditEmptyDay(dateStr)} className="p-1.5 sm:p-2 text-slate-300 hover:text-sky-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Pencil className="w-3.5 h-3.5 opacity-50" />
                                                </button>
                                            </td>
                                        </tr>
                                    ); 
                                } 
                                return (
                                    <tr key={dateStr} className={`hover:bg-slate-50/30 transition-colors group ${isToday ? 'bg-sky-50/60 border-r-2 border-r-sky-400' : ''} ${dayData.isSigned ? 'bg-emerald-50/20' : ''}`}>
                                        <td className={`px-1 py-2 sm:p-4 font-bold flex items-center gap-2 ${isToday ? 'text-sky-700' : 'text-slate-600'}`}>
                                            {formatDate(dateStr)} 
                                            {dayData.isSigned && <span title="מאושר ע״י מנהל"><UserCheck className="w-3.5 h-3.5 text-emerald-500" /></span>}
                                        </td>
                                        <td className="px-1 py-2 sm:p-4 font-mono text-slate-400 text-[11px] sm:text-xs">{getHourFromIso(dayData.earliestStart)}</td>
                                        <td className="px-1 py-2 sm:p-4 font-mono text-slate-400 text-[11px] sm:text-xs">{dayData.latestEnd ? getHourFromIso(dayData.latestEnd) : '--:--'}</td>
                                        <td className="px-1 py-2 sm:p-4 font-black text-sky-500">{Math.floor(dayData.totalMinutes / 60)}:{(dayData.totalMinutes % 60).toString().padStart(2, '0')}</td>
                                        <td className="px-1 py-2 sm:p-4 text-center">
                                            <div className="flex items-center justify-center gap-3 sm:gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                                {!dayData.isSigned && (
                                                    <>
                                                        <button onClick={() => handleEditExistingDay(dateStr, dayData)} className="p-1 sm:p-2 text-slate-300 hover:text-sky-500 rounded-xl">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(dayData.originalRecords)} className="p-1 sm:p-2 text-slate-300 hover:text-rose-500 rounded-xl">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ); 
                            })}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

// --- App Main Logic ---

const App = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [authMode, setAuthMode] = useState<'COMPANY' | 'USER' | 'PLATFORM'>('COMPANY');
    const [activeCompany, setActiveCompany] = useState<Company | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubCompanies = onSnapshot(collection(db, 'companies'), (snap) => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))));
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))));
        const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
        const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))));
        const unsubEvents = onSnapshot(collection(db, 'calendarEvents'), (snap) => setCalendarEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent))));
        
        return () => { unsubCompanies(); unsubUsers(); unsubTasks(); unsubAttendance(); unsubEvents(); };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            tasks.filter(t => t.status === 'IN_PROGRESS' && !t.isDeleted).forEach(t => updateDoc(doc(db, 'tasks', t.id), { elapsedSeconds: (t.elapsedSeconds || 0) + 1 }));
            tasks.filter(t => t.status === 'BLOCKED' && !t.isDeleted).forEach(t => updateDoc(doc(db, 'tasks', t.id), { waitSeconds: (t.waitSeconds || 0) + 1 }));
        }, 1000);
        return () => clearInterval(interval);
    }, [tasks]);

    const handleCompanyLogin = (cid: string, pass: string) => {
        const company = companies.find(c => c.id === cid && c.password === pass);
        if (company) { setActiveCompany(company); setAuthMode('USER'); setError(''); } else setError('סיסמת חברה שגויה');
    };

    const handleUserLogin = (u: string, p: string) => {
        const user = users.find(usr => usr.username === u && usr.password === p && usr.companyId === activeCompany?.id);
        if (user) { setCurrentUser(user); setError(''); updateDoc(doc(db, 'users', user.id), { status: 'ONLINE' }); } else setError('שם משתמש או סיסמא שגויים');
    };

    const handleLogout = () => {
        if (!currentUser) return;
        const userRole = currentUser.role;
        setCurrentUser(null);
        if (userRole === 'PLATFORM_ADMIN') { setActiveCompany(null); setAuthMode('COMPANY'); } else setAuthMode('USER');
    };

    const handleUpdateUser = async (id: string, name: string, score: number, u: string, p: string, r: UserRole) => {
        if (id === 'platform_admin') {
            const newAdminRef = doc(collection(db, 'users'));
            await setDoc(newAdminRef, { name: 'Platform Admin', efficiencyScore: 100, username: u, password: p, role: 'PLATFORM_ADMIN', companyId: '', status: 'ONLINE' });
            setCurrentUser({ id: newAdminRef.id, name, efficiencyScore: score, username: u, password: p, role: r, companyId: '', avatar: '', status: 'ONLINE' });
        } else {
            await updateDoc(doc(db, 'users', id), { name, efficiencyScore: score, username: u, password: p, role: r });
            if (currentUser?.id === id) setCurrentUser(prev => prev ? ({ ...prev, name, efficiencyScore: score, username: u, password: p, role: r }) : null);
        }
    };

    const handleUpdateCompany = async (id: string, updates: Partial<Company>) => {
        await updateDoc(doc(db, 'companies', id), updates);
        if (activeCompany?.id === id) {
            setActiveCompany(prev => prev ? ({ ...prev, ...updates }) : null);
        }
    };

    const handleSignAttendanceRange = async (userId: string, startStr: string, endStr: string) => {
        if (!currentUser) return;
        const batch = writeBatch(db);
        const recordsToSign = attendance.filter(a => 
            a.userId === userId && 
            a.date >= startStr && 
            a.date <= endStr && 
            !a.isSigned
        );

        if (recordsToSign.length === 0) {
            alert('לא נמצאו דיווחים ללא חתימה בטווח התאריכים המבוקש.');
            return;
        }

        recordsToSign.forEach(rec => {
            batch.update(doc(db, 'attendance', rec.id), {
                isSigned: true,
                signedBy: currentUser.name,
                signedAt: new Date().toISOString()
            });
        });

        await batch.commit();
        alert(`בוצע בהצלחה: נחתמו ${recordsToSign.length} דיווחי שעות.`);
    };

    const handleAddCalendarEvent = async (date: string, time: string, title: string, type: 'MEETING' | 'TASK' | 'REMINDER') => {
        if (!currentUser) return;
        await addDoc(collection(db, 'calendarEvents'), {
            userId: currentUser.id,
            date,
            time,
            title,
            type,
            createdAt: new Date().toISOString()
        });
    };

    const handleDeleteCalendarEvent = async (id: string) => {
        await deleteDoc(doc(db, 'calendarEvents', id));
    };

    const handleExecutionAction = async (action: string, params: any): Promise<string> => {
        if (!currentUser || !activeCompany) return "שגיאה: אין גישה למערכת.";
        
        try {
            switch (action) {
                case 'create_employee':
                    await addDoc(collection(db, 'users'), { 
                        name: params.name, 
                        username: params.username, 
                        password: params.password, 
                        role: params.role, 
                        companyId: activeCompany.id, 
                        efficiencyScore: 100, 
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.username}`, 
                        status: 'OFFLINE', 
                        isDeleted: false
                    });
                    return `בוצע: עובד חדש ${params.name} נוסף למערכת.`;
                
                case 'update_employee_details':
                    const updateObj: any = {};
                    if (params.name) updateObj.name = params.name;
                    if (params.username) updateObj.username = params.username;
                    await updateDoc(doc(db, 'users', params.employee_id), updateObj);
                    return `בוצע: פרטי העובד (שם/משתמש) עודכנו בהצלחה.`;

                case 'assign_task':
                    await addDoc(collection(db, 'tasks'), { 
                        title: params.title, 
                        assigneeId: params.employee_id, 
                        companyId: activeCompany.id, 
                        status: 'PENDING', 
                        type: 'FLOATING', 
                        estimatedMinutes: params.minutes || 30, 
                        elapsedSeconds: 0, 
                        waitSeconds: 0, 
                        createdBy: currentUser.id, 
                        creatorRole: currentUser.role, 
                        isDeleted: false
                    });
                    return `בוצע: משימה "${params.title}" הוקצתה לעובד.`;

                case 'edit_task':
                    const taskUpdate: any = {};
                    if (params.title) taskUpdate.title = params.title;
                    if (params.minutes) taskUpdate.estimatedMinutes = params.minutes;
                    await updateDoc(doc(db, 'tasks', params.task_id), taskUpdate);
                    return `בוצע: המשימה עודכנה (כותרת/זמן).`;

                case 'reassign_task':
                    await updateDoc(doc(db, 'tasks', params.task_id), { assigneeId: params.new_employee_id });
                    return `בוצע: המשימה הועברה לעובד המבוקש.`;
                
                case 'update_password':
                    await updateDoc(doc(db, 'users', params.user_id), { password: params.new_password });
                    return `בוצע: הסיסמא עודכנה בהצלחה.`;

                case 'update_employee_role':
                    await updateDoc(doc(db, 'users', params.employee_id), { role: params.new_role });
                    return `בוצע: התפקיד של העובד עודכן ל-${params.new_role}.`;

                case 'delete_employee':
                    // Soft delete
                    await updateDoc(doc(db, 'users', params.employee_id), { isDeleted: true });
                    return `בוצע: העובד הוסר (ניתן לשחזר באמצעות פקודת שחזור).`;

                case 'delete_task':
                    // Soft delete
                    await updateDoc(doc(db, 'tasks', params.task_id), { isDeleted: true });
                    return `בוצע: המשימה הוסרה (ניתן לשחזר באמצעות פקודת שחזור).`;

                case 'restore_item':
                    if (params.item_type === 'EMPLOYEE') {
                        await updateDoc(doc(db, 'users', params.item_id), { isDeleted: false });
                        return `בוצע: העובד שוחזר למערכת בהצלחה.`;
                    } else if (params.item_type === 'TASK') {
                        await updateDoc(doc(db, 'tasks', params.item_id), { isDeleted: false });
                        return `בוצע: המשימה שוחזרה למערכת בהצלחה.`;
                    }
                    return "שגיאה: סוג פריט לא ידוע לשחזור.";

                case 'toggle_employee_status':
                    const userToToggle = users.find(u => u.id === params.employee_id);
                    if (userToToggle) {
                        const newStatus = userToToggle.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                        await updateDoc(doc(db, 'users', params.employee_id), { status: newStatus });
                        return `בוצע: הסטטוס של ${userToToggle.name} שונה ל-${newStatus}.`;
                    }
                    return "שגיאה: עובד לא נמצא.";

                case 'update_task_status':
                    await updateDoc(doc(db, 'tasks', params.task_id), { status: params.status });
                    return `בוצע: סטטוס המשימה עודכן ל-${params.status}.`;
                
                default:
                    return "פעולה לא נתמכת על ידי מנוע הביצוע.";
            }
        } catch (e: any) {
            return `שגיאה קריטית בביצוע הפעולה: ${e.message}`;
        }
    };

    if (authMode === 'PLATFORM' && !currentUser) return <PlatformAdminLoginScreen onLogin={(u, p) => { const dbAdmin = users.find(usr => usr.role === 'PLATFORM_ADMIN' && usr.username === u && usr.password === p); if (dbAdmin) { setCurrentUser(dbAdmin); updateDoc(doc(db, 'users', dbAdmin.id), { status: 'ONLINE' }); } else if (u === 'admin' && p === 'master') setCurrentUser({ id: 'platform_admin', name: 'Platform Admin', role: 'PLATFORM_ADMIN', avatar: '', efficiencyScore: 100, status: 'ONLINE', username: 'admin', password: 'master', companyId: '' }); else setError('פרטי גישה שגויים'); }} onBack={() => setAuthMode('COMPANY')} error={error} isLoading={false} />;
    if (authMode === 'COMPANY' && !activeCompany) return <CompanyLoginScreen companies={companies} onCompanyLogin={handleCompanyLogin} onPlatformLoginClick={() => setAuthMode('PLATFORM')} error={error} isLoading={false} />;
    if (authMode === 'USER' && activeCompany && !currentUser) return <UserLoginScreen company={activeCompany} onLogin={handleUserLogin} onBack={() => { setActiveCompany(null); setAuthMode('COMPANY'); }} error={error} isLoading={false} />;

    if (currentUser?.role === 'PLATFORM_ADMIN') return (
        <PlatformAdminDashboard 
            companies={companies} 
            users={users} 
            tasks={tasks} // Pass tasks to Platform Admin
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onAddCompany={async (name:any, companyPassword:any, adminName:any, adminUsername:any, adminPassword:any) => { const batch = writeBatch(db); const companyRef = doc(collection(db, 'companies')); batch.set(companyRef, { name, password: companyPassword, status: 'ACTIVE' }); const userRef = doc(collection(db, 'users')); batch.set(userRef, { companyId: companyRef.id, name: adminName, username: adminUsername, password: adminPassword, role: 'SUPER_ADMIN', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUsername}`, efficiencyScore: 100, status: 'OFFLINE' }); await batch.commit(); }} 
            onDeleteCompany={(id:any) => deleteDoc(doc(db, 'companies', id))} 
            onUpdateCompany={(id:any, updates:any) => updateDoc(doc(db, 'companies', id), updates)} 
            onToggleCompanyStatus={async (id:any) => { const comp = companies.find(c => c.id === id); if (comp) await updateDoc(doc(db, 'companies', id), { status: comp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }); }} 
            onAddUserToCompany={(n:any,u:any,p:any,r:any,cid:any) => addDoc(collection(db, 'users'), { name: n, username: u, password: p, role: r, companyId: cid, efficiencyScore: 100, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}`, status: 'OFFLINE' })} 
            onDeleteUser={(id:any) => updateDoc(doc(db, 'users', id), { isDeleted: true })} 
            onUpdateUser={handleUpdateUser} 
            // Pass Task Handlers
            onAddTask={(uid:any, title:any, minutes:any) => addDoc(collection(db, 'tasks'), { title, assigneeId: uid, companyId: '', status: 'PENDING', type: 'FLOATING', estimatedMinutes: minutes, elapsedSeconds: 0, waitSeconds: 0, createdBy: currentUser.id, creatorRole: currentUser.role, isDeleted: false })}
            onUpdateNotes={(notes:any) => updateDoc(doc(db, 'users', currentUser.id), { personalNotes: notes })}
            onEditTask={(id:any, up:any) => updateDoc(doc(db, 'tasks', id), up)}
            onDeleteTask={(id:any) => updateDoc(doc(db, 'tasks', id), { isDeleted: true })}
        />
    );

    if (currentUser?.role === 'SUPER_ADMIN') return <AdminDashboard users={users.filter(u => u.companyId === activeCompany?.id)} tasks={tasks.filter(t => t.companyId === activeCompany?.id)} attendanceRecords={attendance.filter(a => a.companyId === activeCompany?.id)} calendarEvents={calendarEvents} currentUser={currentUser} onLogout={handleLogout} onAddTask={(uid:any, title = 'משימה חדשה', minutes = 30) => addDoc(collection(db, 'tasks'), { title, assigneeId: uid, companyId: activeCompany?.id, status: 'PENDING', type: 'FLOATING', estimatedMinutes: minutes, elapsedSeconds: 0, waitSeconds: 0, createdBy: currentUser.id, creatorRole: currentUser.role, isDeleted: false })} onEditTask={(id:any, up:any) => updateDoc(doc(db, 'tasks', id), up)} onDeleteTask={(id:any) => updateDoc(doc(db, 'tasks', id), { isDeleted: true })} onUpdateUser={handleUpdateUser} onAddUser={(n:any,u:any,p:any,r:any) => addDoc(collection(db, 'users'), { name: n, username: u, password: p, role: r, companyId: activeCompany?.id, efficiencyScore: 100, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}`, status: 'OFFLINE', isDeleted: false })} onDeleteUser={(id:any) => updateDoc(doc(db, 'users', id), { isDeleted: true })} onToggleStatus={async (id:any) => { const u = users.find(usr => usr.id === id); if (u) await updateDoc(doc(db, 'users', id), { status: u.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' }); }} onUpdateNotes={(notes:any) => updateDoc(doc(db, 'users', currentUser.id), { personalNotes: notes })} onCreateUrgent={(uid:any) => {}} onUpdateAttendance={(id:any, updates:any) => updateDoc(doc(db, 'attendance', id), updates)} onDeleteAttendance={async (ids:any[]) => { const batch = writeBatch(db); ids.forEach(id => batch.delete(doc(db, 'attendance', id))); await batch.commit(); }} onSignRange={handleSignAttendanceRange} onExecutionAction={handleExecutionAction} activeCompany={activeCompany} onUpdateCompany={handleUpdateCompany} onAddEvent={handleAddCalendarEvent} onDeleteEvent={handleDeleteCalendarEvent} />;
    if (currentUser?.role === 'EMPLOYEE') return <EmployeeCockpit user={currentUser} tasks={tasks.filter(t => t.assigneeId === currentUser.id)} onUpdateTask={(id:any, up:any) => updateDoc(doc(db, 'tasks', id), up)} onLogout={handleLogout} onAddTask={(title:any, estimatedMinutes:any) => addDoc(collection(db, 'tasks'), { title, assigneeId: currentUser.id, companyId: currentUser.companyId, status: 'PENDING', type: 'FLOATING', estimatedMinutes, elapsedSeconds: 0, waitSeconds: 0, createdBy: currentUser.id, creatorRole: currentUser.role, isDeleted: false })} />;
    if (currentUser?.role === 'WORKER') return <WorkerCockpit user={currentUser} attendanceRecords={attendance.filter(a => a.userId === currentUser.id)} onUpdateAttendance={async (id:any, updates:any) => id ? await updateDoc(doc(db, 'attendance', id), updates) : await addDoc(collection(db, 'attendance'), { ...updates, userId: currentUser.id, companyId: currentUser.companyId, status: 'COMPLETED' })} onDeleteAttendance={async (ids:any[]) => { const batch = writeBatch(db); ids.forEach(id => batch.delete(doc(db, 'attendance', id))); await batch.commit(); }} onSignRange={handleSignAttendanceRange} onLogout={handleLogout} activeCompany={activeCompany} />;
    return null;
};

export default App;
