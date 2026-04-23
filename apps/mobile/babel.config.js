module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    // `react-native-worklets/plugin` powers Reanimated 4 worklets.
    // It MUST be listed last so it can transform the output of every
    // other plugin/preset.
    plugins: ["react-native-worklets/plugin"],
  };
};
