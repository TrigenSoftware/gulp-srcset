# gulp-srcset

[![NPM version][npm]][npm-url]
[![Node version][node]][node-url]
[![Dependency status][deps]][deps-url]
[![Build status][build]][build-url]
[![Greenkeeper badge][greenkeeper]][greenkeeper-url]

[npm]: https://img.shields.io/npm/v/gulp-srcset.svg
[npm-url]: https://www.npmjs.com/package/gulp-srcset

[node]: https://img.shields.io/node/v/gulp-srcset.svg
[node-url]: https://nodejs.org

[deps]: https://img.shields.io/david/TrigenSoftware/gulp-srcset.svg
[deps-url]: https://david-dm.org/TrigenSoftware/gulp-srcset

[build]: http://img.shields.io/travis/com/TrigenSoftware/gulp-srcset.svg
[build-url]: https://travis-ci.com/TrigenSoftware/gulp-srcset

[greenkeeper]: https://badges.greenkeeper.io/TrigenSoftware/gulp-srcset.svg
[greenkeeper-url]: https://greenkeeper.io/

Highly customizable plugin to generating responsive images.

## Install

```bash
npm i -D gulp-srcset
# or
yarn add -D gulp-srcset
```

## API

### `gulpSrcsetPlugin(rules: object[], options?: object)`

#### `rules: object[]`

Array of rules to generate variants of image.

##### `rule.match: string|Function|(string|Function)[]`

There is support of 3 types of matchers:

1. Glob pattern of file path/name.
2. Media query to match image by size.
3. Function with `path`, `size` and `file` arguments, where `path` is `string`, `size` is `{ width: nunber, height: number }` and `file` is instance of `Vinyl`.

##### `rule.width: number|number[]`

Target widths to generate, value less or equal 1 will be detected as multiplier.

`gulp-srsset` supports SVG, GIF, JPEG, PNG and WebP, but only last 3 formats available to resize.

Default: `[1]`

##### `rule.format: string|string[]`

Target formats to generate, supports: `'svg'`, `'gif'`, `'jpeg'`, `'png'` and `'webp'`.

For converting are available only `'jpeg'`, `'png'` and `'webp'`.

Default: ```[`format of source image`]```

##### `rule.postfix`

Same as [`postfix` option](#optionspostfix-calculatedwidth-number-width-number-format-string--string).

##### `rule.processing`

Same as [`processing` option](#optionsprocessing-object).

##### `rule.optimization`

Same as [`optimization` option](#optionsoptimization-object).

##### `rule.skipOptimization`

Same as [`skipOptimization` option](#optionsskipoptimization-boolean).

##### `rule.scalingUp`

Same as [`scalingUp` option](#optionsscalingup-boolean).

#### `options: object`

Object with common config.

##### `options.postfix: (calculatedWidth: number, width: number, format: string) => string`

Function to generate postfix for file name.

Default: ```(width, mul, format) => mul == 1 ? '' : `@${width}w` ```

##### `options.processing: object`

Object with [Sharp configs](http://sharp.readthedocs.io/en/stable/api-output/) for each supported format. Sharp used as tool for resizing and converting images.

Default:
```js
{
    webp: {
        quality: 100
    },
    jpg: {
        quality: 100
    },
    png: {}
}
```

##### `options.optimization: object`

Object with [imagemin](https://www.npmjs.com/package/imagemin) plugins for each format. Imagemin used as tool for images optimization.

Default:
```js
{
    webp: webpPlugin({
        quality: 100
    }),
    jpg:  mozJpegPlugin({
        quality: 100
    }),
    png:  zopfliPlugin(),
    gif:  gifLossyPlugin(),
    svg:  svgoPlugin()
}
```

##### `options.skipOptimization: boolean`

Option to skip optimization.

Default: `false`

##### `options.scalingUp: boolean`

Generate or not images with higher width than they's sources are.

Default: `true`

## Example 
```js
const gulp = require('gulp');
const srcset = require('gulp-srcset');

gulp.task('images', () =>
    gulp.src('src/*.{jpg,png,gif}')
        .pipe(srcset([{
            match:  '(min-width: 3000px)',
            width:  [1, 1920, 1280, 720, 560, 320],
            format: ['jpg', 'webp']
        }]))
        .pipe(gulp.dest('dist'))
);
```

---
[![NPM](https://nodei.co/npm/gulp-srcset.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/gulp-srcset/)
