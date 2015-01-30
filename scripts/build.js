var csso = require('gulp-csso');
var filter = require('gulp-filter');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var minifyHtml = require('gulp-minify-html');
var path = require('path');
var pngquant = require('imagemin-pngquant');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var svgmin = require('gulp-svgmin');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');

var sources = [
  'frontend/index.html',
  'frontend/svgdefs.svg',
  'frontend/bundle.js',
  'frontend/favicons/*.png',
  'frontend/robots.txt'
];
// there's no css because they will be concatenated by gulp-useref

var assetsFilter = filter([
  '**/*', '!index.html', '!robots.txt'
]);

var indexFilter = filter('index.html');
var userefAssets = useref.assets();

gulp
  .src(sources, {
    base: path.join(__dirname, '..', 'frontend')
  })
  // let's work on the index page to
  // concatenate needed assets
  .pipe(indexFilter)
  // this is how gulp-useref is used, no mistake
  // it finds builds blocks and then concatenate them
  // we could also use https://github.com/klei/gulp-inject
  .pipe(userefAssets)
  .pipe(userefAssets.restore())
  .pipe(useref())
  // now minify the index page
  .pipe(gulpif(/index\.html$/, minifyHtml()))
  .pipe(indexFilter.restore())
  // let's work on assets
  .pipe(assetsFilter)
  // minify them
  .pipe(gulpif(/bundle\.css$/, csso()))
  .pipe(gulpif(/bundle\.js$/, uglify()))
  .pipe(gulpif(/svgdefs\.svg$/, svgmin({
    plugins: [{
      cleanupIDs: false
    }]
  })))
  .pipe(gulpif(/\.png$/, pngquant({
    speed: 1,
    quality: '65-80'
  })()))
  // rev them (md5)
  .pipe(rev())
  .pipe(assetsFilter.restore())
  // replace revs everywhere, inside css, js, html
  .pipe(revReplace())
  .pipe(gulp.dest('public'));
