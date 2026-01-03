import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Helper to get dates for a specific week based on a reference date
const getWeekDates = (referenceDate) => {
    const now = new Date(referenceDate);
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to get Monday (if day is 0/Sunday, go back 6 days)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(now).setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        week.push(date);
    }
    return week;
};

const Timetable = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [timetable, setTimetable] = useState([]);

    // State for the currently viewed week
    const [currentDate, setCurrentDate] = useState(new Date());

    const [formData, setFormData] = useState({
        subjectId: '',
        dayOfWeek: '0', // Default Monday
        plannedHours: '',
        startDate: '',
        endDate: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showResetModal, setShowResetModal] = useState(false); // Modal State

    const days = [
        { id: 0, name: 'Monday' },
        { id: 1, name: 'Tuesday' },
        { id: 2, name: 'Wednesday' },
        { id: 3, name: 'Thursday' },
        { id: 4, name: 'Friday' },
        { id: 5, name: 'Saturday' },
        { id: 6, name: 'Sunday' },
    ];

    // Calculate dates for the currently selected week
    const weekDates = getWeekDates(currentDate);

    // Format date for API (YYYY-MM-DD)
    const formatDateForApi = (date) => {
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (user?.id) {
            fetchTimetable();
        }
    }, [user?.id, currentDate]); // Re-fetch when user or date changes

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            // Pass the current reference date to get stats for that specific week
            const dateStr = formatDateForApi(currentDate);
            const res = await api.get(`/timetable/${user.id}?date=${dateStr}`);
            setTimetable(res.data);
        } catch (err) {
            console.error("Failed to fetch timetable", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleReset = async () => {
        setLoading(true);
        setShowResetModal(false);
        try {
            await api.delete(`/timetable/?studentId=${user.id}`);
            setSuccess('Timetable plan reset successfully.');
            setTimeout(() => setSuccess(''), 3000);
            fetchTimetable();
        } catch (err) {
            console.error("Failed to reset timetable", err);
            setError('Failed to reset timetable.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await api.post('/timetable/', {
                studentId: user.id,
                subjectId: formData.subjectId,
                dayOfWeek: parseInt(formData.dayOfWeek),
                plannedHours: parseFloat(formData.plannedHours),
                startDate: formData.startDate || null,
                endDate: formData.endDate || null
            });
            setSuccess('Timetable updated successfully!');
            fetchTimetable();
            setFormData({ ...formData, plannedHours: '', startDate: '', endDate: '' });
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update timetable. Please try again.');
            console.error(err);
        }
    };

    // Week Navigation Handlers
    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToCurrentWeek = () => {
        setCurrentDate(new Date());
    };

    // Group timetable entries by dayOfWeek
    const getEntriesForDay = (dayIndex) => {
        return timetable.filter(t => t.dayOfWeek === dayIndex);
    };

    // Calculate Week Range Label
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const weekRangeLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (loading && !timetable.length) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            {/* Header with Navigation */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Weekly Schedule</h1>
                    <p className="text-sm text-gray-500">Plan and track your progress</p>
                </div>

                {/* Week Slider Controls */}
                <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <button
                        onClick={goToPreviousWeek}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-full text-gray-600 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div className="text-center min-w-[150px]">
                        <span className="block text-sm font-semibold text-gray-900">{weekRangeLabel}</span>
                        <button onClick={goToCurrentWeek} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            Jump to Today
                        </button>
                    </div>

                    <button
                        onClick={goToNextWeek}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-full text-gray-600 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="text-gray-500 hover:text-gray-900 text-sm hidden md:block"
                >
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100 sticky top-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </span>
                            Edit Plan
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Set a recurring plan. Optional: Add start/end dates to validitiy.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* ... Form Inputs (Existing) ... */}
                            <div>
                                <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    name="subjectId"
                                    id="subjectId"
                                    required
                                    value={formData.subjectId}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="e.g. Physics"
                                />
                            </div>

                            <div>
                                <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                                <select
                                    id="dayOfWeek"
                                    name="dayOfWeek"
                                    value={formData.dayOfWeek}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                >
                                    {days.map(day => (
                                        <option key={day.id} value={day.id}>{day.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="plannedHours" className="block text-sm font-medium text-gray-700 mb-1">Planned Hours</label>
                                <input
                                    type="number"
                                    name="plannedHours"
                                    id="plannedHours"
                                    required
                                    min="0.5"
                                    step="0.5"
                                    value={formData.plannedHours}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="2.0"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-500 mb-1">Start Date (Opt)</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        id="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-500 mb-1">End Date (Opt)</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        id="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
                            {success && <div className="text-green-500 text-sm bg-green-50 p-2 rounded">{success}</div>}

                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Update Schedule
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowResetModal(true)}
                                className="w-full flex justify-center py-2 px-4 border border-red-200 rounded-lg shadow-sm text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Reset All Plans
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Timetable List */}
                <div className="lg:col-span-2 space-y-6 relative">
                    {/* Loading Overlay if needed */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}

                    {weekDates.map((date, index) => {
                        const dayEntries = getEntriesForDay(index); // index matches dayOfWeek (0-6)
                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                            <div key={index} className={`rounded-xl border ${isToday ? 'border-indigo-200 shadow-md ring-1 ring-indigo-100 bg-indigo-50/30' : 'border-gray-200 bg-white shadow-sm'} overflow-hidden transition-all hover:shadow-md`}>
                                {/* Day Header */}
                                <div className={`px-6 py-4 border-b ${isToday ? 'border-indigo-100 bg-indigo-50' : 'border-gray-100 bg-gray-50/50'} flex justify-between items-center`}>
                                    <div>
                                        <h3 className={`text-lg font-bold ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                        </h3>
                                        <p className={`text-sm ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                                            {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    {dayEntries.length === 0 && (
                                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                            No classes planned
                                        </span>
                                    )}
                                </div>

                                {/* Subjects List */}
                                <div className="p-4 space-y-3">
                                    {dayEntries.length > 0 ? (
                                        dayEntries.map((entry) => {
                                            // Calculate progress
                                            const progress = Math.min((entry.actualHours / entry.plannedHours) * 100, 100);
                                            const isComplete = progress >= 100;

                                            // Formatting
                                            // Handle potentially undefined or string values robustly
                                            const actual = parseFloat(entry.actualHours || 0);
                                            const planned = parseFloat(entry.plannedHours || 0);

                                            // Check validity range to show info
                                            const rangeInfo = (entry.startDate || entry.endDate)
                                                ? `(Valid: ${entry.startDate || '...'} to ${entry.endDate || '...'})`
                                                : '';

                                            return (
                                                <div key={entry._id || `${index}-${entry.subjectId}`} className="flex flex-col sm:flex-row sm:items-center bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                                                    {/* Subject Info */}
                                                    <div className="flex-1 mb-2 sm:mb-0">
                                                        <h4 className="text-base font-semibold text-gray-800">
                                                            {entry.subjectId}
                                                            {rangeInfo && <span className="block text-xs text-gray-400 font-normal">{rangeInfo}</span>}
                                                        </h4>
                                                    </div>

                                                    {/* Stats & Progress */}
                                                    <div className="flex-1 flex flex-col sm:items-end space-y-2">
                                                        <div className="flex items-center space-x-4 text-sm">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-gray-500 text-xs uppercase tracking-wide">Actual</span>
                                                                <span className={`font-bold ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>{actual}h</span>
                                                            </div>
                                                            <div className="h-8 w-px bg-gray-200"></div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-gray-500 text-xs uppercase tracking-wide">Planned</span>
                                                                <span className="font-bold text-gray-900">{planned}h</span>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="w-full sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-gray-400 text-sm italic">
                                            Enjoy your free time!
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Timetable Plan?</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Are you sure you want to reset your entire plan? <br />
                            <span className="font-semibold text-red-600">This will delete all saved schedules locally.</span>
                            <br />This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                            >
                                Yes, Reset Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timetable;
