CREATE TABLE `link_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`link_slug` text NOT NULL,
	`actor` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE INDEX `link_audit_logs_created_at_idx` ON `link_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `link_audit_logs_link_slug_idx` ON `link_audit_logs` (`link_slug`);