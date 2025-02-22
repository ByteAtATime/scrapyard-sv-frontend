import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from './logging';
vi.mock('$app/environment', () => ({
	dev: false
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		ENABLE_DEBUG_LOGGING: 'false'
	}
}));

describe('Logger', () => {
	let logger: Logger;
	const testPrefix = 'TestService';

	beforeEach(() => {
		vi.resetModules();

		vi.spyOn(console, 'debug').mockImplementation(() => {});
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('constructor', () => {
		it('should create logger with prefix', () => {
			const logger = new Logger('TestPrefix');
			expect(logger).toBeInstanceOf(Logger);
		});
	});

	describe('logging methods', () => {
		describe('when logging is disabled', () => {
			beforeEach(async () => {
				vi.doMock('$app/environment', () => ({
					dev: false
				}));
				vi.doMock('$env/dynamic/private', () => ({
					env: {
						ENABLE_DEBUG_LOGGING: 'false'
					}
				}));

				const { Logger } = await import('./logging');
				logger = new Logger(testPrefix);
			});

			it('should not log debug messages', () => {
				logger.debug('test message');
				expect(console.debug).not.toHaveBeenCalled();
			});

			it('should not log info messages', () => {
				logger.info('test message');
				expect(console.info).not.toHaveBeenCalled();
			});

			it('should not log warn messages', () => {
				logger.warn('test message');
				expect(console.warn).not.toHaveBeenCalled();
			});

			it('should always log error messages regardless of debug setting', () => {
				const errorMessage = 'test error';
				logger.error(errorMessage);
				expect(console.error).toHaveBeenCalledWith(`[${testPrefix}] ${errorMessage}`);
			});
		});

		describe('when logging is enabled', () => {
			beforeEach(async () => {
				vi.doMock('$app/environment', () => ({
					dev: false
				}));
				vi.doMock('$env/dynamic/private', () => ({
					env: {
						ENABLE_DEBUG_LOGGING: 'true'
					}
				}));

				const { Logger } = await import('./logging');
				logger = new Logger(testPrefix);
			});

			it('should log debug messages with prefix', () => {
				const message = 'test debug';
				logger.debug(message);
				expect(console.debug).toHaveBeenCalledWith(`[${testPrefix}] ${message}`);
			});

			it('should log info messages with prefix', () => {
				const message = 'test info';
				logger.info(message);
				expect(console.info).toHaveBeenCalledWith(`[${testPrefix}] ${message}`);
			});

			it('should log warn messages with prefix', () => {
				const message = 'test warning';
				logger.warn(message);
				expect(console.warn).toHaveBeenCalledWith(`[${testPrefix}] ${message}`);
			});

			it('should log error messages with prefix', () => {
				const message = 'test error';
				logger.error(message);
				expect(console.error).toHaveBeenCalledWith(`[${testPrefix}] ${message}`);
			});

			it('should include additional arguments in log messages', () => {
				const message = 'test message';
				const additionalArgs = { key: 'value' };
				logger.debug(message, additionalArgs);
				expect(console.debug).toHaveBeenCalledWith(`[${testPrefix}] ${message}`, additionalArgs);
			});
		});

		describe('when in development mode', () => {
			beforeEach(async () => {
				vi.doMock('$app/environment', () => ({
					dev: true
				}));
				vi.doMock('$env/dynamic/private', () => ({
					env: {
						ENABLE_DEBUG_LOGGING: 'false'
					}
				}));

				const { Logger } = await import('./logging');
				logger = new Logger(testPrefix);
			});

			it('should log debug messages even if ENABLE_DEBUG_LOGGING is false', () => {
				const message = 'dev mode debug';
				logger.debug(message);
				expect(console.debug).toHaveBeenCalledWith(`[${testPrefix}] ${message}`);
			});
		});
	});

	describe('error handling', () => {
		beforeEach(async () => {
			const { Logger } = await import('./logging');
			logger = new Logger(testPrefix);
		});

		it('should handle undefined additional arguments', () => {
			const message = 'test message';
			logger.error(message, undefined);
			expect(console.error).toHaveBeenCalledWith(`[${testPrefix}] ${message}`, undefined);
		});

		it('should handle multiple additional arguments', () => {
			const message = 'test message';
			const arg1 = { key: 'value' };
			const arg2 = ['array'];
			const arg3 = 42;

			logger.info(message, arg1, arg2, arg3);
			expect(console.info).toHaveBeenCalledWith(`[${testPrefix}] ${message}`, arg1, arg2, arg3);
		});
	});
});
