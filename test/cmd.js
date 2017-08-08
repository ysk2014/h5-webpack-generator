var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var request = require('supertest');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;
var validateNpmName = require('validate-npm-package-name');

var PKG_PATH = path.resolve(__dirname, '..', 'package.json');
var BIN_PATH = path.resolve(path.dirname(PKG_PATH), require(PKG_PATH).bin['h5-generator']);
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
                assert.equal(ctx.files.length, 14);
                done();
            })
        });

        it('should have webpack files', function() {
            assert.notEqual(ctx.files.indexOf('webpack/dev.js'), -1);
            assert.notEqual(ctx.files.indexOf('webpack/pro.js'), -1);
        });

        it('should have js files', function() {
            assert.notEqual(ctx.files.indexOf('src/js/app.js'), -1);
        });

        it('should have css files', function() {
            assert.notEqual(ctx.files.indexOf('src/css/app.css'), -1);
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
                '    "pro": "./node_modules/.bin/webpack --config ./webpack/pro.js"\n' +
                '  },\n' +
                '  "devDependencies": {\n' +
                '    "babel-core": "~6.25.0",\n' +
                '    "babel-loader": "~7.1.1",\n' +
                '    "babel-preset-es2015": "~6.24.1",\n' +
                '    "clean-webpack-plugin": "~0.1.16",\n' +
                '    "css-loader": "~0.28.4",\n' +
                '    "extract-text-webpack-plugin": "~3.0.0",\n' +
                '    "file-loader": "~0.11.2",\n' +
                '    "html-webpack-plugin": "~2.30.1",\n' +
                '    "html-withimg-loader": "~0.1.16",\n' +
                '    "inline-manifest-webpack-plugin": "~3.0.1",\n' +
                '    "style-loader": "~0.18.2",\n' +
                '    "url-loader": "~0.5.9",\n' +
                '    "webpack": "~3.4.1",\n' +
                '    "webpack-dev-server": "~2.6.1"\n' +
                '  },\n' +
                '  "dependencies": {}\n'+
                '}\n')
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

function parseCreatedFiles(output, dir) {
    console.log(output);
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