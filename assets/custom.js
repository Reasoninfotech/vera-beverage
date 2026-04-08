  /* ---------- Detect BG Color ---------- */
  document.addEventListener("DOMContentLoaded", () => {
  let lastTime = 0;
  const delay = 60; // increase = fewer bubbles

  document.addEventListener("mousemove", function(e) {
    const now = Date.now();
    if (now - lastTime < delay) return;
    lastTime = now;

    const bubble = document.createElement("span");
    bubble.className = "bubble";

    const size = Math.random() * 24 + 10;
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";

    bubble.style.left = (e.clientX - size / 2) + "px";
    bubble.style.top = (e.clientY + 12) + "px";

    document.body.appendChild(bubble);

    setTimeout(() => bubble.remove(), 1600);
  });
    });
    document.addEventListener("DOMContentLoaded", () => {
  const cartDrawer = document.querySelector(".cart-drawer__inner");
  if (!cartDrawer) return;

  let lastTime = 0;
  const delay = 60;

  cartDrawer.addEventListener("mousemove", function (e) {
    const now = Date.now();
    if (now - lastTime < delay) return;
    lastTime = now;

    const bubble = document.createElement("span");
    bubble.className = "bubble";

    const size = Math.random() * 24 + 10;
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";

    const rect = cartDrawer.getBoundingClientRect();

    bubble.style.left = (e.clientX - rect.left - size / 2) + "px";
    bubble.style.top = (e.clientY - rect.top + 12) + "px";

    cartDrawer.appendChild(bubble);

    setTimeout(() => bubble.remove(), 1600);
  });
});

document.addEventListener("DOMContentLoaded", function () {
  var variants = document.querySelectorAll('input[name^="Pack Size"]');
 
  variants.forEach(function(variant){
    variant.checked = false;
  });
 
  variants.forEach(function(variant){
    variant.addEventListener("click", function(){
      variants.forEach(function(v){
        v.checked = false;
      });
      this.checked = true;
    });
  });
 
});