import globals from 'rollup-plugin-node-globals';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import eslint from 'rollup-plugin-eslint';
import pkg from './package.json';

const plugins = [
	eslint({
		exclude:      ['**/*.json', 'node_modules/**'],
		throwOnError: process.env.ROLLUP_WATCH != 'true'
	}),
	babel({
		runtimeHelpers: true
	}),
	resolve({
		preferBuiltins: true
	}),
	commonjs(),
	globals()
];
const dependencies = [].concat(
	['os'],
	Object.keys(pkg.dependencies)
);

function external(id) {
	return dependencies.some(_ =>
		_ == id || id.indexOf(`${_}/`) == 0
	);
}

export default {
	input:  'src/index.js',
	plugins,
	external,
	output: {
		file:      pkg.main,
		format:    'cjs',
		sourcemap: 'inline'
	}
};
