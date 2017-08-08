#!/usr/bin/env node

var ejs = require('ejs');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var program = require('commander');
var readline = require('readline');
var sortedObject = require('sorted-object');
var util = require('util');

var pkg = require('../package.json');
var version = pkg.version;

var _exit = process.exit;
var MODE_0666 = parseInt('0666', 8);
var MODE_0755 = parseInt('0755', 8);

process.exit = exit;

program
    .version(version, '-v --version')
    .option('-c, --css <engine>', 'add stylesheet <engine> support (less|sass|css) (defaults to plain css)')
    .option('-j, --js <engine>', 'add js loader <engine> support (es2015|typescript|coffescript) (default es2015)')
    .option('-f, --font', 'add iconfont loader')
    .option('--cache', 'add webpack cache')
    .option('-m, --multiple', 'creat multiple entry')
    .parse(process.argv);

main();

/**
 * Determine if launched from cmd.exe
 */

function launchedFromCmd () {
    return process.platform === 'win32' &&
        process.env._ === undefined
}


/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */
function createAppName (pathName) {
    return path.basename(pathName)
        .replace(/[^A-Za-z0-9.()!~*'-]+/g, '-')
        .replace(/^[-_.]+|-+$/g, '')
        .toLowerCase();
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */

function emptyDirectory (path, fn) {
    fs.readdir(path, function(err, files) {
        if (err && err.code != 'ENOENT') throw err;
        fn(!files || !files.length);
    })
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

function confirm (msg, callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(msg, (input) => {
        rl.close();
        callback(/^y|yes|ok|true$/i.test(input));
    });
}

/**
 * Graceful exit for async STDIO
 */

function exit (code) {
    // flush output for Node.js Windows pipe bug
    // https://github.com/visionmedia/mocha/issues/333 has a good discussion
    function done () {
        if (!(draining--)) _exit(code);
    }

    var draining = 0;
    var streams = [process.stdout, process.stderr];

    exit.exited = true;

    streams.forEach((stream) => {
        draining += 1;
        stream.write('', done);
    });

    done();
}

/**
 * Load template file.
 * 
 * @param {String} name
 */

function loadTemplate (name) {
    let contents = fs.readFileSync(path.join(__dirname,'..','templates', (name+'.ejs')), 'utf-8');
    let locals = Object.create(null);

    function render () {
        return ejs.render(contents, locals);
    }
    return {locals, render};
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
function mkdir (path, fn) {
    mkdirp(path, MODE_0755, (err) => {
        if (err) throw err;
        console.log('   \x1b[36mcreate\x1b[0m : ' + path);
        fn && fn()
    })
}


/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */

function write (path, str, encode, mode) {
    fs.writeFileSync(path, str, { mode: mode || MODE_0666, encoding: encode || 'utf-8' });
    console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Copy file from template directory.
 */
function copyTemplate (from, to, encode) {
    from = path.join(__dirname, '..', 'templates', from);
    write(to, fs.readFileSync(from, encode || 'utf-8'), encode);
}

/**
 * Create application at the given directory `path`.
 *
 * @param {String} name
 * @param {String} path
 */
function createApplication (name, path) {
    var wait = program.cache ? 7 : 6;

    console.log();
    function complete () {
        if (--wait) return;
        var prompt = launchedFromCmd() ? '>' : '$';

        console.log();
        console.log('   install dependencies:');
        console.log('     %s cd %s && npm install', prompt, path);
        console.log();
        console.log('   run the h5:');
        console.log('     npm run dev');
        console.log('   build the h5:');
        console.log('     npm run pro');
        console.log()
    }

    let dev = loadTemplate('webpack/dev.js');
    let pro = loadTemplate('webpack/pro.js');

    pro.locals.multiple = dev.locals.multiple = program.multiple;
    pro.locals.jsLoader = dev.locals.jsLoader = program.js;
    pro.locals.cssLoader = dev.locals.cssLoader = program.css;
    pro.locals.fileLoader = dev.locals.fileLoader = program.font || false;
    pro.locals.cache = dev.locals.cache = program.cache || false;

    if (program.js == 'coffeescript') {
        pro.locals.extname = dev.locals.extname = 'coffee';
    } else if (program.js == 'typescript') {
        pro.locals.extname = dev.locals.extname = 'ts';
    } else {
        pro.locals.extname = dev.locals.extname = 'js';
    }

    mkdir(path, () => {
        mkdir(path + '/src', () => {
            //js
            mkdir(path + '/src/js', () => {
                var extname = dev.locals.extname;
                var jsAppTpl = loadTemplate('js/app.js');

                if (program.css == 'less') {
                    jsAppTpl.locals.css = 'less';
                } else if (program.css == 'sass') {
                    jsAppTpl.locals.css = 'scss';
                } else {
                    jsAppTpl.locals.css = 'css';
                }

                jsAppTpl.locals.cache = program.cache || false;
                
                if (program.cache) {
                    mkdir(path + '/src/js/libs', () => {
                        copyTemplate('js/libs/utils.js', path + '/src/js/libs/utils.' + extname);
                        complete();
                    });
                }

                if (program.multiple) {
                    var jsInfoTpl = loadTemplate('js/info.js');
                    jsInfoTpl.locals.css = jsAppTpl.locals.css;
                    jsInfoTpl.locals.cache = program.cache || false;
                    write(path + '/src/js/info.'+extname , jsInfoTpl.render());
                }

                write(path + '/src/js/app.'+extname , jsAppTpl.render());

                complete();
            });
            //css
            mkdir(path + '/src/css', () => {
                switch (program.css) {
                    case 'less':
                        copyTemplate('less/app.less', path + '/src/css/app.less');
                        if (program.multiple) {
                            copyTemplate('less/info.less', path + '/src/css/info.less');
                        }
                        break;
                    case 'sass':
                        copyTemplate('sass/app.scss', path + '/src/css/app.scss');
                        if (program.multiple) {
                            copyTemplate('sass/info.scss', path + '/src/css/info.scss');
                        }
                        break;
                    default:
                        copyTemplate('css/app.css', path + '/src/css/app.css');
                        if (program.multiple) {
                            copyTemplate('css/info.css', path + '/src/css/info.css');
                        }
                }
                complete();
            });
            //images
            mkdir(path + '/src/images', () => {
                copyTemplate('images/app.jpg', path + '/src/images/app.jpg', 'binary');
                complete();
            });
            //font
            if (program.font) {
                mkdir(path + '/src/font');
            }
            //html
            copyTemplate('html/index.html', path + '/src/index.html');
            if (program.multiple) {
                copyTemplate('html/info.html', path + '/src/info.html');
            }
            complete();
        });

        var pkg = {
            name: name,
            version: '0.0.0',
            scripts: {
                dev: './node_modules/.bin/webpack-dev-server --config ./webpack/dev.js --open',
                pro: './node_modules/.bin/webpack --config ./webpack/pro.js'
            },
            devDependencies: {
                "babel-core": "~6.25.0",
                "babel-loader": "~7.1.1",
                "babel-preset-es2015": "~6.24.1",
                "clean-webpack-plugin": "~0.1.16",
                "css-loader": "~0.28.4",
                "extract-text-webpack-plugin": "~3.0.0",
                "file-loader": "~0.11.2",
                "html-webpack-plugin": "~2.30.1",
                "html-withimg-loader": "~0.1.16",
                "inline-manifest-webpack-plugin": "~3.0.1",
                "style-loader": "~0.18.2",
                "url-loader": "~0.5.9",
                "webpack": "~3.4.1",
                "webpack-dev-server": "~2.6.1"
            },
            dependencies: {}
        }

        switch (program.css) {
            case "less":
                pkg.devDependencies.less = "~2.4.0";
                pkg.devDependencies["less-loader"] = "~4.0.5";
                break;
            case "sass":
                pkg.devDependencies["sass-loader"] = "~6.0.6";
                pkg.devDependencies["node-sass"] = "~4.5.3";
        }

        if (program.js == 'coffeescript') {
            pkg.devDependencies["coffee-loader"] = "~0.7.3";
            pkg.devDependencies["coffee-script"] = "~1.12.7";
        } else if (program.js == 'typescript') {
            pkg.devDependencies["ts-loader"] = "~2.3.2";
            pkg.devDependencies["typescript"] = "~2.1.5";
        }

        // sort dependencies like npm(1)
        pkg.dependencies = sortedObject(pkg.dependencies);
        write(path + '/package.json', JSON.stringify(pkg, null, 2) + '\n');

        mkdir(path + '/webpack', () => {
            write(path + '/webpack/dev.js', dev.render());
            write(path + '/webpack/pro.js', pro.render());
            complete();
        });

        copyTemplate('gitignore', path + '/.gitignore');
        complete();
    })
}


/**
 * Main program.
 */

function main() {
    //path
    var destinationPath = program.args.shift() || '.';
    // App name
    var appName = createAppName(path.resolve(destinationPath)) || 'hello-world';

    emptyDirectory(destinationPath, (empty) => {
        if (empty) {
            createApplication(appName, destinationPath);
        } else {
            confirm('destination is not empty, continue? [y/N]: ', (ok) => {
                if (ok) {
                    process.stdin.destroy(); //关闭该进程的输入流，防止再次输入
                    createApplication(appName, destinationPath);
                } else {
                    console.error('aborting');
                    exit(1);
                }
            })
        }
    })
}

