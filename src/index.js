import { cpus } from 'os';
import Vinyl from 'vinyl';
import through from 'through2-concurrent';
import SrcsetGenerator, { matchImage } from '@flexis/srcset';

const throughOptions = {
	maxConcurrency: cpus().length
};

function toVinyl(source) {
	return Vinyl.isVinyl(source)
		? source
		: source.isBuffer && source.isStream && source.isNull
			? new Vinyl(source)
			: source;
}

export default function plugin(rules = [], inputOptions = {}) {

	const options = Object.assign({
		processing:       false,
		optimization:     false,
		postfix:          false,
		skipOptimization: false,
		scalingUp:        true
	}, inputOptions);
	const srcset = new SrcsetGenerator(options);

	async function each(file, enc, next) {

		if (file.isNull() || file.isStream()) {
			next(null, file);
			return;
		}

		const vinylFile = toVinyl(file);

		try {

			const results = await Promise.all(
				rules.map(async (rule) => {

					const matches = await matchImage(vinylFile, rule.match);

					if (matches) {

						const images = srcset.generate(vinylFile, rule);

						for await (const image of images) {
							this.push(image);
						}

						return true;
					}

					return false;
				})
			);

			if (results.every(_ => !_)) {
				next(null, vinylFile);
				return;
			}

			next();
			return;

		} catch (err) {
			next(err);
			return;
		}
	}

	return through.obj(throughOptions, each);
}
