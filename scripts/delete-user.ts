/**
 * Delete User Script
 * Usage: pnpm tsx scripts/delete-user.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
  console.error('Usage: pnpm tsx scripts/delete-user.ts <email>');
  process.exit(1);
}

async function deleteUser(email: string) {
  console.log(`🔍 Looking for user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      members: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`❌ User not found: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name} (${user.email})`);
  console.log(`   User ID: ${user.id}`);
  
  if (user.members.length > 0) {
    console.log(`   Organizations: ${user.members.length}`);
    user.members.forEach((m) => {
      console.log(`     - ${m.org.name} (${m.orgId}) - Role: ${m.role}`);
    });
  }

  // Delete in correct order (respecting foreign keys)
  console.log('\n🗑️  Deleting user data...');

  // 1. Delete memberships
  if (user.members.length > 0) {
    await prisma.membership.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✅ Deleted ${user.members.length} membership(s)`);
  }

  // 2. Delete organizations if user was the only member
  for (const member of user.members) {
    const otherMembers = await prisma.membership.count({
      where: { orgId: member.orgId },
    });

    if (otherMembers === 0) {
      // Check for projects in this org
      const projects = await prisma.project.findMany({
        where: { orgId: member.orgId },
      });

      if (projects.length > 0) {
        console.log(`   ⚠️  Organization ${member.org.name} has ${projects.length} project(s), deleting them...`);
        
        for (const project of projects) {
          // Delete sidecar tokens
          await prisma.sidecarToken.deleteMany({
            where: { projectId: project.id },
          });

          // Delete runs and related data
          const runs = await prisma.run.findMany({
            where: { projectId: project.id },
          });

          for (const run of runs) {
            // Delete story steps
            await prisma.storyStep.deleteMany({
              where: { runId: run.id },
            });

            // Delete findings
            await prisma.finding.deleteMany({
              where: { runId: run.id },
            });

            // Delete events
            await prisma.event.deleteMany({
              where: { runId: run.id },
            });

            // Delete script results
            await prisma.scriptResult.deleteMany({
              where: { runId: run.id },
            });
          }

          // Delete runs
          await prisma.run.deleteMany({
            where: { projectId: project.id },
          });

          // Delete project
          await prisma.project.delete({
            where: { id: project.id },
          });
        }
      }

      // Delete organization
      await prisma.organization.delete({
        where: { id: member.orgId },
      });
      console.log(`   ✅ Deleted organization: ${member.org.name}`);
    }
  }

  // 3. Delete user
  await prisma.user.delete({
    where: { id: user.id },
  });
  console.log(`   ✅ Deleted user: ${email}`);

  console.log('\n✅ User and all related data deleted successfully!');
}

deleteUser(email)
  .catch((error) => {
    console.error('❌ Error deleting user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
