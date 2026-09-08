import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('should create an Argon2id hash', async () => {
    const password = 'Password123';

    const passwordHash = await service.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toBe(password);
  });

  it('should verify the correct password', async () => {
    const password = 'Password123';
    const passwordHash = await service.hash(password);

    const passwordMatches = await service.verify(passwordHash, password);

    expect(passwordMatches).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const passwordHash = await service.hash('Password123');

    const passwordMatches = await service.verify(
      passwordHash,
      'WrongPassword123',
    );

    expect(passwordMatches).toBe(false);
  });

  it('should reject an invalid or legacy hash without throwing an error', async () => {
    const passwordMatches = await service.verify(
      'scrypt$old-salt$old-hash',
      'Password123',
    );

    expect(passwordMatches).toBe(false);
  });
});
