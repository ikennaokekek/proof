# PROOF --- Master Product & Engineering Specification

**Status:** Living specification\
**Version:** 0.1\
**Purpose:** Canonical source of truth for the PROOF investor-ready MVP
and its path to a production full-stack platform.

------------------------------------------------------------------------

# 1. Executive Concept

## One-sentence definition

**PROOF is an independent verification layer that lets people and
businesses confirm who is really behind a digital interaction and what
they actually authorized.**

## Plain-English definition

PROOF does not primarily attempt to determine whether a voice, video,
email, WhatsApp message, Teams message, or other communication is fake.

Instead, PROOF goes around the potentially compromised communication
channel and independently asks the previously enrolled, trusted person
whether they authorized the exact action being attributed to them.

Example:

1.  Ben receives a message apparently from Ikenna asking him to transfer
    €40,000.
2.  Ben does not need to determine whether the message, voice, or video
    is genuine.
3.  Ben creates a PROOF request containing the exact transaction
    details.
4.  PROOF contacts Ikenna through his previously enrolled PROOF
    identity/credential.
5.  Ikenna authenticates, reviews the exact action, and approves or
    rejects it.
6.  PROOF returns the resulting verification state and records the
    evidence.

The central principle is:

> **Do not try to beat the deepfake. Go around it and independently ask
> the trusted human.**

------------------------------------------------------------------------

# 2. The Secret Security Door Analogy

Think of PROOF as a secret security door between two people.

The suspicious interaction exists in an untrusted world:

``` text
WhatsApp / Email / Phone / Teams / Video
                    |
                    v
         "Ikenna asked for €40,000"
                    |
                    v
                   Ben
```

Ben then uses a separate trusted path:

``` text
Ben
 |
 | REQUEST PROOF
 v
PROOF
 |
 | independent challenge
 v
Previously enrolled Ikenna credential
 |
 +---- APPROVE ----> VERIFIED
 |
 +---- REJECT -----> REJECTED
```

The attacker does not need to be detected or defeated by PROOF. The
attacker's communication channel does not count as authorization.

------------------------------------------------------------------------

# 3. Problem Statement

AI and account compromise increasingly weaken the evidentiary value of
digital communications. Voices, faces, video, writing styles, email
identities, and messaging identities may be impersonated or compromised.

Businesses still make consequential decisions based on these channels,
including:

-   Payments
-   Supplier bank-detail changes
-   Payroll changes
-   Password resets
-   Account recovery
-   Sensitive administrative instructions
-   Contracts
-   Sensitive data exports

PROOF provides a separate, previously established trust path through
which an enrolled person can authenticate and explicitly approve or
reject the exact action attributed to them.

------------------------------------------------------------------------

# 4. What PROOF Establishes

PROOF must preserve a strict assurance boundary.

PROOF should **not** claim:

> "This transaction is safe."

or:

> "This transaction is legitimate."

The intended assurance is narrower:

> **The required enrolled credential authenticated, and the
> authenticated person explicitly authorized these specific transaction
> details.**

Authentication and authorization are distinct:

-   **Authentication:** Is the expected enrolled credential/person
    authenticating?
-   **Authorization:** Did that authenticated person approve this exact
    action?

PROOF does not claim that a correctly authenticated person cannot be
mistaken, coerced, compromised, or deceived.

------------------------------------------------------------------------

# 5. PROOF's Five Core Laws

These five principles are PROOF's core product DNA.

## Law 1 --- Human Authorization

Consequential protected actions can require authorization by an
appropriate enrolled human.

AI-generated messages, voices, videos, or writing do not themselves
constitute authorization for protected actions.

## Law 2 --- Transaction Binding

Authorization applies to the exact material action presented to the
approver.

Examples of material fields include:

-   Amount
-   Currency
-   Recipient
-   Destination account
-   Purpose
-   Action type
-   Relevant transaction/reference identifiers

A material change requires new authorization.

## Law 3 --- Risk-Based Controls

Organizations can require stronger verification as risk increases.

Example:

-   €0--€10,000 → Finance Manager
-   €10,000--€50,000 → Finance Director
-   €50,000--€250,000 → CFO
-   €250,000+ → CFO + CEO

## Law 4 --- PROOF Chain / Segregation of Duties

One action may require multiple independently authenticated authorized
humans.

PROOF should be able to establish that the correct set of people
authorized the same bound transaction according to organizational
policy.

## Law 5 --- Control Evidence & Traceability

PROOF records sufficient lifecycle evidence to reconstruct:

-   Who requested verification
-   What was being verified
-   Which policy applied
-   Why verification was required
-   Which enrolled credential/person authenticated
-   Who approved or rejected
-   When lifecycle events occurred
-   Whether the request expired, was cancelled, rejected, or completed

------------------------------------------------------------------------

# 6. PROOF Intent

PROOF should be designed for **informed authorization**, not merely
authentication or a reflexive approval button.

For selected requests, before final authorization PROOF can require the
approver to independently provide a critical transaction detail.

Example:

> Enter the last four digits of the destination account.

This separates three concepts:

``` text
AUTHENTICATE
"Is the enrolled credential being used?"
        |
        v
INTENT / ATTENTION CHECK
"Did the approver independently engage with a critical detail?"
        |
        v
AUTHORIZE
"Does the authenticated approver explicitly approve this exact action?"
```

PROOF Intent must not be described as proof that the human perfectly
understood the entire transaction. It is an
informed-authorization/attention control.

**MVP:** Include a real, focused implementation.

------------------------------------------------------------------------

# 7. PROOF Chain

PROOF Chain supports multi-party authorization.

Example:

``` text
€600,000 PAYMENT

Finance Director
       |
       v
   VERIFIED

CFO
       |
       v
   VERIFIED

CEO
       |
       v
   VERIFIED

----------------
PROOF CHAIN COMPLETE
3/3 required humans independently authorized the same transaction.
```

Architecturally, PROOF must not assume that a verification always has
exactly one approver.

Conceptual domain model:

``` text
Verification Request
        |
        +-- Transaction Snapshot
        |
        +-- Applied Policy Version
        |
        +-- Approval Requirements
                 |
                 +-- Requirement -> Decision
                 +-- Requirement -> Decision
                 +-- Requirement -> Decision
```

A one-person verification is therefore simply a chain containing one
required approval.

**MVP:** Implement a deliberately limited but real PROOF Chain capable
of demonstrating multi-person authorization.

------------------------------------------------------------------------

# 8. Verification Lifecycle

A PROOF request should have a controlled lifecycle.

Example successful path:

``` text
CREATED
  -> SENT
  -> VIEWED
  -> AUTHENTICATED
  -> INTENT CONFIRMED (where required)
  -> APPROVED
```

Terminal/alternative outcomes include:

-   APPROVED / COMPLETED
-   REJECTED
-   EXPIRED
-   CANCELLED

Multi-party chains additionally track each approval requirement and the
overall chain completion state.

Lifecycle transitions should create audit/evidence events.

------------------------------------------------------------------------

# 9. Replay, Expiry, and Single Use

PROOF authorization must be:

-   Bound to one exact action
-   Time bounded
-   Protected against replay
-   Single-use where applicable

An approval from an old request must not silently authorize a new
action.

Expired verification must fail closed and require a new verification
where authorization remains necessary.

------------------------------------------------------------------------

# 10. Enrolment and Identity Assurance

PROOF depends on trust being established before an attack occurs.

For the business MVP:

``` text
Organization
   -> invites/establishes known member
   -> member enrols
   -> trusted authentication/authorization credential is registered
   -> organization associates that credential with the member
```

A passkey authenticates a previously enrolled credential. PROOF must not
falsely claim that a passkey alone proves a person's legal identity.

Future assurance levels may incorporate:

-   Enterprise identity providers
-   SSO
-   Administrative attestation
-   Stronger identity-proofing providers
-   Regulated identity verification where justified

The MVP should accurately state the assurance it actually provides.

------------------------------------------------------------------------

# 11. MVP Product

PROOF starts as a responsive business web application.

Desktop supports:

-   Organization administration
-   Employees/members
-   Authorized approvers
-   Verification requests
-   Policies
-   Audit/evidence
-   Security settings

Mobile browser supports secure, convenient approval/rejection workflows,
including passkey/WebAuthn where supported by the final architecture.

The backend is API-first so native mobile clients and external
integrations can be added without rebuilding the core verification
engine.

------------------------------------------------------------------------

# 12. Investor MVP Scope

## Must Have

-   Responsive web application
-   Organization/workspace
-   Organization members
-   User roles
-   Authentication
-   Trusted identity/credential enrolment
-   Passkey/WebAuthn authorization architecture
-   Create a PROOF request
-   Exact transaction/action details
-   Independent approval/rejection path
-   Approve
-   Reject
-   Request expiry
-   Single-use semantics
-   Replay protection
-   Transaction binding
-   Immutable verification/reference IDs
-   Verification result
-   Audit/evidence lifecycle
-   PROOF Intent
-   Basic risk/policy rules
-   Basic PROOF Chain
-   Server-side RBAC/authorization
-   Tenant/organization isolation
-   Security/event logging
-   Investor-quality dashboard
-   Mobile-responsive approval experience
-   API-first backend
-   Unit tests
-   Integration tests
-   Critical end-to-end tests
-   Loading, empty, success, and error states
-   Accessibility baseline
-   Environment/secrets separation
-   Database migrations
-   Basic observability/error handling

## Explicitly Later

-   Native iOS application
-   Native Android application
-   PROOF Circle / Family
-   PROOF Personal
-   PROOF Call
-   Banking integrations
-   ERP integrations
-   Slack/Teams integrations
-   Large integration marketplace
-   Complex visual policy builder
-   Enterprise SSO/SCIM
-   Advanced external identity proofing
-   Advanced cryptographic evidence infrastructure unless validated as
    necessary

------------------------------------------------------------------------

# 13. Future Product Expansion

The verification engine must not be hard-coded exclusively around
companies.

Potential future surfaces:

## PROOF Business

Executive and employee authorization.

## PROOF Circle / Family

Trusted groups protecting family members from impersonation.

## PROOF Personal

Person-to-person independent verification.

## PROOF Call

Short-lived live verification during calls/video interactions.

Example:

``` text
IKENNA VERIFIED — LIVE
Verified 8 seconds ago
```

Live verification must be deliberately short-lived and must preserve
clear assurance boundaries.

## PROOF Platform/API

Banks, ERPs, communication systems, marketplaces, account-recovery
systems, and other services can request independent human authorization
through PROOF.

------------------------------------------------------------------------

# 14. AI-GRC Principles

The following principles remain rooted in the project.

1.  Human Oversight
2.  Human-in-the-Loop Authorization
3.  Accountability
4.  Traceability
5.  Control Evidence
6.  Transaction Binding
7.  Segregation of Duties
8.  Risk-Based Controls
9.  Least Privilege
10. Role-Based Access Control (RBAC)
11. Independent / Out-of-Band Verification
12. Strong Authentication
13. Explicit Authorization
14. Informed Authorization
15. Replay Protection
16. Single-Use Verification
17. Time-Bounded Authorization
18. Tamper Evidence
19. Immutable Identity/Record References
20. Auditability
21. Evidence Provenance
22. Policy Enforcement
23. PROOF Chain / Multi-Party Authorization
24. Fail-Safe / Fail-Closed Behaviour
25. Revocation
26. Recovery Governance
27. Privacy & Data Minimisation
28. Purpose Limitation
29. Security Logging & Monitoring
30. Incident Evidence
31. Versioned Policies
32. Change Management
33. Dual Control for Critical Changes
34. Explainability of Decisions
35. Assurance Boundaries

For every meaningful control or feature, ask:

> **What risk does this control address, how is it enforced, and what
> evidence proves it operated?**

------------------------------------------------------------------------

# 15. Architecture Direction

The product should evolve around a reusable verification engine rather
than embedding all business rules directly into UI screens.

Conceptually:

``` text
                 PROOF PLATFORM

             Verification Engine
                    |
     +--------------+--------------+
     |              |              |
 Identity      Transaction       Policy
     |              |              |
     +---------- Approval Requirements
                    |
              Human Decisions
                    |
                 Evidence

        +-----------+-----------+
        |           |           |
      Web        Mobile        API
```

PROOF Business is a client/use case of the core verification engine
rather than the engine itself.

------------------------------------------------------------------------

# 16. Architecture Principles

-   Modular monolith first
-   API-first boundaries
-   Business logic server-side
-   Security by design
-   Strong typing
-   Managed services where appropriate
-   No premature microservices
-   No secrets in frontend code
-   Explicit authorization
-   Tenant isolation
-   Version-controlled database migrations
-   Testable domain logic
-   Append-oriented evidence history
-   Observable critical workflows
-   Graceful/fail-closed failure handling for verification

------------------------------------------------------------------------

# 17. Provisional Technology Stack

This is provisional until the Technical Blueprint stage.

  -----------------------------------------------------------------------
  Area                                Provisional Choice
  ----------------------------------- -----------------------------------
  Primary language                    TypeScript

  Frontend                            React / likely Next.js

  Backend                             Node.js / TypeScript

  Architecture                        Modular monolith, API-first

  Database                            PostgreSQL

  Platform/database service           Supabase

  Account authentication              Supabase Auth

  OAuth                               Google and/or Microsoft via
                                      Supabase Auth, final MVP choice
                                      pending

  Strong authorization                WebAuthn / Passkeys, exact
                                      implementation pending technical
                                      validation

  Authorization                       PROOF server-side RBAC + policy
                                      evaluation

  Unit/integration testing            TypeScript testing stack, exact
                                      library pending

  E2E                                 Playwright

  Development                         Replit

  Source control                      Git

  CI/CD                               To be finalized

  Monitoring/error tracking           To be finalized
  -----------------------------------------------------------------------

Important distinction:

**Ordinary account login is not automatically equivalent to
authorization of a protected PROOF transaction.**

------------------------------------------------------------------------

# 18. Authentication vs PROOF Authorization

Conceptual flow:

``` text
User login
   |
   v
Supabase Auth
   |
   v
PROOF application session
   |
   +--> dashboard / normal permitted operations
   |
   v
Protected authorization
   |
   v
Strong credential / WebAuthn ceremony
   |
   v
Explicit bound transaction decision
   |
   v
Evidence event(s)
```

Final implementation details must be validated against current
Supabase/WebAuthn capabilities before coding.

------------------------------------------------------------------------

# 19. Authorization and Trust Rules

The frontend is never the authority for security decisions.

Protected operations must establish server-side:

-   Authenticated identity
-   Organization membership
-   Active tenant
-   Required role/permission
-   Resource ownership/access
-   Applicable policy
-   Approval eligibility
-   Credential state
-   Request state
-   Expiration
-   Replay/single-use state

Never trust client-provided:

-   user_id
-   organization_id
-   role
-   permission
-   approval status
-   policy outcome

------------------------------------------------------------------------

# 20. Evidence Architecture Direction

MVP does **not** require blockchain.

Use a conventional relational database with carefully controlled,
append-oriented evidence/audit events, immutable identifiers, access
controls, and appropriate integrity protections.

Future enterprise requirements may justify evaluating:

-   Cryptographic hash chaining
-   Signed evidence packages
-   External timestamping
-   Stronger immutable storage
-   External evidence export

These should be added only when requirements justify the complexity.

------------------------------------------------------------------------

# 21. Testing Philosophy

Testing is part of MVP development, not a later cleanup stage.

## Unit Tests

Focus on deterministic business/security logic:

-   Expiry
-   Transaction binding
-   Policy evaluation
-   Role/permission rules
-   Approval eligibility
-   PROOF Intent validation
-   Chain completion
-   Single-use behavior
-   State transitions

## Integration Tests

Test boundaries such as:

-   API + database
-   Authentication + application
-   Authorization + tenant isolation
-   Credential/authorization ceremony
-   Policy + approval requirements
-   Evidence generation

## End-to-End Tests

Critical journeys include:

1.  Organization/user onboarding
2.  Request creation
3.  Approver receives/views request
4.  Authentication
5.  PROOF Intent
6.  Approval
7.  Requester sees verified result
8.  Evidence/audit record exists
9.  Rejection
10. Expiration
11. Unauthorized access attempt
12. Cross-tenant access attempt
13. Material transaction modification requires new authorization
14. PROOF Chain completion

Security testing must include IDOR/broken authorization, tenant
isolation, tampering, replay attempts, and privilege boundaries.

------------------------------------------------------------------------

# 22. Vertical Build Strategy

Do not build the entire frontend and then the backend.

Build complete vertical slices.

Example:

``` text
Feature
 -> database/model
 -> server/domain logic
 -> API
 -> authorization
 -> UI
 -> unit tests
 -> integration tests
 -> E2E
 -> review
 -> complete
```

This keeps the MVP demonstrably functional throughout development.

------------------------------------------------------------------------

# 23. Investor Demo Narrative

The MVP should tell one escalating story.

## Act I --- You Cannot Trust What You See

Ben receives a convincing request apparently from Ikenna:

> Send €40,000 to this new supplier account.

Ben chooses **Request PROOF** instead of trying to detect whether the
communication is fake.

## Act II --- Go Around the Attacker

Ikenna receives an independent PROOF request through the trusted
enrolled path.

He:

1.  Authenticates
2.  Reviews the exact transaction
3.  Completes PROOF Intent
4.  Explicitly approves or rejects

Ben sees the precise result and evidence.

## Act III --- Human Authorization Infrastructure

A €600,000 payment triggers organizational policy.

Multiple required approvers independently authenticate and authorize the
same transaction.

PROOF shows:

> **PROOF CHAIN COMPLETE**

The audit/evidence view demonstrates why the verification was required,
who participated, what they authorized, and when.

The intended investor mental shift is:

**"deepfake/scam protection" -\> "human authorization infrastructure."**

------------------------------------------------------------------------

# 24. Initial Personas --- Pending Step 2 Validation

Provisional personas only:

-   Organization Owner/Admin
-   Requester / Finance Employee
-   Approver / Executive
-   Auditor / Viewer

Their exact trust relationships, permissions, enrolment
responsibilities, recovery powers, and administrative boundaries are NOT
yet finalized.

------------------------------------------------------------------------

# 25. Planning and Build Sequence

## Completed

### Step 1 --- Concept & Product DNA

Status: **Completed / v0.1**

## Next

### Step 2 --- People & Trust Model

Define: - Personas - Organization ownership - Membership - Roles -
Permissions - Who enrols whom - Who can revoke whom - Who can request
verification from whom - Who can approve which action - Auditor
visibility - Admin powers - Separation of duties - Recovery governance -
High-risk administrative changes

### Step 3 --- Investor MVP & User Journey

Define: - Exact demo - Screen-by-screen journey - Primary and secondary
flows - Empty/loading/error/success states - Acceptance criteria -
Investor "aha" moments

### Step 4 --- UX/UI & Brand Direction

Define: - Visual personality - Trust language - Design system -
Information hierarchy - Mobile approval UX - Desktop administration UX -
Accessibility - Brand.md

### Step 5 --- Technical Blueprint

Finalize: - Stack - Architecture - Database/ERD - API specification -
Auth - Passkeys/WebAuthn - RBAC - Policy engine - Evidence model -
Security/threat model - Testing - CI/CD - Environments - Monitoring -
Backups/recovery - Compliance considerations - Cost assumptions - Replit
implementation structure

### Step 6 --- BUILD

Implement vertical slices with unit, integration, E2E, security, and
review gates.

------------------------------------------------------------------------

# 26. Decision Log

## D-001 --- Product category

**Decision:** PROOF is an independent human identity/authorization
layer, not primarily a deepfake detector.

## D-002 --- Initial market surface

**Decision:** Responsive business web application first.

## D-003 --- Future clients

**Decision:** Preserve API-first backend boundaries so native mobile
applications and third-party integrations can be added later.

## D-004 --- Core product DNA

**Decision:** Human authorization, transaction binding, risk-based
controls, PROOF Chain/segregation of duties, and control
evidence/traceability.

## D-005 --- PROOF Intent

**Decision:** Include a focused real implementation in the investor MVP.

## D-006 --- PROOF Chain

**Decision:** Include a deliberately limited but real multi-party
implementation in the investor MVP.

## D-007 --- Consumer expansion

**Decision:** PROOF Circle/Family, Personal, and Call are post-MVP, but
the core verification domain must not be company-hard-coded.

## D-008 --- Architecture

**Decision:** Prefer a modular monolith and API-first domain boundaries
before considering microservices.

## D-009 --- Primary language

**Decision:** TypeScript is the provisional primary frontend/backend
language.

## D-010 --- Supabase

**Decision:** Supabase/PostgreSQL and Supabase Auth are preferred for
MVP, subject to final technical validation.

## D-011 --- Login vs authorization

**Decision:** Ordinary application authentication must remain
conceptually distinct from explicit authorization of a protected
transaction.

## D-012 --- Evidence

**Decision:** Do not introduce blockchain for MVP. Use a relational,
append-oriented evidence model with appropriate integrity controls.

## D-013 --- Testing

**Decision:** Unit, integration, critical E2E, authorization,
tenant-isolation, and tampering/replay tests are part of MVP
implementation.

## D-014 --- Assurance language

**Decision:** PROOF reports what its controls actually establish and
does not label a transaction "safe" merely because required enrolled
approvers authenticated and authorized it.

------------------------------------------------------------------------

# 27. Open Decisions Register

These decisions must be resolved before or during Steps 2--5:

-   Exact MVP roles and permission matrix
-   Organization creation/onboarding model
-   Member invitation/enrolment trust model
-   Credential enrolment process
-   Credential revocation
-   Account recovery governance
-   Whether critical admin changes require dual control in MVP
-   Requester-to-approver eligibility rules
-   Policy structure and versioning
-   Exact material fields for MVP payment transaction binding
-   Canonical transaction representation/hash strategy
-   Expiration defaults
-   Cancellation rules
-   Rejection semantics
-   PROOF Intent trigger rules
-   PROOF Chain ordering: sequential vs parallel vs both
-   Evidence event schema
-   Audit visibility
-   Data retention
-   Privacy/PII inventory
-   Exact OAuth providers
-   Exact WebAuthn/passkey implementation
-   Supabase RLS strategy
-   Backend/API framework
-   Validation library
-   Test libraries
-   Rate limiting
-   Security headers/CORS/CSRF strategy
-   Logging/error tracking
-   Analytics
-   Email/notification provider
-   CI/CD and staging
-   Secrets management
-   Backup/restore expectations
-   RPO/RTO for production evolution
-   Investor seed/demo data strategy
-   Brand identity
-   Accessibility target
-   Initial performance targets
-   Cost envelope
-   Terms/privacy/compliance requirements

Nothing in this register should be silently forgotten. Items are closed
by recording decisions in the Decision Log.

------------------------------------------------------------------------

# 28. Final Engineering Rule

Every feature must answer:

1.  **What user/business problem does this solve?**
2.  **What risk does the control address?**
3.  **How is the control technically enforced?**
4.  **What evidence demonstrates that the control operated?**
5.  **What happens when the control fails?**
6.  **How is it tested?**
7.  **Does it stay inside PROOF's assurance boundary?**

This document remains the canonical specification and must be updated
when significant product, security, architecture, or implementation
decisions change.

------------------------------------------------------------------------

## Step 3 Decisions D-039--D-047 --- Locked

### D-039 --- Product Experience Principle

PROOF feels like a simple, secure business authorization-messaging
product. Policy, evidence, RBAC, audit, security and GRC controls remain
powerful infrastructure underneath the everyday UX.

### D-040 --- Action-Based Request Creation

Requesters create PROOF from understandable action types and supply the
material facts. PROOF determines applicable policy, Intent and Chain
requirements. Investor MVP action types: Payment and Supplier
Bank-Detail Change. These are verification subjects; PROOF does not
execute them.

### D-041 --- Deliberate Mobile Authorization Ceremony

Locked sequence: notification → open PROOF → passkey/trusted credential
→ reveal sensitive request → review exact bound action → Intent if
required → explicit Approve/Reject → evidence. Authentication and Intent
never automatically constitute approval.

### D-042 --- Requester Result Experience

The Requester experience is create PROOF → wait → receive the controlled
PROOF outcome/evidence. Internal, Chain and Bridge views disclose only
permitted information. Bridge never exposes the authorizing
organization's private routing, personnel, Intent activity, policy
mechanics or internal Chain unless explicitly disclosed.

### D-043 --- Immutable Evidence Receipt & First-Class PROOF ID

Every completed PROOF produces a human-readable receipt derived from
authoritative server evidence and the immutable action snapshot.
Approval and rejection both produce evidence. Completed evidence is not
rewritten; corrections require a new PROOF. A human-friendly PROOF ID is
first-class product data backed by a separate internal database
identifier and is not itself an authorization boundary.

### D-044 --- Unified Request Inbox

Requests are the primary everyday object. Internal PROOF, Chain and
Bridge share one Requests experience. A Chain remains one PROOF with
multiple requirements. Primary CTA: **+ Request PROOF**. User-facing
states must not imply that PROOF executed an external action.

### D-045 --- Trusted Organization Directory & Relationship Governance

Display names are not security identities; trusted relationships
reference immutable organization identities. Verified Organization and
Trusted Relationship are distinct. Bridge routes to the trusted
organization, not a requester-selected employee. Investor organizations
are explicitly **Verified Organization --- Demo**. Admin may initiate
trust establishment; Owner authorization is required to establish it.

### D-046 --- People, Membership & Authority UX

Job title, membership, PROOF role, Approval Authority and trusted
credential are distinct. People establish their own credentials.
Suspension removes current organizational capability while preserving
history. Owner/Admin may invite ordinary members, but Admin cannot grant
Approval Authority, make someone Owner, self-elevate, impersonate
another person or replace another person's credential.

### D-047 --- Versioned Policy-Driven Human Authorization Evidence --- CORRECTED

PROOF policies determine which human authentication and
human-authorization evidence must be collected for an exact bound
action.

**PROOF does not authorize, release, execute, transmit, settle or send
an external payment or other real-world action.**

Sarah may create a PROOF concerning a €40,000 payment instruction and,
if policy permits, authenticate and explicitly confirm that she
authorized those exact details. PROOF records that evidence. No money
moves. PROOF does not instruct or permit an accountant or bank to
execute the payment. The accountant, bank, ERP or other relying party
applies its own independent rules and decides what happens next.

Requester independence is a configurable PROOF evidence/control rule,
not a universal external-payment rule. Policy may allow requester
self-confirmation, require at least one independent human, prohibit the
requester from satisfying specified requirements, or require multiple
independent humans through PROOF Chain.

Requesters describe the exact action; they cannot weaken configured
evidence requirements. A submitted PROOF is bound to the policy version
used to establish those requirements. New policy versions never silently
rewrite in-flight or historical PROOF records. Critical policy weakening
is audited and subject to dual control when another eligible governance
human exists; explicit bootstrap governance remains supported.

For the investor MVP, Chain requirements may be satisfied
independently/in parallel. A valid rejection of a mandatory requirement
fails the configured PROOF verification by default rather than being
routed around.

Preferred outcome language includes **PROOF requirements satisfied**,
**Required PROOF authorizations recorded**, and **Authorization was not
given for these exact details**.

Avoid language implying external execution or truth, including **payment
executed**, **payment released**, **safe to pay**, **transaction is
safe/legitimate**, **fraud-free**, or **PROOF authorized the
bank/accountant to execute the payment**.

### Global Terminology Guardrail

The entire product preserves three separate concepts:

1.  **Authentication** --- did the required enrolled credential
    authenticate the human?
2.  **Human authorization in PROOF** --- did that authenticated human
    explicitly authorize/reject these exact bound details?
3.  **External execution authority/action** --- will an accountant,
    bank, ERP, administrator or other relying party permit and/or
    execute the real-world action?

PROOF directly establishes evidence for (1) and (2) within its assurance
boundary. PROOF does not inherently establish or perform (3).

This guardrail applies to UI copy, statuses, API/domain naming, database
semantics, evidence receipts, policies, tests, investor narration,
documentation and future integrations. Unless a future integration
supplies trustworthy execution evidence, PROOF never claims that an
external action occurred, was consumed or happened only once.

------------------------------------------------------------------------

# PRE-BUILD LOCK --- CONTROLLING BASELINE

**Status:** LOCKED FOR INVESTOR MVP BUILD

Where earlier exploratory wording conflicts with this baseline or a
later-numbered decision, this baseline/later decision controls.

## Assurance boundary

PROOF is an independent human identity and authorization-evidence layer.
It authenticates enrolled humans and records explicit authorization or
rejection of exact, bound action details.

PROOF does **not** authorize, release, execute, transmit, settle, send,
or consume an external payment or real-world action. External relying
parties independently decide whether to act.

Keep distinct: 1. Authentication --- did the enrolled credential
authenticate the human? 2. Human authorization in PROOF --- did that
authenticated human authorize/reject these exact details? 3. External
execution --- did a bank, accountant, ERP, administrator, or other
relying party permit/perform the action?

Completed approval/rejection is immutable historical evidence and does
not expire merely with time. Pending requests may be cancelled or
closed. PROOF must not claim external execution, consumption, safety,
legitimacy, or fraud-free status.

## D-015--D-038 --- Trust model

**D-015 Initial organization establishment.** CEO/business owner or
CFO/Finance Director may establish the organization. Creator becomes
initial Owner and establishes their own trusted credential before
inviting others; other humans establish their own credentials.

**D-016 MVP roles.** Owner, Admin, Requester, Approver, Auditor. A human
may hold multiple roles. Job title is separate.

**D-017 Owner is not God Mode.** Ownership does not permit
impersonation, policy bypass, silent credential replacement, or approval
without separately valid Approval Authority.

**D-018 Admin is operational, not a second Owner.** Admin cannot
auto-transfer ownership, self-elevate, grant themselves approval
authority, impersonate, silently replace credentials, alter/delete
evidence, or silently disable critical controls. Admin may respond only
when separately eligible.

**D-019 / D-047 Requester independence.** This is configurable PROOF
evidence/control, not an external execution rule. Policy may allow
self-confirmation, require an independent human, prohibit requester
satisfaction of specified requirements, or require multiple independent
humans.

**D-020 Bridge is MVP.** Bridge uses the same verification engine as
internal PROOF with limited investor-demo scope.

**D-021 Bridge privacy.** Requesting organization receives outcome and
permitted evidence, not authorizing organization private workflow.

**D-022 Organization verification.** Organization creation is distinct
from verified identity. Verification is evidence/status, not a
display-name claim.

**D-023 Real KYB deferred.** Investor demo uses fictional organizations
explicitly labelled **Verified Organization --- Demo**. No fake real
KYB.

**D-024 Trusted business relationships.** Relationships reference
immutable organization IDs, not display names. Organization identity
survives credential loss.

**D-025 Private Bridge routing.** Requester asks the organization, not
an employee. Authorizing organization's private policy selects eligible
responders.

**D-026 Approval Authority.** Approver role is not blanket authority.
Eligibility is scoped to active membership and granted authority. MVP
must support Payment and Supplier Bank-Detail Change authority
categories.

**D-027 Authority governance.** Admin cannot grant Approval Authority.
Owners govern authority changes; no self privilege elevation. Critical
increases use dual control when another eligible governance human
exists; bootstrap is explicit. Changes are audited.

**D-028 Auditor.** Read-only and tenant-bound; may inspect permitted
evidence/lifecycle/action/policy/outcome but cannot create, respond,
manage members, grant authority, or manage credentials. Bridge access is
limited to evidence permitted to own organization.

**D-029 Requester control.** Requesters describe/initiate actions but
cannot determine, weaken, remove, override, or falsely satisfy controls.
Drafts are editable; submitted material details are immutable.
Correction means cancel + new request. Bridge requester selects trusted
organization, not internal employee.

**D-030 Trusted Credential.** Protected human authorization is
attributable to an enrolled human using an active trusted credential.
Humans establish their own credentials. Architecture supports multiple
independently revocable credentials. Credential alone never grants
authority; server evaluates credential, membership, authority, policy,
and state.

**D-031 Layered recovery.** Account recovery is distinct from PROOF
authorization recovery. Email/OAuth recovery does not automatically
restore authorization capability. Recovery restores existing
organization identity. Admin cannot impersonate recovering human/create
their private credential. Recovery is audited.

**D-032 Offboarding/revocation.** Active membership is authoritative for
acting for an organization. Suspension/termination immediately disables
current roles/authorities. Historical evidence remains immutable. In an
incomplete Chain, a revoked person's earlier decision remains evidence
but by default no longer satisfies the incomplete requirement;
replacement is required. Completed records remain historical evidence.

**D-033 Requirement resolution.** Policies define requirements, not
notification recipients. Eligible humans satisfy authority-based
requirements unless policy explicitly names a person. No response is
never approval. Mandatory rejection fails the configured verification by
default and cannot be erased/routed around.

**D-034 Verification finality/closure.** Completed approved/rejected
results are historical evidence bound to exact details and timestamp;
they do not expire merely with time. Pending requests may be
cancelled/closed. Completed records cannot be rewritten. Single-use
means a decision belongs to one immutable request/action snapshot and
cannot transfer to another.

**D-035 Action binding.** Submitted PROOF contains immutable
human-readable material details. Correction is cancel + new. Decisions
bind to human, organization membership, active credential, PROOF ID,
exact snapshot, policy version, Intent result where required, decision,
and timestamp. Implementation uses deterministic canonical
representation/fingerprint while humans review understandable details.

**D-036 Intent.** Where policy requires it: strong authentication →
Intent challenge about material bound information → explicit
authorization. Requester cannot disable required Intent. Intent failure
blocks approval but is distinct from rejection. Repeated failures are
limited/evidenced. Bridge Intent is private. Intent proves configured
control operation, not perfect understanding.

**D-037 Notification boundary.** External notifications are convenience
only, minimize sensitive data, and are not evidence of
identity/details/authorization. Deep links navigate but never
authenticate/authorize. Users can independently open PROOF.

**D-038 Protected decisions inside PROOF.** Approval/rejection cannot be
completed via email/SMS/messaging/notification actions. Authentication,
exact-action review, Intent, and decision happen inside PROOF.

## D-039--D-050 --- Product, UX, implementation

**D-039 Product experience.** Simple secure authorization-messaging
product; heavy policy/RBAC/evidence/audit machinery stays underneath
ordinary UX.

**D-040 Action-based creation.** Investor MVP has exactly two
first-class verification subjects: Payment and Supplier Bank-Detail
Change. PROOF derives controls/requirements; no manual Create Chain
action.

**D-041 Mobile authorization ceremony.** Open PROOF → trusted
credential/passkey → authenticate → reveal sensitive exact details →
review → Intent if required → explicit Approve/Reject → evidence.
Authentication/Intent never auto-approve.

**D-042 Requester result.** Create → wait → controlled result/evidence.
Bridge requester cannot see private authorizer
routing/personnel/Intent/policy/Chain.

**D-043 Evidence receipt/PROOF ID.** Completed PROOF gets immutable
human-readable receipt derived from authoritative evidence/snapshot:
exact action, outcome, timestamp, public PROOF reference, permitted
control outcomes and identity/org information. Approval and rejection
are evidence. Detailed evidence is permission-controlled. Public
reference is not an authorization boundary.

**D-044 Unified inbox.** Requests are primary everyday object. Dashboard
prioritizes needs-attention, waiting, recent. Internal/Chain/Bridge
share one request experience. Chain remains one PROOF. Primary CTA:
**Request PROOF**.

**D-045 Trusted organizations.** Organization UI represents own identity
and established trusted relationships, not generic directory. Verified
status and trust are distinct. External profile does not expose private
personnel/devices/credentials/policies/Chains/audit. Owner authorization
establishes trust in MVP.

**D-046 People/membership/authority UX.** Job title, membership, role,
Approval Authority, credentials are distinct. People establish own
credentials. Eligibility server-side. People UI stays understandable;
suspension is easy and audited.

**D-047 Versioned policy-driven human authorization evidence.** Policies
determine required human authentication/authorization evidence for exact
action. PROOF does not execute external action. Requester independence
configurable. Requesters cannot weaken requirements. Submitted PROOF
binds to applied policy version. Critical weakening governed/audited.
Mandatory rejection fails configured verification by default.

**D-048 Constrained MVP policy engine.** Configuration limited to action
type, relevant thresholds, required Approval Authorities,
number/combination of human requirements, requester-independence rule,
and Intent requirement. PROOF generates requirements/Chain. Policies
versioned; sensitive changes governed; Bridge policies private. Complex
visual builder deferred.

**D-049 Friendly Trust, Not Fear.** Calm, human, clear, trustworthy,
premium. Plain English, generous whitespace, friendly typography,
progressive disclosure, accessible responsive components. Avoid hacker
aesthetics, alarmism, fake security scores, jargon, and intimidating
dashboards.

**D-050 Authentication abstraction.** PROOF owns Trusted
Credential/protected-ceremony domain concepts. Authentication/passkey
provider is an implementation dependency and must not define the
evidence model. Login remains distinct from protected human
authorization.

## Investor MVP surfaces

1.  Sign in / organization setup
2.  Overview
3.  Unified Requests inbox
4.  Request PROOF --- Payment / Supplier Bank-Detail Change
5.  Protected mobile review --- credential/passkey, exact details,
    Intent, Approve/Reject
6.  Request result
7.  Evidence receipt/detail
8.  People/member management
9.  Trusted Organizations + constrained Policies

Settings/security are supporting surfaces only as needed.

## Three investor stories

**€40,000 impersonation:** Ben independently creates a Payment PROOF
with exact details. Ikenna opens PROOF, authenticates, reviews,
completes required Intent, and explicitly approves/rejects. Ben receives
controlled result + evidence. PROOF does not move money.

**€600,000 Chain:** High-value Payment matches versioned policy that
creates multiple requirements. Eligible humans independently
authenticate/respond to the same immutable snapshot. Final state means
configured PROOF requirements were satisfied, not that payment executed.

**Supplier bank-detail change / Bridge:** Northstar Retail Ltd sends a
Supplier Bank-Detail Change PROOF to trusted Atlas Supplies Ltd. Atlas
privately applies policy/routing/Intent/requirements. Northstar receives
only permitted result/evidence. Demo org verification is explicitly
**Verified Organization --- Demo**.

## Locked technical baseline

-   Responsive business web MVP.
-   Next.js + TypeScript.
-   Modular monolith; API/server-first domain boundaries.
-   Supabase/PostgreSQL for persistence/auth infrastructure.
-   RLS plus server-side authorization.
-   Trusted Credential abstraction for protected authorization/passkey
    implementation.
-   Immutable submitted action snapshots + deterministic canonical
    representation/fingerprint.
-   Versioned constrained policy engine.
-   Authorization Requirements model one-person and multi-person Chain.
-   Intent separate from authentication and explicit decision.
-   Bridge uses distinct requesting/authorizing organization IDs and
    same verification engine.
-   Append-oriented evidence/audit.
-   Internal UUIDs + human-friendly public PROOF references.
-   Runtime input validation.
-   Transactional protected writes, concurrency protection, idempotency
    for critical mutations.
-   External notifications non-authoritative.
-   No blockchain, microservices, or unjustified queue/cache
    infrastructure in MVP.
-   Replit is primary development workspace; external managed services
    may be used. Code, migrations, tests, and configuration stay
    portable in Git.

## Security invariants

Frontend is untrusted. Server establishes authenticated identity, active
membership, tenant access, role/permission, Approval Authority, resource
access, policy applicability, credential state, request state, and
requirement eligibility.

Never trust client-provided user/org IDs, roles, permissions, approval
status, or policy outcomes as authority. Elevated secrets never reach
browser.

Baseline: TLS, runtime validation, SQLi/XSS/CSRF controls where
applicable, CORS/security headers, rate limiting, audit logging, least
privilege, encryption via platform capabilities, dependency/secret
scanning, RLS, tenant isolation.

## Testing baseline

Testing ships with each slice: - Unit: domain, policy, binding. -
Integration/database: RLS, RBAC, authority, state transitions,
transactions, evidence, revocation, Bridge privacy. - E2E:
investor-critical flows and mobile response ceremony. -
Negative/security: IDOR, cross-tenant access, session/JWT tampering
attempts, client org/role/status manipulation, privilege escalation,
request mutation, policy/Intent bypass, replay/double decision, revoked
membership/credential bypass, Bridge leakage, rate-limit bypass where
implemented.

## Build slices / finish line

**Slice 1 --- Foundation:** repo, Next.js/TS, Supabase local/dev,
migrations, auth, organizations, memberships, RLS, app shell, design
tokens, CI, first tests.

**Slice 2 --- People & Authority:** invites/members, roles, Approval
Authority, suspension, server authorization, security tests.

**Slice 3 --- Request PROOF:** two action types, drafts, immutable
submission, public PROOF IDs, policy application, unified inbox.

**Slice 4 --- Human Authorization:** trusted credential/passkey,
protected reveal, Intent, Approve/Reject, evidence, mobile-first
ceremony.

**Slice 5 --- Chain:** multiple requirements, policy-generated Chain,
concurrency, rejection, revocation.

**Slice 6 --- Bridge:** trusted org relationships, cross-org requests,
private authorizing workflow, controlled result, privacy tests.

**Slice 7 --- Evidence:** polished receipts, timeline, Auditor access,
lifecycle completeness.

**Slice 8 --- Investor Hardening:** three stories E2E, responsive
polish, accessibility, security audit, integration/E2E audit,
observability, staging/deployment, smoke tests, deterministic demo
seed/reset.

**Investor MVP finish line:** Slice 8 passes final acceptance, security,
and E2E review. This is investor-MVP readiness, not a claim of
enterprise-commercial readiness.

## Explicitly deferred

Native apps; PROOF Circle/Family; PROOF Personal; PROOF Call; real KYB;
banking/ERP/Teams/Slack integrations; enterprise SSO/SCIM; advanced
identity proofing; complex visual policy builder; advanced cryptographic
evidence infrastructure unless justified; enterprise certification
programs; unjustified scale infrastructure.

## Change control during build

1.  Implement locked requirements as specified.
2.  Make minor implementation choices without interrupting the user when
    they do not alter product behavior/assurance boundaries.
3.  Add technical necessities only for security, correctness, testing,
    deployment, accessibility, or maintainability.
4.  Explicitly identify any proposal that would materially alter product
    behavior, trust model, assurance boundary, investor stories, or MVP
    scope before treating it as a requirement.
5.  No invented requirement silently becomes part of PROOF.

**PRE-BUILD STATUS: LOCKED. NEXT ACTION: SLICE 1 IMPLEMENTATION.**
