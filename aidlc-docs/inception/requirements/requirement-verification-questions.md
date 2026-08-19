# Requirements Verification Questions

**Stage**: INCEPTION - Requirements Analysis
**Created**: 2026-08-19T07:27:43Z
**Status**: Awaiting your answers

## Why these questions exist

Your request was to run the AI-DLC process. Workspace detection confirmed this is a **greenfield** project: there is no source code, no build manifest, and no prior AI-DLC state in `/Users/sehoonbyun/Documents/prompthon`. That means there is nothing in the workspace that tells me what you want to build, so I cannot infer requirements from existing code.

Round 1 below establishes **what** we are building and the key context around it. Once I have that, I may create a short follow-up round for details that only make sense after the product is known (data model specifics, integration contracts, and similar).

## How to answer

- For each question, put your choice after the `[Answer]:` tag.
- Use the letter only (for example `[Answer]: B`).
- If none of the options fit, use `X` and describe what you want after the tag (for example `[Answer]: X - a Slack bot instead`).
- Section 0 is free text, not multiple choice. Please write directly under it.
- Tell me when you are done and I will read this file and continue.

---

## Section 0: Project Description (REQUIRED - free text)

In your own words, describe what you want to build. A few sentences is enough. Helpful things to include: the problem it solves, who uses it, and what a successful demo looks like.

**Your description**:

Characterizing LG products encompassing beatuy, life to niche products with AI.

Target: B2C(All LG customers who owns any kind of LG product)

Problem: Current ThinQ app lacks AI native features like skills, chat interaction, and most of all boring.
We are attempting to change all experience of using LG products by integrating AI with characterization(like gaming).

Core concept:
- No more little buttons or bars for every settings, AI agents will handle it with either voice or chat.
- Based on the accumulated user data from products, AI will discover useful skills that give personalized experience and impression of self-improving just like smartphones with new OS updates.
- An AI agent - a product - a character, 1:1:1 relation. -> The more you use, more your character learns -> exp gained -> personalized skills, refined in every iteration.
---

## Question 1
Which category best describes what you want to build?

A) Web application (browser UI plus backend)

B) Backend API or service (no UI, consumed by other clients)

C) CLI tool or developer utility

D) Data or AI pipeline (ingest, process, generate)

E) AI agent or chatbot application

F) Mobile application

X) Other (please describe after [Answer]: tag below)

[Answer]: E and F(But using Web browser)

## Question 2
Your `.env-example` asks for an `AWS_PROFILE`, which suggests AWS is involved. How should AWS factor into this project?

A) AWS is central - build on AWS services (Lambda, DynamoDB, Bedrock, S3, etc.)

B) AWS is used for a specific capability only (for example Bedrock for AI, S3 for storage)

C) AWS is optional - prefer running locally, cloud later

D) No AWS - the profile is leftover from unrelated setup

X) Other (please describe after [Answer]: tag below)

[Answer]: A(Bedrock, Storage, AWS Polly, EC2, etc).

## Question 3
Who are the primary users of this system?

A) Just me (personal tool or experiment)

B) A small internal team

C) Hackathon judges and demo audience

D) External end users (public or customer-facing)

E) Other developers (library, SDK, or platform consumers)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 4
What is the intended lifespan and quality bar for this build?

A) Throwaway prototype - speed over everything, will not be maintained

B) Hackathon demo - must work reliably for a live demo, may evolve later

C) Internal tool - will be maintained and used regularly

D) Production system - real users, real data, needs full rigor

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
Do you have a preferred language and stack, or should I recommend one?

A) Python

B) TypeScript / Node.js

C) Java

D) Go

E) No preference - recommend the best fit for the requirements

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6
What are the data persistence needs?

A) None - stateless, nothing is stored between runs

B) Local files only (JSON, SQLite, CSV on disk)

C) Managed NoSQL (DynamoDB or similar)

D) Relational database (PostgreSQL, MySQL, Aurora)

E) Not sure yet - decide during design

X) Other (please describe after [Answer]: tag below)

[Answer]: E

## Question 7
Does the system need user authentication or access control?

A) No auth - open access or single local user

B) Simple shared secret or API key

C) Full user accounts with login (Cognito, OAuth, or similar)

D) Not sure yet - decide during design

X) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 8
How much time do you have for this build?

A) Hours - need something working today

B) A day or two

C) About a week

D) Several weeks or longer

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 9
How would you like AI-DLC itself to run for this project?

A) Full rigor - run all applicable stages with approval gates at each one

B) Lean - run only essential stages (Requirements, Workflow Planning, Code Generation, Build and Test) and skip conditional design stages where reasonable

C) Let the workflow decide adaptively and show me the plan before executing

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

# Extension Opt-In Questions

Three AI-DLC extensions are available in this workspace. Rules for an extension are only loaded and enforced if you opt in. Enabled extension rules become **blocking constraints** at every applicable stage.

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: Balanced approach, simple guardrail and secruity that can be easily implemented should exist(LITE)

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early — it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate — not a finished, production-certified result.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: Balanced, code should follow YAGNI

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: B
