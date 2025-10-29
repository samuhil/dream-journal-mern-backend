import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, PlusCircle, Trash2, Edit2, Zap, Moon, Sun, Lock } from 'lucide-react';

// NOTE: Use your backend URL running locally.
// If your backend is deployed, replace 'http://localhost:5000' with your live API URL.
const API_URL = 'http://localhost:5000/api';

// --- Axios Configuration (Interceptor for Token) ---
// This automatically adds the JWT token to every request made to the secure API routes.
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// --- State Management ---
// Custom hook for simple routing
const useRoute = (initialRoute) => {
    const [route, setRoute] = useState(initialRoute);
    return [route, setRoute];
};

// --- Utility Functions ---
const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// --- Main App Component ---
const App = () => {
    // 1. App State
    const [currentUser, setCurrentUser] = useState(null);
    const [dreams, setDreams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // 2. Routing State (login, register, dashboard)
    const [currentView, setCurrentView] = useRoute('login');

    // 3. Form State
    const [form, setForm] = useState({ title: '', description: '', tags: '', date: new Date().toISOString().substring(0, 10), isEditing: false, dreamId: null });

    // --- Authentication Effects ---

    // Effect to check local token on load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // In a real app, you would verify this token with the backend.
            setCurrentUser({ name: 'User' }); // Simple placeholder for name
            setCurrentView('dashboard');
        }
    }, []);

    // --- API Calls ---

    // 1. Fetch Dreams
    const fetchDreams = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/dreams`);
            setDreams(response.data);
        } catch (err) {
            console.error('Fetch Dreams Error:', err);
            setError('Failed to load dreams. Please log in again.');
            handleLogout();
        } finally {
            setLoading(false);
        }
    };

    // 2. Auth Handlers
    const handleAuth = async (isRegister, credentials) => {
        setLoading(true);
        setError(null);
        const endpoint = isRegister ? 'register' : 'login';
        try {
            const response = await axios.post(`${API_URL}/users/${endpoint}`, credentials);
            localStorage.setItem('token', response.data.token);
            setCurrentUser({ name: credentials.name || 'User' });
            setCurrentView('dashboard');
            // Fetch dreams immediately after successful login
            if (!isRegister) fetchDreams();
        } catch (err) {
            const msg = err.response?.data?.msg || 'An unexpected error occurred.';
            setError(msg);
            setCurrentUser(null);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setCurrentUser(null);
        setDreams([]);
        setCurrentView('login');
    };

    // 3. Dream Handlers (CRUD)
    const handleSubmitDream = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const dreamData = {
            ...form,
            tags: form.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        try {
            if (form.isEditing) {
                await axios.put(`${API_URL}/dreams/${form.dreamId}`, dreamData);
            } else {
                await axios.post(`${API_URL}/dreams`, dreamData);
            }
            // Clear form and reload data
            setForm({ title: '', description: '', tags: '', date: new Date().toISOString().substring(0, 10), isEditing: false, dreamId: null });
            fetchDreams();
        } catch (err) {
            const msg = err.response?.data?.msg || 'Failed to save dream. Check your token.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDream = async (id) => {
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/dreams/${id}`);
            fetchDreams(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to delete dream.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (dream) => {
        setForm({
            title: dream.title,
            description: dream.description,
            tags: dream.tags.join(', '),
            date: dream.date.substring(0, 10),
            isEditing: true,
            dreamId: dream._id
        });
        // Scroll to the form
        document.getElementById('dream-form-section').scrollIntoView({ behavior: 'smooth' });
    };

    // Load dreams on dashboard view
    useEffect(() => {
        if (currentView === 'dashboard' && currentUser && dreams.length === 0) {
            fetchDreams();
        }
    }, [currentView, currentUser]);

    // --- UI Components ---

    const AuthForm = ({ isRegister }) => {
        const [formData, setFormData] = useState({ name: '', email: '', password: '' });

        const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

        const onSubmit = e => {
            e.preventDefault();
            handleAuth(isRegister, formData);
        };

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <form onSubmit={onSubmit} className={`p-6 shadow-2xl rounded-xl w-full max-w-sm ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'}`}>
                    <h2 className="text-3xl font-bold mb-6 text-center text-indigo-400">
                        {isRegister ? 'Register' : 'Welcome Back'}
                    </h2>
                    {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Name"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            required
                            className={`w-full p-3 mb-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email Address"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        required
                        className={`w-full p-3 mb-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        value={formData.password}
                        onChange={onChange}
                        required
                        className={`w-full p-3 mb-6 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isRegister ? 'Register Account' : 'Login'}
                    </button>
                    <p className="mt-4 text-center text-sm">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            type="button"
                            onClick={() => setCurrentView(isRegister ? 'login' : 'register')}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 transition duration-200"
                        >
                            {isRegister ? 'Login' : 'Register'}
                        </button>
                    </p>
                </form>
            </div>
        );
    };

    const DreamForm = () => (
        <section id="dream-form-section" className={`p-6 rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-2xl font-bold mb-6 text-indigo-400 flex items-center">
                {form.isEditing ? <Edit2 className="w-6 h-6 mr-2" /> : <PlusCircle className="w-6 h-6 mr-2" />}
                {form.isEditing ? 'Edit Dream Entry' : 'New Dream Entry'}
            </h3>
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

            <form onSubmit={handleSubmitDream}>
                <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`w-full p-3 mb-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                    required
                />
                <input
                    type="text"
                    placeholder="Dream Title (e.g., Flying to the Moon)"
                    name="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={`w-full p-3 mb-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-gray-100' : 'bg-gray-50 border-gray-300 placeholder-gray-500 text-gray-800'}`}
                    required
                />
                <textarea
                    placeholder="Describe your dream in detail..."
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="4"
                    className={`w-full p-3 mb-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-gray-100' : 'bg-gray-50 border-gray-300 placeholder-gray-500 text-gray-800'}`}
                    required
                ></textarea>
                <input
                    type="text"
                    placeholder="Tags (comma separated, e.g., lucid, nightmare, emotional)"
                    name="tags"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className={`w-full p-3 mb-6 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-gray-100' : 'bg-gray-50 border-gray-300 placeholder-gray-500 text-gray-800'}`}
                />
                <div className="flex space-x-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : form.isEditing ? 'Update Dream' : 'Record Dream'}
                    </button>
                    {form.isEditing && (
                        <button
                            type="button"
                            onClick={() => setForm({ title: '', description: '', tags: '', date: new Date().toISOString().substring(0, 10), isEditing: false, dreamId: null })}
                            className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition duration-200"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>
        </section>
    );

    const DreamItem = ({ dream }) => (
        <div className={`p-4 rounded-lg shadow-md mb-4 border-l-4 ${isDarkMode ? 'bg-gray-800 border-indigo-500' : 'bg-white border-indigo-400'}`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-bold text-indigo-300">{dream.title}</h4>
                <div className="flex space-x-2">
                    <button onClick={() => handleEditClick(dream)} className="text-yellow-500 hover:text-yellow-400 transition">
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteDream(dream._id)} className="text-red-500 hover:text-red-400 transition">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dream.description}</p>
            <div className="flex justify-between items-center text-xs">
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{formatDate(dream.date)}</p>
                <div className="flex flex-wrap gap-2">
                    {dream.tags.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const Dashboard = () => (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
            <header className={`p-4 shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-extrabold text-indigo-400 flex items-center">
                        <Moon className="w-6 h-6 mr-2 text-indigo-500" /> Dream Journal
                    </h1>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full transition ${isDarkMode ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-gray-200 text-indigo-600 hover:bg-gray-300'}`}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center text-sm font-medium px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                        >
                            <LogOut className="w-4 h-4 mr-1" /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 order-2 lg:order-1">
                    <h2 className="text-3xl font-bold mb-6 text-indigo-400 flex items-center">
                        <Zap className="w-6 h-6 mr-2" /> All Recorded Dreams
                    </h2>
                    {loading && <p className="text-indigo-400">Loading dreams...</p>}
                    {dreams.length === 0 && !loading && (
                        <div className={`p-8 rounded-xl text-center ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'}`}>
                            <p className="text-lg font-medium">No dreams recorded yet.</p>
                            <p className="text-sm mt-2">Use the form on the side to start your first entry!</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {dreams.map(dream => <DreamItem key={dream._id} dream={dream} />)}
                    </div>
                </div>

                <div className="lg:col-span-1 order-1 lg:order-2 sticky top-4">
                    <DreamForm />
                </div>
            </main>
        </div>
    );

    // --- Main Renderer ---
    return (
        <div className={isDarkMode ? 'dark' : ''}>
            {currentView === 'login' && <AuthForm isRegister={false} />}
            {currentView === 'register' && <AuthForm isRegister={true} />}
            {currentView === 'dashboard' && currentUser && <Dashboard />}

            {/* Default lock screen if token is present but user state hasn't loaded (brief flicker) */}
            {currentView === 'dashboard' && !currentUser && (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
                    <div className="text-center p-8 bg-gray-800 rounded-xl shadow-2xl">
                        <Lock className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
                        <h2 className="text-xl font-semibold">Accessing Secure Zone...</h2>
                        <p className="text-sm text-gray-400 mt-2">Please wait.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
