-- Fix RLS for soft delete flow on public.inqueritos using anon role.
-- This migration is meant to be applied manually (SQL Editor or migration tool).

ALTER TABLE public.inqueritos ENABLE ROW LEVEL SECURITY;

-- Allow anon to read only active (non-deleted) records.
DROP POLICY IF EXISTS inqueritos_select_active_anon ON public.inqueritos;
CREATE POLICY inqueritos_select_active_anon
ON public.inqueritos
FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- Allow anon to soft delete active records by updating deleted_at.
DROP POLICY IF EXISTS inqueritos_soft_delete_update_anon ON public.inqueritos;
CREATE POLICY inqueritos_soft_delete_update_anon
ON public.inqueritos
FOR UPDATE
TO anon
USING (deleted_at IS NULL)
WITH CHECK (deleted_at IS NOT NULL);
