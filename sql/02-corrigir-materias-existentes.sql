-- Este arquivo corrige nomes já salvo em algumas contas.
-- Não apague linhas nem matérias. Execute apenas depois de confirmar as linhas
-- distorcidas pelo filtro abaixo.

select id, user_id, nome
from public.materias
where nome in (
  'PortuguÃªs', 'MatemÃ¡tica', 'HistÃ³ria',
  'Geografia', 'CiÃªncias', 'InglÃªs'
)
order by nome;

update public.materias set nome = 'Português'
where nome = 'PortuguÃªs';

update public.materias set nome = 'Matemática'
where nome = 'MatemÃ¡tica';

update public.materias set nome = 'História'
where nome = 'HistÃ³ria';

update public.materias set nome = 'Geografia'
where nome = 'Geografia';

update public.materias set nome = 'Ciências'
where nome = 'CiÃªncias';

update public.materias set nome = 'Inglês'
where nome = 'InglÃªs';
