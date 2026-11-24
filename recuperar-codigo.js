/* Carregar DEPOIS do app.js. Troca "esqueci a senha" por código enviado ao e-mail.
   Usa as funções que já existem no seu app.js (montarTela, feedback, telaLogin, telaNovaSenha, esc, sb). */

async function pedirCodigoRecuperacao(email) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (!error) return null;
  if (/signups? not allowed|not found|user not/i.test(error.message)) return "Não existe conta cadastrada com esse e-mail.";
  if (/seconds|rate limit/i.test(error.message)) return "Aguarde um minuto antes de pedir outro código.";
  return `Não foi possível enviar o código: ${error.message}`;
}

function telaRecuperarSenha() {
  tela = "recuperar-senha";
  montarTela(`<section class="card login-card">
    <h2>Recuperar senha</h2>
    <p>Digite o e-mail da sua conta. Vamos enviar um código de verificação para ele.</p>
    <form class="form" id="formRecuperar">
      <label for="emailRecuperacao">E-mail</label>
      <input id="emailRecuperacao" name="email" type="email" autocomplete="email" required>
      <button class="primary" type="submit">Enviar código</button>
      <button class="link-button" id="voltarLogin" type="button">Voltar para entrar</button>
    </form>
  </section>`, false);
  document.getElementById("voltarLogin").onclick = telaLogin;
  document.getElementById("formRecuperar").onsubmit = async evento => {
    evento.preventDefault();
    const email = new FormData(evento.currentTarget).get("email").trim();
    feedback("Enviando código...");
    const erro = await pedirCodigoRecuperacao(email);
    if (erro) return feedback(erro, "erro");
    telaCodigoRecuperacao(email);
  };
}

function telaCodigoRecuperacao(email) {
  tela = "codigo-recuperacao";
  montarTela(`<section class="card login-card">
    <h2>Digite o código</h2>
    <p>Enviamos um código para <b>${esc(email)}</b>. Confira também a pasta de spam.</p>
    <form class="form" id="formCodigo">
      <label for="codigoRecuperacao">Código de verificação</label>
      <input id="codigoRecuperacao" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]{6,8}" required>
      <button class="primary" type="submit">Verificar código</button>
      <button class="link-button" id="reenviarCodigo" type="button">Reenviar código</button>
      <button class="link-button" id="voltarLogin" type="button">Voltar para entrar</button>
    </form>
  </section>`, false);
  feedback("Código enviado. Confira sua caixa de entrada e o spam.", "sucesso");
  document.getElementById("voltarLogin").onclick = telaLogin;
  document.getElementById("reenviarCodigo").onclick = async () => {
    feedback("Enviando novo código...");
    const erro = await pedirCodigoRecuperacao(email);
    feedback(erro || "Novo código enviado.", erro ? "erro" : "sucesso");
  };
  document.getElementById("formCodigo").onsubmit = async evento => {
    evento.preventDefault();
    const token = new FormData(evento.currentTarget).get("codigo").trim();
    feedback("Verificando...");
    recuperacaoAtiva = true; // impede o app de abrir a tela inicial antes de definir a nova senha
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      recuperacaoAtiva = false;
      return feedback("Código inválido ou expirado. Peça um novo código.", "erro");
    }
    feedback("");
    telaNovaSenha();
  };
}
