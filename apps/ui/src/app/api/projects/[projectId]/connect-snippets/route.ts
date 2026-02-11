import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * GET /api/projects/[projectId]/connect-snippets
 * 
 * Returns:
 * - docker-compose.yml template with sidecar configuration
 * - .env template with environment variables
 * - Connection verification instructions
 * 
 * Automatically generates a new sidecar token if none exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const projectId = params.projectId;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId },
      select: {
        id: true,
        name: true,
        environment: true,
        agentTestUrl: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get or create active token
    let token = await prisma.sidecarToken.findFirst({
      where: { projectId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    let plaintextToken: string | null = null;

    if (!token) {
      // Generate new token (same format as POST /api/projects/[projectId]/tokens)
      plaintextToken = `cog_${randomBytes(32).toString('hex')}`;
      const tokenHash = await bcrypt.hash(plaintextToken, 10);
      const tokenPrefix = plaintextToken.substring(0, 8);

      token = await prisma.sidecarToken.create({
        data: {
          projectId,
          orgId,
          tokenHash,
          tokenPrefix,
          status: 'active',
        },
      });
    }

    // Get API URL from environment (defaults to production)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.cogumi.io';

    // Generate docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  cogumi-sidecar:
    image: cogumi/sidecar:latest
    container_name: cogumi-sidecar
    ports:
      - "8080:8080"
    environment:
      - COGUMI_TOKEN=${plaintextToken || '${COGUMI_TOKEN}'}
      - COGUMI_API_URL=${apiUrl}
      - LOG_LEVEL=info
      - CAPTURE_HTTP=true
      - CAPTURE_HTTPS_METADATA=true
    restart: unless-stopped
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
`;

    // Generate .env template
    const envTemplate = `# COGUMI AI Protect Environment Variables

# Proxy configuration (add to your agent's environment)
HTTP_PROXY=http://localhost:8080
HTTPS_PROXY=http://localhost:8080
NO_PROXY=localhost,127.0.0.1

# Sidecar authentication token${plaintextToken ? '' : ' (REPLACE WITH YOUR TOKEN)'}
COGUMI_TOKEN=${plaintextToken || 'YOUR_TOKEN_HERE'}

# API endpoint
COGUMI_API_URL=${apiUrl}

# Project configuration
PROJECT_ID=${projectId}
PROJECT_NAME=${project.name}
ENVIRONMENT=${project.environment}

# Optional: Agent test endpoint
${project.agentTestUrl ? `AGENT_TEST_URL=${project.agentTestUrl}` : '# AGENT_TEST_URL=http://localhost:3000/api/chat'}
`;

    // Generate verification instructions
    const verifyInstructions = `# Verify Sidecar Connection

## Step 1: Start the sidecar
\`\`\`bash
docker-compose up -d
\`\`\`

## Step 2: Check sidecar logs
\`\`\`bash
docker-compose logs -f cogumi-sidecar
\`\`\`

You should see:
- ✓ Sidecar proxy started on :8080
- ✓ Connected to COGUMI API at ${apiUrl}
- ✓ Heartbeat successful

## Step 3: Test proxy connection
\`\`\`bash
# Set proxy environment variables
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

# Make a test request
curl -v https://httpbin.org/get
\`\`\`

## Step 4: Start your AI agent
Configure your agent to use the proxy:

\`\`\`bash
HTTP_PROXY=http://localhost:8080 \\
HTTPS_PROXY=http://localhost:8080 \\
python your_agent.py
\`\`\`

## Troubleshooting

**Sidecar not starting?**
- Check Docker is running: \`docker ps\`
- Check logs: \`docker-compose logs cogumi-sidecar\`
- Verify token is set correctly in docker-compose.yml

**Connection refused?**
- Ensure port 8080 is not in use: \`lsof -i :8080\`
- Check firewall settings

**Heartbeat failing?**
- Verify COGUMI_API_URL is reachable
- Check token is valid (not revoked)
- Review sidecar logs for authentication errors
`;

    return NextResponse.json({
      dockerCompose,
      envTemplate,
      verifyInstructions,
      tokenGenerated: Boolean(plaintextToken),
      tokenValue: plaintextToken, // Only returned if just generated
      tokenId: token.id,
      apiUrl,
    });
  } catch (error) {
    console.error('Error generating connect snippets:', error);
    return NextResponse.json(
      { error: 'Failed to generate connect snippets' },
      { status: 500 }
    );
  }
}
