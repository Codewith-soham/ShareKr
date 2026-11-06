// Loaded before tests (see package.json "test" script) so env validation passes.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5433/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-0123456789';
process.env.OTP_PEPPER = 'test-otp-pepper-test-otp-pepper-0123456789';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.OTP_DELIVERY = 'console';
process.env.CLOUDINARY_CLOUD_NAME = 'sharekar-test';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-secret';
