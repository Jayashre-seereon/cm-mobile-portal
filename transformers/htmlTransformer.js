const upstreamTransformer = require('../node_modules/expo/node_modules/@expo/metro-config/build/babel-transformer');

module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.html')) {
    const escapedHtml = JSON.stringify(src);
    return upstreamTransformer.transform({
      src: `module.exports = ${escapedHtml};`,
      filename: `${filename}.js`,
      options,
    });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
