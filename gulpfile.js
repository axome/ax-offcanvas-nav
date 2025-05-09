const { src, dest, parallel, series, watch } = require('gulp');
const glob = require('glob');
const sass = require('gulp-sass')(require('sass'));
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const saveLicense = require('uglify-save-license');
const babel = require('gulp-babel');
const through = require('through2');
const path = require('path');
const argv = require('yargs').argv;
const bump = require('gulp-bump');
const replace = require('gulp-replace');

const compileJs = () => {
  return src([
      './src/js/hc-offcanvas-nav.js',
      './src/js/hc-offcanvas-nav.helpers.js'
    ])
    .pipe(concat('hc-offcanvas-nav.js'))
    .pipe(babel(
      {
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              loose: true,
              exclude: ['transform-typeof-symbol']
            }
          ]
        ]
      }
    ))
    .pipe(argv.dev ? through.obj() : uglify({
      output: {
        comments: saveLicense
      }
    }))
    .pipe(dest('./docs/')) // demo
    .pipe(dest('./dist/'));
};

const compileScss = () => {
  return src(['./src/scss/*.scss'])
    .pipe(sass({
      'includePaths': ['node_modules'],
      'style': argv.dev ? 'expanded' : 'compressed'
    }).on('error', sass.logError))
    .pipe(dest('./dist/'));
};

const compileDemoScss = () => {
  return src(['./docs/demo.scss'])
    .pipe(sass({
      'includePaths': ['node_modules'],
      'style': argv.dev ? 'expanded' : 'compressed'
    }).on('error', sass.logError))
    .pipe(dest('./docs/'));
};

const runDemo = async () => {
  const open = (await import('open')).default;
  await open('./docs/index.html');
};

const bumpPackage = () => {
  return src('./*.json')
    .pipe(bump(argv.ver && argv.ver.indexOf('.') > -1 ? {version: argv.ver} : {type: argv.ver || 'patch'}))
    .pipe(dest('./'));
};

const bumpJs = () => {
  const package = require('./package.json');

  return src(['./src/js/*.js'])
    .pipe(replace(/ \* Version: ([\d\.]+)/g, () => {
      return ` * Version: ${package.version}`;
    }))
    .pipe(dest('./src/js/'))
};

const bumpHtml = () => {
  const package = require('./package.json');

  return src(['./docs/*.html'])
    .pipe(replace(/\?ver=([\d\.]+)/g, () => {
      return `?ver=${package.version}`;
    }))
    .pipe(replace(/v<span>([\d\.]+)/g, () => {
      return `v<span>${package.version}`;
    }))
    .pipe(dest('./docs/'))
};

const defaultTask = parallel(compileJs, compileScss, compileDemoScss);

const watchFiles = () => {
  watch('./src/scss/**/*.scss', parallel(compileScss, compileDemoScss));
  watch('./docs/demo.scss', compileDemoScss);
  watch('./src/js/**/*.js', compileJs);
};

module.exports.default = defaultTask;
module.exports.watch = series(defaultTask, watchFiles);
module.exports.bump = series(bumpPackage, bumpJs, bumpHtml, compileJs);
module.exports.demo = series(defaultTask, runDemo);