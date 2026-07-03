import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserStatus } from '../generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the database seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

const permissionsByRole = {
  admin: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'roles:create',
    'roles:read',
    'roles:update',
    'roles:delete',
    'permissions:create',
    'permissions:read',
    'permissions:update',
    'permissions:delete',
  ],
  customer: ['profile:read', 'profile:update'],
} as const;

const roles = [
  {
    name: 'admin',
    description: 'Administrator with full system access',
  },
  {
    name: 'customer',
    description: 'Customer account with access to customer features',
  },
] as const;

const users = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@dailygreens.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
    roleName: 'admin',
    fullName: 'Daily Greens Admin',
  },
  {
    email: process.env.SEED_CUSTOMER_EMAIL ?? 'customer@dailygreens.local',
    password: process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer@12345',
    roleName: 'customer',
    fullName: 'Daily Greens Customer',
  },
] as const;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
}

async function seedRoles() {
  return Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: {
          name: role.name,
        },
        update: {
          description: role.description,
        },
        create: role,
      }),
    ),
  );
}

async function seedPermissions() {
  const permissionNames = Object.values(permissionsByRole).flat();

  return Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: {
          name,
        },
        update: {},
        create: {
          name,
        },
      }),
    ),
  );
}

async function seedRolePermissions() {
  for (const [roleName, permissionNames] of Object.entries(permissionsByRole)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        name: roleName,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: [...permissionNames],
        },
      },
    });

    await Promise.all(
      permissions.map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            permissionId: permission.id,
          },
          update: {
            roleId: role.id,
          },
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        }),
      ),
    );
  }
}

async function seedUsers() {
  for (const user of users) {
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        name: user.roleName,
      },
    });

    const createdUser = await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        roleId: role.id,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: user.email,
        passwordHash: hashPassword(user.password),
        roleId: role.id,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.profile.upsert({
      where: {
        userId: createdUser.id,
      },
      update: {
        fullName: user.fullName,
      },
      create: {
        userId: createdUser.id,
        fullName: user.fullName,
      },
    });
  }
}

async function main() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedUsers();

  const [roleCount, permissionCount, userCount] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.user.count(),
  ]);

  console.log('Database seed completed.');
  console.log(`Roles: ${roleCount}`);
  console.log(`Permissions: ${permissionCount}`);
  console.log(`Users: ${userCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
