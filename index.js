console.log("JS working");
// Loader
const loadingText = document.getElementById("loading-text");
if (loadingText) {
  setTimeout(() => loadingText.textContent = "loading assets...", 1200);
  setTimeout(() => loadingText.textContent = "access granted.", 2400);
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.style.display = "none", 800);
    }
  }, 3500);
}

// Inventory toggle
const loadoutBtn = document.getElementById("loadoutBtn");
const inventory = document.getElementById("inventory");

if (loadoutBtn && inventory) {
  loadoutBtn.addEventListener("click", () => {
    inventory.classList.toggle("active");
    loadoutBtn.textContent = inventory.classList.contains("active") ? "\u{1F9F3}" : "\u{1F392}";
  });

  inventory.addEventListener("click", e => {
    if (e.target === inventory) {
      inventory.classList.remove("active");
      loadoutBtn.textContent = "\u{1F392}";
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      inventory.classList.remove("active");
      loadoutBtn.textContent = "\u{1F392}";
    }
  });
} else {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && inventory) {
      inventory.classList.remove("active");
      if (loadoutBtn) loadoutBtn.textContent = "\u{1F392}";
    }
  });
}

// Tooltip
const tooltip = document.getElementById("tooltip");
const slots = document.querySelectorAll(".slot");
if (tooltip && slots.length) {
  slots.forEach(slot => {
    slot.addEventListener("mousemove", e => {
      const name = slot.dataset.name;
      const rarity = slot.dataset.rarity;
      if (!name) return;
      tooltip.style.opacity = "1";
      tooltip.textContent = `${name} [${rarity || 'common'}]`;
      tooltip.style.left = e.pageX + 15 + "px";
      tooltip.style.top = e.pageY + 15 + "px";
    });
    slot.addEventListener("mouseleave", () => tooltip.style.opacity = "0");
  });
}

// Scroll reveal
const sections = document.querySelectorAll(".section");
if (sections.length) {
  const reveal = () => {
    sections.forEach(sec => {
      if (sec.getBoundingClientRect().top < window.innerHeight - 100) {
        sec.classList.add("active");
      }
    });
  };
  window.addEventListener("scroll", reveal);
  reveal();
}

// Particles
const canvas = document.getElementById("particles");
let ctx = null;
let particles = [];
if (canvas && canvas.getContext) {
  ctx = canvas.getContext("2d");

  const setSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  setSize();

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: Math.random() * 0.5 - 0.25,
      speedY: Math.random() * 0.5 - 0.25
    });
  }

  window.addEventListener("resize", () => {
    setSize();
    particles.forEach(p => {
      p.x = Math.min(p.x, canvas.width);
      p.y = Math.min(p.y, canvas.height);
    });
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ffcc";
    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}
