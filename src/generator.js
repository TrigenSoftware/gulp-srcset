import Vinyl          from 'vinyl';
import minimatch      from 'minimatch';
import mediaQuery     from 'css-mediaquery';
import Sharp          from 'sharp';
import Imagemin       from 'imagemin';
import webpPlugin     from 'imagemin-webp';
import mozJpegPlugin  from 'imagemin-mozjpeg';
import zopfliPlugin   from 'imagemin-zopfli';
import gifLossyPlugin from 'imagemin-giflossy';
import svgoPlugin     from 'imagemin-svgo';

const extensions = {
	webp: /^webp$/,
	jpg:  /^jp(e|)g$/,
	png:  /^png$/,
	gif:  /^gif$/,
	svg:  /^svg$/
};

const isMediaQuery = /^\s*(\(\s*((max|min)-|)(width|height)\s*:\s*\d+\w*\s*\)\s*(,|and)\s*)*\(\s*((max|min)-|)(width|height)\s*:\s*\d+\w*\s*\)\s*$/g;

export default class SrcsetGenerator {

	static Extensions = extensions;
	static ExtensionsList = Object.keys(extensions).map(_ => extensions[_]);

	/**
	 * Check image type
	 * @param  {String} type
	 * @return {Boolean}
	 */
	static TypeIsSupported(type) {
		return SrcsetGenerator.ExtensionsList.some(_ => _.test(type));
	}

	processing = {
		webp: {
			quality: 100
		},
		jpg: {
			quality: 100
		},
		png: {}
	};

	optimization = {
		webp: webpPlugin({
			quality: 100
		}),
		jpg:  mozJpegPlugin({
			quality: 100
		}),
		png:  zopfliPlugin(),
		gif:  gifLossyPlugin(),
		svg:  svgoPlugin()
	};

	postfix = (width, mul) => (mul === 1 ? '' : `@${width}w`);

	constructor(config = {}) {

		if (typeof config == 'object') {

			const { processing, optimization, postfix } = config;

			Object.assign(this.processing, processing);
			Object.assign(this.optimization, optimization);

			if (typeof postfix == 'function') {
				this.postfix = postfix;
			}
		}
	}

	/**
	 * Create set of sources form original image.
	 * @param  {Vinyl}    source
	 * @param  {Object}   config
	 * @param  {Function} push
	 * @return {Promise<Array<Vinyl>>}
	 */
	generate(source, _config = {}, push = false) {

		if (!Vinyl.isVinyl(source) || source.isNull() || source.isStream()) {
			throw new Error('Invalid source.');
		}

		const config = Object.assign({
			format:       [],
			width:        [],
			postfix:      false,
			processing:   false,
			optimization: false
		}, _config);

		const { TypeIsSupported, Extensions } = SrcsetGenerator,
			sourceType = source.extname.replace(/^\./, '');

		if (!TypeIsSupported(sourceType)) {
			throw new Error(`"${sourceType}" is not supported.`);
		}

		const triggerPush = (_) => {

			if (typeof push == 'function') {
				push(_);
			}

			return _;
		};

		const outputTypes = Array.isArray(config.format)
				? config.format
				: [config.format],
			widths = Array.isArray(config.width)
				? config.width
				: [config.width];

		if (!outputTypes.length) {
			outputTypes.push(sourceType);
		}

		if (!widths.length) {
			widths.push(1);
		}

		const onlyOptimize = Extensions.svg.test(sourceType)
				|| Extensions.gif.test(sourceType),
			processors = [];

		outputTypes.forEach((type) => {

			if (!TypeIsSupported(type)) {
				throw new Error(`"${type}" is not supported.`);
			}

			if (onlyOptimize) {
				processors.push(
					this._optimizeImage(source, config)
						.then(triggerPush)
				);
			} else {
				widths.forEach((width) => {

					if (typeof width != 'number') {
						throw new Error(`Invalid width parameter.`);
					}

					processors.push(
						this._attachMetadata(source)
							.then(image => this._processImage(image, type, width, config))
							.then(image => this._optimizeImage(image, config))
							.then(triggerPush)
					);
				});
			}
		});

		return Promise.all(processors);
	}

	/**
	 * Match image file by path and size
	 * @param  {Vinyl}                  source
	 * @param  {Array<String|Function>} matchers
	 * @return {Promise<Boolean>}
	 */
	matchImage(source, matcherOrMatchers) {

		if (!Vinyl.isVinyl(source) || source.isNull() || source.isStream()) {
			throw new Error('Invalid source.');
		}

		const matchers = Array.isArray(matcherOrMatchers)
			? matcherOrMatchers
			: [matcherOrMatchers];

		return this._attachMetadata(source).then(() => {

			const { metadata, path } = source;

			if (typeof metadata != 'object') {
				return false;
			}

			const size = {
				width:  metadata.width,
				height: metadata.height
			};

			return matchers.every((funcOrPatternOrMediaQuery) => {

				if (isMediaQuery.test(funcOrPatternOrMediaQuery)) {
					return mediaQuery.match(funcOrPatternOrMediaQuery, size);
				} else
				if (typeof funcOrPatternOrMediaQuery == 'function') {
					return funcOrPatternOrMediaQuery(path, size, source);
				} else {
					return minimatch(path, funcOrPatternOrMediaQuery);
				}
			});
		});
	}

	/**
	 * Attach image metadata to the vinyl file.
	 * @param  {Vinyl} source
	 * @return {Vinyl}
	 */
	_attachMetadata(source) {

		if (typeof source.metadata == 'object') {
			return Promise.resolve(source);
		}

		return Sharp(source.contents).metadata()
			.then((metadata) => {
				source.metadata = metadata;
				return source;
			});
	}

	/**
	 * Resize and convert image.
	 * @param  {Vinyl}   source
	 * @param  {String}  outputType
	 * @param  {Boolean} width
	 * @param  {Object}  config
	 * @return {Promise<Vinyl>}
	 */
	_processImage(source, outputType, width = false, config = {}) {

		const { Extensions } = SrcsetGenerator,
			{ metadata } = source,
			originWidth = typeof metadata == 'object' ? metadata.width : 0,
			processing = Object.assign({}, this.processing, config.processing),
			target    = source.clone({ contents: false }),
			processor = Sharp(source.contents);

		target.extname = `.${outputType}`;

		if (width) {

			const calculatedWidth = originWidth && width <= 1
				? width * originWidth
				: width;

			this._addPostfix(target, calculatedWidth, width, config.postfix);

			if (calculatedWidth < originWidth) {
				processor.resize(calculatedWidth);
			}

		} else {
			this._addPostfix(target, originWidth, originWidth, config.postfix);
		}

		if (width == 1 && source.extname == target.extname) {
			target.contents = source.contents;
			return Promise.resolve(target);
		}

		if (Extensions.webp.test(outputType)) {
			processor.webp(processing.webp);
		} else
		if (Extensions.jpg.test(outputType)) {
			processor.jpeg(processing.jpg);
		} else
		if (Extensions.png.test(outputType)) {
			processor.png(processing.png);
		}

		return processor.toBuffer().then((buffer) => {
			target.contents = buffer;
			return target;
		});
	}

	/**
	 * Optimize image with imagemin.
	 * @param  {Vinyl}  source
	 * @param  {Object} config
	 * @return {Promise<Vinyl>}
	 */
	_optimizeImage(source, config = {}) {

		const target = source.clone({ contents: false }),
			optimization = Object.assign({}, this.optimization, config.optimization);

		return Imagemin.buffer(source.contents, {
			plugins: [optimization[source.extname.replace(/^\./, '')]]
		}).then((buffer) => {
			target.contents = buffer;
			return target;
		});
	}

	/**
	 * Add postfix to image file name.
	 * @param {Vinyl}           target
	 * @param {Number}          calculatedWidth
	 * @param {Number}          width
	 * @param {String|Function} customPostfix
	 */
	_addPostfix(target, calculatedWidth, width, customPostfix = false) {

		const { postfix } = this;

		if (typeof customPostfix == 'string') {
			target.stem += customPostfix;
		} else
		if (typeof customPostfix == 'function') {
			target.stem += customPostfix(calculatedWidth, width);
		} else
		if (typeof postfix == 'function') {
			target.stem += postfix(calculatedWidth, width);
		}
	}
}
