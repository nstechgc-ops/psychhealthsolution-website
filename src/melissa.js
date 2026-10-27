// Melissa web voice assistant. The Vapi SDK is only downloaded when someone starts a chat.
const root = document.querySelector(".melissa");
if (root) {
  const key = root.dataset.key;
  const assistant = root.dataset.assistant;
  const ready = Boolean(key && assistant);
  const $ = (s) => root.querySelector(s);
  const launch = $(".mel-launch");
  const panel = $(".mel-panel");
  const status = $(".mel-status");
  const captions = $(".mel-captions");
  const startBtn = $(".mel-start");
  const muteBtn = $(".mel-mute");
  const endBtn = $(".mel-end");
  const intro = status.textContent;
  let vapi = null;
  let live = false;
  let lastFocus = null;

  if (!ready) {
    startBtn.hidden = true;
    status.textContent = "Voice chat with Melissa is almost ready. Until then, call and she'll answer.";
  }

  const setState = (s) => { root.dataset.state = s; };
  const say = (t) => { status.textContent = t; };

  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    (ready && !live ? startBtn : $(".mel-close")).focus();
  }
  function close() {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  launch.addEventListener("click", () => (panel.hidden ? open() : close()));
  $(".mel-close").addEventListener("click", close);
  document.querySelectorAll("[data-melissa-open]").forEach((b) =>
    b.addEventListener("click", (e) => { e.preventDefault(); open(); })
  );
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

  function addLine(role, text) {
    const p = document.createElement("p");
    p.className = role === "assistant" ? "from-mel" : "from-you";
    const who = document.createElement("strong");
    who.textContent = role === "assistant" ? "Melissa" : "You";
    p.append(who, " ", text);
    captions.append(p);
    while (captions.children.length > 4) captions.firstElementChild.remove();
    captions.hidden = false;
  }

  function reset(msg) {
    live = false;
    setState("idle");
    startBtn.hidden = !ready;
    startBtn.disabled = false;
    muteBtn.hidden = true;
    endBtn.hidden = true;
    muteBtn.textContent = "Mute";
    muteBtn.setAttribute("aria-pressed", "false");
    root.style.setProperty("--lvl", 0);
    say(msg || intro);
  }

  async function start() {
    if (!ready || live) return;
    startBtn.disabled = true;
    setState("connecting");
    say("Connecting to Melissa. Allow microphone access if your browser asks.");
    try {
      if (!vapi) {
        const { default: Vapi } = await import("/vapi-sdk.js");
        vapi = new Vapi(key);
        vapi.on("call-start", () => {
          live = true;
          setState("listening");
          say("You're connected. Go ahead and speak.");
          startBtn.hidden = true;
          muteBtn.hidden = false;
          endBtn.hidden = false;
          endBtn.focus();
        });
        vapi.on("speech-start", () => { setState("speaking"); say("Melissa is speaking…"); });
        vapi.on("speech-end", () => { if (live) { setState("listening"); say("Listening…"); } });
        vapi.on("volume-level", (v) => root.style.setProperty("--lvl", Math.min(1, v * 1.6).toFixed(3)));
        vapi.on("message", (m) => {
          if (m && m.type === "transcript" && m.transcriptType === "final" && m.transcript) addLine(m.role, m.transcript);
        });
        vapi.on("call-end", () => reset("Chat ended. Thanks for talking with Melissa."));
        vapi.on("error", (err) => {
          console.warn("Melissa error", err);
          if (vapi) vapi.stop().catch(() => {});
          reset("Sorry, Melissa couldn't connect. Check your microphone permission, or call the number below.");
        });
      }
      captions.replaceChildren();
      captions.hidden = true;
      await vapi.start(assistant);
    } catch (err) {
      console.warn("Melissa start failed", err);
      reset("Sorry, Melissa couldn't connect. Check your microphone permission, or call the number below.");
    }
  }

  startBtn.addEventListener("click", start);
  endBtn.addEventListener("click", () => { if (vapi) vapi.stop(); });
  muteBtn.addEventListener("click", () => {
    if (!vapi) return;
    const m = !vapi.isMuted();
    vapi.setMuted(m);
    muteBtn.textContent = m ? "Unmute" : "Mute";
    muteBtn.setAttribute("aria-pressed", String(m));
    say(m ? "You're muted. Melissa can't hear you." : "Listening…");
  });
  window.addEventListener("pagehide", () => { if (vapi && live) vapi.stop(); });
}
