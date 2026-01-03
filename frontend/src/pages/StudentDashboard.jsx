import React, { useState, useEffect } from 'react';
import DailyRoutine from '../components/DailyRoutine';
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
                const [wStats, dStats] = await Promise.all([
                    api.get(`/stats/${user.id}?period=weekly&date=${selectedWeeklyDate}`),
                    api.get(`/stats/${user.id}?period=daily&date=${selectedDate}`)
                ]);
                setWeeklyStats(wStats.data);
                setDailyStats(dStats.data);
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user.id, activeTab, selectedDate, selectedWeeklyDate]); // Refresh when any dependency changes

    const handleLogSubmit = async (e) => {
        e.preventDefault();
        setLogStatus({ type: '', msg: '' });
        try {
            await api.post('/logs/', {
                studentId: user.id,
                ...logData,
                hoursSpent: parseFloat(logData.hoursSpent)
            });
            setLogStatus({ type: 'success', msg: 'Log added successfully!' });
            setLogData({ subjectId: '', hoursSpent: '', date: new Date().toISOString().split('T')[0], notes: '' });

            // Trigger refresh (optional, but good practice if we want immediate feedback without refetching everything)
            setDailyStats(null); // Force loading state/refresh effectively on next render cycle if we triggered it
            // actually, the simplest way to refresh is to just update a trigger or recall fetchStats.
            // For now, user can click refresh or tab.
        } catch (error) {
            setLogStatus({ type: 'error', msg: 'Failed to add log.' });
            console.error(error);
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
        { id: 'daily_routine', label: 'Daily Routine' },
        { id: 'weekly_progress', label: 'Weekly Progress' },
        { id: 'daily_progress', label: 'Daily Progress' },
        { id: 'update_log', label: 'Update Log' },
        { id: 'timetable', label: 'My Timetable' },
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
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {tab.label}
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
                    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto animate-fade-in">
                        <h3 className="text-xl font-medium text-gray-900 mb-6">Log Study Session</h3>
                        <form onSubmit={handleLogSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={logData.subjectId}
                                    onChange={e => setLogData({ ...logData, subjectId: e.target.value })}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                    placeholder="e.g., Math"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={logData.date}
                                        onChange={e => setLogData({ ...logData, date: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hours Spent</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        required
                                        value={logData.hoursSpent}
                                        onChange={e => setLogData({ ...logData, hoursSpent: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                        placeholder="1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={logData.notes}
                                    onChange={e => setLogData({ ...logData, notes: e.target.value })}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                    placeholder="What did you study?"
                                />
                            </div>
                            {logStatus.msg && (
                                <div className={`p-3 rounded text-sm ${logStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {logStatus.msg}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Save Entry
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowResetLogsModal(true)}
                                type="button"
                                className="w-full flex justify-center py-2 px-4 border border-red-200 rounded-lg shadow-sm text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Reset All Logs
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
        </div >
    );
};

export default StudentDashboard;
