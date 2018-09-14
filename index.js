const path = require('path');
const fs = require('fs');
const clone = require('clone');
const packingGlob = require('packing-glob');

function CopySsrPlugin({ sourcePath, destPath }) {
  this.sourcePath = sourcePath;
  this.destPath = destPath;
}

CopySsrPlugin.prototype.apply = function(compiler) {
  const { sourcePath, destPath } = this;
  compiler.plugin('done', function() {
    fs.createReadStream(sourcePath)
      .pipe(fs.createWriteStream(destPath));
  });
};

const filterPlugin = excludePlugins => plugin => (
  excludePlugins.indexOf(plugin.constructor.name) < 0
);

const globEntries = (ssrEntryFileName, ssrEntryCwd) => {
  const entryPattern = `**/${ssrEntryFileName}`;
  const cwd = path.resolve(ssrEntryCwd);
  const ssrEntries = packingGlob(entryPattern, { cwd }).map((page) => (`./${page}`));
  return ssrEntries;
};

const handleCfg = (appConfig, webpackConfig) => {
  const customCfg = appConfig.ssr || {};
  return Object.assign({
    entry: './src/pages/ssr-assemble.js',
    ssrEntryFileName: 'entry.ssr.js',
    ssrEntryCwd: 'src/pages',
    excludePlugins: [
      'DllReferencePlugin',
      'CleanWebpackPlugin',
      'PackingTemplatePlugin',
      'VisualizerPlug'
    ],
    outputFilename: 'ssr.js',
    buildOutputPath: `${webpackConfig.output.path}/templates`,
    serveOutputPath: `${webpackConfig.output.path}/${appConfig.path.mockPages}`
  }, customCfg)
};

const commonConfig = (cfg, webpackConfig/* , program, appConfig */) => {
  const {
    entry,
    ssrEntryFileName,
    ssrEntryCwd,
    excludePlugins,
    outputFilename
  } = cfg;
  const config = webpackConfig;
  const ssrConfig = clone(config);
  ssrConfig.optimization = undefined;
  ssrConfig.target = 'node';
  ssrConfig.entry = entry;
  ssrConfig.plugins = config.plugins.filter(filterPlugin(excludePlugins));
  const ssrEntries = globEntries(ssrEntryFileName, ssrEntryCwd);
  const moduleRules = ssrConfig.module.rules;
  moduleRules.push({
    include: path.resolve(process.cwd(), entry),
    use: {
      loader: path.resolve(__dirname, './assemble-modules-loader.js'),
      options: { moduleFiles: ssrEntries }
    }
  });
  moduleRules.unshift({
    test: /\.(css|less|scss|sass)$/, use: 'ignore-loader'
  });
  ssrConfig.output = {
    libraryTarget: 'umd',
    filename: outputFilename
  };
  return ssrConfig;
}

const buildConfig = (webpackConfig, program, appConfig, ...args) => {
  const cfg = handleCfg(appConfig, webpackConfig);
  const ssrConfig = commonConfig(cfg, webpackConfig, program, appConfig, ...args);
  ssrConfig.plugins.push(new CopySsrPlugin({
    sourcePath: `${cfg.buildOutputPath}/${cfg.outputFilename}`,
    destPath: `${appConfig.path.mockPages}/${cfg.outputFilename}`
  }));
  ssrConfig.output.path = cfg.buildOutputPath;
  return [webpackConfig, ssrConfig];
};

const serveConfig = (webpackConfig, program, appConfig, ...args) => {
  const cfg = handleCfg(appConfig, webpackConfig);
  const ssrConfig = commonConfig(cfg, webpackConfig, program, appConfig, ...args);
  ssrConfig.output.path = cfg.serveOutputPath;
  const result = [webpackConfig, ssrConfig];
  result.output = webpackConfig.output;
  return result;
};

module.exports = {
  commonConfig,
  buildConfig,
  serveConfig
};
