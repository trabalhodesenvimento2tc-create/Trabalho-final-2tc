let tela = "login";
let usuario = null;
let materias = [];
let timerSalvando = false;
let recuperacaoAtiva = false;
let recuperacaoSolicitadaNaUrl = false;
let chaveTimer = "";
let materiaEditando = null;
let blocoEditando = null;
let notaEditando = null;

const view = document.getElementById("view");
const temaChave = "foco-rota-tema";
const DURACAO_PADRAO = 25 * 60;
let estadoTimer = novoTimer();

function novoTimer() {
  return {
    duracao: DURACAO_PADRAO,
    restante: DURACAO_PADRAO,
    estudado: 0,
    rodando: false,
    iniciadoEm: null,
    materiaId: ""
  };
}

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function feedback(mensagem = "", tipo = "") {
  const elemento = document.getElementById("feedback");
  elemento.textContent = mensagem;
  elemento.className = `feedback${tipo ? ` ${tipo}` : ""}`;
  elemento.hidden = !mensagem;
}

function definirTema(tema) {
  const valor = tema === "claro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = valor;
  try {
    localStorage.setItem(temaChave, valor);
  } catch {
    feedback("Não foi possível salvar a preferência de tema neste navegador.", "erro");
  }
  const botao = document.getElementById("btn-tema");
  const rotulo = valor === "claro" ? "Ativar tema escuro" : "Ativar tema claro";
  botao.setAttribute("aria-label", rotulo);
  botao.title = rotulo;
}

function configurarTema() {
  let tema = "escuro";
  try {
    tema = localStorage.getItem(temaChave) || tema;
  } catch {
    feedback("Não foi possível ler a preferência de tema deste navegador.", "erro");
  }
  definirTema(tema);
  document.getElementById("btn-tema").onclick = () => {
    definirTema(document.documentElement.dataset.tema === "claro" ? "escuro" : "claro");
  };
}

function salvarTimer() {
  try {
    localStorage.setItem(chaveTimer, JSON.stringify(estadoTimer));
  } catch {
    feedback("Não foi possível salvar o estado do cronômetro neste navegador.", "erro");
  }
}

function restaurarTimer() {
  const valor = localStorage.getItem(chaveTimer);
  if (!valor) {
    estadoTimer = novoTimer();
    return;
  }
  try {
    const salvo = JSON.parse(valor);
    if (
      !Number.isFinite(salvo.duracao) ||
      !Number.isFinite(salvo.restante) ||
      !Number.isFinite(salvo.estudado) ||
      typeof salvo.rodando !== "boolean"
    ) throw new Error("Estado do cronômetro inválido.");
    estadoTimer = { ...novoTimer(), ...salvo };
  } catch {
    localStorage.removeItem(chaveTimer);
    estadoTimer = novoTimer();
    feedback("O estado salvo do cronômetro estava inválido e foi reiniciado.", "erro");
  }
}

function restanteAtual() {
  if (!estadoTimer.rodando || !estadoTimer.iniciadoEm) return Math.max(0, estadoTimer.restante);
  return Math.max(0, estadoTimer.restante - (Date.now() - estadoTimer.iniciadoEm) / 1000);
}

function estudadoAtual() {
  if (!estadoTimer.rodando || !estadoTimer.iniciadoEm) return Math.max(0, estadoTimer.estudado);
  return estadoTimer.estudado + Math.max(0, (Date.now() - estadoTimer.iniciadoEm) / 1000);
}

function sincronizarTimer() {
  estadoTimer.restante = restanteAtual();
  estadoTimer.estudado = estudadoAtual();
  estadoTimer.rodando = false;
  estadoTimer.iniciadoEm = null;
  salvarTimer();
}

function formatarTempo(segundos) {
  const total = Math.ceil(Math.max(0, segundos));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function atualizarTimer() {
  const mostrador = document.getElementById("tempo");
  if (mostrador) mostrador.textContent = formatarTempo(restanteAtual());
  if (estadoTimer.rodando && restanteAtual() <= 0) concluirTimer(true);
}

function montarTela(conteudo, navegacao = true) {
  view.innerHTML = `${conteudo}${navegacao ? `
    <nav class="nav" aria-label="Navegação principal">
      ${[
        ["inicio", "Início"],
        ["estudar", "Estudar"],
        ["materias", "Matérias"],
        ["plano", "Plano"],
        ["notas", "Anotações"]
      ].map(([nome, rotulo]) => `<button type="button" data-tela="${nome}" class="${tela === nome ? "active" : ""}"${tela === nome ? ' aria-current="page"' : ""}>${rotulo}</button>`).join("")}
      <button id="sair" type="button">Sair</button>
    </nav>` : ""}`;

  view.querySelectorAll("[data-tela]").forEach(botao => {
    botao.onclick = () => mostrar(botao.dataset.tela);
  });
  const sair = document.getElementById("sair");
  if (sair) sair.onclick = async () => {
    try {
      if (estadoTimer.rodando) {
        if (restanteAtual() <= 0) await concluirTimer(true);
        else sincronizarTimer();
      }
      await api("sair");
      location.reload();
    } catch (erro) {
      feedback(erro.message, "erro");
    }
  };
}

function telaLogin() {
  tela = "login";
  montarTela(`<section class="card login-card">
    <h2>Entrar ou criar conta</h2>
    <div class="login-abas" role="tablist" aria-label="Opções de acesso">
      <button id="abaEntrar" class="aba ativa" type="button" role="tab" aria-selected="true">Entrar</button>
      <button id="abaCriar" class="aba" type="button" role="tab" aria-selected="false">Criar conta</button>
    </div>
    <div id="painelEntrar" role="tabpanel">
      <form class="form" id="formLogin">
        <label for="emailLogin">E-mail</label>
        <input id="emailLogin" name="email" type="email" autocomplete="email" required>
        <label for="senhaLogin">Senha</label>
        <input id="senhaLogin" name="senha" type="password" autocomplete="current-password" minlength="6" required>
        <button class="primary" type="submit">Entrar</button>
        <button class="link-button" id="esqueciSenha" type="button">Esqueci a senha</button>
      </form>
    </div>
    <div id="painelCriar" role="tabpanel" hidden>
      <form class="form" id="formCadastro">
        <label for="emailCriar">E-mail</label>
        <input id="emailCriar" name="email" type="email" autocomplete="email" required>
        <label for="senhaCriar">Senha</label>
        <input id="senhaCriar" name="senha" type="password" autocomplete="new-password" minlength="6" required>
        <label for="confirmarSenha">Confirmar senha</label>
        <input id="confirmarSenha" name="confirmar" type="password" autocomplete="new-password" minlength="6" required>
        <button class="primary" type="submit">Criar minha conta</button>
      </form>
    </div>
  </section>`, false);

  const entrar = document.getElementById("abaEntrar");
  const criar = document.getElementById("abaCriar");
  const painelEntrar = document.getElementById("painelEntrar");
  const painelCriar = document.getElementById("painelCriar");
  const selecionarAba = mostrarEntrar => {
    painelEntrar.hidden = !mostrarEntrar;
    painelCriar.hidden = mostrarEntrar;
    entrar.classList.toggle("ativa", mostrarEntrar);
    criar.classList.toggle("ativa", !mostrarEntrar);
    entrar.setAttribute("aria-selected", String(mostrarEntrar));
    criar.setAttribute("aria-selected", String(!mostrarEntrar));
    feedback("");
    document.getElementById(mostrarEntrar ? "emailLogin" : "emailCriar").focus();
  };
  entrar.onclick = () => selecionarAba(true);
  criar.onclick = () => selecionarAba(false);
  document.getElementById("esqueciSenha").onclick = telaRecuperarSenha;

  document.getElementById("formLogin").onsubmit = async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    feedback("Entrando...");
    try {
      await api("entrar", { email: dados.get("email").trim(), senha: dados.get("senha") });
      await inicio();
    } catch (erro) {
      feedback(erro.message, "erro");
    }
  };

  document.getElementById("formCadastro").onsubmit = async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const senha = dados.get("senha");
    if (senha !== dados.get("confirmar")) {
      feedback("As duas senhas precisam ser iguais.", "erro");
      return;
    }
    try {
      const resultado = await api("cadastrar", { email: dados.get("email").trim(), senha });
      if (resultado.session) return inicio();
      formulario.reset();
      selecionarAba(true);
      feedback("Conta criada. Verifique seu e-mail e confirme o cadastro antes de entrar.", "sucesso");
    } catch (erro) {
      feedback(erro.message, "erro");
    }
  };
}

function telaRecuperarSenha() {
  tela = "recuperar-senha";
  montarTela(`<section class="card login-card">
    <h2>Recuperar senha</h2>
    <p>Informe o e-mail associado à sua conta. Se ela existir, enviaremos as instruções.</p>
    <form class="form" id="formRecuperar">
      <label for="emailRecuperacao">E-mail</label>
      <input id="emailRecuperacao" name="email" type="email" autocomplete="email" required>
      <button class="primary" type="submit">Enviar instruções</button>
      <button class="link-button" id="voltarLogin" type="button">Voltar para entrar</button>
    </form>
  </section>`, false);
  document.getElementById("voltarLogin").onclick = telaLogin;
  document.getElementById("formRecuperar").onsubmit = async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    try {
      await api("recuperar_senha", {
        email: dados.get("email").trim(),
        redirectTo: `${location.origin}${location.pathname}?recovery=1`
      });
      feedback("Se existir uma conta para este e-mail, enviaremos as instruções de recuperação.", "sucesso");
    } catch {
      feedback("Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.", "erro");
    }
  };
}

function telaNovaSenha() {
  tela = "nova-senha";
  montarTela(`<section class="card login-card">
    <h2>Definir nova senha</h2>
    <form class="form" id="formNovaSenha">
      <label for="novaSenha">Nova senha</label>
      <input id="novaSenha" name="senha" type="password" autocomplete="new-password" minlength="6" required>
      <label for="confirmarNovaSenha">Confirmar nova senha</label>
      <input id="confirmarNovaSenha" name="confirmar" type="password" autocomplete="new-password" minlength="6" required>
      <button class="primary" type="submit">Salvar nova senha</button>
    </form>
  </section>`, false);
  document.getElementById("formNovaSenha").onsubmit = async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    if (dados.get("senha") !== dados.get("confirmar")) {
      feedback("As duas senhas precisam ser iguais.", "erro");
      return;
    }
    try {
      await api("atualizar_senha", { senha: dados.get("senha") });
      recuperacaoAtiva = false;
      feedback("Senha atualizada com sucesso.", "sucesso");
      setTimeout(() => inicio().catch(exibirErro), 800);
    } catch (erro) {
      feedback(erro.message, "erro");
    }
  };
}

function erroDeRecuperacaoNaUrl() {
  const parametros = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const codigo = parametros.get("error_code") || hash.get("error_code") || "";
  const descricao = parametros.get("error_description") || hash.get("error_description") || "";
  return /expired|invalid|otp/i.test(`${codigo} ${descricao}`);
}

function limparMarcadorRecuperacao() {
  const url = new URL(location.href);
  url.searchParams.delete("recovery");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

async function inicio() {
  const sessao = await api("sessao");
  usuario = sessao.data.session?.user || null;
  if (recuperacaoSolicitadaNaUrl) {
    recuperacaoSolicitadaNaUrl = false;
    limparMarcadorRecuperacao();
    if (!usuario) {
      telaLogin();
      feedback("O link de recuperação expirou ou é inválido. Solicite um novo link.", "erro");
      return;
    }
    recuperacaoAtiva = true;
    telaNovaSenha();
    return;
  }
  if (!usuario) {
    telaLogin();
    return;
  }
  if (recuperacaoAtiva) return;
  chaveTimer = `foco-rota-timer-${usuario.id}`;
  restaurarTimer();
  await api("iniciar_usuario");
  if (recuperacaoAtiva) return;
  await mostrar("inicio");
}

async function mostrar(nome) {
  tela = nome;
  feedback("");
  try {
    materias = await api("materias_listar");
    if (nome === "inicio") return await telaInicio();
    if (nome === "estudar") return telaEstudar();
    if (nome === "materias") return telaMaterias();
    if (nome === "plano") return await telaPlano();
    if (nome === "notas") return await telaNotas();
    throw new Error("Tela desconhecida.");
  } catch (erro) {
    exibirErro(erro, () => mostrar(nome));
  }
}

function exibirErro(erro, tentarNovamente = inicio) {
  feedback("");
  montarTela(`<section class="card">
    <h2>Não foi possível carregar os dados</h2>
    <p role="alert">${esc(erro.message || "Ocorreu um erro inesperado.")}</p>
    <button class="primary" id="tentarNovamente" type="button">Tentar novamente</button>
  </section>`);
  document.getElementById("tentarNovamente").onclick = async () => {
    try {
      await tentarNovamente();
    } catch (novoErro) {
      exibirErro(novoErro, tentarNovamente);
    }
  };
}

async function telaInicio() {
  const [resumo, frase, planos, estatisticas] = await Promise.all([
    api("resumo"),
    api("frase"),
    api("plano_listar"),
    api("estatisticas_materias")
  ]);
  const hoje = (new Date().getDay() + 6) % 7;
  const planosHoje = planos.filter(plano => plano.dia === hoje);
  const mensagemHoje = planosHoje.length
    ? `Hoje você tem ${planosHoje.length} bloco${planosHoje.length === 1 ? "" : "s"} planejado${planosHoje.length === 1 ? "" : "s"}.`
    : "Nenhum bloco planejado para hoje. Abra o Plano e organize seu dia.";
  montarTela(`<div class="app">
    <section class="card frase">${esc(frase.texto)}</section>
    <section class="card">
      <h2>Seu progresso</h2>
      <div class="grid">
        <div class="stat"><strong>${resumo.pomodoros}</strong>Blocos concluídos</div>
        <div class="stat"><strong>${resumo.minutos}</strong>Minutos estudados</div>
      </div>
    </section>
    <section class="card"><h2>Seu plano de hoje</h2><p>${mensagemHoje}</p></section>
    <section class="card">
      <h2>Estatísticas por matéria</h2>
      ${materias.length ? `<div class="tabela-wrap"><table>
        <thead><tr><th scope="col">Matéria</th><th scope="col">Minutos</th><th scope="col">Blocos concluídos</th></tr></thead>
        <tbody>${materias.map(materia => {
          const item = estatisticas[materia.id] || { minutos: 0, blocos: 0 };
          return `<tr><th scope="row">${esc(materia.nome)}</th><td>${item.minutos}</td><td>${item.blocos}</td></tr>`;
        }).join("")}</tbody>
      </table></div>` : '<p class="muted">Adicione uma matéria para acompanhar suas estatísticas.</p>'}
    </section>
    <section class="card"><h2>Como usar</h2><p>Escolha uma matéria, estude por ciclos de foco e organize suas anotações.</p></section>
  </div>`);
}

function telaEstudar() {
  const minutos = Math.round(estadoTimer.duracao / 60);
  const tentaSalvar = estadoTimer.restante <= 0 && estadoTimer.estudado > 0;
  montarTela(`<div class="app"><section class="card">
    <h2>Estudar</h2>
    <label for="materia">Matéria</label>
    <select id="materia" ${estadoTimer.rodando ? "disabled" : ""}>
      <option value="">Sem matéria</option>
      ${materias.map(item => `<option value="${esc(item.id)}" ${estadoTimer.materiaId === item.id ? "selected" : ""}>${esc(item.nome)}</option>`).join("")}
    </select>
    <div class="timer" id="tempo" role="timer" aria-live="off">${formatarTempo(restanteAtual())}</div>
    <div class="row">
      <button class="primary" id="iniciar" type="button">${tentaSalvar ? "Tentar salvar conclusão" : estadoTimer.rodando ? "Pausar" : "Iniciar"}</button>
      <button id="pular" type="button">Pular ciclo</button>
    </div>
    <label for="ajuste">Duração do ciclo: <b id="min">${minutos}</b> minutos</label>
    <input id="ajuste" type="range" min="5" max="90" step="5" value="${minutos}" ${estadoTimer.rodando ? "disabled" : ""}>
    <p class="muted">O tempo pausado não é contabilizado. Ao pular, só o tempo já estudado será registrado.</p>
  </section></div>`);

  document.getElementById("ajuste").oninput = evento => {
    if (estadoTimer.rodando) return;
    estadoTimer.duracao = Number(evento.currentTarget.value) * 60;
    estadoTimer.restante = estadoTimer.duracao;
    estadoTimer.estudado = 0;
    document.getElementById("min").textContent = evento.currentTarget.value;
    atualizarTimer();
    salvarTimer();
  };
  document.getElementById("materia").onchange = evento => {
    estadoTimer.materiaId = evento.currentTarget.value;
    salvarTimer();
  };
  document.getElementById("iniciar").onclick = alternarTimer;
  document.getElementById("pular").onclick = () => concluirTimer(false);
}

function alternarTimer() {
  if (estadoTimer.rodando) {
    sincronizarTimer();
    telaEstudar();
    feedback("Cronômetro pausado. O tempo pausado não será contabilizado.", "sucesso");
    return;
  }
  if (estadoTimer.restante <= 0 && estadoTimer.estudado > 0) {
    concluirTimer(true);
    return;
  }
  if (estadoTimer.restante <= 0) estadoTimer = novoTimer();
  estadoTimer.rodando = true;
  estadoTimer.iniciadoEm = Date.now();
  salvarTimer();
  telaEstudar();
}

async function concluirTimer(concluido) {
  if (timerSalvando) return;
  if (estadoTimer.rodando) sincronizarTimer();
  if (concluido && estadoTimer.restante > 0) return;
  if (!concluido && estadoTimer.estudado < 1) {
    estadoTimer = novoTimer();
    salvarTimer();
    telaEstudar();
    feedback("Ciclo pulado. Nenhum tempo estudado foi registrado.", "sucesso");
    return;
  }
  timerSalvando = true;
  const segundos = Math.floor(estadoTimer.estudado);
  try {
    await api("sessao_salvar", {
      segundos_estudados: segundos,
      materia_id: estadoTimer.materiaId || null,
      concluida: concluido
    });
    estadoTimer = novoTimer();
    salvarTimer();
    if (tela === "estudar") telaEstudar();
    feedback(
      concluido ? "Ciclo concluído! O tempo estudado foi registrado."
        : `Ciclo pulado. ${Math.floor(segundos / 60)} min ${segundos % 60} s estudados registrados.`,
      "sucesso"
    );
  } catch (erro) {
    estadoTimer.rodando = false;
    estadoTimer.iniciadoEm = null;
    salvarTimer();
    if (tela === "estudar") telaEstudar();
    feedback(`Não foi possível salvar a sessão: ${erro.message}`, "erro");
  } finally {
    timerSalvando = false;
  }
}

async function telaMaterias() {
  montarTela(`<div class="app">
    <section class="card"><h2>Matérias</h2>
      <form class="form" id="novaMateria">
        <label for="nomeMateria">Nome da matéria</label>
        <input id="nomeMateria" name="nome" required maxlength="80" placeholder="Nome da matéria">
        <label for="corMateria">Cor da matéria</label>
        <input id="corMateria" name="cor" type="color" value="#3b82f6">
        <button class="primary" type="submit">Adicionar matéria</button>
      </form>
    </section>
    ${materias.length ? materias.map(item => `<section class="card item" style="border-left-color:${esc(item.cor)}">
      ${materiaEditando === item.id ? `<form class="form" data-editar-materia="${esc(item.id)}">
        <label for="nome-${esc(item.id)}">Nome da matéria</label>
        <input id="nome-${esc(item.id)}" name="nome" value="${esc(item.nome)}" required maxlength="80">
        <label for="cor-${esc(item.id)}">Cor da matéria</label>
        <input id="cor-${esc(item.id)}" name="cor" type="color" value="${esc(item.cor)}">
        <div class="row"><button class="primary" type="submit">Salvar</button><button type="button" data-cancelar>Cancelar</button></div>
      </form>` : `<div class="row"><b>${esc(item.nome)}</b><div class="row">
        <button type="button" data-editar="${esc(item.id)}" aria-label="Editar matéria ${esc(item.nome)}">Editar</button>
        <button class="danger" type="button" data-excluir="${esc(item.id)}" aria-label="Excluir matéria ${esc(item.nome)}">Excluir</button>
      </div></div>`}
    </section>`).join("") : '<section class="card"><p class="muted">Você ainda não tem matérias. Adicione uma para organizar seus estudos.</p></section>'}
  </div>`);

  document.getElementById("novaMateria").onsubmit = async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    try {
      await api("materias_criar", { nome: dados.get("nome").trim(), cor: dados.get("cor") });
      await mostrar("materias");
      feedback("Matéria adicionada.", "sucesso");
    } catch (erro) {
      feedback(`Não foi possível adicionar a matéria: ${erro.message}`, "erro");
    }
  };
  view.querySelectorAll("[data-editar]").forEach(botao => {
    botao.onclick = () => {
      materiaEditando = botao.dataset.editar;
      telaMaterias();
    };
  });
  view.querySelectorAll("[data-cancelar]").forEach(botao => {
    botao.onclick = () => {
      materiaEditando = null;
      telaMaterias();
    };
  });
  view.querySelectorAll("form[data-editar-materia]").forEach(formulario => {
    formulario.onsubmit = async evento => {
      evento.preventDefault();
      const dados = new FormData(evento.currentTarget);
      try {
        await api("materias_editar", {
          id: evento.currentTarget.dataset.editarMateria,
          nome: dados.get("nome").trim(),
          cor: dados.get("cor")
        });
        materiaEditando = null;
        await mostrar("materias");
        feedback("Matéria atualizada.", "sucesso");
      } catch (erro) {
        feedback(`Não foi possível editar a matéria: ${erro.message}`, "erro");
      }
    };
  });
  view.querySelectorAll("[data-excluir]").forEach(botao => {
    botao.onclick = async () => {
      try {
        await api("materias_excluir", { id: botao.dataset.excluir });
        await mostrar("materias");
        feedback("Matéria excluída.", "sucesso");
      } catch (erro) {
        feedback(`Não foi possível excluir a matéria: ${erro.message}`, "erro");
      }
    };
  });
}

async function telaPlano() {
  const dias = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const blocos = await api("plano_listar");
  const hoje = (new Date().getDay() + 6) % 7;
  const feitos = blocos.filter(bloco => bloco.feito).length;
  const progresso = blocos.length ? Math.round(feitos / blocos.length * 100) : 0;
  const editar = blocos.find(bloco => bloco.id === blocoEditando);
  const formulario = (bloco = null) => `<form class="form plano-form" id="${bloco ? "editarBloco" : "novoBloco"}" ${bloco ? `data-id="${esc(bloco.id)}"` : ""}>
    <label for="${bloco ? "editarDia" : "diaPlano"}">Dia da semana</label>
    <select id="${bloco ? "editarDia" : "diaPlano"}" name="dia">${dias.map((dia, i) => `<option value="${i}" ${Number(bloco?.dia ?? hoje) === i ? "selected" : ""}>${dia}</option>`).join("")}</select>
    <label for="${bloco ? "editarMateria" : "materiaPlano"}">Matéria</label>
    <select id="${bloco ? "editarMateria" : "materiaPlano"}" name="materia"><option value="">Sem matéria</option>
      ${materias.map(item => `<option value="${esc(item.id)}" ${bloco?.materia_id === item.id ? "selected" : ""}>${esc(item.nome)}</option>`).join("")}
    </select>
    <label for="${bloco ? "editarMinutos" : "minutosPlano"}">Minutos</label>
    <input id="${bloco ? "editarMinutos" : "minutosPlano"}" name="minutos" type="number" min="5" max="240" step="5" value="${esc(bloco?.minutos ?? 30)}" required>
    <label for="${bloco ? "editarObservacao" : "observacaoPlano"}">Observação</label>
    <input id="${bloco ? "editarObservacao" : "observacaoPlano"}" name="observacao" maxlength="120" value="${esc(bloco?.observacao || "")}" placeholder="Ex.: revisar exercícios">
    <div class="row"><button class="primary" type="submit">${bloco ? "Salvar alterações" : "Adicionar bloco"}</button>${bloco ? '<button id="cancelarBloco" type="button">Cancelar</button>' : ""}</div>
  </form>`;

  montarTela(`<div class="app">
    <section class="card"><h2>Plano semanal</h2><p class="muted">Organize o que você vai estudar em cada dia da semana.</p>
      <div class="progresso" role="progressbar" aria-label="Progresso dos blocos do plano" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progresso}%"></span></div>
      <p>${feitos} de ${blocos.length} blocos concluídos nesta semana.</p>${formulario()}
    </section>
    ${blocos.length ? `<div class="plano-semana">${dias.map((dia, i) => {
      const lista = blocos.filter(bloco => bloco.dia === i);
      return `<section class="card plano-dia ${i === hoje ? "hoje" : ""}"><h3>${dia}${i === hoje ? ' <span class="hoje-label">Hoje</span>' : ""}</h3>
        ${lista.map(bloco => {
          if (bloco.id === blocoEditando) return formulario(bloco);
          const materia = materias.find(item => item.id === bloco.materia_id);
          return `<div class="plano-bloco ${bloco.feito ? "feito" : ""}">
            <div><b>${esc(materia?.nome || "Sem matéria")}</b><br><span>${bloco.minutos} minutos${bloco.observacao ? ` · ${esc(bloco.observacao)}` : ""}</span></div>
            <div class="plano-acoes">
              <button type="button" data-feito="${esc(bloco.id)}" data-valor="${!bloco.feito}" aria-label="${bloco.feito ? "Desmarcar bloco concluído" : "Marcar bloco como concluído"}">${bloco.feito ? "Desfazer" : "Feito"}</button>
              <button type="button" data-editar-bloco="${esc(bloco.id)}">Editar</button>
              <button class="danger" type="button" data-apagar="${esc(bloco.id)}">Excluir</button>
            </div>
          </div>`;
        }).join("") || '<p class="muted">Nenhum bloco neste dia. Adicione um ao seu plano.</p>'}
      </section>`;
    }).join("")}</div>` : '<section class="card"><p class="muted">Seu plano está vazio. Adicione um bloco para organizar a semana.</p></section>'}
  </div>`);

  const enviarBloco = async (evento, atualizando) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const valores = {
      dia: Number(dados.get("dia")),
      materia_id: dados.get("materia") || null,
      minutos: Number(dados.get("minutos")),
      observacao: dados.get("observacao").trim()
    };
    try {
      if (atualizando) {
        await api("plano_editar", { ...valores, id: form.dataset.id });
        blocoEditando = null;
      } else {
        await api("plano_criar", valores);
      }
      await mostrar("plano");
      feedback(atualizando ? "Bloco atualizado." : "Bloco adicionado ao plano.", "sucesso");
    } catch (erro) {
      feedback(`Não foi possível salvar o bloco: ${erro.message}`, "erro");
    }
  };
  document.getElementById("novoBloco").onsubmit = evento => enviarBloco(evento, false);
  const formEdicao = document.getElementById("editarBloco");
  if (formEdicao) formEdicao.onsubmit = evento => enviarBloco(evento, true);
  const cancelar = document.getElementById("cancelarBloco");
  if (cancelar) cancelar.onclick = () => {
    blocoEditando = null;
    mostrar("plano");
  };
  view.querySelectorAll("[data-feito]").forEach(botao => {
    botao.onclick = async () => {
      try {
        await api("plano_marcar", { id: botao.dataset.feito, feito: botao.dataset.valor === "true" });
        await mostrar("plano");
      } catch (erro) {
        feedback(`Não foi possível atualizar o bloco: ${erro.message}`, "erro");
      }
    };
  });
  view.querySelectorAll("[data-editar-bloco]").forEach(botao => {
    botao.onclick = () => {
      blocoEditando = botao.dataset.editarBloco;
      mostrar("plano");
    };
  });
  view.querySelectorAll("[data-apagar]").forEach(botao => {
    botao.onclick = async () => {
      if (!confirm("Excluir este bloco do plano?")) return;
      try {
        await api("plano_excluir", { id: botao.dataset.apagar });
        await mostrar("plano");
        feedback("Bloco excluído.", "sucesso");
      } catch (erro) {
        feedback(`Não foi possível excluir o bloco: ${erro.message}`, "erro");
      }
    };
  });
}

async function telaNotas() {
  const notas = await api("anotacoes_listar");
  const editar = notas.find(nota => nota.id === notaEditando);
  montarTela(`<div class="app">
    <section class="card"><h2>${editar ? "Editar anotação" : "Anotações"}</h2>
      <form class="form" id="formNota">
        <label for="tituloNota">Título</label>
        <input id="tituloNota" name="titulo" value="${esc(editar?.titulo || "")}" required maxlength="120" placeholder="Título">
        <label for="materiaNota">Matéria</label>
        <select id="materiaNota" name="materia"><option value="">Sem matéria</option>
          ${materias.map(item => `<option value="${esc(item.id)}" ${editar?.materia_id === item.id ? "selected" : ""}>${esc(item.nome)}</option>`).join("")}
        </select>
        <label for="textoNota">Anotação</label>
        <textarea id="textoNota" name="texto" rows="5" required>${esc(editar?.texto || "")}</textarea>
        <div class="row"><button class="primary" type="submit">${editar ? "Salvar alterações" : "Salvar nota"}</button>${editar ? '<button id="cancelarNota" type="button">Cancelar</button>' : ""}</div>
      </form>
    </section>
    ${notas.length ? notas.map(nota => `<details class="card"><summary>${esc(nota.titulo)}</summary>
      <p>${esc(nota.texto)}</p><div class="row">
        <button type="button" data-editar-nota="${esc(nota.id)}">Editar</button>
        <button class="danger" type="button" data-apagar-nota="${esc(nota.id)}">Excluir</button>
      </div></details>`).join("") : '<section class="card"><p class="muted">Você ainda não tem anotações. Crie uma para guardar seus resumos.</p></section>'}
  </div>`);

  document.getElementById("formNota").onsubmit = async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const valores = {
      titulo: dados.get("titulo").trim(),
      texto: dados.get("texto").trim(),
      materia_id: dados.get("materia") || null
    };
    try {
      if (editar) {
        await api("anotacoes_editar", { ...valores, id: editar.id });
        notaEditando = null;
      } else {
        await api("anotacoes_criar", valores);
      }
      await mostrar("notas");
      feedback(editar ? "Anotação atualizada." : "Anotação salva.", "sucesso");
    } catch (erro) {
      feedback(`Não foi possível salvar a anotação: ${erro.message}`, "erro");
    }
  };
  const cancelar = document.getElementById("cancelarNota");
  if (cancelar) cancelar.onclick = () => {
    notaEditando = null;
    mostrar("notas");
  };
  view.querySelectorAll("[data-editar-nota]").forEach(botao => {
    botao.onclick = () => {
      notaEditando = botao.dataset.editarNota;
      mostrar("notas");
    };
  });
  view.querySelectorAll("[data-apagar-nota]").forEach(botao => {
    botao.onclick = async () => {
      try {
        await api("anotacoes_excluir", { id: botao.dataset.apagarNota });
        await mostrar("notas");
        feedback("Anotação excluída.", "sucesso");
      } catch (erro) {
        feedback(`Não foi possível excluir a anotação: ${erro.message}`, "erro");
      }
    };
  });
}

function iniciarAplicacao() {
  configurarTema();
  recuperacaoSolicitadaNaUrl = new URLSearchParams(location.search).get("recovery") === "1";
  sb.auth.onAuthStateChange(evento => {
    if (evento === "PASSWORD_RECOVERY") {
      recuperacaoAtiva = true;
      telaNovaSenha();
    }
  });
  setInterval(atualizarTimer, 250);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && usuario && estadoTimer.rodando) salvarTimer();
  });
  if (erroDeRecuperacaoNaUrl()) {
    telaLogin();
    feedback("O link de recuperação expirou ou é inválido. Solicite um novo link.", "erro");
    return;
  }
  inicio().catch(erro => exibirErro(erro));
}

document.addEventListener("DOMContentLoaded", iniciarAplicacao);

recuperar-codigo.js
