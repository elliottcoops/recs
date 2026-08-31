module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind exports a Babel *preset*, not a plugin. It also includes the
    // required worklets transform for Reanimated 4 / Gorhom Bottom Sheet.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
