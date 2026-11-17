const SUPABASE_URL = "https://wboaqwpxnoghtzwbdygh.supabase.co";
 const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib2Fxd3B4bm9naHR6d2JkeWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTY2NzAsImV4cCI6MjEwOTEzMjY3MH0.F_T5HzdpxMAZfYfUm3ljMNQ67W4CLgKoeje2z9IHAdo";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MATERIAS_INICIAIS = [
  { nome: "Português", cor: "#3b82f6" },
  { nome: "Matemática", cor: "#2563eb" },
  { nome: "História", cor: "#60a5fa" },
  { nome: "Geografia", cor: "#1d4ed8" },
  { nome: "Ciências", cor: "#93c5fd" },
  { nome: "Inglês", cor: "#38bdf8" }
];

function traduzirErro(error) {
  const mensagem = error?.message || "Erro desconhecido.";
  if (mensagem.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("Email rate limit")) return "Não foi possível concluir agora. Aguarde alguns minutos e tente novamente.";
  if (/Password should be at least|password.*characters|password.*short/i.test(mensagem)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/expired|invalid.*token|token.*invalid|Auth session missing/i.test(mensagem)) {
    return "O link de recuperação expirou ou é inválido. Solicite um novo link.";
  }
  if (mensagem.includes("already registered")) return "Este e-mail já está cadastrado.";
  if (mensagem.includes("invalid email")) return "Digite um e-mail válido.";
  if (mensagem.includes("Email not confirmed")) return "Confirme o e-mail antes de entrar.";
  if (/Failed to fetch|NetworkError|fetch failed/i.test(mensagem)) {
    return "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.";
  }
  return mensagem;
}

function verificarResultado(resultado) {
  if (resultado.error) throw resultado.error;
  return resultado.data;
}

async function api(acao, dados = {}) {
  try {
    if (acao === "sessao") {
      const resultado = await sb.auth.getSession();
      if (resultado.error) throw resultado.error;
      return resultado;
    }
    if (acao === "cadastrar") {
      return verificarResultado(await sb.auth.signUp({ email: dados.email, password: dados.senha }));
    }
    if (acao === "entrar") {
      return verificarResultado(await sb.auth.signInWithPassword({ email: dados.email, password: dados.senha }));
    }
    if (acao === "recuperar_senha") {
      const { error } = await sb.auth.resetPasswordForEmail(dados.email, { redirectTo: dados.redirectTo });
      if (error) throw error;
      return { ok: true };
    }
    if (acao === "atualizar_senha") {
      return verificarResultado(await sb.auth.updateUser({ password: dados.senha }));
    }
    if (acao === "sair") {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      return { ok: true };
    }

    const resultadoUsuario = await sb.auth.getUser();
    if (resultadoUsuario.error) throw resultadoUsuario.error;
    const usuario = resultadoUsuario.data.user;
    if (!usuario) throw new Error("Sua sessão expirou. Entre novamente.");

    switch (acao) {
      case "iniciar_usuario": {
        const existentes = verificarResultado(
          await sb.from("materias").select("id").limit(1)
        );
        if (!existentes.length) {
          verificarResultado(await sb.from("materias").insert(MATERIAS_INICIAIS));
        }
        return { ok: true };
      }
      case "materias_listar":
        return verificarResultado(await sb.from("materias").select("*").order("created_at"));
      case "materias_criar":
        return verificarResultado(await sb.from("materias").insert({
          nome: dados.nome,
          cor: dados.cor || "#3b82f6"
        }).select());
      case "materias_editar":
        return verificarResultado(await sb.from("materias").update({
          nome: dados.nome,
          cor: dados.cor
        }).eq("id", dados.id).select());
      case "materias_excluir":
        return verificarResultado(await sb.from("materias").delete().eq("id", dados.id));
      case "plano_listar":
        return verificarResultado(await sb.from("plano_estudos").select("*").order("dia"));
      case "plano_criar":
        return verificarResultado(await sb.from("plano_estudos").insert({
          dia: dados.dia,
          materia_id: dados.materia_id,
          minutos: dados.minutos,
          observacao: dados.observacao || null
        }).select());
      case "plano_editar":
        return verificarResultado(await sb.from("plano_estudos").update({
          dia: dados.dia,
          materia_id: dados.materia_id,
          minutos: dados.minutos,
          observacao: dados.observacao || null
        }).eq("id", dados.id).select());
      case "plano_marcar":
        return verificarResultado(await sb.from("plano_estudos").update({ feito: dados.feito })
          .eq("id", dados.id));
      case "plano_excluir":
        return verificarResultado(await sb.from("plano_estudos").delete()
          .eq("id", dados.id));
      case "sessao_salvar": {
        if (!Number.isFinite(dados.segundos_estudados) || dados.segundos_estudados < 1) {
          throw new Error("O tempo estudado precisa ser maior que zero.");
        }
        const segundos = Math.floor(dados.segundos_estudados);
        return verificarResultado(await sb.from("sessoes").insert({
          minutos: Math.floor(segundos / 60),
          segundos_estudados: segundos,
          concluida: dados.concluida,
          materia_id: dados.materia_id || null
        }));
      }
      case "resumo": {
        const sessoes = verificarResultado(await sb.from("sessoes")
          .select("segundos_estudados, minutos, concluida"));
        const segundos = sessoes.reduce((total, sessao) => {
          return total + (sessao.segundos_estudados || sessao.minutos * 60);
        }, 0);
        return {
          pomodoros: sessoes.filter(sessao => sessao.concluida).length,
          minutos: Math.floor(segundos / 60)
        };
      }
      case "estatisticas_materias": {
        const sessoes = verificarResultado(await sb.from("sessoes")
          .select("materia_id, segundos_estudados, minutos, concluida"));
        const estatisticas = {};
        sessoes.forEach(sessao => {
          if (!sessao.materia_id) return;
          const estatistica = estatisticas[sessao.materia_id] || { segundos: 0, blocos: 0 };
          estatistica.segundos += sessao.segundos_estudados || sessao.minutos * 60;
          if (sessao.concluida) estatistica.blocos += 1;
          estatisticas[sessao.materia_id] = estatistica;
        });
        return Object.fromEntries(Object.entries(estatisticas).map(([id, estatistica]) => [
          id,
          { minutos: Math.floor(estatistica.segundos / 60), blocos: estatistica.blocos }
        ]));
      }
      case "frase": {
        const frases = verificarResultado(await sb.from("frases").select("texto").limit(20));
        return { texto: frases.length ? frases[new Date().getDate() % frases.length].texto : "Um passo de cada vez." };
      }
      case "anotacoes_listar":
        return verificarResultado(await sb.from("anotacoes").select("*").order("created_at", { ascending: false }));
      case "anotacoes_criar":
        return verificarResultado(await sb.from("anotacoes").insert({
          titulo: dados.titulo,
          texto: dados.texto,
          materia_id: dados.materia_id || null
        }).select());
      case "anotacoes_editar":
        return verificarResultado(await sb.from("anotacoes").update({
          titulo: dados.titulo,
          texto: dados.texto,
          materia_id: dados.materia_id || null
        }).eq("id", dados.id).select());
      case "anotacoes_excluir":
        return verificarResultado(await sb.from("anotacoes").delete().eq("id", dados.id));
      default:
        throw new Error(`Ação desconhecida: ${acao}`);
    }
  } catch (error) {
    throw new Error(traduzirErro(error));
  }
}
