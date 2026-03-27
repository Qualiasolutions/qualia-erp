-- Batch update task sort_order and status in a single round-trip
-- Called from app/actions/inbox.ts reorderTasks()
CREATE OR REPLACE FUNCTION batch_update_task_orders(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE tasks
    SET
      sort_order = (item->>'sort_order')::int,
      status = COALESCE(item->>'status', status),
      completed_at = CASE
        WHEN item->>'status' = 'Done' THEN now()
        WHEN item ? 'status' AND item->>'status' != 'Done' THEN NULL
        ELSE completed_at
      END
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
