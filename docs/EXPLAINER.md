# RetailPulse Architecture & Feature Explainer

This document outlines the architecture, data flow, key technical decisions, and interview Q&A for the Retail Inventory & Sales Management System.

---

## 1. Feature Map & Code Walkthrough

### Feature A: Atomic Point-of-Sale Checkout
- **Files to Open**:
  - `server/src/services/sale.service.ts`
  - `server/src/controllers/sale.controller.ts`
  - `server/src/utils/invoice-generator.ts`
  - `client/src/app/sales/new/page.tsx`
- **Flow**:
  1. The client submits a cart with product IDs, quantities, and discount/tax options.
  2. Inside a MongoDB transaction (`session.withTransaction`), products are loaded from the database, checked for `isActive`, and price snapshots are computed from DB prices.
  3. Stock is deducted conditionally using `{ _id: id, stock: { $gte: quantity } }` with `$inc: { stock: -quantity }`.
  4. An atomic sequential invoice number (`INV-YYYYMMDD-XXXX`) is reserved via a dedicated `Counter` model.
  5. An append-only `StockMovement` entry is persisted for each line item, and the final `Sale` document is created. If any item has insufficient stock or a write fails, the entire transaction rolls back cleanly.
- **Key Decision & Why**:
  - *Why MongoDB Transactions with Conditional Updates?*: A basic read-then-write approach leaves a race window where concurrent checkouts can both read `stock = 1` and decrement to `-1`. Conditional updates (`stock: { $gte: qty }`) combined with multi-document transactions ensure ACID atomicity across the sale, receipt generation, and stock movement logs.

---

### Feature B: Price Snapshotting & Tamper Resistance
- **Files to Open**:
  - `server/src/services/sale.service.ts` (`createSale`)
  - `server/tests/sales-transaction.test.ts` (`ignores client price tampering`)
- **Flow**:
  1. The client sends product IDs and desired quantities.
  2. The server ignores any `unitPrice`, `lineTotal`, or `subtotal` sent in the request body.
  3. The server queries the database for authoritative `sellingPrice` and `purchasePrice` values.
  4. Line totals, discounts, and taxes are strictly calculated and rounded on the backend.
  5. The authoritative prices are recorded into `skuSnapshot`, `nameSnapshot`, `unitPrice`, and `unitCost` on the sale items.
- **Key Decision & Why**:
  - *Why Price Snapshots?*: Products frequently change prices or names over time. If orders only referenced a Product ID without snapshots, editing a product's price next month would corrupt all historical financial records and profit calculations.

---

### Feature C: Append-Only Stock Movement Audit Log
- **Files to Open**:
  - `server/src/models/StockMovement.ts`
  - `server/src/services/inventory.service.ts`
  - `client/src/app/inventory/page.tsx`
- **Flow**:
  1. Every inventory modification (shipment received, sale completed, manual addition, damage removal, or customer return) invokes `StockMovement.create`.
  2. The movement logs `quantityBefore`, `quantityAfter`, the operator's user ID, timestamp, reason, and reference ID.
  3. The model only enables `createdAt` (no `updatedAt`) and has no update/delete routes exposed in the API.
- **Key Decision & Why**:
  - *Why Append-Only Logs?*: In retail inventory, discrepancy investigations require reconstructing exact stock levels at any point in history. Mutable stock counts without an append-only ledger make it impossible to audit shrinkage, cashier theft, or vendor shortages.

---

### Feature D: Sales Returns & Stock Restoration
- **Files to Open**:
  - `server/src/services/sale.service.ts` (`processSaleReturn`)
  - `server/src/models/SaleReturn.ts`
  - `client/src/app/sales/[id]/page.tsx`
- **Flow**:
  1. An Administrator initiates a return request with item IDs, returned quantities, and a reason.
  2. The transaction verifies that the returned quantity does not exceed the remaining refundable quantity (`soldQty - previousReturns`).
  3. Pro-rated refunds are computed, taking into account any original order discounts.
  4. Product inventory is incremented via `$inc: { stock: quantity }`, and a `RETURN` audit log entry is written.
  5. The sale's status transitions from `Completed` to either `PartiallyReturned` or `Returned`.
- **Key Decision & Why**:
  - *Why Admin-Only Approval for Returns?*: Allowing unrestricted return processing creates an attack vector for unauthorized inventory or cashier drawer manipulation. Enforcing role checks guarantees accountability.

---

### Feature E: Net Profitability Analytics
- **Files to Open**:
  - `server/src/services/report.service.ts` (`getProfitReport`)
  - `client/src/app/reports/page.tsx`
- **Flow**:
  1. Invoices within the requested date range are fetched along with their corresponding return records.
  2. Gross revenue and unit costs (`purchasePrice` snapshot) are aggregated across all line items.
  3. Customer refunds and the cost value of restocked items are subtracted.
  4. Net profit is calculated as: `(Net Revenue - Net Cost of Goods Sold - Discounts)`.
- **Key Decision & Why**:
  - *Why Factor in Unit Cost Snapshots?*: Calculating profit using current product prices would be inaccurate if vendor prices rose or fell after the item was sold. Snapshots ensure margin reports reflect true historical margins.

---

## 2. Top 10 Technical Interview Questions & Answers

### Q1: Why did you choose MongoDB multi-document transactions instead of simple `$inc` operations?
> **Answer**: While a single `$inc` is atomic on one document, a retail checkout spans multiple collections: updating stock for multiple distinct products, creating an immutable `Sale` document, writing multiple `StockMovement` audit logs, and incrementing a daily invoice sequence. If product #2 fails validation or MongoDB crashes midway, a transaction guarantees all changes roll back, preventing ghost sales or missing stock.

### Q2: How does your implementation prevent overselling under high concurrency?
> **Answer**: We combine a transaction with conditional atomic updates: `{ _id: productId, stock: { $gte: requestedQty } }` with `$inc: { stock: -requestedQty }`. If two requests compete for the last item in stock, MongoDB's document-level locking serializes them; the first matches the filter and decrements stock to 0, while the second fails the `$gte` condition, returns null, and throws an `INSUFFICIENT_STOCK` (409) conflict.

### Q3: Why is MongoDB Replica Set required for this architecture?
> **Answer**: MongoDB multi-document transactions rely on the WiredTiger storage engine's replica set oplog to coordinate distributed two-phase commits across documents. In development and CI tests, we use `MongoMemoryReplSet` to replicate production Atlas replica sets without external dependencies.

### Q4: How do you prevent clients from tampering with item prices during checkout?
> **Answer**: The checkout endpoint only accepts `productId` and `quantity` from the client. Any client-sent prices, subtotals, or taxes are discarded. The service re-fetches authoritative `sellingPrice` and `purchasePrice` directly from MongoDB and computes all calculations on the server.

### Q5: What is the purpose of storing `skuSnapshot` and `nameSnapshot` on each sale item?
> **Answer**: Products are mutable—a manager might rename a product or update its SKU next quarter. By embedding snapshots into the `Sale` line items, the receipt and financial history remain permanently accurate and immutable, preserving receipt integrity even if the catalog item is updated or deactivated.

### Q6: How does the system enforce that staff cannot perform unauthorized adjustments?
> **Answer**: We enforce role authorization at two layers:
> 1. Route-level middleware (`requireRole('Admin')`) blocks unauthorized endpoints.
> 2. Service-level checks inspect `user.role` on the `/api/inventory/adjustments` route to ensure staff can only perform `received` restock actions, while `add` (corrections) and `remove` (damage/write-offs) strictly require Admin credentials.

### Q7: Why are stock movements strictly append-only?
> **Answer**: In retail inventory, traceability is critical. If a manager could edit or delete an audit log, shrinkage or fraud could be masked. By making `StockMovement` immutable and recording `quantityBefore` and `quantityAfter`, any auditor can trace the complete lifecycle of every unit of inventory.

### Q8: How did you test race conditions in your Jest test suite?
> **Answer**: In `tests/sales-transaction.test.ts`, we spawn two concurrent requests via `Promise.all` targeting the same product where total requested quantity exceeds available stock (e.g., 8 requested vs 5 in stock). We assert that one request returns `201` and the other returns `409`, and that final database stock is non-negative and matches expected inventory.

### Q9: How do you handle partial vs complete sales returns?
> **Answer**: When a return is requested, we query all prior `SaleReturn` documents for that sale, compute the remaining refundable count per item, and validate that `requestedReturnQty <= soldQty - alreadyReturnedQty`. If the cumulative returned quantities equal the total sold quantities across all products, the sale status transitions to `Returned`; otherwise, it becomes `PartiallyReturned`.

### Q10: Why use custom `AppError` and centralized error handling instead of scattered try/catch blocks?
> **Answer**: Scattering `res.status(...).json(...)` across controllers duplicates envelope formatting, leads to inconsistent error shapes, and makes refactoring difficult. Centralizing errors via `AppError` guarantees that every error follows the `{ success: false, error: { code, message, details } }` contract and maps domain errors (such as 409 conflict or 422 validation) to clean HTTP responses.
