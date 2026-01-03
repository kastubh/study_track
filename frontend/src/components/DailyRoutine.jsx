import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DailyRoutine = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [loading, setLoading] = useState(true);

    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sun(0) to 6, Mon(1) to 0

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tasksRes, timetableRes] = await Promise.all([
                    api.get(`/daily-tasks/?studentId=${user.id}&date=${dateStr}`),
                    api.get(`/timetable/${user.id}`)
                ]);
                setTasks(tasksRes.data);

                // Filter timetable for today
                const todays = timetableRes.data.filter(t => t.dayOfWeek === dayOfWeek);
                setTodaySchedule(todays);

            } catch (error) {
                console.error("Error fetching daily routine", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id, dateStr, dayOfWeek]);

    // Fetch Tech News
    useEffect(() => {
        const fetchNews = async () => {
            try {
                // Using rss2json to convert The Verge RSS to JSON
                const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.theverge.com/rss/index.xml');
                const data = await response.json();

                if (data.status === 'ok') {
                    setNews(data.items.slice(0, 4)); // Top 4 stories
                } else {
                    throw new Error('RSS fetch failed');
                }
            } catch (error) {
                console.error("Error fetching news", error);
                // Fallback news
                setNews([
                    { title: 'New AI Model Shatters Benchmarks', link: '#', pubDate: 'Just now' },
                    { title: 'SpaceX Successful Starship Landing', link: '#', pubDate: '1 hour ago' },
                    { title: 'Quantum Computing Breakthrough Announced', link: '#', pubDate: '2 hours ago' },
                    { title: 'The Future of Web Development in 2026', link: '#', pubDate: '4 hours ago' }
                ]);
            } finally {
                setNewsLoading(false);
            }
        };
        fetchNews();
    }, []);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        try {
            const res = await api.post('/daily-tasks/', {
                studentId: user.id,
                title: newTask,
                date: dateStr
            });
            setTasks([...tasks, { _id: res.data.id, title: newTask, isCompleted: false }]);
            setNewTask('');
        } catch (error) {
            console.error("Error adding task", error);
        }
    };

    const toggleTask = async (taskId) => {
        try {
            const res = await api.patch(`/daily-tasks/${taskId}`);
            setTasks(tasks.map(t =>
                t._id === taskId ? { ...t, isCompleted: res.data.isCompleted } : t
            ));
        } catch (error) {
            console.error("Error toggling task", error);
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`/daily-tasks/${taskId}`);
            setTasks(tasks.filter(t => t._id !== taskId));
        } catch (error) {
            console.error("Error deleting task", error);
        }
    };

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    if (loading) return <div>Loading Routine...</div>;

    return (
        <div className="space-y-6">
            {/* Top Section: Schedule & Tasks */}
            <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 transition-colors duration-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">Today's Routine ({dateStr})</h3>

                <div className="md:grid md:grid-cols-2 md:gap-6">
                    {/* Left: Schedule */}
                    <div className="mb-6 md:mb-0">
                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</h4>
                        {todaySchedule.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No classes scheduled for today.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {todaySchedule.map(item => (
                                    <li key={item._id} className="py-2 flex justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.subjectId}</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{item.plannedHours} hrs</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Right: Tasks */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Daily Tasks</h4>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 dark:text-indigo-200 bg-indigo-200 dark:bg-indigo-900/50">
                                {Math.round(progress)}% Done
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                            <div className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>

                        <form onSubmit={handleAddTask} className="flex mb-4">
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="Add a task..."
                                className="flex-grow shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-l-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                            >
                                Add
                            </button>
                        </form>

                        <ul className="space-y-2">
                            {tasks.map(task => (
                                <li key={task._id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-transparent dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={task.isCompleted}
                                            onChange={() => toggleTask(task._id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className={`ml-2 text-sm ${task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-200'}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <button onClick={() => deleteTask(task._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Tech Check (News) */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-bold text-white flex items-center">
                        <span className="mr-2">⚡</span> Tech Check
                    </h3>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Powered by The Verge</span>
                </div>

                {newsLoading ? (
                    <div className="flex space-x-4 animate-pulse">
                        <div className="h-24 bg-gray-700 rounded w-1/4"></div>
                        <div className="h-24 bg-gray-700 rounded w-1/4"></div>
                        <div className="h-24 bg-gray-700 rounded w-1/4"></div>
                        <div className="h-24 bg-gray-700 rounded w-1/4"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {news.map((item, idx) => (
                            <a
                                key={idx}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg p-4 border border-gray-700 group h-full flex flex-col justify-between"
                            >
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 text-gray-100 group-hover:text-indigo-400 line-clamp-2">
                                        {item.title}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: item.description.replace(/<[^>]*>?/gm, '') }}></p>
                                    )}
                                </div>
                                <div className="text-xs text-indigo-400 font-medium mt-2 flex items-center">
                                    Read Article <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyRoutine;
