// Copy buttons on code blocks.
for (const btn of document.querySelectorAll(".copy")) {
  btn.addEventListener("click", async () => {
    const code = btn.closest(".code").querySelector("pre").innerText;
    try { await navigator.clipboard.writeText(code); btn.textContent = "Copied"; } catch { btn.textContent = "Press Cmd+C"; }
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
}
