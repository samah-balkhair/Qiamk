CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "coreValues" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"isDefault" boolean DEFAULT true NOT NULL,
	"createdBy" varchar(64),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dailyQuota" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"scenariosGenerated" integer DEFAULT 0 NOT NULL,
	"quotaLimit" integer DEFAULT 1500 NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finalResults" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"topValue1Id" varchar(64) NOT NULL,
	"topValue1Definition" text,
	"topValue2Id" varchar(64) NOT NULL,
	"topValue2Definition" text,
	"topValue3Id" varchar(64) NOT NULL,
	"topValue3Definition" text,
	"sentToGhl" boolean DEFAULT false,
	"emailSent" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "initialComparisons" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"value1Id" varchar(64) NOT NULL,
	"value2Id" varchar(64) NOT NULL,
	"selectedValueId" varchar(64) NOT NULL,
	"comparisonRound" integer NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"value1Id" varchar(64) NOT NULL,
	"value1Definition" text,
	"value2Id" varchar(64) NOT NULL,
	"value2Definition" text,
	"scenarioText" text NOT NULL,
	"selectedValueId" varchar(64),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "selectedValues" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"valueId" varchar(64) NOT NULL,
	"definition" text,
	"initialScore" integer DEFAULT 0,
	"finalScore" integer DEFAULT 0,
	"rank" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"currentPage" integer DEFAULT 1 NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"comparisonsCompleted" integer DEFAULT 0,
	"totalComparisons" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(20),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastSignedIn" timestamp DEFAULT now()
);
