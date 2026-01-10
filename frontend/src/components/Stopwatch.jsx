import React, { useState, useEffect, useRef } from 'react';

const Stopwatch = ({ onStop, onTimeUpdate, subject, subjects, onSubjectChange }) => {
    const [time, setTime] = useState(0); // time in seconds
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const countRef = useRef(null);

    const handleStart = () => {
        if (!subject) return;
        setIsActive(true);
        setIsPaused(false);
        countRef.current = setInterval(() => {
            setTime((time) => time + 1);
        }, 1000);
    };

    const handlePause = () => {
        clearInterval(countRef.current);
        setIsPaused(true);
    };

    const handleResume = () => {
        setIsPaused(false);
        countRef.current = setInterval(() => {
            setTime((time) => time + 1);
        }, 1000);
    };

    const handleStop = () => {
        clearInterval(countRef.current);
        const hoursSpent = (time / 3600).toFixed(2);
        onStop(parseFloat(hoursSpent));
        setIsActive(false);
        setIsPaused(false);
        setTime(0);
    };

    useEffect(() => {
        if (onTimeUpdate) {
            onTimeUpdate(time);
        }
    }, [time, onTimeUpdate]);

    useEffect(() => {
        return () => clearInterval(countRef.current);
    }, []);

    const formatTime = () => {
        const getSeconds = `0${(time % 60)}`.slice(-2);
        const minutes = `${Math.floor(time / 60)}`;
        const getMinutes = `0${minutes % 60}`.slice(-2);
        const getHours = `0${Math.floor(time / 3600)}`.slice(-2);

        return `${getHours}:${getMinutes}:${getSeconds}`;
    };

    return (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
            <div className="text-center mb-6">
                {!isActive ? (
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-2">
                            Select Subject to Start
                        </label>
                        <input
                            list="stopwatch-subjects"
                            type="text"
                            value={subject}
                            onChange={(e) => onSubjectChange(e.target.value)}
                            className="block w-full text-center border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                            placeholder="e.g., Math, Science..."
                        />
                        <datalist id="stopwatch-subjects">
                            {subjects?.map((sub, i) => (
                                <option key={i} value={sub} />
                            ))}
                        </datalist>
                    </div>
                ) : (
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center justify-center">
                        <span className="flex h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                        Studying: {subject}
                    </div>
                )}
                <span className="text-5xl font-mono font-bold text-gray-800 dark:text-gray-100 tracking-tighter">
                    {formatTime()}
                </span>
            </div>

            <div className="flex justify-center space-x-3">
                {!isActive ? (
                    <button
                        onClick={handleStart}
                        disabled={!subject}
                        type="button"
                        className={`w-full max-w-xs py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center transform active:scale-95 ${!subject
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                            }`}
                    >
                        <span className="mr-2 text-lg">🚀</span> Start Study Session
                    </button>
                ) : (
                    <>
                        {isPaused ? (
                            <button
                                onClick={handleResume}
                                type="button"
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all transform active:scale-95 flex items-center justify-center"
                            >
                                <span className="mr-2">▶</span> Resume
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                type="button"
                                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold transition-all transform active:scale-95 flex items-center justify-center"
                            >
                                <span className="mr-2">⏸</span> Pause
                            </button>
                        )}
                        <button
                            onClick={handleStop}
                            type="button"
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all transform active:scale-95 flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none"
                        >
                            <span className="mr-2">⏹</span> Stop & Log
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Stopwatch;
