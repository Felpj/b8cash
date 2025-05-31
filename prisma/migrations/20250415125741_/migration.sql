-- CreateTable
CREATE TABLE `WebhookLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notificationType` VARCHAR(191) NULL,
    `requestHeaders` TEXT NOT NULL,
    `requestBody` TEXT NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
