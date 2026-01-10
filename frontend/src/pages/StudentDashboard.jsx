import React, { useState, useEffect } from 'react';
import DailyRoutine from '../components/DailyRoutine';
import Stopwatch from '../components/Stopwatch';
import Timetable from './Timetable';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const StudentDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('daily_routine');
    const [weeklyStats, setWeeklyStats] = useState(null);
    const [dailyStats, setDailyStats] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Log Form State
    const [logData, setLogData] = useState({
        subjectId: '',
        hoursSpent: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [logStatus, setLogStatus] = useState({ type: '', msg: '' });
    const [showResetLogsModal, setShowResetLogsModal] = useState(false);
    const [excessiveStudyInfo, setExcessiveStudyInfo] = useState(null); // {subject, planned, actual}

    const handleResetLogs = async () => {
        setLoading(true);
        setShowResetLogsModal(false);
        try {
            await api.delete(`/logs/?studentId=${user.id}`);
            setLogStatus({ type: 'success', msg: 'All logs reset successfully.' });
            // Refresh stats to show 0
            setDailyStats(null);
            setWeeklyStats(null);
        } catch (err) {
            console.error("Failed to reset logs", err);
            setLogStatus({ type: 'error', msg: 'Failed to reset logs.' });
        } finally {
            setLoading(false);
        }
    };

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedWeeklyDate, setSelectedWeeklyDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch weekly stats (specific week containing selectedWeeklyDate) and daily stats (specific date)
                const [wStats, dStats, timetableRes] = await Promise.all([
                    api.get(`/stats/${user.id}?period=weekly&date=${selectedWeeklyDate}`),
                    api.get(`/stats/${user.id}?period=daily&date=${selectedDate}`),
                    api.get(`/timetable/${user.id}`)
                ]);
                setWeeklyStats(wStats.data);
                setDailyStats(dStats.data);

                // Extract unique subjects from timetable
                const subjects = [...new Set(timetableRes.data.map(t => t.subjectId))];
                setAvailableSubjects(subjects);

            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user.id, activeTab, selectedDate, selectedWeeklyDate]); // Refresh when any dependency changes

    const handleLogSubmit = async (e) => {
        if (e) e.preventDefault();
        setLogStatus({ type: '', msg: '' });
        try {
            await api.post('/logs/', {
                studentId: user.id,
                ...logData,
                hoursSpent: parseFloat(logData.hoursSpent)
            });
            setLogStatus({ type: 'success', msg: 'Log added successfully!' });
            setLogData({ subjectId: '', hoursSpent: '', date: new Date().toISOString().split('T')[0], notes: '' });

            // Trigger refresh
            setDailyStats(null);
        } catch (error) {
            setLogStatus({ type: 'error', msg: 'Failed to add log.' });
            console.error(error);
        }
    };

    const handleStopwatchFinish = async (hours) => {
        if (!logData.subjectId) {
            setLogStatus({ type: 'error', msg: 'Please select or enter a subject first.' });
            return;
        }

        const newHoursSpent = hours;

        // Find subject stats from today
        const subjectStats = dailyStats?.subjectBreakdown?.find(
            s => s.subjectId.toLowerCase() === logData.subjectId.toLowerCase()
        );

        if (subjectStats && subjectStats.planned > 0) {
            const totalActual = (subjectStats.hours || 0) + newHoursSpent;
            if (totalActual > subjectStats.planned) {
                setExcessiveStudyInfo({
                    subject: logData.subjectId,
                    planned: subjectStats.planned,
                    actual: totalActual
                });
            }
        }

        // Auto submit
        console.log("Starting auto-log for:", logData.subjectId, "Hours:", newHoursSpent);

        if (!user || !user.id) {
            setLogStatus({ type: 'error', msg: 'User session missing. Please log in again.' });
            return;
        }

        try {
            const payload = {
                studentId: user.id,
                subjectId: logData.subjectId,
                date: logData.date || new Date().toISOString().split('T')[0],
                hoursSpent: newHoursSpent,
                notes: logData.notes || 'Auto-logged via stopwatch'
            };

            console.log("Sending auto-log payload:", payload);
            const response = await api.post('/logs/', payload);
            console.log("Auto-log success:", response.data);

            setLogStatus({ type: 'success', msg: `Logged ${newHoursSpent} hours for ${logData.subjectId}!` });
            setDailyStats(null);
        } catch (error) {
            console.error("Auto-log request failed:", error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown server error';
            setLogStatus({ type: 'error', msg: `Failed to auto-log: ${errorMsg}` });
        }
    };

    const getChartData = (statsData, labelColor) => ({
        labels: statsData?.subjectBreakdown?.map(s => s.subjectId) || [],
        datasets: [
            {
                label: 'Planned Hours',
                data: statsData?.subjectBreakdown?.map(s => s.planned) || [],
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
                label: 'Actual Hours',
                data: statsData?.subjectBreakdown?.map(s => s.hours) || [],
                backgroundColor: labelColor || 'rgba(75, 192, 192, 0.5)',
            },
        ],
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const tabs = [
        { id: 'daily_routine', label: 'Daily Routine', icon: '📅' },
        { id: 'weekly_progress', label: 'Weekly Progress', icon: '📊' },
        { id: 'daily_progress', label: 'Daily Progress', icon: '📈' },
        { id: 'update_log', label: 'Update Log', icon: '📝' },
        { id: 'timetable', label: 'My Timetable', icon: '🕒' },
    ];

    // Helper to get week range label
    const getWeekRangeLabel = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const startOfWeek = new Date(date.setDate(diff));
        const endOfWeek = new Date(date.setDate(startOfWeek.getDate() + 6));

        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user?.name || 'Student'}</span>
                </h1>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 transition-colors duration-200">
                <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id.replace('_', '-')}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-2
                                ${activeTab === tab.id
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {tab.icon && <span>{tab.icon}</span>}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="transition-all duration-300">
                {activeTab === 'daily_routine' && (
                    <div className="space-y-4 animate-fade-in">
                        <DailyRoutine />
                    </div>
                )}

                {activeTab === 'weekly_progress' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in transition-colors duration-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <div>
                                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Weekly Performance</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{getWeekRangeLabel(selectedWeeklyDate)}</p>
                            </div>
                            <div className="mt-2 md:mt-0 flex items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                                <span className="text-sm text-gray-500 dark:text-gray-300 mr-2 font-medium">Select Week (by Date):</span>
                                <input
                                    type="date"
                                    value={selectedWeeklyDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setWeeklyStats(null);
                                        setSelectedWeeklyDate(e.target.value);
                                    }}
                                    className="bg-white dark:bg-gray-600 border-none rounded text-sm focus:ring-0 text-gray-700 dark:text-gray-200 font-semibold cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="h-80">
                            {weeklyStats ? (
                                <Bar
                                    data={getChartData(weeklyStats, 'rgba(75, 192, 192, 0.6)')}
                                    options={{ maintainAspectRatio: false, responsive: true }}
                                />
                            ) : <div className="flex h-full items-center justify-center text-gray-400">Loading weekly data...</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'daily_progress' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in transition-colors duration-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Daily Performance</h3>
                            <div className="mt-2 md:mt-0 flex items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                                <span className="text-sm text-gray-500 dark:text-gray-300 mr-2 font-medium">Viewing Date:</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setDailyStats(null); // Clear old stats to show loading/change
                                        setSelectedDate(e.target.value);
                                    }}
                                    className="bg-white dark:bg-gray-600 border-none rounded text-sm focus:ring-0 text-gray-700 dark:text-gray-200 font-semibold cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Summary Cards */}
                        {!dailyStats ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading data for {selectedDate}...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 transition-transform hover:scale-[1.01]">
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Planned Hours</p>
                                    <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{dailyStats?.plannedHours || 0}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800 transition-transform hover:scale-[1.01]">
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Actual Hours</p>
                                    <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-100">{dailyStats?.totalHours || 0}</p>
                                </div>
                            </div>
                        )}

                        <div className="h-80">
                            {dailyStats ? (
                                <Bar
                                    data={getChartData(dailyStats, 'rgba(255, 159, 64, 0.6)')}
                                    options={{
                                        maintainAspectRatio: false,
                                        responsive: true,
                                        plugins: {
                                            legend: {
                                                labels: {
                                                    color: '#9CA3AF' // gray-400 for better visibility in dark/light
                                                }
                                            }
                                        },
                                        scales: {
                                            x: {
                                                ticks: { color: '#9CA3AF' },
                                                grid: { color: 'rgba(156, 163, 175, 0.1)' }
                                            },
                                            y: {
                                                ticks: { color: '#9CA3AF' },
                                                grid: { color: 'rgba(156, 163, 175, 0.1)' }
                                            }
                                        }
                                    }}
                                />
                            ) : <p className="text-gray-500 dark:text-gray-400">No data available for this date.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'update_log' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl mx-auto animate-fade-in transition-colors duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Study Tracker</h3>
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full font-semibold">
                                Live Tracking & Manual Logs
                            </span>
                        </div>

                        {/* Integrated Stopwatch Component */}
                        <div className="mb-8">
                            <Stopwatch
                                onStop={handleStopwatchFinish}
                                subject={logData.subjectId}
                                subjects={availableSubjects}
                                onSubjectChange={(val) => setLogData({ ...logData, subjectId: val })}
                            />
                        </div>

                        <div className="relative mb-8 text-center">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 bg-white dark:bg-gray-800 text-xs text-gray-400 font-bold uppercase tracking-widest transition-colors">or Enter Manually</span>
                            </div>
                        </div>

                        <form onSubmit={handleLogSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                                <input
                                    list="manual-subjects-list"
                                    type="text"
                                    required
                                    value={logData.subjectId}
                                    onChange={e => setLogData({ ...logData, subjectId: e.target.value })}
                                    className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="e.g., Math"
                                />
                                <datalist id="manual-subjects-list">
                                    {availableSubjects.map((sub, i) => (
                                        <option key={i} value={sub} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={logData.date}
                                        onChange={e => setLogData({ ...logData, date: e.target.value })}
                                        className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours Spent</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={logData.hoursSpent}
                                        onChange={e => setLogData({ ...logData, hoursSpent: e.target.value })}
                                        className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="e.g., 1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={logData.notes}
                                    onChange={e => setLogData({ ...logData, notes: e.target.value })}
                                    className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="What did you study?"
                                />
                            </div>
                            {logStatus.msg && (
                                <div className={`p-3 rounded-lg text-sm font-medium ${logStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                    {logStatus.msg}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform active:scale-95"
                            >
                                Save Manual Entry
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setShowResetLogsModal(true)}
                                type="button"
                                className="w-full flex justify-center py-2 px-4 border border-red-200 dark:border-red-900/50 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                Reset Study History
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="animate-fade-in">
                        <Timetable />
                    </div>
                )}
            </div>

            {activeTab === 'tech_check' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Tech Check 📰</h3>
                    <div className="space-y-4">
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">Latest in AI</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                Keeping up with the rapid advancements in Artificial Intelligence is crucial.
                                Check out the latest models and tools transforming the industry.
                            </p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">Web Dev Trends 2026</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                From signals to server components, explore what's new in the web development ecosystem this year.
                            </p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">Cybersecurity Tips</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                Stay safe online with these essential security practices for developers and students alike.
                            </p>
                        </div>
                    </div>
                </div>
            )}



            {/* Reset Logs Confirmation Modal */}
            {
                showResetLogsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Study Logs?</h3>
                            <p className="text-gray-600 mb-6 text-sm">
                                Are you sure you want to reset all your study history? <br />
                                <span className="font-semibold text-red-600">This will delete all actual hours logged.</span>
                                <br />This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowResetLogsModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResetLogs}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                                >
                                    Yes, Reset Logs
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Excessive Study Notification Modal */}
            {
                excessiveStudyInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in transition-colors duration-200 border-2 border-yellow-400">
                            <div className="flex items-center space-x-3 mb-4">
                                <span className="text-3xl">⚠️</span>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Study Goal Exceeded!</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                You've surpassed your planned hours for <span className="font-bold text-indigo-600 dark:text-indigo-400">{excessiveStudyInfo.subject}</span>.
                                <br /><br />
                                📅 <span className="font-medium">Planned:</span> {excessiveStudyInfo.planned} hrs <br />
                                📈 <span className="font-medium text-red-500">Actual:</span> {excessiveStudyInfo.actual.toFixed(2)} hrs
                                <br /><br />
                                Great job on the extra effort, but remember to take breaks!
                            </p>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setExcessiveStudyInfo(null)}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-md"
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StudentDashboard;
