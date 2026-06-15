# Module 2 — Delivery / Dispatch (Specification)

> Canonical reference for SeaPole TMS **Module 2**. This is the stable spec; the working
> implementation plan lives separately and changes over time. Update this doc when the
> **design** changes, not for day-to-day task tracking.

---

## 1. System context — the 4-module ERP

SeaPole is an ERP for a shipping-logistics company that receives goods from abroad by ship and
delivers them to customer companies. It has **four modules**; we build **Module 2 only** now, but
the codebase must be **modular and secure** so the others slot in without rework.

- **Module 1 — Arrival & storage (NOT us).** Ship arrives at port. **BL quantity** (Bills of
  Lading) and **BE quantity** (Bills of Entry) are recorded. Goods are stored in **storage plots**
  at the port. Module 2 begins _after_ this — goods are already stored.
- **Module 2 — Delivery / Dispatch (THIS).** Deliver the already-stored goods from port to receivers.
- **Module 3 — Accounting (later).** Money, taxes, e-way bills, payments.
- **Module 4 — Maintenance (later).** Truck maintenance and storage-plot management.

## 2. Roles / account types

1. **Admin** — manages the truck master and work orders; allots trucks to work orders; sees
   everything; provisions all other accounts.
2. **Port Weighbridge operator** — at the port weighbridge on a machine with a connected printer
   running our software; assigns the **VT number** per truck-trip; weighs the truck empty then
   loaded; prints invoices/gate passes.
3. **Receiver Weighbridge operator** — at the receiver site; weighs the loaded truck on arrival and
   the empty truck on exit; prints the final invoice.
4. **Accounts / Approval** — the company's accounting team; approves (or disputes) that each trip
   was delivered correctly (effectively shortage sign-off).

## 3. Truck master database

- Hundreds of trucks, **reused repeatedly**. Built once up front, then maintained.
- **CRUD:** add/remove trucks individually, **plus bulk upload via Excel**.
- **Columns:** vehicle number, owner, insurance details, fitness/health-checkup details (each with
  expiry dates).
- **Alerts:** notify admins when a truck's insurance or fitness is expired or nearing expiry
  (configurable lead times; default 30 & 7 days before + on expiry).
- Lives in the **shared kernel** (Module 4 maintenance will reuse it).

## 4. Work Order (WO) — the delivery umbrella

When a company orders goods from the port, that order is a Work Order. One ship's cargo can be split
across multiple WOs (e.g. a 100,000 MT vessel → a 20,000 MT WO for one customer).

- **WO number** — system-generated. Format **`WO-####-<vessel code>`** (see §10 Numbering).
- **Vessel** — the ship the goods came on (master record; carries a short **code** used in the WO#).
- **Supplier** and **Receiver** — master records the WO references (1:1 per WO; a different buyer of
  the same vessel's goods = a separate WO).
- **Commodity** — the material being delivered (master record; default tolerance %).
- **BL Quantity** — total goods to deliver in this WO.
- **DO / Delivered Quantity** — confirmed delivered (starts 0, increases).
- **Dispatched Quantity** — reserved at port gate-out; in-transit until confirmed at receiver.
- **Balance** = `BL − Delivered`. **Allottable** = `BL − Dispatched` (prevents over-dispatch).
- **Truck allotment:** admin allots a pool of trucks to the WO via a **checklist** over the truck
  master (e.g. ~70 trucks for a 20,000 MT WO).

## 5. The trip & the VT number

- A **VT number** identifies **one single truck-run**: go to port → load → deliver to receiver →
  return. Unique per trip; it is how a single delivery cycle is tracked. Many VT trips roll up under
  one WO until the BL is fulfilled.
- **Per-trip flow:**
  1. Empty truck arrives at **Port Weighbridge**; operator assigns the **VT#**, prints an invoice
     (WO# + VT#), hands **two copies** to the driver.
  2. Driver enters the port, presents the invoice at the storage plot, **loads goods**.
  3. Returns to the Port WB → **loaded weigh** → **gate-out invoice** stating net goods taken; the
     driver is now responsible for delivering that quantity.
  4. Drives to the **receiver** → **Receiver Weighbridge** weighs the **loaded** truck on arrival.
  5. **Unloads** at the receiver → truck weighed **empty** on exit.
  6. **Final invoice** issued with the **four quantities** + trip details + VT#. Driver takes it to
     the company; **accounts approve**; driver is paid.

## 6. Weighing — four events and the terms

- **Tare** = empty truck. **Gross** = truck + goods. **Net** = Gross − Tare = the goods.
- **Port:** PortTare (empty in) → PortGross (loaded out) ⇒ **Net loaded**.
- **Receiver:** RecvGross (loaded in) → RecvTare (empty out) ⇒ **Net delivered**.
- **Shortage** = `Net loaded − Net delivered` (the reason both ends are weighed).

## 7. Decisions (locked in)

- **Quantity flow:** _reserve on dispatch, confirm on delivery._ Dispatched reserves at port
  gate-out (in-transit); Delivered confirms at receiver. Allottable = BL − Dispatched ⇒ no
  over-dispatch.
- **Master data:** Supplier / Receiver / Vessel / Commodity are **master tables** the WO references.
- **Shortage reconciliation:** computed per VT; **tolerance % is per-commodity** (global default);
  accounts approval is an explicit **accept / dispute** of the shortage, audited.
- **Drivers:** a **Driver** entity (name + licence + expiry) linked per VT, defaultable from the
  truck's usual driver.
- **Auth:** **Better Auth**; **admin provisions all accounts** and assigns roles — **no public
  signup**. Roles: `ADMIN`, `PORT_WB`, `RECEIVER_WB`, `ACCOUNTS`; weighbridge logins station-bound.
- **Architecture:** **feature modules over a shared kernel**; **truck master in the shared kernel**.
- **Weighbridge capture:** **manual entry** (no hardware integration); every reading immutable + audited.
- **Expiry alerts:** configurable lead times; default 30 & 7 days before + on expiry.
- **e-way bill:** generated in Module 3; Module 2 **stores the feeding data** (truck, driver,
  quantities, route).

## 8. Domain notes (rationale)

- **Double-weighing exists to catch transit loss.** Bulk cargo always loses some; the per-commodity
  tolerance % decides what's acceptable, and excess shortage → dispute / transporter deduction /
  claim. The accounts approval is the commercial heart of the module.
- **Dispatched vs delivered.** With ~70 trucks out, lots of cargo is in-transit; reserving on
  dispatch prevents over-dispatch past the BL, while confirming on delivery keeps DO accurate.
- **Weights = money** ⇒ strict role isolation (port operator can't touch receiver weights and
  vice-versa) and an **immutable audit trail** on every weigh + approval.
- **Compliance (India-style ops: BL/BE, weighbridge, MT):** e-way bill / gate pass likely required
  for goods movement; surfaces in Module 3 but is fed by Module 2 data.

## 9. Architecture

```
src/
  modules/
    delivery/                 # Module 2: work orders, trips(VT), weighbridge, invoices, approval
      actions/  components/  lib/  schemas/
  core/                       # shared kernel
    auth/                     # Better Auth config, session, RBAC guards (requireRole)
    db/                       # re-exports existing src/lib/prisma.ts singleton
    audit/                    # audit-log helper
    masters/                  # Truck, Driver (shared — Module 4 reuses)
    numbering/                # concurrency-safe WO#/VT# generators
  components/ui/              # existing shadcn primitives (kept)
  env.ts                     # existing validated env (kept)
```

- **Mutations** via Next.js **Server Actions** (+ Zod); **reads** via RSC; **API routes** only for
  Excel upload + PDF streaming.
- **RBAC enforced server-side** via a shared `requireRole(...)` guard on every action/route handler
  using the Better Auth session; UI only hides controls. Existing `src/lib/prisma.ts` and
  `src/env.ts` are preserved (re-exported through `core/`).

## 10. Tech additions (all mainstream, minimal)

- **Better Auth** (+ Prisma adapter + admin plugin) — auth/RBAC (verify against Prisma 7 client first).
- **TanStack Table** + shadcn table — large grids (trucks, WOs, trips) with sort/filter/paginate.
- **react-hook-form** + Zod — forms/validation (Zod already installed).
- **exceljs** — bulk truck Excel parse/validate + template download.
- **@react-pdf/renderer** — invoice / gate-pass PDFs (print two copies).

## 11. Data model (Prisma) — key entities

Quantities & weights use `Decimal` (MT, fixed precision). Snake_case table names.

- **Auth (Better Auth):** `User` (+ `role` enum, optional `stationId`), `Session`, `Account`, `Verification`.
- **Shared masters:** `Truck` (vehicleNo unique, owner, insurer/policyNo/insuranceExpiry,
  fitnessCertNo/fitnessExpiry, status); `Driver` (name, licenceNo, licenceExpiry, phone, defaultTruckId?).
- **Delivery masters:** `Vessel` (name, **code**), `Supplier`, `Receiver` (name, address…),
  `Commodity` (name, defaultTolerancePct).
- **WorkOrder:** woNumber, serial, vesselId, supplierId, receiverId, commodityId, blQty,
  dispatchedQty=0, deliveredQty=0, tolerancePct (seeded from commodity), status. Derived: balance,
  allottable, inTransit.
- **WorkOrderTruck:** (workOrderId, truckId, allottedBy, allottedAt) — allotment M:N.
- **Trip (VT):** vtNumber, workOrderId, truckId, driverId, `status` (state machine), port tare/gross
  (+by/at), netLoaded, receiver gross/tare (+by/at), netDelivered, shortageQty, shortagePct,
  withinTolerance, approvalStatus (pending/accepted/disputed), approvedBy/At, disputeNote.
- **Invoice:** invoiceNumber, type (PORT_ENTRY | PORT_GATE_OUT | RECEIVER_FINAL), tripId,
  snapshot JSON, generatedBy/At.
- **AuditLog:** actor, action, entityType, entityId, before/after JSON, at (esp. weights + approvals).

### Quantity & integrity rules

- Numbering is **concurrency-safe** (locked numbering row per sequence).
- **Port gate-out:** in a transaction with a row lock on the WorkOrder, add `netLoaded` to
  `dispatchedQty`; guard `dispatchedQty ≤ blQty` (allow exact-fill final load; block over-dispatch).
- **Receiver tare:** add `netDelivered` to `deliveredQty`; compute shortage vs `tolerancePct`.
- **Trip state machine:** `CREATED → PORT_TARE → LOADED_GATE_OUT → IN_TRANSIT → RECEIVER_ARRIVED →
UNLOADED → COMPLETED → APPROVED | DISPUTED` (enforces ordering; no receiver weigh before gate-out).

## 12. RBAC matrix

| Capability                                       | ADMIN | PORT_WB | RECEIVER_WB | ACCOUNTS |
| ------------------------------------------------ | ----- | ------- | ----------- | -------- |
| Manage users/masters/trucks/drivers              | ✓     |         |             |          |
| Create WO + allot trucks                         | ✓     |         |             |          |
| Create VT, record port tare/gross, port invoices |       | ✓       |             |          |
| Record receiver gross/tare, final invoice        |       |         | ✓           |          |
| Accept/dispute shortage (approval)               | view  |         |             | ✓        |
| View dashboards/reports                          | ✓     | own     | own         | ✓        |

## 13. Numbering (OPEN — confirm before Phase 2)

- **WO#** = `WO-{serial:0000}-{vessel.code}` (vessel code = admin-set abbreviation on the Vessel master).
- **To confirm:** is the serial **global & continuous** (no yearly reset)? **Starting value / offset?**
  **VT# format?** (assumed `VT-{serial:000000}` continuous global until specified).

## 14. Phased roadmap (build + verify each before the next)

- **Phase 0 — Shared kernel & auth:** module structure, Better Auth (admin-provisioned, 4 roles),
  `requireRole` guard, audit log, base app shell/nav, seed the first admin user.
- **Phase 1 — Masters:** Truck (CRUD + **Excel bulk upload** + **expiry alerts**), Driver, and
  Vessel/Supplier/Receiver/Commodity.
- **Phase 2 — Work Orders:** create (WO# numbering), WO table (admin), **truck allotment checklist**, quantities.
- **Phase 3 — Port weighbridge:** VT creation + VT#, port tare/gross capture, transactional
  dispatched update, port invoices (PDF/print).
- **Phase 4 — Receiver weighbridge:** receiver gross/tare, delivered + shortage computation, final
  invoice (4 qty).
- **Phase 5 — Accounts approval:** accept/dispute workflow + tolerance flagging.
- **Phase 6 — Tracking board, alerts surfacing, reporting polish.**

## 15. Verification

- Each phase: `pnpm typecheck/lint/test` green; targeted Vitest for quantity math, shortage,
  numbering, and state transitions.
- **E2E happy path:** seed masters → create WO → allot trucks → run a full VT (port tare→gross ⇒
  dispatched updates → receiver gross→tare ⇒ shortage computed → accounts approve) → WO balance/DO
  correct. Auth/RBAC: every role limited to its actions; weighbridge cannot cross-edit.

## 16. Out of scope (Modules 1/3/4)

Arrival/BL/BE/storage; accounting/tax/e-way-bill generation; maintenance/storage plots — seams left
so they slot in cleanly later.
