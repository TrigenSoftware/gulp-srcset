/* eslint-disable */
const gulp = require('gulp');
const srcset = require('../lib/index');

gulp.task('images', () =>
	gulp.src('src/*.{jpg,png,gif,ico}')
		.pipe(srcset([{
			match:  '(min-width: 3000px)',
			width:  [1, 3200, 1920, 1280, 720, 560, 320],
			format: ['jpg', 'webp']
		}]))
		.pipe(gulp.dest('dist'))
);
