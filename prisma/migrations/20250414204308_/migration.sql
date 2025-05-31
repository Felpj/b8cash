/*
  Warnings:

  - Added the required column `accountDigit` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agencyDigit` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankNumber` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `account` ADD COLUMN `accountDigit` VARCHAR(191) NOT NULL,
    ADD COLUMN `agencyDigit` VARCHAR(191) NOT NULL,
    ADD COLUMN `bankNumber` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `document` VARCHAR(191) NOT NULL;
