

## H5应用的Webpack脚手架
这是一个快速搭建h5应用开发环境和打包的webpack脚手架。

## 安装

```sh
$ npm install -g h5-webpack-generator
```

## 开始


创建应用：

```bash
$ h5-webpack  /tmp/foo && cd /tmp/foo
```

安装 devpendencies:

```bash
$ npm install
```

启动开发环境服务： `http://localhost:3000/`:

```bash
$ npm run dev
```

打包：
```bash
$ npm run build
```

如果想使用`webpack-bundle-analyzer`插件，请使用：
```
$ npm run build --report
```

## 命令行参数


    -v, --version       output the version number
    -m, --multiple      add multiple pages support
    -c, --cache         add webpack hash cache support

## 版本
* 1.2.0: 把babel-preset-es2015替换成babel-preset-env
* 1.3.0: 去掉对ts和coffeescript、sass的支持，默认支持es2015和less，添加对`webpack-bundle-analyzer`插件的支持
* 1.3.2: 对多页面配置的优化
* 1.3.3: 对dev环境webpack配置优化
* 1.3.4: 开发环境使用NamedModulesPlugin，生产环境使用HashedModuleIdsPlugin，可以减小打包后的文件大小