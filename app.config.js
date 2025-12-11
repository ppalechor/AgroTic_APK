export default ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    android: {
      ...(config.android || {}),
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: { apiKey }
      }
    },
    ios: {
      ...(config.ios || {}),
      config: {
        ...((config.ios && config.ios.config) || {}),
        googleMapsApiKey: apiKey
      }
    }
  };
};
