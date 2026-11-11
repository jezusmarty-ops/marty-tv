const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = {
  resolver: {
    // permite importar legendas (.vtt/.srt) e fontes locais
    assetExts: getDefaultConfig(__dirname).resolver.assetExts.concat([
      'vtt',
      'srt',
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
