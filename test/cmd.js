var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var request = require('supertest');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;
var validateNpmName = require('validate-npm-package-name');

var PKG_PATH = path.join(__dirname, '..', 'package.json');
var BIN_PATH = path.resolve(path.dirname(PKG_PATH), require(PKG_PATH).bin['h5-webpack']);
var TEMP_DIR = path.resolve(__dirname, '..', 'temp', String(process.pid + Math.random()));

describe('h5-generator(1)', function() {

    before(function(done) {
        this.timeout(30000);
        cleanup(done);
    });

    after(function(done) {
        this.timeout(30000);
        cleanup(done);
    })
    describe('no args', function() {
        var ctx = setupTestEnvironment(this.fullTitle());

        it('should create basic app', function(done) {
            runRaw(ctx.dir, [], function(err, code, stdout, stderr) {
                if (err) return done(err);

                ctx.files = parseCreatedFiles(stdout, ctx.dir);
                ctx.stderr = stderr;
                ctx.stdout = stdout;
                assert.equal(ctx.files.length, 17);
                done();
            })
        });

        it('should have webpack files', function() {
            assert.notEqual(ctx.files.indexOf('webpack/base.js'), -1);
            assert.notEqual(ctx.files.indexOf('webpack/dev.js'), -1);
            assert.notEqual(ctx.files.indexOf('webpack/pro.js'), -1);
        });

        it('should have js files', function() {
            assert.notEqual(ctx.files.indexOf('src/js/app.js'), -1);
        });

        it('should have css files', function() {
            assert.notEqual(ctx.files.indexOf('src/css/app.less'), -1);
        });

        it('should have images files', function() {
            assert.notEqual(ctx.files.indexOf('src/images/app.jpg'), -1);
        });

        it('should have a package.json file', function() {
            var file = path.resolve(ctx.dir, 'package.json');
            var contents = fs.readFileSync(file, 'utf8');
            assert.equal(contents, '{\n' +
                '  "name": "h5-generator(1)-no-args",\n' +
                '  "version": "0.0.0",\n' +
                '  "scripts": {\n' +
                '    "dev": "./node_modules/.bin/webpack-dev-server --config ./webpack/dev.js --open",\n' +
                '    "build": "./node_modules/.bin/webpack --config ./webpack/pro.js"\n' +
                '  },\n' +
                '  "devDependencies": {\n' +
                '    "autoprefixer": "~7.1.2",\n' +
                '    "babel-core": "~6.25.0",\n' +
                '    "babel-loader": "~7.1.1",\n' +
                '    "babel-preset-env": "~1.6.1",\n' +
                '    "babel-plugin-transform-runtime": "~6.23.0",\n' +
                '    "clean-webpack-plugin": "~0.1.16",\n' +
                '    "css-loader": "~0.28.4",\n' +
                '    "extract-text-webpack-plugin": "~3.0.0",\n' +
                '    "file-loader": "~0.11.2",\n' +
                '    "friendly-errors-webpack-plugin": "~1.6.1",\n' +
                '    "html-webpack-plugin": "~2.30.1",\n' +
                '    "html-withimg-loader": "~0.1.16",\n' +
                '    "postcss-loader": "~2.0.6",\n' +
                '    "style-loader": "~0.18.2",\n' +
                '    "url-loader": "~0.5.9",\n' +
                '    "webpack": "~3.4.1",\n' +
                '    "webpack-dev-server": "~2.6.1",\n' +
                '    "webpack-bundle-analyzer": "^2.9.0",\n' +
                '    "webpack-merge": "~4.1.0",\n' +
                '    "less": "~2.4.0",\n' +
                '    "less-loader": "~4.0.5"\n' +
                '  },\n' +
                '  "dependencies": {}\n'+
                '}\n')
        });
        
    });

    describe('unknown args', function() {
        var ctx = setupTestEnvironment(this.fullTitle());

        it('should exit with code 1', function(done) {
            runRaw(ctx.dir, ['--foo'], function(err, code, stdout, stderr) {
                if (err) return done(err);
                assert.strictEqual(code, 1);
                done();
            });
        });

        it('should print unknown option', function(done) {
            runRaw(ctx.dir, ['--foo'], function(err, code, stdout, stderr) {
                if (err) return done(err);
                assert.ok(/error: unknown option/.test(stderr));
                done();
            });
        });
    });

    describe('--multiple', function() {
        var ctx = setupTestEnvironment(this.fullTitle());

        it('should create multiple app', function(done) {
            runRaw(ctx.dir, ['-m'], function(err, code, stdout, stderr) {
                if (err) return done(err);
                ctx.files = parseCreatedFiles(stdout, ctx.dir);
                ctx.stderr = stderr;
                ctx.stdout = stdout;
                assert.equal(ctx.files.length, 20);
                done();
            });
        });

        it('should have multiple files', function() {
            assert.notEqual(ctx.files.indexOf('src/info.html'), -1);
            assert.notEqual(ctx.files.indexOf('src/js/info.js'), -1);
            assert.notEqual(ctx.files.indexOf('src/css/info.less'), -1);
        });

    });

    describe('--cache', function() {
        var ctx = setupTestEnvironment(this.fullTitle());

        it('should create cache app', function(done) {
            runRaw(ctx.dir, ['--cache'], function(err, code, stdout, stderr) {
                if (err) return done(err);
                ctx.files = parseCreatedFiles(stdout, ctx.dir);
                ctx.stderr = stderr;
                ctx.stdout = stdout;
                assert.equal(ctx.files.length, 19);
                done();
            });
        });

        it('should have cache file', function() {
            assert.notEqual(ctx.files.indexOf('src/js/libs/utils.js'), -1);
        });
    })
});


function cleanup(dir, callback) {
    if (typeof dir == 'function') {
        callback = dir;
        dir = TEMP_DIR;
    }

    rimraf(dir, function(err) {
        callback(err);
    })
}

function childEnvironment() {
    var env = Object.create(null);

    for (var key in process.env) {
        if (key.substr(0, 4) !== 'npm_') {
            env[key] = process.env[key];
        }
    }

    return env;
}

function npmInstall(dir, callback) {
    var env = childEnvironment();

    exec('cnpm install', {cwd: dir, env: env}, function(err, stderr) {
        if (err) {
            err.message += stderr;
            callback(err);
            return false;
        }

        callback();
    })
}

function parseCreatedFiles(output, dir) {
    var files = [];
    var lines = output.split(/[\r\n]+/);
    var match;

    for (var i=0; i< lines.length; i++) {
        if (match = /create.*?: (.*)$/.exec(lines[i])) {
            var file = match[1];

            if (dir) {
                file = path.resolve(dir, file);
                file = path.relative(dir, file);
            }
            file = file.replace(/\\/g, '/');
            files.push(file);
        }
    }

    return files;
}

function run (dir, args, callback) {
    runRaw(dir, args, function (err, code, stdout, stderr) {
        if (err) {
            return callback(err);
        }

        process.stderr.write(stripWarnings(stderr));

        try {
            assert.equal(stripWarnings(stderr), '');
            assert.strictEqual(code, 0);
        } catch (e) {
            return callback(e);
        }

        callback(null, stripColors(stdout));
    })
}

function runRaw(dir, args, callback) {
    var argv = [BIN_PATH].concat(args);
    var exec = process.argv[0];
    var stderr = '';
    var stdout = '';

    var child = spawn(exec, argv, {
        cwd: dir
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function ondata(str) {
        stdout += str;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(str) {
        stderr += str;
    });

    child.on('close', onclose);
    child.on('error', callback);

    function onclose(code) {
        callback(null, code, stdout, stderr);
    }
}

function setupTestEnvironment(name) {
    var ctx = {};
    before('create environment', function(done) {
        ctx.dir = path.join(TEMP_DIR, name.replace(/[<>]/g,''));
        mkdirp(ctx.dir, done);
    });

    after('cleanup environment', function(done) {
        this.timeout(30000);
        cleanup(ctx.dir, done);
    });

    return ctx;
}

function stripColors (str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[(\d+)m/g, '_color_$1_');
}

function stripWarnings (str) {
    return str.replace(/\n(?:\x20{2}warning: [^\n]+\n)+\n/g, '');
}

