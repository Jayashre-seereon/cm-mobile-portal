const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle assessment HTML as source text so WebView can load it inline in APKs.
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'html');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'html'];
config.transformer.babelTransformerPath = require.resolve('./transformers/htmlTransformer');

module.exports = withNativeWind(config, {
  input: './global.css',
});
