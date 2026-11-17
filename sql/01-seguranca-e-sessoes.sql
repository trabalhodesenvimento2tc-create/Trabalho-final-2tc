-- Execute no SQL Editor do Supabase antes dos scripts 02, 03 e 04.
-- Define o proprietário no banco e substitui políticas antigas por RLS por usuário.
do $$
declare
  tabela text;
  politica record;
  tabelas text[] := array['materias', 'sessoes', 'anotacoes', 'plano_estudos'];
begin
  foreach tabela in array tabelas loop
    if to_regclass(format('public.%I', tabela)) is not null then
      execute format(
        'alter table public.%I alter column user_id set default auth.uid()',
        tabela
      );
      execute format('alter table public.%I enable row level security', tabela);

      for politica in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = tabela
      loop
        execute format('drop policy %I on public.%I', politica.policyname, tabela);
      end loop;

      execute format(
        'create policy foco_rota_select_own on public.%I for select using (auth.uid() = user_id)',
        tabela
      );
      execute format(
        'create policy foco_rota_insert_own on public.%I for insert with check (auth.uid() = user_id)',
        tabela
      );
      execute format(
        'create policy foco_rota_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        tabela
      );
      execute format(
        'create policy foco_rota_delete_own on public.%I for delete using (auth.uid() = user_id)',
        tabela
      );
    end if;
  end loop;

  if to_regclass('public.sessoes') is not null then
    alter table public.sessoes
      add column if not exists segundos_estudados integer not null default 0,
      add column if not exists concluida boolean not null default true;

    update public.sessoes
    set segundos_estudados = minutos * 60
    where segundos_estudados = 0 and minutos > 0;
  end if;
end;
$$;
