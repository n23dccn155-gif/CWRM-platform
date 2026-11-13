import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('báo rõ DATABASE_URL khi thiếu', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
  });

  it('báo rõ PORT khi giá trị sai', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://localhost/cwrm', PORT: 'abc' }),
    ).toThrow('PORT');
  });

  it('điền giá trị mặc định cho port, origin CORS và môi trường', () => {
    expect(
      validateEnv({ DATABASE_URL: 'postgresql://localhost/cwrm' }),
    ).toEqual({
      databaseUrl: 'postgresql://localhost/cwrm',
      port: 3001,
      corsOrigins: ['http://localhost:3000'],
      nodeEnv: 'development',
    });
  });
});
