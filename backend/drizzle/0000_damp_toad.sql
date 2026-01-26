CREATE TABLE `agent_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text NOT NULL,
	`summary` text NOT NULL,
	`key_decisions` text,
	`files_modified` text,
	`token_count` integer DEFAULT 0,
	`extracted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`description` text,
	`focus_areas` text,
	`default_skills` text,
	`default_tools` text,
	`inject_previous_summaries` integer DEFAULT true,
	`max_summaries_to_inject` integer DEFAULT 5,
	`total_sessions` integer DEFAULT 0,
	`total_tokens_used` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`message_id` text,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`tool_category` text DEFAULT 'requires-approval',
	`matched_pattern` text,
	`status` text DEFAULT 'pending',
	`timeout_at` text NOT NULL,
	`auto_action` text DEFAULT 'deny',
	`decided_at` text,
	`decided_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`changes` text,
	`performed_by` text,
	`session_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `diffs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`message_id` text,
	`tool_use_id` text NOT NULL,
	`approval_id` text,
	`file_path` text NOT NULL,
	`operation` text NOT NULL,
	`old_content` text,
	`new_content` text,
	`full_content` text,
	`line_start` integer,
	`line_end` integer,
	`hunks` text,
	`status` text DEFAULT 'pending',
	`applied_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`blocks` text NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP,
	`token_count` integer,
	`tool_name` text,
	`tool_input` text,
	`tool_result` text,
	`approval_id` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`is_favorite` integer DEFAULT false,
	`last_accessed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`agent_id` text,
	`parent_session_id` text,
	`provider_session_id` text,
	`name` text,
	`status` text DEFAULT 'queued',
	`provider` text,
	`process_id` integer,
	`working_dir` text,
	`started_at` text,
	`ended_at` text,
	`duration_ms` integer,
	`token_input` integer DEFAULT 0,
	`token_output` integer DEFAULT 0,
	`token_cache_read` integer DEFAULT 0,
	`token_cache_creation` integer DEFAULT 0,
	`token_total` integer DEFAULT 0,
	`estimated_cost_usd` real DEFAULT 0,
	`model_usage` text,
	`tool_stats` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'global' NOT NULL,
	`user_name` text,
	`theme` text DEFAULT 'system',
	`default_provider` text,
	`default_model` text,
	`api_keys` text,
	`yolo_mode` integer DEFAULT false,
	`approval_gate` text,
	`auto_extract_summary` integer DEFAULT true,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_id` text,
	`parent_id` text,
	`dependencies` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'not-started',
	`priority` text DEFAULT 'medium',
	`assignee` text,
	`due_date` text,
	`agent_role` text,
	`provider` text,
	`model` text,
	`skills` text,
	`tools` text,
	`context_files` text,
	`workflow_stage` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_path_unique` ON `projects` (`path`);