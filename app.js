const form = document.getElementById("loginForm");
const result = document.getElementById("result");
const resetBtn = document.getElementById("resetBtn");

function setMessage(text, isOk) {
  result.textContent = text;
  result.style.color = isOk === true ? "green" : isOk === false ? "crimson" : "inherit";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  setMessage("Проверка...", null);

  try {
    const resp = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await resp.json().catch(() => ({
      ok: false,
      message: "Некорректный ответ сервера",
    }));

    setMessage(data.message || "Неизвестная ошибка", resp.ok && data.ok);
  } catch {
    setMessage("Ошибка сети", false);
  }
});

resetBtn.addEventListener("click", () => {
  setMessage("Введите логин и пароль.", null);
});
