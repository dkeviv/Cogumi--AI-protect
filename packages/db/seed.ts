import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with demo data...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org-1' },
    update: {},
    create: {
      id: 'demo-org-1',
      name: 'Demo Organization',
    },
  });
  console.log('✅ Created organization:', org.name);

  // Create demo user with hashed password
  const passwordHash = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@cogumi.ai' },
    update: {},
    create: {
      id: 'demo-user-1',
      email: 'demo@cogumi.ai',
      name: 'Demo User',
      password_hash: passwordHash,
      email_verified: true, // Pre-verified for demo
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

  // Create demo project pre-configured for demo-agent
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      orgId: org.id,
      name: 'Demo Agent Security Test',
      environment: 'sandbox',
      agentTestUrl: 'http://demo-agent:3001/chat',
      prodOverrideEnabled: false,
      retentionDays: 30,
      toolDomains: ['api.openrouter.ai', 'openrouter.ai'],
      internalSuffixes: ['cogumi.ai', 'localhost'],
    },
  });
  console.log('✅ Created project:', project.name);

  // Create sidecar token for demo
  const tokenValue = `demo_${crypto.randomBytes(32).toString('hex')}`;
  const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');

  await prisma.sidecarToken.upsert({
    where: { id: 'demo-token-1' },
    update: {},
    create: {
      id: 'demo-token-1',
      orgId: org.id,
      projectId: project.id,
      tokenHash: tokenHash,
      status: 'active',
    },
  });

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Demo database seeded successfully!');
  console.log('='.repeat(70));
  console.log('\n📧 LOGIN CREDENTIALS:');
  console.log('   Email:    demo@cogumi.ai');
  console.log('   Password: demo123');
  console.log('\n🔑 SIDECAR TOKEN (copy this):');
  console.log(`   ${tokenValue}`);
  console.log('\n🚀 QUICK START:');
  console.log('   1. Open http://localhost:3000 and login');
  console.log('   2. Go to project "Demo Agent Security Test"');
  console.log('   3. Start sidecar:');
  console.log(`      ./apps/sidecar/start-demo.sh ${tokenValue}`);
  console.log('   4. Click "Run Tests" in the UI');
  console.log('\n' + '='.repeat(70));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
