import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { resolveApiUrl } from './resolveApiUrl';

const DEFAULT_API_URL = 'https://inhalex-backend.onrender.com/api';

const api = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL, {
  isDevelopment: __DEV__,
  platform: Platform.OS,
  isExpoClient: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  hostUri: __DEV__ && Platform.OS === 'android' ? Constants.expoConfig?.hostUri : null,
});

export const environment = {
  ...api,
  requestTimeoutMs: 15_000,
} as const;
