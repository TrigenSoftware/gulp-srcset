import path from 'path';
import gulp from 'gulp';
import srcset from '../src';

jest.setTimeout(50000);

describe('gulp-srcset', () => {

	it('should emit files', (done) => {

		let counter = 0;

		gulp.src(
			path.join(__dirname, 'src/*.{jpg,png,gif,ico}')
		)
			.pipe(srcset([{
				match:  '(min-width: 3000px)',
				width:  [1, 3200, 1920, 1280, 720, 560, 320],
				format: ['jpg', 'webp']
			}]))
			.on('error', done)
			.on('data', () => {
				counter++;
			})
			.on('end', () => {
				expect(counter).toBe(17);
				done();
			});
	});
});
