-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BRANCH',
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "secondMobile" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "customerHeight" REAL,
    "sleeveLength" REAL,
    "shoulderWidth" REAL,
    "chestWidth" REAL,
    "backLength" REAL,
    "frontLength" REAL,
    "specialMeasurements" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerMeasurement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "productType" TEXT NOT NULL DEFAULT 'BISHT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dueDate" DATETIME,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL,
    "deposit" REAL,
    "remaining" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "branchNotes" TEXT,
    "factoryNotes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL DEFAULT 1,
    "embroideryModel" TEXT,
    "fabric" TEXT,
    "size" TEXT,
    "color" TEXT,
    "zariWidth" TEXT,
    "brooj" TEXT,
    "tanjeema" TEXT,
    "dakkaLine" TEXT,
    "mukassar" TEXT,
    "takheela" TEXT,
    "neckHoleWidth" TEXT,
    "embroideryLength" TEXT,
    "customerHeight" TEXT,
    "sleeveLength" TEXT,
    "shoulderWidth" TEXT,
    "chestWidth" TEXT,
    "backLength" TEXT,
    "frontLength" TEXT,
    "specialMeasurements" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DropdownOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "mobile" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SMS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "sentAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownOption_category_value_key" ON "DropdownOption"("category", "value");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
