ALTER TABLE `links` ADD `countryBlock` text;--> statement-breakpoint
ALTER TABLE `links` ADD `countryAllow` text;--> statement-breakpoint
ALTER TABLE `links` ADD `ab` text;--> statement-breakpoint
ALTER TABLE `links` ADD `maxClicks` integer;--> statement-breakpoint
ALTER TABLE `links` ADD `click_count` integer DEFAULT 0 NOT NULL;