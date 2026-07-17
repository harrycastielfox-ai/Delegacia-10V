-- Endurece o acesso direto aos envolvidos de inqueritos.
-- A escrita permanece exclusivamente pela RPC replace_inquerito_pessoas.

revoke all on table public.inquerito_pessoas from authenticated;
grant select on table public.inquerito_pessoas to authenticated;

create index if not exists inquerito_pessoas_created_by_idx
  on public.inquerito_pessoas (created_by);
