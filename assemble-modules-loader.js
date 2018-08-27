const { getOptions } = require('loader-utils');

module.exports = function loader(source) {
  const options = getOptions(this);
  const { moduleFiles } = options;
  const codeLines = moduleFiles.map((file) => {
    const key = file.replace(/\/entry\.ssr\.js/, '');
    return `moduleAssembly['${key}'] = require('${file}');`
  });
  codeLines.unshift('const moduleAssembly = {};');
  codeLines.push(source);
  return codeLines.join('\n');
}
