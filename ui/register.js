const form = document.getElementById("regForm");
const result = document.getElementById("result");

function setResult(text) {
  result.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const resp = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await resp.json();
    setResult(data.message || "Нет сообщения");
  } catch {
    setResult("Ошибка соединения с сервером");
  }
});

form.addEventListener("reset", () => setResult("Поля очищены."));
