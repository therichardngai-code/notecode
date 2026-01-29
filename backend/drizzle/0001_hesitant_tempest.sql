CREATE TABLE `git_commit_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`project_id` text NOT NULL,
	`attempt_number` integer DEFAULT 1,
	`status` text DEFAULT 'pending',
	`commit_message` text,
	`files_changed` text,
	`diff_summary` text,
	`commit_sha` text,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`pushed_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hooks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`task_id` text,
	`name` text NOT NULL,
	`event` text NOT NULL,
	`type` text NOT NULL,
	`config` text NOT NULL,
	`filters` text,
	`enabled` integer DEFAULT true,
	`priority` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `status` text DEFAULT 'complete';--> statement-breakpoint
ALTER TABLE `messages` ADD `stream_offset` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `system_prompt` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `resume_mode` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `attempt_number` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `sessions` ADD `resumed_from_session_id` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `initial_prompt` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `included_context_files` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `included_skills` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `fallback_model` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `system_prompt` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `subagent_delegates` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `auto_branch` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `auto_commit` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `branch_name` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `base_branch` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `branch_created_at` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `permission_mode` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `total_attempts` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `renew_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `retry_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `fork_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_attempt_at` text;