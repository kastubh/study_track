import React, { useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

const Wizard = ({ onClose }) => {
    const { user, updateUser } = useAuth();
    const { theme } = useTheme();
    const [run, setRun] = useState(true);

    const steps = [
        {
            target: 'body',
            content: (
                <div>
                    <h3 className="text-xl font-bold mb-2">Welcome to StudyTrack! 👋</h3>
                    <p>Let's take a quick tour of your new productivity companion.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#nav-dashboard-link',
            content: 'This is your Dashboard. Check your weekly timetable and progress here.',
        },
        {
            target: '#nav-logs-link',
            content: 'Log your daily study sessions and tasks here to keep track of your hard work.',
        },
        {
            target: '#tab-daily-routine',
            content: 'View your daily routine here. 📅',
        },
        {
            target: '#tab-weekly-progress',
            content: 'Track your weekly performance and stats. 📊',
        },
        {
            target: '#tab-daily-progress',
            content: 'See how you performed today. 📈',
        },
        {
            target: '#tab-update-log',
            content: 'Quickly add a new study log entry. 📝',
        },
        {
            target: '#tab-timetable',
            content: 'Access your full weekly timetable. 🕒',
        },
        {
            target: '#tab-tech-check',
            content: 'Stay updated with the latest tech news and trends!',
        },
        {
            target: '#nav-theme-toggle',
            content: 'Toggle between Light and Dark mode to suit your study environment. 🌙',
        },
        {
            target: 'button[title="Start Tour"]',
            content: 'Need a refresher? Click this icon anytime to restart the tour.',
        }
    ];

    const handleJoyrideCallback = async (data) => {
        const { status, type } = data;

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRun(false);
            onClose();

            // Only update backend if it wasn't already seen (to avoid unnecessary calls if just re-playing)
            if (!user.hasSeenWizard) {
                try {
                    await api.put('/auth/update-wizard', { hasSeenWizard: true });
                    updateUser({ ...user, hasSeenWizard: true });
                } catch (error) {
                    console.error("Failed to update wizard status", error);
                }
            }
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            token="e2e-tour"
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: theme === 'dark' ? '#1f2937' : '#fff',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    primaryColor: '#4f46e5',
                    textColor: theme === 'dark' ? '#fff' : '#333',
                    zIndex: 1000,
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#4f46e5',
                },
                buttonBack: {
                    color: theme === 'dark' ? '#fff' : '#333',
                }
            }}
        />
    );
};

export default Wizard;
