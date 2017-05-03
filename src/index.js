import SrcsetGenerator from './generator';
import through from 'through2';

export default function plugin(rules = [], inputOptions = {}) {

	const options = Object.assign({
		processing:       false,
		optimization:     false,
		postfix:          false,
		skipOptimization: false
	}, inputOptions);

	const srcset = new SrcsetGenerator(options);

	function each(file, enc, next) {

		if (file.isNull() || file.isStream()) {
			next(null, file);
			return;
		}

		Promise.all(rules.map(rule =>
			match(srcset, file, rule.match, () =>
				srcset.generate(
					file,
					rule,
					this.push.bind(this)
				)
			)
		))
			.then((results) => {

				if (results.every(_ => _ == false)) {
					next(null, file);
					return;
				}

				next();
			})
			.catch(next);
	}

	return through.obj(each);
}

function match(srcset, file, matchers, ifMatches) {
	return srcset.matchImage(file, matchers)
		.then(matches => (matches
			? ifMatches()
			: false
		));
}
