import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';
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

function getRequiredSeedEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to run the database seed`);
  }

  return value;
}

const users = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@dailygreens.local',
    password: getRequiredSeedEnvironmentVariable('SEED_ADMIN_PASSWORD'),
    roleName: 'admin',
    fullName: 'Daily Greens Admin',
  },
  {
    email: process.env.SEED_CUSTOMER_EMAIL ?? 'customer@dailygreens.local',
    password: getRequiredSeedEnvironmentVariable('SEED_CUSTOMER_PASSWORD'),
    roleName: 'customer',
    fullName: 'Daily Greens Customer',
  },
] as const;

const deliveryZones = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Jakarta Pusat',
    description: 'Zona pengiriman untuk wilayah Jakarta Pusat',
    deliveryFee: 10000,
    minimumOrderAmount: 50000,
    freeDeliveryThreshold: 150000,
    estimatedMinMinutes: 30,
    estimatedMaxMinutes: 60,
    postalCodes: ['10110', '10120', '10130'],
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Jakarta Selatan',
    description: 'Zona pengiriman untuk wilayah Jakarta Selatan',
    deliveryFee: 15000,
    minimumOrderAmount: 75000,
    freeDeliveryThreshold: 200000,
    estimatedMinMinutes: 45,
    estimatedMaxMinutes: 90,
    postalCodes: ['12110', '12120', '12130'],
  },
];

function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
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
  return Promise.all(
    Object.entries(permissionsByRole).map(
      async ([roleName, permissionName]) => {
        const [role, permissions] = await Promise.all([
          prisma.role.findUniqueOrThrow({
            where: {
              name: roleName,
            },
          }),

          prisma.permission.findMany({
            where: {
              name: {
                in: [...permissionName],
              },
            },
          }),
        ]);

        return Promise.all(
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
      },
    ),
  );
}

async function seedUsers() {
  return Promise.all(
    users.map(async (user) => {
      const [passwordHash, role] = await Promise.all([
        hashPassword(user.password),

        prisma.role.findUniqueOrThrow({
          where: {
            name: user.roleName,
          },
        }),
      ]);

      const createdUser = await prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: {
          passwordHash,
          roleId: role.id,
          status: UserStatus.ACTIVE,
        },
        create: {
          email: user.email,
          passwordHash,
          roleId: role.id,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      return prisma.profile.upsert({
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
    }),
  );
}

async function seedDeliveryZones() {
  return Promise.all(
    deliveryZones.map((deliveryZone) =>
      prisma.$transaction(async (transaction) => {
        const deliveryZoneData = {
          name: deliveryZone.name,
          description: deliveryZone.description,
          deliveryFee: deliveryZone.deliveryFee,
          minimumOrderAmount: deliveryZone.minimumOrderAmount,
          freeDeliveryThreshold: deliveryZone.freeDeliveryThreshold,
          estimatedMinMinutes: deliveryZone.estimatedMinMinutes,
          estimatedMaxMinutes: deliveryZone.estimatedMaxMinutes,
          isActive: true,
          deletedAt: null,
        };

        await transaction.deliveryZone.upsert({
          where: {
            id: deliveryZone.id,
          },
          update: deliveryZoneData,
          create: {
            id: deliveryZone.id,
            ...deliveryZoneData,
          },
        });

        await transaction.deliveryZonePostalCode.deleteMany({
          where: {
            zoneId: deliveryZone.id,
            postalCode: {
              notIn: [...deliveryZone.postalCodes],
            },
          },
        });

        await Promise.all(
          deliveryZone.postalCodes.map((postalCode) =>
            transaction.deliveryZonePostalCode.upsert({
              where: {
                postalCode,
              },
              update: {
                zoneId: deliveryZone.id,
              },
              create: {
                zoneId: deliveryZone.id,
                postalCode,
              },
            }),
          ),
        );
      }),
    ),
  );
}

async function main() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedUsers();
  await seedDeliveryZones();

  const [
    roleCount,
    permissionCount,
    userCount,
    deliveryZoneCount,
    deliveryPostalCodeCount,
  ] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.user.count(),
    prisma.deliveryZone.count(),
    prisma.deliveryZonePostalCode.count(),
  ]);

  console.log('Database seed completed.');
  console.log(`Roles: ${roleCount}`);
  console.log(`Permissions: ${permissionCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Delivery zones: ${deliveryZoneCount}`);
  console.log(`Delivery postal code: ${deliveryPostalCodeCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
