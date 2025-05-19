import React, { useState, useEffect, useCallback } from 'react';

// Tailwind CSS is assumed to be available globally (e.g., via CDN in index.html)

// --- Configuration ---
const LOCAL_STORAGE_KEYS = {
    CANVAS_DOMAIN: 'canvasCloneDomain',
    API_TOKEN: 'canvasCloneApiToken',
};

// --- API Service (simulated, calls our Cloudflare Worker) ---
const apiService = {
    async request(endpoint, method = 'GET', body = null, domain, token) {
        if (!domain || !token) {
            throw new Error("Canvas domain or API token is missing.");
        }

        const response = await fetch('/api-proxy', { // Our Cloudflare Worker endpoint
            method: 'POST', // Always POST to our proxy
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                canvas_domain: domain,
                api_token: token,
                target_endpoint: endpoint, // e.g., "/api/v1/courses"
                target_method: method,
                target_body: body,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
            throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`);
        }
        if (response.status === 204) { // No Content
            return null;
        }
        return response.json();
    }
};


// --- Components ---

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
}

function ErrorMessage({ message }) {
    if (!message) return null;
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{message}</span>
        </div>
    );
}

function Navbar({ onLogout, currentView, setCurrentView }) {
    return (
        <nav className="bg-indigo-600 p-4 shadow-lg">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-white text-2xl font-bold">Canvas Lite</h1>
                <div>
                    {currentView !== 'login' && (
                         <button
                            onClick={() => setCurrentView('dashboard')}
                            className={`text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium ${currentView === 'dashboard' ? 'bg-indigo-700' : ''}`}
                        >
                            Dashboard
                        </button>
                    )}
                    {onLogout && currentView !== 'login' && (
                        <button
                            onClick={onLogout}
                            className="ml-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}

function LoginPage({ onLoginSuccess }) {
    const [domain, setDomain] = useState(localStorage.getItem(LOCAL_STORAGE_KEYS.CANVAS_DOMAIN) || '');
    const [token, setToken] = useState(localStorage.getItem(LOCAL_STORAGE_KEYS.API_TOKEN) || '');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!domain || !token) {
            setError('Both Canvas Domain and API Token are required.');
            return;
        }
        setIsLoading(true);
        try {
            // Test the token by fetching user's profile
            await apiService.request('/api/v1/users/self/profile', 'GET', null, domain, token);
            localStorage.setItem(LOCAL_STORAGE_KEYS.CANVAS_DOMAIN, domain);
            localStorage.setItem(LOCAL_STORAGE_KEYS.API_TOKEN, token);
            onLoginSuccess(domain, token);
        } catch (err) {
            setError(`Login failed: ${err.message}. Please check your domain and token.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Welcome to Canvas Lite</h2>
                    <p className="text-gray-600 mt-2">Enter your Canvas details to proceed.</p>
                </div>
                <ErrorMessage message={error} />
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="canvas_domain" className="block text-sm font-medium text-gray-700 mb-1">
                            Canvas Domain
                        </label>
                        <input
                            type="text"
                            id="canvas_domain"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            placeholder="your.instructure.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="api_token" className="block text-sm font-medium text-gray-700 mb-1">
                            Canvas API Token
                        </label>
                        <input
                            type="password" // Use password type to obscure token
                            id="api_token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            placeholder="Paste your API token"
                            required
                        />
                         <p className="text-xs text-gray-500 mt-1">Generate this from Canvas: Profile > Settings > New Access Token.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function CourseCard({ course, onClick }) {
    return (
        <div
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => onClick(course.id)}
        >
            <div className="h-32 bg-indigo-500 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m0 0A8.001 8.001 0 004 17.747M12 17.747A8.001 8.001 0 0120 17.747M4 12a8.001 8.001 0 0116 0c0 2.922-.932 5.097-2.198 6.506M4 12c0-2.922.932-5.097 2.198-6.506M12 6.253A8.001 8.001 0 004 12M12 6.253A8.001 8.001 0 0120 12" /></svg>
            </div>
            <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 truncate" title={course.name}>{course.name || 'Unnamed Course'}</h3>
                <p className="text-sm text-gray-600 mb-1">Code: {course.course_code || 'N/A'}</p>
                <p className="text-sm text-gray-600">Term: {course.term?.name || 'N/A'}</p>
            </div>
        </div>
    );
}

function DashboardPage({ domain, token, onSelectCourse }) {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Fetch only active courses, you might want to add more params like enrollment_state
                const coursesData = await apiService.request('/api/v1/courses?enrollment_state=active&include[]=term', 'GET', null, domain, token);
                setCourses(coursesData || []);
            } catch (err) {
                setError(`Failed to fetch courses: ${err.message}`);
                setCourses([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, [domain, token]);

    if (isLoading) return <LoadingSpinner />;
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Your Courses</h2>
            <ErrorMessage message={error} />
            {courses.length === 0 && !isLoading && !error && (
                <p className="text-gray-600">No active courses found.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map(course => (
                    <CourseCard key={course.id} course={course} onClick={onSelectCourse} />
                ))}
            </div>
        </div>
    );
}

function CourseDetailPage({ domain, token, courseId, onBack }) {
    const [course, setCourse] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCourseData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const courseData = await apiService.request(`/api/v1/courses/${courseId}`, 'GET', null, domain, token);
            setCourse(courseData);

            // Fetch announcements for this course
            // context_codes[]=course_COURSEID
            const announcementsData = await apiService.request(`/api/v1/announcements?context_codes[]=course_${courseId}`, 'GET', null, domain, token);
            setAnnouncements(announcementsData || []);

        } catch (err) {
            setError(`Failed to fetch course details: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, domain, token]);

    useEffect(() => {
        fetchCourseData();
    }, [fetchCourseData]);
    
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <button
                onClick={onBack}
                className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center transition duration-150"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Courses
            </button>
            <ErrorMessage message={error} />
            {course && (
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{course.name}</h2>
                    <p className="text-gray-600 mb-1">Course Code: {course.course_code}</p>
                    <p className="text-gray-600 mb-6">Term: {course.term?.name || 'N/A'}</p>

                    <h3 className="text-2xl font-semibold text-gray-700 mt-8 mb-4">Recent Announcements</h3>
                    {announcements.length > 0 ? (
                        <ul className="space-y-4">
                            {announcements.slice(0, 5).map(announcement => ( // Show latest 5
                                <li key={announcement.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <h4 className="font-semibold text-indigo-700">{announcement.title}</h4>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Posted: {new Date(announcement.posted_at).toLocaleDateString()}
                                    </p>
                                    <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: announcement.message }} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">No announcements found for this course.</p>
                    )}
                </div>
            )}
        </div>
    );
}


// --- Main App Component ---
export default function App() {
    const [currentView, setCurrentView] = useState('login'); // 'login', 'dashboard', 'courseDetail'
    const [authDetails, setAuthDetails] = useState({ domain: null, token: null });
    const [selectedCourseId, setSelectedCourseId] = useState(null);

    useEffect(() => {
        const savedDomain = localStorage.getItem(LOCAL_STORAGE_KEYS.CANVAS_DOMAIN);
        const savedToken = localStorage.getItem(LOCAL_STORAGE_KEYS.API_TOKEN);
        if (savedDomain && savedToken) {
            setAuthDetails({ domain: savedDomain, token: savedToken });
            setCurrentView('dashboard');
        }
    }, []);

    const handleLoginSuccess = (domain, token) => {
        setAuthDetails({ domain, token });
        setCurrentView('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CANVAS_DOMAIN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.API_TOKEN);
        setAuthDetails({ domain: null, token: null });
        setCurrentView('login');
        setSelectedCourseId(null);
    };

    const handleSelectCourse = (courseId) => {
        setSelectedCourseId(courseId);
        setCurrentView('courseDetail');
    };

    const handleBackToDashboard = () => {
        setSelectedCourseId(null);
        setCurrentView('dashboard');
    };
    
    const renderView = () => {
        switch (currentView) {
            case 'login':
                return <LoginPage onLoginSuccess={handleLoginSuccess} />;
            case 'dashboard':
                if (!authDetails.domain || !authDetails.token) {
                     setCurrentView('login'); // Should not happen if logic is correct
                     return <LoginPage onLoginSuccess={handleLoginSuccess} />;
                }
                return <DashboardPage domain={authDetails.domain} token={authDetails.token} onSelectCourse={handleSelectCourse} />;
            case 'courseDetail':
                 if (!authDetails.domain || !authDetails.token || !selectedCourseId) {
                     setCurrentView('dashboard'); // Go back if something is missing
                     return <DashboardPage domain={authDetails.domain} token={authDetails.token} onSelectCourse={handleSelectCourse} />;
                 }
                return <CourseDetailPage domain={authDetails.domain} token={authDetails.token} courseId={selectedCourseId} onBack={handleBackToDashboard} />;
            default:
                return <LoginPage onLoginSuccess={handleLoginSuccess} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar onLogout={handleLogout} currentView={currentView} setCurrentView={setCurrentView} />
            <main>
                {renderView()}
            </main>
            <footer className="text-center py-8 text-gray-500 text-sm">
                Canvas Lite - Educational Project
            </footer>
        </div>
    );
}

// To make this runnable in a typical Create React App setup, you would have:
// 1. public/index.html with <div id="root"></div> and Tailwind CSS linked.
// 2. src/index.js with ReactDOM.render(<App />, document.getElementById('root'));
