module.exports = ({ config }) => {
  const mapsApiKey = process.env.MAPS_API_KEY || '';

  return {
    ...config,

    android: {
      ...config.android,

      config: {
        ...config.android?.config,

        googleMaps: {
          apiKey: mapsApiKey,
        },
      },
    },

    plugins: [
      ...(config.plugins || []),
      [
        "react-native-maps",
        {
          "androidGoogleMapsApiKey": mapsApiKey
        }
      ]
    ],
  };
};