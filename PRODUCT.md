# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two sides, equal weight (confirmed):
- **Households**: upper and upper-middle-class families in Pakistani cities (Lahore, Karachi, Islamabad…) hiring maids, cooks, drivers, gardeners, cleaners and nannies. They need to trust a stranger with their home and children.
- **Domestic workers**: many from villages and low-income families, often with low literacy and little smartphone experience. They want steady, respectful work and a way to be known as trustworthy. Many use the app in Urdu; some never use it at all and are served by staff.

Operators:
- **Staff (field agents, ops leads)**: act for workers who can't use the app, run police verification, review complaints, request penalties. Every action is recorded and some need a second person's approval.
- **Founders (super admins)**: oversee staff through red flags, the audit log and reports about staff.

## Product Purpose

An inDrive-style marketplace for home help: a family posts a job at its price, workers accept or name their own price, and the two sides negotiate until one accepts. Trust is the core problem the product solves, through police verification, identity checks, endorsements from the team and from families after a month of work, complaints with the worker's side heard, and penalties up to a ban. Success: families hire with confidence, and workers build a reputation that gets them better homes.

## Positioning

Trust you can see on both sides: workers carry verified, endorsed reputations; families see who vouches for whom; staff power is visibly checked (two-person approvals, SMS receipts to workers, a tamper-evident audit log). Workers who can't use a phone are still first-class users through staff-assisted mode.

## Operating Context

- Households: browse workers, post jobs, negotiate prices, confirm written terms, endorse after 30 days, report problems. Desktop and phone.
- Workers: respond to jobs, negotiate, see hires and terms, request verification, see everything done on their account ("activity"), dispute staff actions. Phone, often in Urdu (RTL).
- Staff/founders: back office on desktop, dense lists and case files.
- Pakistani legal context: minimum wage floor, weekly rest day, 18+ workers, written terms (Punjab Domestic Workers Act 2019).

## Capabilities and Constraints

- Installable PWA (React + Vite); the same REST API will later serve a native mobile app.
- English and Urdu (Nastaliq, right-to-left) for every worker-facing screen; household and staff screens are English for now.
- Worker devices are unknown (confirmed "not sure yet"): design for low-end Android and patchy data as the floor. No heavy WebGL or large media on worker screens.
- Phone numbers and CNICs are private; staff see them masked.

## Brand Commitments

- Name: **Bharosa** (بھروسا, "trust"). Nothing else is fixed (confirmed): logo, colours and type are open.
- Voice: plain, warm and respectful; short sentences; never call workers servants.
- Visual approach (confirmed after comparing four previewed directions): the category standard, a clean modern services-app look, executed at the craft level of **Careem, Urban Company, Airbnb and LinkedIn** (LinkedIn specifically for profiles and stacked-face endorsements). No quirky or themed reinterpretation.

## Evidence on Hand

- Demo data only (seeded families, workers, staff). No real testimonials, customers, ratings or press exist; none may be invented.
- Research on comparable products and Pakistani law: `../docs/research/competitive-analysis.md`.

## Product Principles

1. Trust must be visible at a glance: who verified, who vouches, who acted.
2. Dignity for workers in every word and screen.
3. Nobody is left out because they can't read well or don't own a smartphone.
4. Staff power is always visible and checkable.
5. Fast and clear beats impressive on a cheap phone.

## Accessibility & Inclusion

- Low literacy: big tap targets, icons with words, short sentences, Urdu everywhere a worker looks.
- RTL layout correctness for Urdu.
- Low-end devices and slow data: light pages, no motion that blocks content, respect reduced-motion.
