import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test organization
  const org = await prisma.organization.upsert({
    where: { id: 'test-org-id' },
    update: {},
    create: {
      id: 'test-org-id',
      name: 'Test Organization',
    },
  });
  console.log('✅ Created organization:', org.name);

  // Create test user with hashed password
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      id: 'test-user-id',
      email: 'admin@test.com',
      name: 'Test Admin',
      password_hash: passwordHash,
      email_verified: true, // Pre-verified for testing
    },
  });
  console.log('✅ Created user:', user.email);

  // Create membership (link user to org)
  const membership = await prisma.membership.upsert({
    where: { 
      orgId_userId: {
        orgId: org.id,
        userId: user.id,
      }
    },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  });
  console.log('✅ Created membership with role:', membership.role);

  console.log('\n🎉 Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Email: admin@test.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
