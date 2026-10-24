# Security Specification: GullyScore Zero-Trust Architecture

## 1. Data Invariants
1. **Match Ownership & Scoring Rights**: A match's score can only be updated by the match `ownerId` or an authorized scorer listed in `assignedScorerIds`. Unauthenticated spectators can only read matches that are `isPublic == true`.
2. **Team Squad Integrity**: Only the team owner can add, modify, or delete players belonging to that team. Players must reference a valid `teamId` and `ownerId`.
3. **Tournament Master Gate**: Only the tournament owner can register teams, schedule fixtures, and modify tournament standings or rules.
4. **Scoring Event Immutability**: Ball events are sequence-governed (`sequenceNumber > 0`). An event cannot be forged for a match the user is not authorized to score.
5. **Role Escalation Immunity**: Users cannot elevate their own role to 'admin' or create documents in `/admins/`. Admin status is strictly checked against the authenticated UID and email `siddhants4567@gmail.com`.
6. **Immutable Critical Fields**: Fields like `ownerId`, `id`, and `createdAt` cannot be altered after document creation.
7. **Default Deny**: Any path or action not explicitly allowed is strictly blocked.

---

## 2. The "Dirty Dozen" Adversarial Payloads
The following 12 attack payloads are designed to test boundary conditions and must be rejected with `PERMISSION_DENIED`:

1. **Privilege Escalation**: An authenticated user writes `{ "role": "admin" }` to `/admins/{attackerUid}`.
2. **Spectator Score Tampering**: An unauthenticated user or spectator writes a fake score update to `/matches/{matchId}`.
3. **Scorer Overreach**: An authorized scorer of Match A attempts to mutate Match B or modify Match A's `ownerId`.
4. **Shadow Field Injection**: A user submits a new team containing an unlisted arbitrary ghost field `isVerifiedByBcci: true`.
5. **Team Hijacking**: An attacker attempts to overwrite another organizer's team with `ownerId: "attackerUid"`.
6. **ID Poisoning Attack**: An attacker attempts to create a document with a 2KB junk character path variable `matches/{giganticString}`.
7. **Negative Score Exploit**: An attacker submits a ball event with `runsBat: -100` or invalid string types.
8. **Tournament Tampering**: An unauthorized organizer attempts to mark another organizer's tournament as completed or change the tournament champion.
9. **Roster Tampering**: A user attempts to add a player to a team owned by someone else.
10. **Unauthenticated Write**: An unauthenticated client attempts to create an audit log or match.
11. **Immutable Date Rewrite**: A user updates a team trying to backdate `createdAt: "1990-01-01"`.
12. **Blanket Query Scraping**: A user attempts to list private draft tournaments of other users.

---

## 3. Test Runner Specification
The test suite validates these 12 scenarios against `firestore.rules` using the Firebase Rules Unit Test framework, verifying zero logic leaks, strict key validation, and role enforcement.
