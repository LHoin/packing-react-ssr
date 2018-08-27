# packing-react-ssr
针对[packing](https://github.com/packingjs/packing)的react ssr配置工具库

## 实现机制
packing基于webpack实现，packing本身只生成一个webpack配置用于打包编译，输出产物为打包后的js/css/模板文件；
为了支持ReactSSR，需要生成一个ssr的node包，供服务用来生成html；
packing-react-ssr在packing配置文件引用，在packing原有打包配置的基础上，再生成一套ReactSSR配置；
packing使用两套配置，进行两次编译，从而在原用产物的基础上再增加ssr的相关产物；

## 使用方法
1. npm安装packing-react-ssr

```bash
npm i packing-react-ssr --save-dev
```

2. 修改packing配置

```javascript
/**
 * 这个文件可以修改build的默认设置
 * 默认配置请看 `node_modules/packing/config/webpack.build.babel.js`
 *
 * @param object webpackConfig 默认配置对象
 * @param object program packing-cli程序对象
 * @param object appConfig config/packing.js中的配置
 */
import { buildConfig } from 'packing-react-ssr';

export default (webpackConfig, program, appConfig) => {
  const config = webpackConfig;
  // webpackConfig 为系统默认的webpack配置，此处可以根据项目情况修改
  // 修改 entry
  // config.entry = 'xxx/xxx.js';
  // 修改 plugins（修改 ＝ 先删除现有的，再添加新的）
  // config.plugins = config.plugins.filter(plugin => !(plugin.filename && plugin.id));
  // config.plugins.push(
  //   new ExtractTextPlugin({
  //     filename: '[name]-[contenthash:8].css',
  //     allChunks: true
  //   })
  // )
  return buildConfig(config, program, appConfig);
};
```

```javascript
/**
 * 这个文件可以修改serve的默认设置
 * 默认配置请看 `node_modules/packing/config/webpack.serve.babel.js`
 *
 * @param object webpackConfig 默认配置对象
 * @param object program packing-cli程序对象
 * @param object appConfig config/packing.js中的配置
 */
import { serveConfig } from 'packing-react-ssr';

export default (webpackConfig, program, appConfig) => {
  const config = webpackConfig;
  // webpackConfig 为系统默认的webpack配置，此处可以根据项目情况修改
  // 修改 entry
  // config.entry = 'xxx/xxx.js';
  // 修改 plugins（修改 ＝ 先删除现有的，再添加新的）
  // config.plugins = config.plugins.filter(plugin => !(plugin.filename && plugin.id));
  // config.plugins.push(
  //   new ExtractTextPlugin({
  //     filename: '[name]-[contenthash:8].css',
  //     allChunks: true
  //   })
  // )
  return serveConfig(config, program, appConfig); 
};
```

3. 为每个页面增加ssr渲染入口文件entry.ssr.js

```javascript
// 示例文件
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { fromJS } from 'immutable';
import Entry from '.';
import reducer from './reducer';
import { setCityList } from './actions';

const render = (resData) => {
  let state = reducer();
  state = reducer(state, setCityList(fromJS(resData.data)));
  const store = createStore(reducer, state);
  const html = renderToString((
    <Provider store={store}>
      <Entry />
    </Provider>
  ));
  const initState = store.getState();
  return {
    html, initState
  };
};

export default render;
```

4. 增加ssr全局入口文件ssr-assemble.js

```javascript
// 示例文件
// eslint-disable-next-line
const assembly = moduleAssembly; 
// moduleAssembly为注入对象, 其中：
// key为page路径（如：./ssr-demo）
// value为各页面entry.ssr.js输出对象（如上一步中export出的函数）

export default path => (
  assembly[path]
);
```

## 参数配置
packing-react-ssr提供了一些可配置项，可以通过修改packing.js来设置这些配置, 这些配置放在ssr节点下。

```javascript
import path from 'path';
import packingGlob from 'packing-glob';

export default (packing) => {
  const p = packing;
  p.ssr = {
    outputFilename: 'ssr-assembly.js'
  };
  return p;
};

```

可用配项：

名称 | 类型 | 作用 | 默认值 
--- | --- | --- | --- |
entry | string | ssr入口文件 | ./src/pages/ssr-assemble.js
ssrEntryFileName | string | 各页面ssr入口文件 | entry.ssr.js
ssrEntryCwd | string | 扫描页面目录 | src/pages
excludePlugins | array | 忽略的插件名 | [ 'DllReferencePlugin', 'CleanWebpackPlugin', 'PackingTemplatePlugin', 'VisualizerPlug' ]
outputFilename | string | 输出文件名 | ssr.js
buildOutputPath | string | build输出路径 | `${webpackConfig.output.path}/templates`
serveOutputPath | string | serve输出路径 | `${webpackConfig.output.path}/${appConfig.path.mockPages}`
