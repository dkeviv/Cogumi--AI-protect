--
-- PostgreSQL database dump
--

\restrict AppR259j795R2hgnn0wEJA2VR2c9Yd3K5WErfhOer5zAMeRQeLTBEdTRJvjysS1

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: FindingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FindingStatus" AS ENUM (
    'confirmed',
    'attempted',
    'suspected'
);


ALTER TYPE public."FindingStatus" OWNER TO postgres;

--
-- Name: ProjectEnv; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectEnv" AS ENUM (
    'sandbox',
    'staging',
    'prod'
);


ALTER TYPE public."ProjectEnv" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'OWNER',
    'ADMIN',
    'MEMBER',
    'VIEWER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: RunStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RunStatus" AS ENUM (
    'queued',
    'running',
    'completed',
    'failed',
    'canceled',
    'stopped_quota'
);


ALTER TYPE public."RunStatus" OWNER TO postgres;

--
-- Name: Severity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Severity" AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'info'
);


ALTER TYPE public."Severity" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "projectId" text NOT NULL,
    "runId" text,
    ts timestamp(3) without time zone NOT NULL,
    seq integer,
    channel text NOT NULL,
    type text NOT NULL,
    actor text NOT NULL,
    host text NOT NULL,
    path text,
    port integer,
    classification text,
    method text,
    "statusCode" integer,
    "bytesOut" integer,
    "bytesIn" integer,
    "durationMs" integer,
    "payloadRedacted" jsonb,
    matches jsonb,
    "integrityHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Event" OWNER TO postgres;

--
-- Name: Finding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Finding" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "runId" text NOT NULL,
    "scriptId" text NOT NULL,
    title text NOT NULL,
    severity public."Severity" NOT NULL,
    status public."FindingStatus" NOT NULL,
    score integer NOT NULL,
    confidence double precision NOT NULL,
    summary text NOT NULL,
    "evidenceEventIds" text[] DEFAULT ARRAY[]::text[],
    "narrativeSteps" jsonb,
    "remediationMd" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Finding" OWNER TO postgres;

--
-- Name: Membership; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Membership" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "userId" text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Membership" OWNER TO postgres;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "maxEventsPerRun" integer DEFAULT 10000 NOT NULL,
    "maxProjects" integer DEFAULT 5 NOT NULL,
    "maxRunsPerMonth" integer DEFAULT 100 NOT NULL,
    "maxStorageMB" integer DEFAULT 1000 NOT NULL
);


ALTER TABLE public."Organization" OWNER TO postgres;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    name text NOT NULL,
    environment public."ProjectEnv" DEFAULT 'sandbox'::public."ProjectEnv" NOT NULL,
    "prodOverrideEnabled" boolean DEFAULT false NOT NULL,
    "agentTestUrl" text,
    "toolDomains" text[] DEFAULT ARRAY[]::text[],
    "internalSuffixes" text[] DEFAULT ARRAY[]::text[],
    "retentionDays" integer DEFAULT 7 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: ProjectRedTeamConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectRedTeamConfig" (
    "projectId" text NOT NULL,
    "enabledStyleIds" text[] DEFAULT ARRAY[]::text[],
    intensity text DEFAULT 'low'::text NOT NULL,
    "versionPin" text DEFAULT 'v1'::text
);


ALTER TABLE public."ProjectRedTeamConfig" OWNER TO postgres;

--
-- Name: PromptVariant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PromptVariant" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "projectId" text NOT NULL,
    "scriptId" text NOT NULL,
    "scriptStepId" text NOT NULL,
    "styleId" text NOT NULL,
    version text DEFAULT 'v1'::text NOT NULL,
    "promptText" text NOT NULL,
    source text DEFAULT 'builtin'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone
);


ALTER TABLE public."PromptVariant" OWNER TO postgres;

--
-- Name: Report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Report" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "runId" text NOT NULL,
    format text DEFAULT 'markdown'::text NOT NULL,
    "contentMd" text NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Report" OWNER TO postgres;

--
-- Name: Run; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Run" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "projectId" text NOT NULL,
    status public."RunStatus" DEFAULT 'queued'::public."RunStatus" NOT NULL,
    "riskScore" integer,
    "startedAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);


ALTER TABLE public."Run" OWNER TO postgres;

--
-- Name: ScriptResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ScriptResult" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "runId" text NOT NULL,
    "scriptId" text NOT NULL,
    score integer NOT NULL,
    severity public."Severity" NOT NULL,
    confidence double precision NOT NULL,
    status text NOT NULL,
    summary text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ScriptResult" OWNER TO postgres;

--
-- Name: SidecarToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SidecarToken" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "projectId" text NOT NULL,
    "tokenHash" text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "lastSeenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tokenPrefix" text
);


ALTER TABLE public."SidecarToken" OWNER TO postgres;

--
-- Name: StoryStep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StoryStep" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "runId" text NOT NULL,
    ts timestamp(3) without time zone NOT NULL,
    "seqStart" integer,
    "seqEnd" integer,
    "scriptId" text,
    "stepKind" text NOT NULL,
    severity public."Severity" NOT NULL,
    "claimTitle" text NOT NULL,
    "claimSummary" text NOT NULL,
    "attackStyle" text,
    "evidenceEventIds" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StoryStep" OWNER TO postgres;

--
-- Name: StylePreset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StylePreset" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    "enabledByDefault" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."StylePreset" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "passwordHash" text,
    "emailVerificationExpires" timestamp(3) without time zone,
    "emailVerificationToken" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Event" (id, "orgId", "projectId", "runId", ts, seq, channel, type, actor, host, path, port, classification, method, "statusCode", "bytesOut", "bytesIn", "durationMs", "payloadRedacted", matches, "integrityHash", "createdAt") FROM stdin;
\.


--
-- Data for Name: Finding; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Finding" (id, "orgId", "runId", "scriptId", title, severity, status, score, confidence, summary, "evidenceEventIds", "narrativeSteps", "remediationMd", "createdAt") FROM stdin;
\.


--
-- Data for Name: Membership; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Membership" (id, "orgId", "userId", role, "createdAt") FROM stdin;
44821c8a-9208-4ec9-b9ac-abbe3200d497	0c176493-2a1d-4d84-b6b3-789a0bcbff44	0a10fe37-d1e2-4fab-8501-4e62dbe8e280	OWNER	2026-02-04 21:51:51.808
02b83b98-775f-46aa-8b44-a05121e41e62	eb9e08f8-7099-4d59-83f7-95f7d356c6e3	67b2628d-0ea0-4dcb-bcb5-aae4c46defb8	OWNER	2026-02-04 21:51:53.573
1e6c9cf9-864e-42c9-b950-2bed87ca0b9e	ecc92df2-fd54-44c2-847a-173f4c7cbcac	6825ca56-b274-477a-b7a1-06ecaacebc22	OWNER	2026-02-04 21:51:55.306
522e9daf-510b-41b7-93ba-c7530f557a68	fe832765-92ce-4ef7-89cb-4552f9d13df4	47e8388a-ac5d-480a-afc0-f3b18899a877	OWNER	2026-02-04 21:51:57.071
aa67c861-d4a2-4eda-9603-f14f98b55565	e5693da1-d0f5-4182-9e70-0e73e8a16739	fa3417fe-be35-4b5e-91f8-a623bdb95e48	OWNER	2026-02-04 22:07:31.122
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Organization" (id, name, "createdAt", "maxEventsPerRun", "maxProjects", "maxRunsPerMonth", "maxStorageMB") FROM stdin;
0c176493-2a1d-4d84-b6b3-789a0bcbff44	Test Org	2026-02-04 21:51:51.802	10000	5	100	1000
eb9e08f8-7099-4d59-83f7-95f7d356c6e3	Test Org	2026-02-04 21:51:53.57	10000	5	100	1000
ecc92df2-fd54-44c2-847a-173f4c7cbcac	Test Org	2026-02-04 21:51:55.305	10000	5	100	1000
fe832765-92ce-4ef7-89cb-4552f9d13df4	Test Org	2026-02-04 21:51:57.069	10000	5	100	1000
e5693da1-d0f5-4182-9e70-0e73e8a16739	Cogumi	2026-02-04 22:07:31.108	10000	5	100	1000
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, "orgId", name, environment, "prodOverrideEnabled", "agentTestUrl", "toolDomains", "internalSuffixes", "retentionDays", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProjectRedTeamConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectRedTeamConfig" ("projectId", "enabledStyleIds", intensity, "versionPin") FROM stdin;
\.


--
-- Data for Name: PromptVariant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PromptVariant" (id, "orgId", "projectId", "scriptId", "scriptStepId", "styleId", version, "promptText", source, "createdAt", "lastUsedAt") FROM stdin;
\.


--
-- Data for Name: Report; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Report" (id, "orgId", "runId", format, "contentMd", "generatedAt") FROM stdin;
\.


--
-- Data for Name: Run; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Run" (id, "orgId", "projectId", status, "riskScore", "startedAt", "endedAt", "createdAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: ScriptResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ScriptResult" (id, "orgId", "runId", "scriptId", score, severity, confidence, status, summary, "createdAt") FROM stdin;
\.


--
-- Data for Name: SidecarToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SidecarToken" (id, "orgId", "projectId", "tokenHash", status, "lastSeenAt", "createdAt", "tokenPrefix") FROM stdin;
\.


--
-- Data for Name: StoryStep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StoryStep" (id, "orgId", "runId", ts, "seqStart", "seqEnd", "scriptId", "stepKind", severity, "claimTitle", "claimSummary", "attackStyle", "evidenceEventIds", "createdAt") FROM stdin;
\.


--
-- Data for Name: StylePreset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StylePreset" (id, name, description, "enabledByDefault") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, "createdAt", "emailVerified", "passwordHash", "emailVerificationExpires", "emailVerificationToken") FROM stdin;
0a10fe37-d1e2-4fab-8501-4e62dbe8e280	ratelimit-test-1@example.com	Test User	2026-02-04 21:51:51.807	f	$2b$10$i3C9Kj3gRj3PIXWHE4VIPuv2skRDWZG1ULZhwIUjXi0NwwGCDFcpu	2026-02-05 21:51:51.798	e98899558a5aab3a1efd60af1c761e221860235e08f135d9e7eb38399efb9a36
67b2628d-0ea0-4dcb-bcb5-aae4c46defb8	ratelimit-test-2@example.com	Test User	2026-02-04 21:51:53.572	f	$2b$10$OZ8pruOxCANUp1BMpUoi2O2.FmzO.mV1vP1mrxfgSyR2d1FEf09/u	2026-02-05 21:51:53.568	813d5feb1bc7138bc8626002d574597d54190e31de158f26c1bf555275ce59e1
6825ca56-b274-477a-b7a1-06ecaacebc22	ratelimit-test-3@example.com	Test User	2026-02-04 21:51:55.306	f	$2b$10$2judRCwWnCe4iXoptueJIeDDEGvdYvE2Kv5HcOEuEDkuV30vgeRam	2026-02-05 21:51:55.303	4737b3aab4614b79e36f0af145982781407f19171b33b579938665779a9575a0
47e8388a-ac5d-480a-afc0-f3b18899a877	ratelimit-test-4@example.com	Test User	2026-02-04 21:51:57.07	f	$2b$10$mbIA6lDR0WVuSmR71y9YJ.7e36UFHNd8IFICbzW9kC3uhO5e28OSa	2026-02-05 21:51:57.066	56ccc9b2c8f6555501196dd50d5b6b3d38df68d61420d48845200c2ba5d3e171
fa3417fe-be35-4b5e-91f8-a623bdb95e48	dkeviv@gmail.com	Vivek Chakravarthy Durairaj	2026-02-04 22:07:31.119	t	$2b$10$EdDyXOsgAjYKWmyWzd5ixe9RrDXGh5VM26u3FZYKb.CNpKQL.5FJq	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c06aa514-3ae7-4aeb-a324-4e8c231a5c37	3112a6170ff52cb7bc52a0d0dd5326fa7931d6bc7778c67b205dc2937322b649	2026-02-04 18:19:37.014576+00	20260203210907_add_org_quotas	\N	\N	2026-02-04 18:19:36.965221+00	1
433b4ca8-9696-4df0-92e0-7b68710361b7	d2d70fdfd1e469483f0d4bb71352d0d402b5211614bed5d4f28cdb148952bfd4	2026-02-04 19:19:14.684174+00	20260204191914_add_organization_quotas	\N	\N	2026-02-04 19:19:14.680916+00	1
3ab274b9-6c1f-4e69-b174-51e9df4551c4	85031a7829c5a7feae9d323ad4864a7d3cd35cc62f439d57262217c2f97b8a98	2026-02-04 19:33:18.962223+00	20260204193318_add_email_verification_fields	\N	\N	2026-02-04 19:33:18.959461+00	1
3d309954-b99b-486e-a03d-7dde94be98c3	7625bad6f61528bc4d8956f65633b3d72e4f3ce377718bd871a15c0a6c900340	2026-02-04 22:47:35.477495+00	20260204224735_add_token_prefix	\N	\N	2026-02-04 22:47:35.47333+00	1
\.


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: Finding Finding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Finding"
    ADD CONSTRAINT "Finding_pkey" PRIMARY KEY (id);


--
-- Name: Membership Membership_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: ProjectRedTeamConfig ProjectRedTeamConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectRedTeamConfig"
    ADD CONSTRAINT "ProjectRedTeamConfig_pkey" PRIMARY KEY ("projectId");


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: PromptVariant PromptVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromptVariant"
    ADD CONSTRAINT "PromptVariant_pkey" PRIMARY KEY (id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: Run Run_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Run"
    ADD CONSTRAINT "Run_pkey" PRIMARY KEY (id);


--
-- Name: ScriptResult ScriptResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ScriptResult"
    ADD CONSTRAINT "ScriptResult_pkey" PRIMARY KEY (id);


--
-- Name: SidecarToken SidecarToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SidecarToken"
    ADD CONSTRAINT "SidecarToken_pkey" PRIMARY KEY (id);


--
-- Name: StoryStep StoryStep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StoryStep"
    ADD CONSTRAINT "StoryStep_pkey" PRIMARY KEY (id);


--
-- Name: StylePreset StylePreset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StylePreset"
    ADD CONSTRAINT "StylePreset_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Event_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Event_orgId_idx" ON public."Event" USING btree ("orgId");


--
-- Name: Event_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Event_projectId_idx" ON public."Event" USING btree ("projectId");


--
-- Name: Event_runId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Event_runId_idx" ON public."Event" USING btree ("runId");


--
-- Name: Finding_runId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Finding_runId_idx" ON public."Finding" USING btree ("runId");


--
-- Name: Membership_orgId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Membership_orgId_userId_key" ON public."Membership" USING btree ("orgId", "userId");


--
-- Name: PromptVariant_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PromptVariant_orgId_idx" ON public."PromptVariant" USING btree ("orgId");


--
-- Name: PromptVariant_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PromptVariant_projectId_idx" ON public."PromptVariant" USING btree ("projectId");


--
-- Name: PromptVariant_projectId_scriptId_scriptStepId_styleId_versi_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PromptVariant_projectId_scriptId_scriptStepId_styleId_versi_key" ON public."PromptVariant" USING btree ("projectId", "scriptId", "scriptStepId", "styleId", version);


--
-- Name: Report_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Report_orgId_idx" ON public."Report" USING btree ("orgId");


--
-- Name: Report_runId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Report_runId_key" ON public."Report" USING btree ("runId");


--
-- Name: Run_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Run_orgId_idx" ON public."Run" USING btree ("orgId");


--
-- Name: Run_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Run_projectId_idx" ON public."Run" USING btree ("projectId");


--
-- Name: ScriptResult_runId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ScriptResult_runId_idx" ON public."ScriptResult" USING btree ("runId");


--
-- Name: SidecarToken_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SidecarToken_orgId_idx" ON public."SidecarToken" USING btree ("orgId");


--
-- Name: SidecarToken_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SidecarToken_projectId_idx" ON public."SidecarToken" USING btree ("projectId");


--
-- Name: SidecarToken_tokenPrefix_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SidecarToken_tokenPrefix_idx" ON public."SidecarToken" USING btree ("tokenPrefix");


--
-- Name: StoryStep_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StoryStep_orgId_idx" ON public."StoryStep" USING btree ("orgId");


--
-- Name: StoryStep_runId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StoryStep_runId_idx" ON public."StoryStep" USING btree ("runId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Event Event_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Event Event_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."Run"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Finding Finding_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Finding"
    ADD CONSTRAINT "Finding_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."Run"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Membership Membership_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Membership Membership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectRedTeamConfig ProjectRedTeamConfig_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectRedTeamConfig"
    ADD CONSTRAINT "ProjectRedTeamConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PromptVariant PromptVariant_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromptVariant"
    ADD CONSTRAINT "PromptVariant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Report Report_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."Run"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Run Run_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Run"
    ADD CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ScriptResult ScriptResult_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ScriptResult"
    ADD CONSTRAINT "ScriptResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."Run"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SidecarToken SidecarToken_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SidecarToken"
    ADD CONSTRAINT "SidecarToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StoryStep StoryStep_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StoryStep"
    ADD CONSTRAINT "StoryStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."Run"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict AppR259j795R2hgnn0wEJA2VR2c9Yd3K5WErfhOer5zAMeRQeLTBEdTRJvjysS1

