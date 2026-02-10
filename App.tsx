import React, { useState, useEffect, useMemo } from 'react';
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
  Save
} from 'lucide-react';
import { User, Task, UserRole, TaskType, TaskStatus, Company, AttendanceRecord } from './types';

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
  writeBatch
} from 'firebase/firestore';

const BLOCKER_REASONS = [
    "ממתין לאישור לקוח",
    "ממתין לחומרים/קבצים",
    "ממתין לאישור מנהל",
    "תקלה טכנית/תשתית",
    "תלות במשימה אחרת"
];

// --- Helper Components ---

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    } catch (e) {
        return dateStr;
    }
}

const getHourFromIso = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  // Pastel Palette
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
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status]} shadow-sm whitespace-nowrap`}>
      {labels[status]}
    </span>
  );
};

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  if (type === 'URGENT') return <Zap className="w-4 h-4 text-rose-400 fill-rose-100" />;
  if (type === 'LOCKED') return <Lock className="w-4 h-4 text-slate-400" />;
  return <Briefcase className="w-4 h-4 text-sky-400" />;
};

// --- Authentication Screens ---

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-sky-100 via-purple-50 to-pink-100 p-4 sm:p-6 overflow-hidden relative">
        {/* Abstract Shapes for background */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float hidden sm:block"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float hidden sm:block" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse hidden sm:block"></div>
        
        <div className="bg-white/70 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white w-full max-w-md animate-fade-in-up relative z-10">
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
            <div className="text-center mb-8 sm:mb-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-200 transform rotate-3">
                        <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">כניסת חברה</h1>
                <p className="text-slate-500 mt-2 font-light text-sm sm:text-base">
                    אנא בחר את החברה שלך והזן קוד גישה
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">חברה</label>
                    <div className="relative">
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full px-5 py-3 sm:py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                            required
                        >
                            <option value="" disabled>בחר חברה מהרשימה...</option>
                            {companies.filter(c => c.status === 'ACTIVE').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">סיסמת חברה</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-3 sm:py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-700 outline-none transition-all placeholder:text-slate-300"
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-500 text-sm rounded-2xl flex items-center gap-2 border border-rose-100">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading || !selectedCompanyId}
                    className="w-full py-3 sm:py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                        <span>המשך לצוות</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
            
            <div className="mt-8 text-center pt-6 border-t border-slate-100">
                <button 
                    onClick={onPlatformLoginClick}
                    className="text-xs text-slate-400 hover:text-sky-600 transition-colors font-medium flex items-center justify-center gap-1 mx-auto"
                >
                    <ShieldCheck className="w-3 h-3" />
                    כניסת מנהל מערכת (Platform Admin)
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-700 mx-auto mb-6 shadow-inner">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <span className="text-3xl font-bold">{company.name.charAt(0)}</span>
                        )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">צוות {company.name}</h1>
                <p className="text-slate-500 mt-1 font-light text-sm sm:text-base">
                    הזדהות עובד
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם משתמש</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-700 outline-none transition-all placeholder:text-slate-300"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">סיסמא</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-700 outline-none transition-all placeholder:text-slate-300"
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-500 text-sm rounded-2xl flex items-center gap-2 border border-rose-100">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>התחברות</span>
                        <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                </button>
            </form>
            
            <div className="mt-6 text-center">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
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
             <div className="text-center mb-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-slate-300">
                     <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Platform Admin</h1>
                <p className="text-slate-500 mt-2 font-light text-sm sm:text-base">
                    גישה לניהול המערכת כולה
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">משתמש מנהל</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-5 py-3 sm:py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-200 text-slate-700 outline-none transition-all placeholder:text-slate-300"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">סיסמא</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-3 sm:py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-200 text-slate-700 outline-none transition-all placeholder:text-slate-300"
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-500 text-sm rounded-2xl flex items-center gap-2 border border-rose-100">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                     {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>כניסה למערכת</span>}
                </button>
            </form>
             <div className="mt-8 text-center">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
                    ביטול וחזרה
                </button>
            </div>
        </AuthLayout>
    );
}

// --- Modals ---

const PlatformAdminSettingsModal = ({
    isOpen,
    onClose,
    user,
    onSave
}: {
    isOpen: boolean,
    onClose: () => void,
    user: User,
    onSave: (id: string, name: string, score: number, username: string, password: string) => void
}) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState(user.password);

    useEffect(() => {
        if (isOpen) {
            setUsername(user.username);
            setPassword(user.password);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user.id, user.name, user.efficiencyScore, username, password);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up border border-white">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-slate-400" />
                        הגדרות חשבון מנהל
                    </h2>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם משתמש חדש</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-200 outline-none font-mono text-slate-700"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">סיסמא חדשה</label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-200 outline-none font-mono text-slate-700"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                            שמור שינויים
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CompanyCreationModal = ({
    isOpen,
    onClose,
    onCreate
}: {
    isOpen: boolean,
    onClose: () => void,
    onCreate: (companyName: string, companyPass: string, adminName: string, adminUser: string, adminPass: string) => void
}) => {
    const [companyName, setCompanyName] = useState('');
    const [companyPass, setCompanyPass] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(companyName, companyPass, adminName, adminUser, adminPass);
        onClose();
        setCompanyName('');
        setCompanyPass('');
        setAdminName('');
        setAdminUser('');
        setAdminPass('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-soft w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-500" />
                        הקמת חברה חדשה
                    </h2>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם החברה</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300"
                                placeholder="Tech Solutions Ltd."
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">סיסמת כניסה לחברה</label>
                            <input
                                type="text"
                                value={companyPass}
                                onChange={(e) => setCompanyPass(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300 font-mono"
                                placeholder="קוד גישה לכלל העובדים"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="mb-4 text-indigo-800 font-bold text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            פרטי מנכ"ל / אדמין ראשי
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-indigo-400 mb-1">שם מלא</label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    placeholder="ישראל ישראלי"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-400 mb-1">שם משתמש</label>
                                    <input
                                        type="text"
                                        value={adminUser}
                                        onChange={(e) => setAdminUser(e.target.value)}
                                        className="w-full px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-indigo-400 mb-1">סיסמא</label>
                                    <input
                                        type="text"
                                        value={adminPass}
                                        onChange={(e) => setAdminPass(e.target.value)}
                                        className="w-full px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            הקם חברה
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CredentialRow: React.FC<{ 
    user: User, 
    onUpdate: (id: string, name: string, score: number, username: string, password: string) => void,
    onDelete?: (id: string) => void
}> = ({ user, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState(user.password);

    const handleSave = () => {
        onUpdate(user.id, user.name, user.efficiencyScore, username, password);
        setIsEditing(false);
    };
    
    const roleMap = {
        'SUPER_ADMIN': 'מנכ"ל',
        'EMPLOYEE': 'עובד',
        'WORKER': 'פועל',
        'PLATFORM_ADMIN': 'אדמין'
    }

    return isEditing ? (
        <tr className="bg-sky-50 transition-colors">
            <td className="p-3 sm:p-4 flex items-center gap-3 min-w-[150px]">
                <img src={user.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm" alt={user.name} />
                <span className="font-medium text-slate-700 text-sm sm:text-base">{user.name}</span>
            </td>
            <td className="p-3 sm:p-4 text-slate-500 text-xs sm:text-sm whitespace-nowrap">
                {roleMap[user.role]}
            </td>
            <td className="p-3 sm:p-4 min-w-[120px]">
                <input 
                   type="text"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-200 outline-none font-mono text-sky-700"
                   autoFocus
                />
            </td>
            <td className="p-3 sm:p-4 min-w-[120px]">
                <input 
                   type="text"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-200 outline-none font-mono text-slate-700"
                />
            </td>
            <td className="p-3 sm:p-4 flex gap-2 justify-end">
                <button onClick={handleSave} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-xl transition-colors shadow-sm" title="שמור">
                    <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditing(false)} className="p-2 bg-rose-100 text-rose-500 hover:bg-rose-200 rounded-xl transition-colors shadow-sm" title="ביטול">
                    <X className="w-4 h-4" />
                </button>
            </td>
        </tr>
    ) : (
        <tr className="hover:bg-slate-50 group transition-colors border-b border-slate-50 last:border-0">
            <td className="p-3 sm:p-4 flex items-center gap-3 min-w-[150px]">
                <img src={user.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm" alt={user.name} />
                <span className="font-medium text-slate-700 text-sm sm:text-base">{user.name}</span>
            </td>
            <td className="p-3 sm:p-4 text-slate-500 text-xs sm:text-sm whitespace-nowrap">
                {roleMap[user.role]}
            </td>
            <td className="p-3 sm:p-4 font-mono text-sky-600 text-xs sm:text-sm whitespace-nowrap">{user.username}</td>
            <td className="p-3 sm:p-4 font-mono text-slate-400 text-xs sm:text-sm tracking-widest whitespace-nowrap">
                ••••••
            </td>
            <td className="p-3 sm:p-4 text-end flex gap-2 justify-end">
                <button onClick={() => setIsEditing(true)} className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all" title="ערוך">
                    <Pencil className="w-4 h-4" />
                </button>
                {onDelete && (
                    <button onClick={() => onDelete(user.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all" title="מחק">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </td>
        </tr>
    );
};

const CredentialsModal = ({ 
  isOpen, 
  onClose, 
  users,
  onUpdateUser,
  onDeleteUser
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  users: User[],
  onUpdateUser: (id: string, name: string, score: number, username: string, password: string) => void,
  onDeleteUser?: (id: string) => void
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-3xl p-6 sm:p-8 animate-fade-in-up">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-500">
                  <Key className="w-6 h-6" />
              </div>
              <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">ניהול משתמשים</h2>
                  <p className="text-sm text-slate-500">צפייה ועריכת פרטי גישה</p>
              </div>
          </div>
          <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border border-slate-100 rounded-2xl max-h-[400px] flex flex-col">
            <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-right text-sm min-w-[600px]">
                    <thead className="bg-slate-50/50 text-slate-500 font-medium sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 sm:p-4 font-normal">עובד</th>
                            <th className="p-3 sm:p-4 font-normal">תפקיד</th>
                            <th className="p-3 sm:p-4 font-normal">שם משתמש</th>
                            <th className="p-3 sm:p-4 font-normal">סיסמא</th>
                            <th className="p-3 sm:p-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {users.map(u => (
                            <CredentialRow key={u.id} user={u} onUpdate={onUpdateUser} onDelete={onDeleteUser} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

const BlockerModal = ({
    isOpen,
    onClose,
    onConfirm
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (reason: string) => void
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up border border-white">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <Ban className="w-8 h-8 text-rose-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">דיווח על חסם</h2>
                    <p className="text-slate-500 text-sm mt-1">מה מונע ממך להתקדם?</p>
                </div>

                <div className="space-y-3 mb-8">
                    {BLOCKER_REASONS.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => { onConfirm(reason); onClose(); }}
                            className="w-full text-right px-5 py-3.5 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50 transition-all text-sm font-medium text-slate-600 hover:text-rose-600"
                        >
                            {reason}
                        </button>
                    ))}
                </div>
                
                <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm hover:text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                    ביטול
                </button>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  itemName,
  title = "מחיקת פריט"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  itemName: string,
  title?: string
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                האם אתה בטוח שברצונך למחוק את <strong>{itemName}</strong>?
                <br />
                פעולה זו אינה הפיכה.
            </p>
            
            <div className="flex gap-4 w-full">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-colors"
                >
                    ביטול
                </button>
                <button 
                    onClick={() => { onConfirm(); onClose(); }}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                >
                    מחק
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const UserCreationModal = ({ 
  isOpen, 
  onClose, 
  onCreate 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onCreate: (name: string, user: string, pass: string, role: UserRole) => void 
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;
    onCreate(name, username, password, role);
    setName('');
    setUsername('');
    setPassword('');
    setRole('EMPLOYEE');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-slate-800">הוספת חבר צוות</h2>
          <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם מלא</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none transition-all placeholder:text-slate-300"
              placeholder="ישראל ישראלי"
              autoFocus
            />
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">תפקיד</label>
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-xl">
                  <button
                      type="button"
                      onClick={() => setRole('EMPLOYEE')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'EMPLOYEE' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      עובד משרד
                  </button>
                  <button
                      type="button"
                      onClick={() => setRole('WORKER')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'WORKER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      פועל (שעות)
                  </button>
                  <button
                      type="button"
                      onClick={() => setRole('SUPER_ADMIN')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'SUPER_ADMIN' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      מנהל
                  </button>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם משתמש</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">סיסמא</label>
                <input 
                  type="text" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              הוסף למערכת
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Attendance Report Modal ---

const AttendanceReportModal = ({
    isOpen,
    onClose,
    users,
    attendanceRecords
}: {
    isOpen: boolean,
    onClose: () => void,
    users: User[],
    attendanceRecords: AttendanceRecord[]
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

    if (!isOpen) return null;

    const workers = users.filter(u => u.role === 'WORKER');
    
    // Filter records for the selected month
    const monthlyRecords = attendanceRecords.filter(r => r.date.startsWith(selectedMonth));

    const workerStats = workers.map(worker => {
        const records = monthlyRecords.filter(r => r.userId === worker.id);
        const totalMinutes = records.reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return {
            worker,
            totalTime: `${hours} שעות ו-${mins} דקות`,
            records: records.sort((a,b) => b.startTime.localeCompare(a.startTime))
        };
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-soft w-full max-w-4xl p-6 sm:p-8 animate-fade-in-up h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-500">
                             <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                             <h2 className="text-xl sm:text-2xl font-bold text-slate-800">דוח שעות ונוכחות</h2>
                             <p className="text-sm text-slate-500">סיכום חודשי לפועלים</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-4 items-center mb-6 bg-slate-50 p-4 rounded-2xl shrink-0">
                    <label className="text-sm font-bold text-slate-500">בחר חודש:</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold"
                    />
                </div>

                <div className="flex-1 overflow-hidden flex gap-6">
                    {/* Worker List */}
                    <div className="w-1/3 overflow-y-auto custom-scrollbar space-y-3">
                        {workerStats.map(stat => (
                            <div 
                                key={stat.worker.id}
                                onClick={() => setSelectedWorkerId(stat.worker.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedWorkerId === stat.worker.id ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <img src={stat.worker.avatar} className="w-10 h-10 rounded-full border border-white shadow-sm" />
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">{stat.worker.name}</div>
                                        <div className="text-xs text-slate-400">סה"כ: {stat.records.length} משמרות</div>
                                    </div>
                                </div>
                                <div className="text-indigo-600 font-bold text-sm bg-white/50 p-2 rounded-lg text-center">
                                    {stat.totalTime}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detail View */}
                    <div className="w-2/3 bg-slate-50 rounded-2xl p-4 overflow-y-auto custom-scrollbar">
                        {selectedWorkerId ? (
                            <table className="w-full text-right text-sm">
                                <thead className="text-slate-500 font-medium">
                                    <tr>
                                        <th className="pb-3 px-2">תאריך</th>
                                        <th className="pb-3 px-2">כניסה</th>
                                        <th className="pb-3 px-2">יציאה</th>
                                        <th className="pb-3 px-2">סה"כ</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {workerStats.find(s => s.worker.id === selectedWorkerId)?.records.map(record => (
                                        <tr key={record.id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-indigo-50/30">
                                            <td className="py-3 px-2 rounded-r-xl">{formatDate(record.date)}</td>
                                            <td className="py-3 px-2">{getHourFromIso(record.startTime)}</td>
                                            <td className="py-3 px-2">{record.endTime ? getHourFromIso(record.endTime) : <span className="text-amber-500 font-bold">פעיל</span>}</td>
                                            <td className="py-3 px-2 font-mono font-bold rounded-l-xl text-indigo-600">
                                                {record.totalMinutes ? `${Math.floor(record.totalMinutes / 60)}:${(record.totalMinutes % 60).toString().padStart(2, '0')}` : '--:--'}
                                            </td>
                                        </tr>
                                    ))}
                                    {workerStats.find(s => s.worker.id === selectedWorkerId)?.records.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-10 text-slate-400">אין רישומים לחודש זה</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <UserCheck className="w-12 h-12 mb-3 opacity-30" />
                                <p>בחר עובד לצפייה בפירוט</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Worker Cockpit (Monthly Timesheet Interface) ---

const WorkerCockpit = ({
    user,
    attendanceRecords,
    onUpdateAttendance
}: {
    user: User,
    attendanceRecords: AttendanceRecord[],
    onUpdateAttendance: (date: string, startTime: string, endTime: string) => void
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const days = useMemo(() => {
        return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(1); // Reset to 1st to prevent month skipping if today is 31st
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const currentMonthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(currentDate);

    // Manually construct prefix to avoid timezone shifts from toISOString()
    const currentMonthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Calculate total hours for the displayed month
    const totalMonthlyMinutes = attendanceRecords
        .filter(r => r.date.startsWith(currentMonthPrefix))
        .reduce((acc, r) => acc + (r.totalMinutes || 0), 0);

    const realNow = new Date();
    const isCurrentMonth = currentDate.getMonth() === realNow.getMonth() && currentDate.getFullYear() === realNow.getFullYear();

    return (
        <div className="h-full bg-slate-100 flex flex-col p-4 sm:p-6 overflow-hidden">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-6">
                
                {/* Header */}
                <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-16 h-16 rounded-full border-4 border-slate-50" />
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">דוח שעות חודשי</h1>
                            <p className="text-slate-500 font-medium">{user.name}</p>
                        </div>
                     </div>
                     <div className="bg-indigo-50 px-6 py-3 rounded-2xl flex flex-col items-center">
                         <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">סה"כ שעות</span>
                         <span className="text-2xl font-mono font-black text-indigo-600">
                             {Math.floor(totalMonthlyMinutes / 60)}:{(totalMonthlyMinutes % 60).toString().padStart(2, '0')}
                         </span>
                     </div>
                </div>

                {/* Timesheet Controls */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <ChevronRight className="w-6 h-6 text-slate-400" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-bold text-slate-700">{currentMonthName}</h2>
                        {!isCurrentMonth && (
                            <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full mt-1">צפייה בלבד</span>
                        )}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Timesheet Table */}
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col border border-slate-100">
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 rounded-r-xl">תאריך</th>
                                    <th className="p-4">כניסה</th>
                                    <th className="p-4">יציאה</th>
                                    <th className="p-4 rounded-l-xl">סה"כ</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {days.map((day) => {
                                    // Manually construct date string to avoid timezone offsets causing "previous day" issues
                                    const y = day.getFullYear();
                                    const m = String(day.getMonth() + 1).padStart(2, '0');
                                    const d = String(day.getDate()).padStart(2, '0');
                                    const dateStr = `${y}-${m}-${d}`;
                                    
                                    const record = attendanceRecords.find(r => r.date === dateStr);
                                    const isWeekend = day.getDay() === 5 || day.getDay() === 6; // Friday/Saturday
                                    
                                    const isToday = day.getDate() === realNow.getDate() && 
                                                    day.getMonth() === realNow.getMonth() && 
                                                    day.getFullYear() === realNow.getFullYear();

                                    const handleTimeChange = (type: 'start' | 'end', value: string) => {
                                        const startTime = type === 'start' ? value : (record ? getHourFromIso(record.startTime) : '');
                                        const endTime = type === 'end' ? value : (record?.endTime ? getHourFromIso(record.endTime) : '');
                                        onUpdateAttendance(dateStr, startTime, endTime);
                                    };

                                    return (
                                        <tr key={dateStr} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-sky-50 ring-1 ring-sky-100 z-10 relative shadow-sm' : isWeekend ? 'bg-slate-50/30' : ''}`}>
                                            <td className="p-3 sm:p-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${isToday ? 'text-sky-700' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                                                            {new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(day)}
                                                        </span>
                                                        {isToday && (
                                                            <span className="text-[10px] font-bold bg-sky-200 text-sky-700 px-2 py-0.5 rounded-full">
                                                                היום
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs ${isToday ? 'text-sky-500' : 'text-slate-400'}`}>
                                                        {formatDate(dateStr)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 sm:p-4">
                                                <input 
                                                    type="time" 
                                                    disabled={!isCurrentMonth}
                                                    className={`border-0 rounded-xl px-3 py-2 text-slate-700 font-mono text-sm focus:ring-2 focus:ring-indigo-200 outline-none w-28 disabled:opacity-50 disabled:cursor-not-allowed ${isToday ? 'bg-white shadow-sm' : 'bg-slate-100'}`}
                                                    value={record ? getHourFromIso(record.startTime) : ''}
                                                    onChange={(e) => handleTimeChange('start', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 sm:p-4">
                                                 <input 
                                                    type="time" 
                                                    disabled={!isCurrentMonth}
                                                    className={`border-0 rounded-xl px-3 py-2 text-slate-700 font-mono text-sm focus:ring-2 focus:ring-indigo-200 outline-none w-28 disabled:opacity-50 disabled:cursor-not-allowed ${isToday ? 'bg-white shadow-sm' : 'bg-slate-100'}`}
                                                    value={record?.endTime ? getHourFromIso(record.endTime) : ''}
                                                    onChange={(e) => handleTimeChange('end', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 sm:p-4">
                                                {record?.totalMinutes ? (
                                                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                        {Math.floor(record.totalMinutes / 60)}:{(record.totalMinutes % 60).toString().padStart(2, '0')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NEW COMPONENTS ---

const TaskCreationModal = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  assigneeId,
  currentUserRole 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onCreate: (task: Partial<Task>) => void,
  assigneeId: string | null,
  currentUserRole: UserRole
}) => {
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState(2);
  const [type, setType] = useState<TaskType>('FLOATING');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setTitle('');
        setEstimatedMinutes(60);
        setPriority(2);
        setType('FLOATING');
        setIsUrgent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      assigneeId: assigneeId || undefined,
      title,
      estimatedMinutes,
      priority: isUrgent ? 1 : priority,
      type: isUrgent ? 'URGENT' : type
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">משימה חדשה</h2>
          <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">כותרת המשימה</label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none transition-all placeholder:text-slate-300"
                    placeholder="לדוגמה: הכנת דוח רבעוני"
                    autoFocus
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">זמן מוערך (דק')</label>
                    <input 
                        type="number" 
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                        min="5"
                        step="5"
                    />
                </div>
                <div>
                     <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">דחיפות</label>
                     <div className="flex items-center gap-2 h-[46px] bg-slate-50 rounded-xl px-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 border-gray-300" />
                            דחוף!
                        </label>
                     </div>
                </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg mt-4"
            >
              צור משימה
            </button>
        </form>
      </div>
    </div>
  );
};

const UserEditModal = ({ isOpen, onClose, user, onSave }: { isOpen: boolean, onClose: () => void, user: User | null, onSave: (id: string, name: string, score: number, username: string, password: string) => void }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [score, setScore] = useState(100);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setUsername(user.username);
            setPassword(user.password);
            setScore(user.efficiencyScore);
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user.id, name, score, username, password);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 sm:p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">עריכת פרטי עובד</h2>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם מלא</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">ציון יעילות</label>
                        <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none" min="0" max="100" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">שם משתמש</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">סיסמא</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none" required />
                    </div>
                    <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg mt-2">שמור שינויים</button>
                </form>
            </div>
        </div>
    );
};

const TaskHistoryModal = ({ isOpen, onClose, user, tasks, onEditTask, onDeleteTask }: { isOpen: boolean, onClose: () => void, user: User | null, tasks: Task[], onEditTask: (id: string, updates: Partial<Task>) => void, onDeleteTask: (id: string) => void }) => {
    if (!isOpen || !user) return null;
    const userTasks = tasks.filter(t => t.assigneeId === user.id).sort((a,b) => (a.status === 'COMPLETED' ? 1 : -1));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
             <div className="bg-white rounded-3xl shadow-soft w-full max-w-2xl p-6 sm:p-8 animate-fade-in-up h-[70vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                         <h2 className="text-xl font-bold text-slate-800">היסטוריית משימות</h2>
                         <p className="text-sm text-slate-500">{user.name}</p>
                    </div>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 p-1">
                    {userTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={task.status} />
                                <div>
                                    <div className="font-bold text-slate-700">{task.title}</div>
                                    <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                        <span>זמן בפועל: {formatTime(task.elapsedSeconds)}</span>
                                        <span>|</span>
                                        <span>הערכה: {task.estimatedMinutes} דק'</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDeleteTask(task.id)} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                    {userTasks.length === 0 && <div className="text-center text-slate-400 mt-10">אין משימות להצגה</div>}
                </div>
             </div>
        </div>
    )
}

const EfficiencyReportsModal = ({ isOpen, onClose, users, tasks }: { isOpen: boolean, onClose: () => void, users: User[], tasks: Task[] }) => {
    if (!isOpen) return null;
    
    // Calculate stats per user
    const stats = users.filter(u => u.role === 'EMPLOYEE').map(user => {
        const userTasks = tasks.filter(t => t.assigneeId === user.id);
        const completed = userTasks.filter(t => t.status === 'COMPLETED');
        const totalEstimated = completed.reduce((acc, t) => acc + (t.estimatedMinutes * 60), 0);
        const totalActual = completed.reduce((acc, t) => acc + t.elapsedSeconds, 0);
        const efficiency = totalEstimated > 0 ? Math.round((totalEstimated / totalActual) * 100) : 100;
        
        return {
            user,
            completedCount: completed.length,
            efficiency: Math.min(efficiency, 200) // Cap at 200%
        };
    }).sort((a,b) => b.efficiency - a.efficiency);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
             <div className="bg-white rounded-3xl shadow-soft w-full max-w-3xl p-6 sm:p-8 animate-fade-in-up">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-violet-500" />
                        דוח יעילות צוות
                    </h2>
                    <button onClick={onClose} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-4">
                    {stats.map(({ user, completedCount, efficiency }) => (
                        <div key={user.id} className="flex items-center gap-4">
                            <img src={user.avatar} className="w-10 h-10 rounded-full bg-slate-100" />
                            <div className="w-32 font-bold text-slate-700 text-sm">{user.name}</div>
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${efficiency >= 100 ? 'bg-emerald-400' : efficiency >= 80 ? 'bg-sky-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(efficiency, 100)}%` }}></div>
                            </div>
                            <div className="w-16 text-left font-mono font-bold text-slate-600">{efficiency}%</div>
                            <div className="w-20 text-xs text-slate-400 text-left">{completedCount} משימות</div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
}

const EmployeeCockpit = ({ 
    user, 
    tasks, 
    onToggle, 
    onComplete, 
    onAddTask, 
    onBlock, 
    onUpdateNotes 
}: { 
    user: User, 
    tasks: Task[], 
    onToggle: (id: string) => void, 
    onComplete: (id: string) => void, 
    onAddTask: () => void, 
    onBlock: (id: string, reason: string) => void, 
    onUpdateNotes: (notes: string) => void
}) => {
    const [isBlockerOpen, setIsBlockerOpen] = useState(false);
    const [notes, setNotes] = useState(user.personalNotes || '');
    
    // Auto-save notes on blur
    const handleNotesBlur = () => {
        if (notes !== user.personalNotes) {
            onUpdateNotes(notes);
        }
    };

    const activeTask = tasks.find(t => t.status === 'IN_PROGRESS' || t.status === 'BLOCKED');
    const pendingTasks = tasks.filter(t => t.status === 'PENDING');
    
    // Sort: Urgent first
    pendingTasks.sort((a,b) => {
        if (a.type === 'URGENT' && b.type !== 'URGENT') return -1;
        if (a.type !== 'URGENT' && b.type === 'URGENT') return 1;
        return 0;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 p-4 sm:p-6 overflow-hidden">
            <BlockerModal 
                isOpen={isBlockerOpen}
                onClose={() => setIsBlockerOpen(false)}
                onConfirm={(reason) => activeTask && onBlock(activeTask.id, reason)}
            />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-14 h-14 rounded-full border-4 border-white shadow-sm" />
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">היי, {user.name.split(' ')[0]}</h1>
                        <p className="text-slate-500 font-medium text-sm">זמן לעבוד!</p>
                    </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">יעילות</span>
                    <span className={`text-xl font-black ${user.efficiencyScore >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{user.efficiencyScore}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-6 overflow-hidden">
                {/* Left Column: Active Task & Notes */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Active Task Card */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-soft flex-1 flex flex-col justify-center items-center relative border border-white overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 to-indigo-400"></div>
                         
                         {activeTask ? (
                             <div className="text-center w-full max-w-md animate-fade-in-up">
                                 <div className="mb-2">
                                     <StatusBadge status={activeTask.status} />
                                 </div>
                                 <h2 className="text-2xl font-black text-slate-800 mb-6 leading-tight">{activeTask.title}</h2>
                                 
                                 <div className="mb-8">
                                     <div className={`text-6xl font-mono font-black tracking-tighter ${activeTask.status === 'BLOCKED' ? 'text-rose-500' : 'text-slate-800'}`}>
                                         {activeTask.status === 'BLOCKED' ? formatTime(activeTask.waitSeconds || 0) : formatTime(activeTask.elapsedSeconds)}
                                     </div>
                                     <p className="text-slate-400 mt-2 font-medium">
                                        {activeTask.status === 'BLOCKED' ? `חסם: ${activeTask.blockedReason}` : `זמן מוערך: ${activeTask.estimatedMinutes} דק'`}
                                     </p>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     {activeTask.status === 'BLOCKED' ? (
                                         <button onClick={() => onToggle(activeTask.id)} className="col-span-2 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 transition-all">
                                             שחרר חסימה
                                         </button>
                                     ) : (
                                        <>
                                            <button onClick={() => activeTask.status === 'IN_PROGRESS' ? onToggle(activeTask.id) : onToggle(activeTask.id)} className={`py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${activeTask.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`}>
                                                {activeTask.status === 'IN_PROGRESS' ? <><Pause className="w-5 h-5"/> הפסקה</> : <><Play className="w-5 h-5"/> המשך</>}
                                            </button>
                                            <button onClick={() => onComplete(activeTask.id)} className="py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2">
                                                <CheckCircle className="w-5 h-5" /> סיימתי
                                            </button>
                                            <button onClick={() => setIsBlockerOpen(true)} className="col-span-2 py-3 bg-rose-50 text-rose-500 rounded-xl font-bold hover:bg-rose-100 transition-all">
                                                דיווח על תקלה / חסם
                                            </button>
                                        </>
                                     )}
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center text-slate-400">
                                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <Sparkles className="w-8 h-8 text-slate-300" />
                                 </div>
                                 <h3 className="text-lg font-bold text-slate-600">אין משימה פעילה</h3>
                                 <p className="text-sm">בחר משימה מהרשימה או צור חדשה</p>
                             </div>
                         )}
                    </div>
                </div>

                {/* Right Column: List & Notes */}
                <div className="w-full sm:w-96 flex flex-col gap-6">
                    {/* Pending Tasks */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-soft flex-1 border border-white flex flex-col min-h-[300px]">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                 <LayoutDashboard className="w-5 h-5 text-sky-500" />
                                 ממתינות לביצוע
                             </h3>
                             <button onClick={onAddTask} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                 <Plus className="w-4 h-4" />
                             </button>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                             {pendingTasks.map(t => (
                                 <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all group cursor-pointer" onClick={() => onToggle(t.id)}>
                                     <div className="flex items-start justify-between mb-2">
                                         <div className="flex items-center gap-2">
                                             <TaskTypeIcon type={t.type} />
                                             <span className={`font-bold text-sm ${t.type === 'URGENT' ? 'text-rose-600' : 'text-slate-700'}`}>{t.title}</span>
                                         </div>
                                         <button className="text-slate-300 hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <Play className="w-4 h-4 fill-current" />
                                         </button>
                                     </div>
                                     <div className="flex justify-between items-center text-xs text-slate-400">
                                         <span>{t.estimatedMinutes} דק'</span>
                                         <span className={`px-2 py-0.5 rounded-full bg-white border ${t.priority === 1 ? 'border-rose-100 text-rose-500' : 'border-slate-100'}`}>
                                             {t.priority === 1 ? 'דחיפות גבוהה' : 'רגיל'}
                                         </span>
                                     </div>
                                 </div>
                             ))}
                             {pendingTasks.length === 0 && (
                                 <div className="text-center py-10 text-slate-400 text-sm">
                                     הכל נקי! אין משימות ממתינות 🎉
                                 </div>
                             )}
                         </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-amber-50/50 rounded-[2rem] p-6 border border-amber-100 h-48 flex flex-col">
                        <h3 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2">
                            <StickyNote className="w-4 h-4" />
                            פתקים אישיים
                        </h3>
                        <textarea 
                            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-700 placeholder:text-amber-300/50 leading-relaxed"
                            placeholder="רשום לעצמך הערות..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onBlur={handleNotesBlur}
                        ></textarea>
                    </div>
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
    onAddTask,
    onUpdateNotes,
    onEditTask,
    onDeleteTask
}: {
    isOpen: boolean,
    onClose: () => void,
    user: User,
    tasks: Task[],
    onAddTask: () => void,
    onUpdateNotes: (notes: string) => void,
    onEditTask: (id: string, updates: Partial<Task>) => void,
    onDeleteTask: (id: string) => void
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white">
            <div className="absolute top-4 left-4 z-10">
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-6 h-6 text-slate-600" />
                </button>
            </div>
            {/* We render a modified cockpit or just a list. Let's render a nice task manager view. */}
            <div className="h-full p-8 overflow-y-auto">
                 <h1 className="text-3xl font-black text-slate-800 mb-8">המרחב האישי שלי</h1>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-bold">המשימות שלי</h2>
                             <button onClick={onAddTask} className="flex items-center gap-2 text-sky-600 font-bold bg-sky-50 px-4 py-2 rounded-xl">
                                 <Plus className="w-4 h-4" /> משימה חדשה
                             </button>
                         </div>
                         <div className="space-y-3">
                             {tasks.map(t => (
                                 <div key={t.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
                                     <div>
                                         <div className="font-bold text-slate-700">{t.title}</div>
                                         <div className="text-sm text-slate-400 mt-1">{t.estimatedMinutes} דק' • {t.status}</div>
                                     </div>
                                     <div className="flex gap-2">
                                          <button onClick={() => onEditTask(t.id, { title: prompt('ערוך כותרת', t.title) || t.title })} className="p-2 text-slate-400 hover:text-sky-600"><Pencil className="w-4 h-4"/></button>
                                          <button onClick={() => onDeleteTask(t.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                                     </div>
                                 </div>
                             ))}
                             {tasks.length === 0 && <div className="text-slate-400 italic">אין משימות אישיות</div>}
                         </div>
                     </div>
                     
                     <div>
                         <h2 className="text-xl font-bold mb-4">פתקים</h2>
                         <textarea 
                             className="w-full h-96 p-6 bg-amber-50 rounded-2xl border border-amber-100 resize-none focus:ring-2 focus:ring-amber-200 outline-none text-slate-700 leading-relaxed"
                             value={user.personalNotes || ''}
                             onChange={(e) => onUpdateNotes(e.target.value)}
                             placeholder="רשום כאן הכל..."
                         ></textarea>
                     </div>
                 </div>
            </div>
        </div>
    )
};

const PlatformAdminDashboard = ({
    companies,
    users,
    currentUser,
    onAddCompany,
    onToggleCompanyStatus,
    onDeleteCompany,
    onAddUserToCompany,
    onUpdateUser,
    onDeleteUser,
    onUpdateCompany
}: {
    companies: Company[],
    users: User[],
    currentUser: User,
    onAddCompany: (name: string, pass: string, adminName: string, adminUser: string, adminPass: string) => void,
    onToggleCompanyStatus: (id: string) => void,
    onDeleteCompany: (id: string) => void,
    onAddUserToCompany: (name: string, u: string, p: string, role: UserRole, companyId: string) => void,
    onUpdateUser: (id: string, name: string, score: number, username: string, password: string) => void,
    onDeleteUser: (id: string) => void,
    onUpdateCompany: (id: string, name: string, pass: string) => void
}) => {
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [managingUsersCompanyId, setManagingUsersCompanyId] = useState<string | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    
    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <DeleteConfirmationModal
                isOpen={!!companyToDelete}
                onClose={() => setCompanyToDelete(null)}
                onConfirm={() => companyToDelete && onDeleteCompany(companyToDelete.id)}
                itemName={companyToDelete?.name || ''}
                title="מחיקת חברה"
            />

            <PlatformAdminSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                user={currentUser}
                onSave={onUpdateUser}
            />

            <CompanyCreationModal 
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onCreate={onAddCompany}
            />

            <CredentialsModal 
                isOpen={!!managingUsersCompanyId}
                onClose={() => setManagingUsersCompanyId(null)}
                users={users.filter(u => u.companyId === managingUsersCompanyId)}
                onUpdateUser={onUpdateUser}
                onDeleteUser={onDeleteUser}
            />
            
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">ניהול פלטפורמה</h1>
                    <p className="text-slate-500">ניהול חברות ומנויים</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 shadow-sm transition-all"
                    >
                        <Settings className="w-5 h-5" />
                        הגדרות מנהל
                    </button>
                    <button 
                        onClick={() => setIsCompanyModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        הקמת חברה חדשה
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {companies.map(company => {
                    const companyAdmin = users.find(u => u.companyId === company.id && u.role === 'SUPER_ADMIN');
                    const employeeCount = users.filter(u => u.companyId === company.id).length;

                    return (
                        <div key={company.id} className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl font-bold text-slate-600">
                                        {company.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{company.name}</h3>
                                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${company.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                            {company.status === 'ACTIVE' ? 'פעיל' : 'מושהה'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => onToggleCompanyStatus(company.id)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                        <Power className="w-4 h-4" />
                                    </button>
                                     <button onClick={() => setCompanyToDelete(company)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span>{employeeCount} משתמשים</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                                    <span>אדמין: {companyAdmin?.name || 'לא הוגדר'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-mono bg-slate-50 p-2 rounded-lg">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    <span className="select-all">סיסמה: {company.password}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-50 flex gap-2">
                                <button 
                                    onClick={() => setManagingUsersCompanyId(company.id)}
                                    className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                                >
                                    ניהול משתמשים
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- View: Admin Dashboard (Command Center) ---

const AdminDashboard = ({ 
  users, 
  tasks, 
  attendanceRecords,
  currentUser,
  onCreateUrgent,
  onAddTask,
  onUpdateUser,
  onAddUser,
  onDeleteUser,
  onToggleStatus,
  onUpdateNotes,
  onEditTask,
  onDeleteTask
}: { 
  users: User[], 
  tasks: Task[], 
  attendanceRecords: AttendanceRecord[],
  currentUser: User,
  onCreateUrgent: (uid: string) => void,
  onAddTask: (uid: string) => void,
  onUpdateUser: (id: string, name: string, score: number, username: string, password: string) => void,
  onAddUser: (name: string, u: string, p: string, role: UserRole) => void,
  onDeleteUser: (id: string) => void,
  onToggleStatus: (id: string) => void,
  onUpdateNotes: (notes: string) => void,
  onEditTask: (taskId: string, updates: Partial<Task>) => void,
  onDeleteTask: (taskId: string) => void
}) => {
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userForHistory, setUserForHistory] = useState<User | null>(null);
  const [isPersonalWorkspaceOpen, setIsPersonalWorkspaceOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Filter office employees for the card view
  const employees = users.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'PLATFORM_ADMIN' && u.role !== 'WORKER');
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id);

  return (
    <div className="p-4 sm:p-10 h-full overflow-y-auto bg-slate-50/50">
        <CredentialsModal
            isOpen={isCredentialsOpen}
            onClose={() => setIsCredentialsOpen(false)}
            users={users.filter(u => u.role !== 'PLATFORM_ADMIN')}
            onUpdateUser={onUpdateUser}
        />
        
        <EfficiencyReportsModal 
            isOpen={isReportsOpen} 
            onClose={() => setIsReportsOpen(false)} 
            users={users} 
            tasks={tasks} 
        />

        <AttendanceReportModal
            isOpen={isAttendanceReportOpen}
            onClose={() => setIsAttendanceReportOpen(false)}
            users={users}
            attendanceRecords={attendanceRecords}
        />

        <TaskHistoryModal 
            isOpen={!!userForHistory} 
            onClose={() => setUserForHistory(null)} 
            user={userForHistory} 
            tasks={tasks}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
        />

        <UserEditModal
            isOpen={!!editingUser}
            onClose={() => setEditingUser(null)}
            user={editingUser}
            onSave={onUpdateUser}
        />
        
        <UserCreationModal
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            onCreate={onAddUser}
        />

        <DeleteConfirmationModal
            isOpen={!!userToDelete}
            onClose={() => setUserToDelete(null)}
            onConfirm={() => userToDelete && onDeleteUser(userToDelete.id)}
            itemName={userToDelete?.name || ''}
            title="מחיקת עובד"
        />

        <AdminPersonalWorkspace
            isOpen={isPersonalWorkspaceOpen}
            onClose={() => setIsPersonalWorkspaceOpen(false)}
            user={currentUser}
            tasks={myTasks}
            onAddTask={() => {
                onAddTask(currentUser.id);
            }}
            onUpdateNotes={onUpdateNotes}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
        />
        
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 mb-2 sm:mb-3 tracking-tight">מרכז שליטה</h1>
                <p className="text-slate-500 text-base sm:text-lg font-light">תמונת מצב בזמן אמת</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                 <button 
                  onClick={() => setIsPersonalWorkspaceOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-700 text-sm font-bold transition-all hover:-translate-y-1 w-full sm:w-auto"
                >
                    <StickyNote className="w-4 h-4" />
                    המרחב שלי
                </button>
                <div className="hidden sm:block w-px h-10 bg-slate-200 mx-2"></div>
                <div className="grid grid-cols-2 sm:flex gap-3">
                    <button 
                    onClick={() => setIsCredentialsOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-5 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all"
                    >
                        <Key className="w-4 h-4 text-amber-500" />
                        סיסמאות
                    </button>
                    <button 
                    onClick={() => setIsAddUserOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-5 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all"
                    >
                        <UserPlus className="w-4 h-4 text-sky-500" />
                        הוסף עובד
                    </button>
                    <button 
                    onClick={() => setIsAttendanceReportOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all"
                    >
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                        דוח שעות
                    </button>
                    <button 
                    onClick={() => setIsReportsOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all col-span-2 sm:col-span-1"
                    >
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        דוחות יעילות
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {employees.map(emp => {
                const empTasks = tasks.filter(t => t.assigneeId === emp.id);
                const inProgressTask = empTasks.find(t => t.status === 'IN_PROGRESS');
                const blockedTask = empTasks.find(t => t.status === 'BLOCKED');
                const activeTask = inProgressTask || blockedTask;
                const backgroundBlockedTasks = empTasks.filter(t => t.status === 'BLOCKED' && t.id !== activeTask?.id);
                const lastCompleted = empTasks.filter(t => t.status === 'COMPLETED').pop();
                const isSuspended = emp.status === 'OFFLINE';
                const isBlocked = activeTask?.status === 'BLOCKED';

                return (
                    <div key={emp.id} className={`bg-white rounded-[2rem] shadow-soft border border-white overflow-hidden flex flex-col group/card transition-all hover:translate-y-[-4px] hover:shadow-xl ${isSuspended ? 'opacity-60 grayscale' : ''} ${isBlocked ? 'ring-2 ring-rose-200' : ''}`}>
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-sky-100 rounded-full blur opacity-40"></div>
                                    <img src={emp.avatar} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-sm relative z-10" alt={emp.name} />
                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white z-20 ${isBlocked ? 'bg-rose-500' : emp.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800">{emp.name}</h3>
                                        <div className="flex opacity-100 sm:opacity-0 group-hover/card:opacity-100 transition-opacity gap-1">
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setEditingUser(emp); }}
                                                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-sky-500 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onToggleStatus(emp.id); }}
                                                className={`p-1.5 hover:bg-slate-50 rounded-lg transition-colors ${isSuspended ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-amber-500'}`}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    setUserToDelete(emp);
                                                }}
                                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">ציון יעילות: <span className={emp.efficiencyScore > 90 ? 'text-emerald-500' : 'text-amber-500'}>{emp.efficiencyScore}</span></div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onAddTask(emp.id)}
                                    title="הקצה משימה"
                                    disabled={isSuspended}
                                    className="p-3 bg-sky-50 text-sky-600 rounded-2xl hover:bg-sky-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Current Status Body */}
                        <div className="p-5 sm:p-6 flex-1 bg-slate-50/30">
                            {isSuspended ? (
                                <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                                    <div className="flex flex-col items-center gap-2">
                                        <Power className="w-6 h-6 opacity-50" />
                                        <span>בהשהיה</span>
                                    </div>
                                </div>
                            ) : (
                            <>
                            <div className="mb-5">
                                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">בטיפול כרגע</div>
                                {activeTask ? (
                                    <div className={`${isBlocked ? 'bg-rose-50 border-rose-100' : 'bg-white border-sky-100'} border rounded-2xl p-5 relative overflow-hidden shadow-sm`}>
                                        <div className="flex items-start justify-between mb-3 z-10 relative">
                                            <h4 className={`font-bold ${isBlocked ? 'text-rose-800' : 'text-slate-800'} text-base line-clamp-1`}>{activeTask.title}</h4>
                                            <span className={`animate-pulse ${isBlocked ? 'text-rose-400' : 'text-sky-400'}`}>
                                                {isBlocked ? <Ban className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            </span>
                                        </div>
                                        <div className={`text-3xl font-mono ${isBlocked ? 'text-rose-600' : 'text-sky-600'} font-bold tracking-tight z-10 relative`}>
                                            {isBlocked ? formatTime(activeTask.waitSeconds || 0) : formatTime(activeTask.elapsedSeconds)}
                                        </div>
                                        <div className={`text-xs ${isBlocked ? 'text-rose-400 font-bold' : 'text-slate-400'} mt-2 z-10 relative`}>
                                            {isBlocked ? `חסם: ${activeTask.blockedReason}` : `צפי: ${activeTask.estimatedMinutes} דק'`}
                                        </div>
                                        {/* Soft Progress Bar */}
                                        <div className={`absolute bottom-0 left-0 h-1.5 ${isBlocked ? 'bg-rose-100' : 'bg-slate-100'} w-full`}>
                                            <div 
                                                className={`h-full rounded-r-full ${isBlocked ? 'bg-rose-400' : activeTask.elapsedSeconds > activeTask.estimatedMinutes * 60 ? 'bg-rose-400' : 'bg-sky-400'}`} 
                                                style={{ width: isBlocked ? '100%' : `${Math.min(100, (activeTask.elapsedSeconds / (activeTask.estimatedMinutes * 60)) * 100)}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl p-6 text-center text-slate-400 text-sm">
                                        פנוי למשימות
                                    </div>
                                )}
                            </div>

                            {backgroundBlockedTasks.length > 0 && (
                                <div className="mb-5">
                                     <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-2">
                                        <div className="flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>חסימות ברקע ({backgroundBlockedTasks.length})</span>
                                        </div>
                                     </div>
                                     <div className="space-y-2">
                                        {backgroundBlockedTasks.map(t => (
                                            <div key={t.id} className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 flex justify-between items-center">
                                                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-rose-900 truncate" title={t.title}>{t.title}</span>
                                                    <span className="text-[10px] text-rose-500 truncate" title={t.blockedReason}>{t.blockedReason}</span>
                                                </div>
                                                <span className="font-mono text-[10px] font-bold text-rose-500 bg-white px-2 py-0.5 rounded shadow-sm border border-rose-100 ml-2">
                                                    {formatTime(t.waitSeconds)}
                                                </span>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">הבא בתור</div>
                                <div className="space-y-2">
                                    {empTasks.filter(t => t.status === 'PENDING').slice(0, 3).map(t => (
                                        <div key={t.id} className="flex items-center justify-between text-sm p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3 truncate min-w-0">
                                                <TaskTypeIcon type={t.type} />
                                                <span className="truncate max-w-[120px] text-slate-600 font-medium">{t.title}</span>
                                            </div>
                                            <span className="text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-md font-mono shrink-0">{t.estimatedMinutes} דק'</span>
                                        </div>
                                    ))}
                                    {empTasks.filter(t => t.status === 'PENDING').length === 0 && <span className="text-xs text-slate-300 italic block text-center py-2">אין משימות ממתינות</span>}
                                </div>
                            </div>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); setUserForHistory(emp); }}
                                className="w-full mt-6 py-3 bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                <ClipboardList className="w-4 h-4 text-sky-500" />
                                צפה בכל המשימות
                            </button>
                            </>
                            )}
                        </div>
                        
                        {/* Footer Stats */}
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between text-xs text-slate-400 font-medium">
                             <span>הושלמו היום: {empTasks.filter(t => t.status === 'COMPLETED').length}</span>
                             {lastCompleted && <span className="truncate max-w-[150px]">אחרונה: {lastCompleted.title}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
};

export default function App() {
    const [users, setUsers] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    // Auth Flow State
    const [loginStep, setLoginStep] = useState<'COMPANY_SELECT' | 'USER_LOGIN' | 'PLATFORM_LOGIN'>('COMPANY_SELECT');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // --- Firebase Sync ---

    // Sync Companies
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, 'companies'), orderBy('name')), (snapshot) => {
            const companiesData: Company[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Company));
            setCompanies(companiesData);
        });
        return () => unsubscribe();
    }, []);

    // Sync Users
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, 'users'), orderBy('name')), (snapshot) => {
            if (snapshot.empty && isLoadingUsers && companies.length === 0) {
                // SEED INITIAL PLATFORM ADMIN if absolutely empty
                const seedAdmin = {
                    name: 'מנהל מערכת',
                    role: 'PLATFORM_ADMIN',
                    companyId: 'platform',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Platform',
                    efficiencyScore: 100,
                    status: 'ONLINE',
                    personalNotes: '',
                    username: 'platform',
                    password: '123'
                };
                addDoc(collection(db, 'users'), seedAdmin);
            }

            const usersData: User[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as User));
            setUsers(usersData);
            
            // If logged in, update currentUser from the list to reflect latest changes
            if (currentUser) {
                const latestUser = usersData.find(u => u.id === currentUser.id);
                if (latestUser) setCurrentUser(latestUser);
            }
            
            setIsLoadingUsers(false);
        });

        return () => unsubscribe();
    }, [companies.length, currentUser?.id]);

    // Sync Tasks
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            const tasksData: Task[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Task));
            setTasks(tasksData);
        });

        return () => unsubscribe();
    }, []);

    // Sync Attendance
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
            const records: AttendanceRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AttendanceRecord));
            setAttendanceRecords(records);
        });
        return () => unsubscribe();
    }, []);
    
    // Timer Effect (Local Visual Only)
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prevTasks => prevTasks.map(task => {
                if (task.status === 'IN_PROGRESS') {
                    // Update visual only, do not write to DB every second
                    return { ...task, elapsedSeconds: (task.elapsedSeconds || 0) + 1 };
                }
                if (task.status === 'BLOCKED') {
                    return { ...task, waitSeconds: (task.waitSeconds || 0) + 1 };
                }
                return task;
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Handlers

    const handleCompanyLogin = (companyId: string, password: string) => {
        const company = companies.find(c => c.id === companyId);
        if (!company) {
             setLoginError('חברה לא נמצאה');
             return;
        }

        if (company.status === 'SUSPENDED') {
            setLoginError('הגישה לחברה זו נחסמה זמנית');
            return;
        }

        // In a real app, hash checking should be here.
        // For existing companies without password, we might skip check or default.
        if (company.password && company.password !== password) {
             setLoginError('סיסמת חברה שגויה');
             return;
        }
        // If company has no password set (legacy), we allow entry or warn. 
        // Assuming strict mode for now if password exists.

        setSelectedCompany(company);
        setLoginStep('USER_LOGIN');
        setLoginError('');
    };

    const handleUserLogin = (u: string, p: string) => {
        if (!selectedCompany) return;

        const user = users.find(user => 
            user.companyId === selectedCompany.id && 
            user.username === u && 
            user.password === p
        );

        if (user) {
            setCurrentUser(user);
            setLoginError('');
            updateDoc(doc(db, 'users', user.id), { status: 'ONLINE' });
        } else {
            setLoginError('שם משתמש או סיסמא שגויים');
        }
    };

    const handlePlatformAdminLogin = (u: string, p: string) => {
         const admin = users.find(user => 
            user.role === 'PLATFORM_ADMIN' && 
            user.username === u && 
            user.password === p
        );

        if (admin) {
             setCurrentUser(admin);
             setLoginError('');
             updateDoc(doc(db, 'users', admin.id), { status: 'ONLINE' });
        } else {
             setLoginError('פרטי גישה שגויים עבור מנהל מערכת');
        }
    };

    const handleLogout = () => {
        if (currentUser) {
            // Update status to offline
             updateDoc(doc(db, 'users', currentUser.id), { status: 'OFFLINE' });
        }
        setCurrentUser(null);
        setSelectedCompany(null);
        setLoginStep('COMPANY_SELECT');
        setLoginError('');
    };

    // Task Actions
    const handleAddTask = async (task: Partial<Task>) => {
        if (!currentUser) return;
        
        const newTask: Omit<Task, 'id'> = {
            companyId: currentUser.companyId,
            assigneeId: task.assigneeId || (currentUser.id || ''),
            title: task.title || 'משימה חדשה',
            type: task.type || 'FLOATING',
            status: 'PENDING',
            estimatedMinutes: task.estimatedMinutes || 60,
            elapsedSeconds: 0,
            waitSeconds: 0,
            priority: task.priority || 2,
            ...task
        };
        await addDoc(collection(db, 'tasks'), newTask);
    };

    const handleToggleTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.status === 'IN_PROGRESS') {
             // Pause: Save current local elapsed time to DB
             await updateDoc(doc(db, 'tasks', taskId), { 
                 status: 'PAUSED',
                 elapsedSeconds: task.elapsedSeconds // Save the locally accumulated time
             });
        } else if (['PENDING', 'PAUSED'].includes(task.status)) {
             // Check if user has other running tasks and pause them
             const otherActiveTask = tasks.find(t => t.assigneeId === task.assigneeId && t.status === 'IN_PROGRESS');
             if (otherActiveTask) {
                 await updateDoc(doc(db, 'tasks', otherActiveTask.id), { 
                     status: 'PAUSED',
                     elapsedSeconds: otherActiveTask.elapsedSeconds
                 });
             }
             
             await updateDoc(doc(db, 'tasks', taskId), { status: 'IN_PROGRESS' });
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            await updateDoc(doc(db, 'tasks', taskId), { 
                status: 'COMPLETED',
                elapsedSeconds: task.elapsedSeconds // Save final time
            });
        }
    };

    const handleBlockTask = async (taskId: string, reason: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
             await updateDoc(doc(db, 'tasks', taskId), { 
                 status: 'BLOCKED', 
                 blockedReason: reason,
                 elapsedSeconds: task.elapsedSeconds // Save progress before block
             });
        }
    };
    
    // Admin Actions
    const handleCreateUrgentTask = async (userId: string) => {
        if (!currentUser) return;
        const newTask: Omit<Task, 'id'> = {
            companyId: currentUser.companyId,
            assigneeId: userId,
            title: 'משימה דחופה',
            type: 'URGENT',
            status: 'PENDING',
            estimatedMinutes: 30,
            elapsedSeconds: 0,
            waitSeconds: 0,
            priority: 1
        };
        await addDoc(collection(db, 'tasks'), newTask);
    };

    const handleUpdateUser = async (id: string, name: string, score: number, username: string, password: string) => {
        await updateDoc(doc(db, 'users', id), {
            name,
            efficiencyScore: score,
            username,
            password
        });
    };

    const handleAddUser = async (name: string, username: string, pass: string, role: UserRole, targetCompanyId?: string) => {
        if (!currentUser) return;
        const cid = targetCompanyId || currentUser.companyId;
        const newUser: Omit<User, 'id'> = {
            companyId: cid,
            name,
            username,
            password: pass,
            role,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            efficiencyScore: 100,
            status: 'OFFLINE'
        };
        await addDoc(collection(db, 'users'), newUser);
    };

    const handleDeleteUser = async (id: string) => {
        await deleteDoc(doc(db, 'users', id));
    };

    const handleToggleUserStatus = async (id: string) => {
        const user = users.find(u => u.id === id);
        if (user) {
            await updateDoc(doc(db, 'users', id), {
                status: user.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE'
            });
        }
    };
    
    const handleUpdateNotes = async (notes: string) => {
        if (!currentUser) return;
        // Optimistic update locally
        const updatedUser = { ...currentUser, personalNotes: notes };
        setCurrentUser(updatedUser);
        
        // Debounce could be added here, but direct update for now
        await updateDoc(doc(db, 'users', currentUser.id), { personalNotes: notes });
    };

    const handleEditTask = async (taskId: string, updates: Partial<Task>) => {
        await updateDoc(doc(db, 'tasks', taskId), updates);
    };

    const handleDeleteTask = async (taskId: string) => {
        await deleteDoc(doc(db, 'tasks', taskId));
    };

    const handleUpdateCompany = async (id: string, name: string, password: string) => {
        await updateDoc(doc(db, 'companies', id), {
            name,
            password
        });
    };

    // Attendance Actions
    const handleManualAttendanceUpdate = async (dateStr: string, startTime: string, endTime: string) => {
        if (!currentUser) return;
        
        // Find existing record for this date
        const existingRecord = attendanceRecords.find(r => 
            r.userId === currentUser.id && 
            r.date === dateStr
        );

        let totalMinutes = 0;
        let status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE';
        let isoStartTime = '';
        let isoEndTime = '';

        if (startTime) {
             isoStartTime = `${dateStr}T${startTime}:00`;
        }
        
        if (endTime) {
            isoEndTime = `${dateStr}T${endTime}:00`;
            status = 'COMPLETED';
            
            // Calculate duration if both exist
            if (isoStartTime) {
                const start = new Date(isoStartTime);
                const end = new Date(isoEndTime);
                const diffMs = end.getTime() - start.getTime();
                totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
            }
        }

        if (existingRecord) {
             // Update
             await updateDoc(doc(db, 'attendance', existingRecord.id), {
                 startTime: isoStartTime || existingRecord.startTime, // Keep old if new is empty (though UI handles this)
                 endTime: isoEndTime,
                 totalMinutes,
                 status
             });
        } else {
             // Create New
             if (startTime || endTime) { // Only create if there's data
                 const record: Omit<AttendanceRecord, 'id'> = {
                    userId: currentUser.id,
                    companyId: currentUser.companyId,
                    date: dateStr,
                    startTime: isoStartTime || new Date().toISOString(), // Fallback if user only enters end time (edge case)
                    endTime: isoEndTime,
                    totalMinutes,
                    status
                };
                await addDoc(collection(db, 'attendance'), record);
             }
        }
    };


    // Platform Admin Actions
    const handleAddCompany = async (companyName: string, companyPass: string, adminName: string, adminUser: string, adminPass: string) => {
        const batch = writeBatch(db);
        
        // 1. Create Company Ref (auto-id)
        const companyRef = doc(collection(db, 'companies'));
        const newCompany = {
            name: companyName,
            status: 'ACTIVE' as const, 
            logo: '', 
            createdAt: new Date().toISOString(),
            password: companyPass
        };
        batch.set(companyRef, newCompany);

        // 2. Create Initial Super Admin for that company
        const userRef = doc(collection(db, 'users'));
        const newAdmin = {
            companyId: companyRef.id,
            name: adminName,
            username: adminUser,
            password: adminPass,
            role: 'SUPER_ADMIN' as const,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminName}`,
            efficiencyScore: 100,
            status: 'OFFLINE' as const
        };
        batch.set(userRef, newAdmin);

        await batch.commit();
    };

    const handleToggleCompanyStatus = async (companyId: string) => {
        const company = companies.find(c => c.id === companyId);
        if (company) {
            await updateDoc(doc(db, 'companies', companyId), {
                status: company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
            });
        }
    };

    const handleDeleteCompany = async (companyId: string) => {
        // In a real app, this should be a cloud function to delete all sub-collections
        // Here we just delete the company doc. Users will be orphaned but filtered out.
        await deleteDoc(doc(db, 'companies', companyId));
    };

    // Modal state for task creation
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskModalAssignee, setTaskModalAssignee] = useState<string | null>(null);

    const openTaskModal = (assigneeId: string | null = null) => {
        setTaskModalAssignee(assigneeId);
        setIsTaskModalOpen(true);
    };

    // --- MAIN RENDER ---

    if (!currentUser) {
        if (loginStep === 'COMPANY_SELECT') {
            return (
                <CompanyLoginScreen 
                    companies={companies}
                    onCompanyLogin={handleCompanyLogin}
                    onPlatformLoginClick={() => {
                        setLoginStep('PLATFORM_LOGIN');
                        setLoginError('');
                    }}
                    error={loginError}
                    isLoading={isLoadingUsers}
                />
            );
        } else if (loginStep === 'USER_LOGIN' && selectedCompany) {
            return (
                <UserLoginScreen 
                    company={selectedCompany}
                    onLogin={handleUserLogin}
                    onBack={() => {
                        setLoginStep('COMPANY_SELECT');
                        setSelectedCompany(null);
                        setLoginError('');
                    }}
                    error={loginError}
                    isLoading={isLoadingUsers}
                />
            );
        } else if (loginStep === 'PLATFORM_LOGIN') {
             return (
                 <PlatformAdminLoginScreen
                    onLogin={handlePlatformAdminLogin}
                    onBack={() => {
                        setLoginStep('COMPANY_SELECT');
                        setLoginError('');
                    }}
                    error={loginError}
                    isLoading={isLoadingUsers}
                 />
             );
        }
    }

    // Filter Data for Views
    const companyUsers = users.filter(u => u.companyId === currentUser.companyId);
    const companyTasks = tasks.filter(t => t.companyId === currentUser.companyId);

    return (
        <div className="h-screen w-screen bg-slate-50 font-sans text-right" dir="rtl">
            <TaskCreationModal 
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onCreate={handleAddTask}
                assigneeId={taskModalAssignee}
                currentUserRole={currentUser.role}
            />

            {/* Top Bar for Logout */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
                <button onClick={handleLogout} className="p-2 sm:p-3 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-soft hover:shadow-lg transition-all" title="התנתק">
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>

            {currentUser.role === 'PLATFORM_ADMIN' ? (
                <PlatformAdminDashboard 
                    companies={companies}
                    users={users}
                    currentUser={currentUser}
                    onAddCompany={handleAddCompany}
                    onToggleCompanyStatus={handleToggleCompanyStatus}
                    onDeleteCompany={handleDeleteCompany}
                    onAddUserToCompany={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onUpdateCompany={handleUpdateCompany}
                />
            ) : currentUser.role === 'SUPER_ADMIN' ? (
                <AdminDashboard 
                    users={companyUsers}
                    tasks={companyTasks}
                    attendanceRecords={attendanceRecords.filter(r => r.companyId === currentUser.companyId)}
                    currentUser={currentUser}
                    onCreateUrgent={handleCreateUrgentTask}
                    onAddTask={openTaskModal}
                    onUpdateUser={handleUpdateUser}
                    onAddUser={handleAddUser}
                    onDeleteUser={handleDeleteUser}
                    onToggleStatus={handleToggleUserStatus}
                    onUpdateNotes={handleUpdateNotes}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                />
            ) : currentUser.role === 'WORKER' ? (
                <WorkerCockpit 
                    user={currentUser}
                    attendanceRecords={attendanceRecords}
                    onUpdateAttendance={handleManualAttendanceUpdate}
                />
            ) : (
                <EmployeeCockpit 
                    user={currentUser}
                    tasks={companyTasks.filter(t => t.assigneeId === currentUser.id)}
                    onToggle={handleToggleTask}
                    onComplete={handleCompleteTask}
                    onAddTask={() => openTaskModal(currentUser.id)}
                    onBlock={handleBlockTask}
                    onUpdateNotes={handleUpdateNotes}
                />
            )}
        </div>
    );
};