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
	 * @param  {String} type Image extension without dot.
	 * @return {Boolean}     Image type is supported or not.
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

	skipOptimization = false;
	scalingUp = true;

	constructor(config = {}) {

		if (typeof config == 'object') {

			const {
				processing,
				optimization,
				postfix,
				skipOptimization,
				scalingUp
			} = config;

			Object.assign(this.processing, processing);
			Object.assign(this.optimization, optimization);

			if (typeof postfix == 'function') {
				this.postfix = postfix;
			}

			if (typeof skipOptimization == 'boolean') {
				this.skipOptimization = skipOptimization;
			}

			if (typeof scalingUp == 'boolean') {
				this.scalingUp = scalingUp;
			}
		}
	}

	/**
	 * Create set of sources form original image.
	 * @param  {Vinyl}    source       Source image file.
	 * @param  {Object}   _config      Image handle config.
	 * @param  {Function} push         Will called on each file.
	 * @return {Promise<Array<Vinyl>>} Results of handling.
	 */
	generate(source, _config = {}, push = false) {

		if (!Vinyl.isVinyl(source) || source.isNull() || source.isStream()) {
			throw new Error('Invalid source.');
		}

		const config = Object.assign({
			format:           [],
			width:            [],
			postfix:          false,
			processing:       false,
			optimization:     false,
			skipOptimization: this.skipOptimization,
			scalingUp:        this.scalingUp
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

		const {
			skipOptimization,
			scalingUp
		} = config;

		const onlyOptimize = Extensions.svg.test(sourceType)
			|| Extensions.gif.test(sourceType);

		const processors = outputTypes.map(async (type) => {

			if (!TypeIsSupported(type)) {
				throw new Error(`"${type}" is not supported.`);
			}

			if (onlyOptimize) {

				if (skipOptimization) {
					return triggerPush(source);
				}

				return triggerPush(
					await this._optimizeImage(source, config)
				);

			}

			const processors = widths.map(async (width) => {

				if (typeof width != 'number') {
					throw new Error(`Invalid width parameter.`);
				}

				let image = await this._attachMetadata(source);

				if (!scalingUp && image.metadata.width < width) {
					return null;
				}

				image = await this._processImage(image, type, width, config);

				if (!skipOptimization) {
					image = await this._optimizeImage(image, config);
				}

				return triggerPush(image);
			});

			return Promise.all(processors);
		});

		return Promise.all(processors);
	}

	/**
	 * Match image file by path and size
	 * @param  {Vinyl}                  source            Source image file.
	 * @param  {Array<String|Function>} matcherOrMatchers Rules to match image file.
	 * @return {Promise<Boolean>}                         Image is matched or not.
	 */
	async matchImage(source, matcherOrMatchers = false) {

		if (!Vinyl.isVinyl(source) || source.isNull() || source.isStream()) {
			throw new Error('Invalid source.');
		}

		const { TypeIsSupported } = SrcsetGenerator,
			sourceType = source.extname.replace(/^\./, '');

		if (!TypeIsSupported(sourceType)) {
			return false;
		}

		if (!matcherOrMatchers) {
			return true;
		}

		const matchers = Array.isArray(matcherOrMatchers)
			? matcherOrMatchers
			: [matcherOrMatchers];

		await this._attachMetadata(source);

		const {
			metadata,
			path
		} = source;

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
			}

			return minimatch(path, funcOrPatternOrMediaQuery);
		});
	}

	/**
	 * Attach image metadata to the vinyl file.
	 * @param  {Vinyl} source   Source image file.
	 * @return {Promise<Vinyl>} Source image file with attached metadata.
	 */
	async _attachMetadata(source) {

		if (typeof source.metadata == 'object') {
			return source;
		}

		source.metadata = await Sharp(source.contents).metadata();

		return source;
	}

	/**
	 * Resize and convert image.
	 * @param  {Vinyl}   source     Source image file.
	 * @param  {String}  outputType Destination image file format.
	 * @param  {Number}  width      Aspect ratio multiplier for destination image.
	 * @param  {Object}  config     Image handle config.
	 * @return {Promise<Vinyl>}     Destination image file.
	 */
	async _processImage(source, outputType, width = false, config = {}) {

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
			return target;
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

		target.contents = await processor.toBuffer();

		return target;
	}

	/**
	 * Optimize image with imagemin.
	 * @param  {Vinyl}  source  Source image file.
	 * @param  {Object} config  Image handle config.
	 * @return {Promise<Vinyl>} Destination image file.
	 */
	async _optimizeImage(source, config = {}) {

		const target = source.clone({ contents: false }),
			optimization = Object.assign({}, this.optimization, config.optimization);

		target.contents = await Imagemin.buffer(source.contents, {
			plugins: [optimization[source.extname.replace(/^\./, '')]]
		});

		return target;
	}

	/**
	 * Add postfix to image file name.
	 * @param  {Vinyl}           target          Image file to add postfix.
	 * @param  {Number}          calculatedWidth Calculated width of image.
	 * @param  {Number}          width           Aspect ratio multiplier of image.
	 * @param  {String|Function} customPostfix   Custom postfix generator.
	 * @return {void}
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
