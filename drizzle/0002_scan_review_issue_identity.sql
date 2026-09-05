ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS owner TEXT;
--> statement-breakpoint
ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS repo TEXT;
--> statement-breakpoint
ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS path TEXT;
--> statement-breakpoint
ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS issue_number INTEGER;
--> statement-breakpoint
ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS original_summary TEXT;
--> statement-breakpoint
UPDATE scan_reviews
SET owner = COALESCE(owner, 'legacy'),
    repo = COALESCE(repo, 'legacy'),
    path = COALESCE(path, target, ''),
    original_summary = COALESCE(original_summary, '{"totalChecks":0,"passed":0,"warnings":0,"failed":0,"criticalCount":0,"highCount":0,"mediumCount":0,"lowCount":0,"infoCount":0}')
WHERE owner IS NULL OR repo IS NULL OR path IS NULL OR original_summary IS NULL;
--> statement-breakpoint
WITH missing_issue_numbers AS (
  SELECT id, -ROW_NUMBER() OVER (ORDER BY id)::INTEGER AS issue_number
  FROM scan_reviews
  WHERE issue_number IS NULL
)
UPDATE scan_reviews review
SET issue_number = missing.issue_number
FROM missing_issue_numbers missing
WHERE review.id = missing.id;
--> statement-breakpoint
ALTER TABLE scan_reviews ALTER COLUMN owner SET NOT NULL;
--> statement-breakpoint
ALTER TABLE scan_reviews ALTER COLUMN repo SET NOT NULL;
--> statement-breakpoint
ALTER TABLE scan_reviews ALTER COLUMN path SET NOT NULL;
--> statement-breakpoint
ALTER TABLE scan_reviews ALTER COLUMN issue_number SET NOT NULL;
--> statement-breakpoint
ALTER TABLE scan_reviews ALTER COLUMN original_summary SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS scan_reviews_active_issue_idx
ON scan_reviews (owner, repo, issue_number)
WHERE status IN ('queued', 'processing', 'awaiting_approval');
