

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
$ npm run pro
```

## 命令行参数


    -v, --version       output the version number
    -j, --js <engine>   add js loader <engine> support (es2015|typescript|coffescript) (default es2015)
    -c, --css <engine>  add stylesheet <engine> support (less|sass|css) (defaults to plain css)
    -m, --multiple      add multiple pages support
    --cache             add webpack hash cache support
    -f, --font          add font loader support
