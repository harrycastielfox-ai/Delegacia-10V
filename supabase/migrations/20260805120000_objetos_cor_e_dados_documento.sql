-- Campos que faltavam no cadastro de Objetos, conferidos contra a planilha
-- real de controle da unidade (BASE_OBJETOS): cor do objeto e os dados de
-- identificação civil quando o objeto apreendido é um documento (RG, CNH,
-- passaporte etc.) — nome de quem consta no documento, órgão emissor/UF e
-- número do documento. Sem esses três, um documento apreendido ficava
-- cadastrado sem nenhum dado que realmente o identifica.

alter table public.objects
  add column if not exists color text,
  add column if not exists document_holder_name text,
  add column if not exists document_issuing_authority text,
  add column if not exists document_number text;

comment on column public.objects.color is 'Cor do objeto, quando relevante para identificação.';
comment on column public.objects.document_holder_name is
  'Nome da pessoa identificada no documento apreendido (aplica-se a object_type = documento).';
comment on column public.objects.document_issuing_authority is
  'Órgão emissor e UF do documento apreendido (ex.: SSP/BA).';
comment on column public.objects.document_number is 'Número do documento apreendido.';

create or replace function private.prepare_object_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(new.internal_id), '') is null then
      new.internal_id := 'OBJ-' || to_char(current_date, 'YYYY') || '-' ||
        lpad(nextval('public.object_internal_id_seq'::regclass)::text, 6, '0');
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  new.pending_identification := coalesce(new.pending_identification, false)
    or coalesce(new.situation = 'pendente_identificacao', false);

  new.search_text := public.normalize_object_search(concat_ws(' ',
    new.internal_id, new.object_type, new.description, new.brand_model,
    new.serial_number, new.caliber, new.color, new.occurrence_type, new.procedure_type,
    new.procedure_number, new.police_report_number, new.court_process_number,
    new.involved_people, new.custody_location, new.storage_location,
    new.status, new.situation, new.document_holder_name, new.document_number,
    new.document_issuing_authority
  ));
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$function$;
