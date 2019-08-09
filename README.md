# gulp-srcset

[![NPM version][npm]][npm-url]
[![Node version][node]][node-url]
[![Dependencies status][deps]][deps-url]
[![Build status][build]][build-url]
[![Dependabot badge][dependabot]][dependabot-url]

[npm]: https://img.shields.io/npm/v/gulp-srcset.svg
[npm-url]: https://npmjs.com/package/gulp-srcset

[node]: https://img.shields.io/node/v/gulp-srcset.svg
[node-url]: https://nodejs.org

[deps]: https://david-dm.org/TrigenSoftware/gulp-srcset.svg
[deps-url]: https://david-dm.org/TrigenSoftware/gulp-srcset

[build]: http://img.shields.io/travis/com/TrigenSoftware/gulp-srcset/master.svg
[build-url]: https://travis-ci.com/TrigenSoftware/gulp-srcset

[dependabot]: https://api.dependabot.com/badges/status?host=github&repo=TrigenSoftware/gulp-srcset
[dependabot-url]: https://dependabot.com/


Highly customizable plugin for generating responsive images.

- [Responsive images](https://developer.mozilla.org/ru/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images) 🌠
- Optimize images with [imagemin](https://www.npmjs.com/package/imagemin) 🗜
- Convert images to [modern formats such as WebP](https://developer.mozilla.org/ru/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Use_modern_image_formats_boldly) 📸

## Install

```bash
npm i -D gulp-srcset
# or
yarn add -D gulp-srcset
```

## Usage

```js
import srcset from 'gulp-srcset';

gulp.task('images', () =>
    gulp.src('src/*.{jpg,png}')
        .pipe(srcset([{
            match:  '(min-width: 3000px)',
            width:  [1920, 1280, 1024, 860, 540, 320],
            format: ['jpg', 'webp']
        }], {
            skipOptimization: true
        }))
        .pipe(gulp.dest('static'))
);
```

Plugin options:

```ts
interface ICommonConfig {
    /**
     * Object with Sharp configs for each supported format.
     */
    processing?: Partial<IProcessingConfig>;
    /**
     * Object with imagemin plugins for each format.
     */
    optimization?: Partial<IOptimizationConfig>;
    /**
     * Do not optimize output images.
     */
    skipOptimization?: boolean;
    /**
     * Generate images with higher resolution than they's sources are.
     */
    scalingUp?: boolean;
    /**
     * Postfix string or function to generate postfix for image.
     */
    postfix?: Postfix;
}

/**
 * First argument: IPluginRule[]
 */
interface IPluginRule extends ICommonConfig {
    /**
     * There is support of 3 types of matchers:
     * 1. Glob pattern of file path;
     * 2. Media query to match image by size;
     * 3. `(path: string, size: ISize, source: Vinyl) => boolean` function.
     */
    match?: Matcher;
    /**
     * Output image(s) formats to convert.
     */
    format?: SupportedExtension|SupportedExtension[];
    /**
     * Output image(s) widths to resize, value less than or equal to 1 will be detected as multiplier.
     */
    width?: number|number[];
}

/**
 * Second argument: 
 */
interface IPluginConfig extends ICommonConfig {
    /**
     * Print additional info about progress.
     */
    verbose?: boolean;
}
```

- [`IProcessingConfig`](https://trigensoftware.github.io/flexis-srcset/interfaces/_types_.iprocessingconfig.html)
- [`IOptimizationConfig`](https://trigensoftware.github.io/flexis-srcset/interfaces/_types_.ioptimizationconfig.html)
- [`Postfix`](https://trigensoftware.github.io/flexis-srcset/modules/_types_.html#postfix)
- [`Matcher`](https://trigensoftware.github.io/flexis-srcset/modules/_helpers_.html#matcher)
- [`SupportedExtension`](https://trigensoftware.github.io/flexis-srcset/modules/_extensions_.html#supportedextension)
