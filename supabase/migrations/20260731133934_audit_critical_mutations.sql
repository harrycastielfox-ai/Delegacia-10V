-- Registra mutacoes criticas no banco, na mesma transacao da operacao.
-- O frontend deixa de ser uma fonte confiavel para autoria e conteudo do evento.

revoke all on function public.log_auditoria(text, text, text, text, text, jsonb)
from public, anon, authenticated;

create or replace function public.audit_critical_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_actor_nome text;
  v_actor_email text;
  v_actor_login text;
  v_old_row jsonb := '{}'::jsonb;
  v_new_row jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_action text;
  v_module text;
  v_entity text;
  v_entity_id text;
  v_description text;
  v_metadata jsonb;
begin
  -- Falha fechada: uma mutacao critica sem usuario atribuivel nao e concluida.
  if v_actor_id is null then
    raise exception 'audit_actor_required' using errcode = '42501';
  end if;

  if tg_op <> 'INSERT' then
    v_old_row := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    v_new_row := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(changed.field_name order by changed.field_name), '[]'::jsonb)
      into v_changed_fields
    from (
      select fields.field_name
      from jsonb_object_keys(v_new_row) as fields(field_name)
      where (v_old_row -> fields.field_name) is distinct from (v_new_row -> fields.field_name)
    ) as changed;

    if jsonb_array_length(v_changed_fields) = 0 then
      return new;
    end if;
  end if;

  v_action := case tg_op
    when 'INSERT' then 'create'
    when 'DELETE' then 'delete'
    else 'update'
  end;

  -- Soft delete e uma exclusao para fins de auditoria.
  if tg_op = 'UPDATE'
     and tg_table_name in ('inqueritos', 'representacoes')
     and (v_old_row ->> 'deleted_at') is null
     and (v_new_row ->> 'deleted_at') is not null then
    v_action := 'delete';
  end if;

  v_entity_id := coalesce(v_new_row ->> 'id', v_old_row ->> 'id');

  case tg_table_name
    when 'inqueritos' then
      v_module := 'inqueritos';
      v_entity := 'inquerito';
      v_description := case v_action
        when 'create' then 'Criou inquérito'
        when 'delete' then 'Excluiu inquérito'
        else 'Editou inquérito'
      end;
      v_metadata := jsonb_strip_nulls(jsonb_build_object(
        'source', 'database_trigger',
        'operation', tg_op,
        'changed_fields', v_changed_fields,
        'numero_ppe', coalesce(v_new_row ->> 'numero_ppe', v_old_row ->> 'numero_ppe')
      ));

    when 'representacoes' then
      v_module := 'representacoes';
      v_entity := 'representacao';
      v_description := case v_action
        when 'create' then 'Criou representação'
        when 'delete' then 'Excluiu representação'
        else 'Editou representação'
      end;
      v_metadata := jsonb_strip_nulls(jsonb_build_object(
        'source', 'database_trigger',
        'operation', tg_op,
        'changed_fields', v_changed_fields,
        'tipo', coalesce(v_new_row ->> 'tipo', v_old_row ->> 'tipo')
      ));

    when 'profiles' then
      v_action := 'admin_update';
      v_module := 'admin_usuarios';
      v_entity := 'profiles';
      v_description := 'Atualizou acesso ou função institucional de usuário';
      v_metadata := jsonb_build_object(
        'source', 'database_trigger',
        'operation', tg_op,
        'changed_fields', v_changed_fields,
        'target_user_id', v_entity_id,
        'target_login', coalesce(v_new_row ->> 'login', v_old_row ->> 'login'),
        'target_nome', coalesce(v_new_row ->> 'nome', v_old_row ->> 'nome'),
        'target_email', coalesce(v_new_row ->> 'email', v_old_row ->> 'email'),
        'old_cargo', v_old_row ->> 'cargo',
        'new_cargo', v_new_row ->> 'cargo',
        'old_status', v_old_row ->> 'status_autorizacao',
        'new_status', v_new_row ->> 'status_autorizacao',
        'old_funcao_institucional', v_old_row ->> 'funcao_institucional',
        'new_funcao_institucional', v_new_row ->> 'funcao_institucional'
      );

    else
      raise exception 'unsupported_audit_table: %.%', tg_table_schema, tg_table_name;
  end case;

  select p.nome, p.email, p.login
    into v_actor_nome, v_actor_email, v_actor_login
  from public.profiles as p
  where p.id = v_actor_id;

  insert into public.auditoria (
    executor_user_id,
    executor_nome,
    executor_email,
    executor_login,
    acao,
    modulo,
    entidade,
    entidade_id,
    descricao,
    metadata
  ) values (
    v_actor_id,
    v_actor_nome,
    v_actor_email,
    v_actor_login,
    v_action,
    v_module,
    v_entity,
    v_entity_id,
    v_description,
    v_metadata
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function public.audit_critical_row_change()
from public, anon, authenticated;

drop trigger if exists audit_inqueritos_critical_changes on public.inqueritos;
create trigger audit_inqueritos_critical_changes
after insert or update or delete on public.inqueritos
for each row execute function public.audit_critical_row_change();

drop trigger if exists audit_representacoes_critical_changes on public.representacoes;
create trigger audit_representacoes_critical_changes
after insert or update or delete on public.representacoes
for each row execute function public.audit_critical_row_change();

drop trigger if exists audit_profiles_access_changes on public.profiles;
create trigger audit_profiles_access_changes
after update of cargo, status_autorizacao, funcao_institucional on public.profiles
for each row
when (
  old.cargo is distinct from new.cargo
  or old.status_autorizacao is distinct from new.status_autorizacao
  or old.funcao_institucional is distinct from new.funcao_institucional
)
execute function public.audit_critical_row_change();

comment on function public.audit_critical_row_change() is
  'Auditoria transacional e confiavel de inqueritos, representacoes e alteracoes criticas de acesso.';
