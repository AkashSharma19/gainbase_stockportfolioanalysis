import Constants from 'expo-constants';

// Safe check to inspect ExpoUpdates module without native crashing
function getExpoUpdatesModule(): any {
  try {
    const isNativeModuleRegistered = Boolean(
      typeof globalThis !== 'undefined' &&
      ((globalThis as any).expo?.modules?.ExpoUpdates || (globalThis as any).ExpoModules?.ExpoUpdates)
    );

    if (!isNativeModuleRegistered) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates');
  } catch {
    return null;
  }
}

export interface AppVersionInfo {
  version: string;
  buildNumber: string;
  channel: string;
  runtimeVersion: string;
  otaUpdateId: string | null;
  isOtaActive: boolean;
  createdAt: string | null;
  formattedString: string;
}

export function getAppVersionInfo(): AppVersionInfo {
  const version =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    '1.0.0';

  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  const androidCode = Constants.expoConfig?.android?.versionCode;
  const nativeBuild = Constants.nativeBuildVersion;
  const buildNumber = iosBuild || (androidCode ? String(androidCode) : null) || nativeBuild || '1';

  let channel = 'Production';
  let otaUpdateId: string | null = null;
  let isOtaActive = false;
  let createdAt: string | null = null;
  let runtimeVersion = typeof Constants.expoConfig?.runtimeVersion === 'string'
    ? Constants.expoConfig.runtimeVersion
    : version;

  try {
    const Updates = getExpoUpdatesModule();
    if (Updates && Updates.isEnabled) {
      channel = Updates.channel || 'Production';
      runtimeVersion = Updates.runtimeVersion || runtimeVersion;
      if (Updates.updateId) {
        otaUpdateId = Updates.updateId;
        isOtaActive = !Updates.isEmbeddedLaunch;
      }
      if (Updates.createdAt) {
        createdAt = new Date(Updates.createdAt).toISOString();
      }
    }
  } catch {
    // Fallback to defaults
  }

  const shortOtaId = otaUpdateId ? otaUpdateId.slice(0, 7) : null;
  const formattedString = isOtaActive && shortOtaId
    ? `v${version} (${buildNumber}) • OTA #${shortOtaId}`
    : `v${version} (${buildNumber})`;

  return {
    version,
    buildNumber,
    channel,
    runtimeVersion,
    otaUpdateId,
    isOtaActive,
    createdAt,
    formattedString,
  };
}
