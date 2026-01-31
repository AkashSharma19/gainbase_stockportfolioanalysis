import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { DataExportService } from '../services/DataExportService';

export const BACKGROUND_FETCH_TASK = 'BACKGROUND_DATA_BACKUP';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
        const success = await DataExportService.exportData();
        return success
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (error) {
        console.error('[BackgroundFetch] Task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export const registerBackgroundFetchAsync = async () => {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
        if (isRegistered) {
            console.log(`[BackgroundFetch] Task ${BACKGROUND_FETCH_TASK} is already registered.`);
            return;
        }

        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60 * 60 * 24, // 24 hours
            stopOnTerminate: false, // Continue even if app is terminated (best effort)
            startOnBoot: true, // Restart on boot
        });
        console.log(`[BackgroundFetch] Task ${BACKGROUND_FETCH_TASK} registered.`);
    } catch (err) {
        console.error(`[BackgroundFetch] Task Register failed:`, err);
    }
};

export const unregisterBackgroundFetchAsync = async () => {
    try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log(`[BackgroundFetch] Task ${BACKGROUND_FETCH_TASK} unregistered.`);
    } catch (err) {
        console.error(`[BackgroundFetch] Task Unregister failed:`, err);
    }
};
