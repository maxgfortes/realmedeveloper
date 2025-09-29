async function atualizarMarqueeUltimoUsuario() {
  const lastUpdateRef = doc(db, "lastupdate", "latestUser");
  const docSnap = await getDoc(lastUpdateRef);
  const marquee = document.querySelector(".marquee");
  if (!marquee) return;
  if (docSnap.exists()) {
    const data = docSnap.data();
    const nomeUsuario = data.username || "Usuário";
    marquee.textContent = `${nomeUsuario} acabou de entrar no RealMe!`;
  } else {
    marquee.textContent = "Bem-vindo ao RealMe!";
  }
}