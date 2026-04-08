// // ============================================================
// // BUNDLE DISCOUNT - Shopify Horizon Theme
// // LOGIC: Lock assigned bundles — never overwrite existing properties
// // Only assign _cs_bundle_id to lines that don't have it yet
// // Upload to: Themes > Assets > bundle-discount.js
// // ============================================================

// (function () {
//     const bundles = window.bundleSettings || [];
//     if (!bundles.length) {
//         console.warn("[BundleDiscount] No bundles configured.");
//         return;
//     }
//     console.log("[BundleDiscount] Loaded bundles:", JSON.stringify(bundles));
//     const originalFetch = window.fetch;
//     const originalXHROpen = XMLHttpRequest.prototype.open;
//     const originalXHRSend = XMLHttpRequest.prototype.send;
//     let isProcessing = false;
//     let pendingCheck = false;
//     let debounceTimer = null;
//     let lastQtySignature = null;
//     let lastFullSignature = null;
//     let bundleRefreshInProgress = false; 
//     const INTERNAL = Symbol("bundleInternal");
//     window.fetch = async function (...args) {
//         const [resource, config] = args;
//         const url = typeof resource === "string" ? resource : resource?.url;
//         if (config && config[INTERNAL]) return originalFetch(...args);
//         if (url && url.includes("/cart/add")) {
//             const response = await originalFetch(...args);
//             if (!bundleRefreshInProgress) scheduleCheck();
//             return response;
//         }
//         return originalFetch(...args);
//     };
//     XMLHttpRequest.prototype.open = function (method, url, ...rest) {
//         this._bundleUrl = url;
//         return originalXHROpen.call(this, method, url, ...rest);
//     };
//     XMLHttpRequest.prototype.send = function (...args) {
//         if (this._bundleUrl && this._bundleUrl.includes("/cart/add")) {
//             this.addEventListener("load", () => {
//                 if (!bundleRefreshInProgress) scheduleCheck();
//             });
//         }
//         return originalXHRSend.apply(this, args);
//     };
//     ["cart:item-added", "on:cart:after-merge"].forEach(evt => {
//         document.addEventListener(evt, scheduleCheck);
//         window.addEventListener(evt, scheduleCheck);
//     });
//     function startObserver() {
//         new MutationObserver((mutations) => {
//             for (const m of mutations) {
//                 const t = m.target;
//                 if (
//                     t.closest?.("cart-drawer") ||
//                     t.closest?.("cart-items") ||
//                     t.closest?.("[data-cart-drawer]")
//                 ) { scheduleCheck(); break; }
//             }
//         }).observe(document.body, { childList: true, subtree: true });
//     }
//     setInterval(async () => {
//         if (isProcessing) return;
//         try {
//             const cart = await getCart();
//             const qtySig = buildQtySignature(cart);
//             const fullSig = buildFullSignature(cart);
//             const hasLocked = cart.items.some(i => i.properties?._cs_bundle_id);
//             if (qtySig !== lastQtySignature || (hasLocked && fullSig !== lastFullSignature)) {
//                 scheduleCheck();
//             }
//         } catch (e) { }
//     }, 2000);
//     function interceptCartButtons() {
//         document.addEventListener("click", function (e) {
//             const btn = e.target.closest("button");
//             if (!btn) return;
//             const onClickAttr = btn.getAttribute("on:click") || "";
//             if (onClickAttr.includes("onLineItemRemove")) {
//                 console.log("[BundleDiscount] Delete button clicked");
//                 toggleCartLoading(true);
//                 setTimeout(scheduleCheck, 800);
//                 return;
//             }
//             if (onClickAttr.includes("increaseQuantity")) {
//                 console.log("[BundleDiscount] Plus button clicked (attr match)");
//                 toggleCartLoading(true);
//                 setTimeout(scheduleCheck, 800);
//                 return;
//             }
//             if (onClickAttr.includes("decreaseQuantity")) {
//                 console.log("[BundleDiscount] Minus button clicked (attr match)");
//                 toggleCartLoading(true);
//                 setTimeout(scheduleCheck, 800);
//                 return;
//             }
//             if (
//                 btn.classList.contains("cart-items__remove") ||
//                 btn.classList.contains("quantity-minus") ||
//                 btn.classList.contains("quantity-plus") ||
//                 btn.name === "minus" ||
//                 btn.name === "plus"
//             ) {
//                 console.log("[BundleDiscount] Cart button clicked (class/name match)");
//                 toggleCartLoading(true);
//                 setTimeout(scheduleCheck, 800);
//             }
//         }, true); // capture phase — fires before Horizon handles it
//     }
//     document.addEventListener("submit", e => {
//         if (e.target?.action?.includes("/cart/add")) setTimeout(scheduleCheck, 900);
//     });
//     if (document.readyState === "loading") {
//         document.addEventListener("DOMContentLoaded", () => {
//             startObserver();
//             interceptCartButtons();
//             scheduleCheck();
//         });
//     } else {
//         startObserver();
//         interceptCartButtons();
//         scheduleCheck();
//     }
//     function scheduleCheck() {
//         clearTimeout(debounceTimer);
//         debounceTimer = setTimeout(() => checkAndApplyBundle().catch(console.error), 500);
//     }
//     async function getCart() {
//         return originalFetch("/cart.js", { [INTERNAL]: true }).then(r => r.json());
//     }
//     function buildQtySignature(cart) {
//         return cart.items.map(i => `${i.variant_id}:${i.quantity}`).join("|");
//     }
//     function buildFullSignature(cart) {
//         return cart.items.map(i => {
//             const bid = i.properties?._cs_bundle_id;
//             // Treat "" and missing as same — both mean "no bundle"
//             return `${i.key}:${i.quantity}:${bid && bid !== "" ? bid : "none"}`;
//         }).join("|");
//     }
//     let bundleLoading = false;
//     let loaderStartTime = 0;
//     let hideLoaderTimer = null;
//     function toggleCartLoading(show) {
//         let overlay = document.getElementById("cs-bundle-loader");
//         const targets = Array.from(document.querySelectorAll(".cart-totals, .cart-totals__container, .cart__footer, [data-cart-totals]"));
//         let targetContainer = targets.find(el => el.offsetParent !== null) || targets[0];
//         if (show) {
//             bundleLoading = true;
//             clearTimeout(hideLoaderTimer);
//             if (!loaderStartTime) loaderStartTime = Date.now();
//             if (!targetContainer) return;
//             if (!document.getElementById("cs-bundle-loader-style")) {
//                 const style = document.createElement("style");
//                 style.id = "cs-bundle-loader-style";
//                 style.innerHTML = `
//                     #cs-bundle-loader {
//                         position: absolute; top: 0; left: 0; width: 100%; height: 100%;
//                         background: rgba(255,255,255,0.7); z-index: 99999;
//                         display: flex; align-items: center; justify-content: center;
//                         min-height: 80px;
//                         border-radius: 4px;
//                     }
//                     #cs-bundle-loader .spinner {
//                         animation: rotate 2s linear infinite; width: 40px; height: 40px;
//                     }
//                     #cs-bundle-loader .path {
//                         stroke: #000; stroke-linecap: round;
//                         animation: dash 1.5s ease-in-out infinite;
//                     }
//                     body.cs-bundle-loading button[name='plus'], 
//                     body.cs-bundle-loading button[name='minus'], 
//                     body.cs-bundle-loading .quantity-plus, 
//                     body.cs-bundle-loading .quantity-minus, 
//                     body.cs-bundle-loading .cart-items__remove,
//                     body.cs-bundle-loading [on\\:click*='increaseQuantity'],
//                     body.cs-bundle-loading [on\\:click*='decreaseQuantity'],
//                     body.cs-bundle-loading [on\\:click*='onLineItemRemove'] {
//                         pointer-events: none !important;
//                         opacity: 0.5 !important;
//                     }
//                     @keyframes rotate { 100% { transform: rotate(360deg); } }
//                     @keyframes dash {
//                         0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
//                         50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
//                         100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
//                     }
//                 `;
//                 document.head.appendChild(style);
//             }
//             if (!overlay) {
//                 overlay = document.createElement("div");
//                 overlay.id = "cs-bundle-loader";
//                 overlay.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
//             }
//             document.body.classList.add("cs-bundle-loading");
//             overlay.style.display = "flex";
//             targetContainer.style.position = "relative";
//             overlay.style.position = "absolute";
//             targetContainer.appendChild(overlay);
//         } else {
//             const elapsed = Date.now() - loaderStartTime;
//             const remaining = Math.max(0, 4000 - elapsed);
//             clearTimeout(hideLoaderTimer);
//             hideLoaderTimer = setTimeout(() => {
//                 bundleLoading = false;
//                 loaderStartTime = 0;
//                 document.body.classList.remove("cs-bundle-loading");
//                 const o = document.getElementById("cs-bundle-loader");
//                 if (o) o.style.display = "none";
//             }, remaining);
//         }
//     }
//     async function checkAndApplyBundle() {
//         if (isProcessing) { pendingCheck = true; return; }
//         isProcessing = true;
//         toggleCartLoading(true);

//         try {
//             const cart = await getCart();
//             const cartItems = cart.items;
//             if (!cartItems || !cartItems.length) return;

//             const qtySig = buildQtySignature(cart);
//             const fullSig = buildFullSignature(cart);
//             const totalQty = {};
//             cartItems.forEach(item => {
//                 const vid = String(item.variant_id);
//                 totalQty[vid] = (totalQty[vid] || 0) + item.quantity;
//             });
//             const isLocked = i => i.properties?._cs_bundle_id && i.properties._cs_bundle_id !== "";
//             const lockedLines = cartItems.filter(isLocked);
//             const freeLines = cartItems.filter(i => !isLocked(i));
//             const simRemaining = { ...totalQty };
//             const validCombos = []; 
//             for (const bundle of bundles) {
//                 const bundleId = String(bundle.bundleId || "").trim();
//                 const v1 = String(bundle.variantId1 || "").trim();
//                 const v2 = String(bundle.variantId2 || "").trim();
//                 if (!bundleId || !v1 || !v2) continue;

//                 if (v1 === v2) {
//                     while ((simRemaining[v1] || 0) >= 2) {
//                         simRemaining[v1] -= 2;
//                         validCombos.push({ bundleId, v1, v2, same: true });
//                     }
//                 } else {
//                     while ((simRemaining[v1] || 0) >= 1 && (simRemaining[v2] || 0) >= 1) {
//                         simRemaining[v1]--;
//                         simRemaining[v2]--;
//                         validCombos.push({ bundleId, v1, v2, same: false });
//                     }
//                 }
//             }
//             const lockedPool = {}; // { bid: { vid: count } }
//             lockedLines.forEach(item => {
//                 const bid = item.properties._cs_bundle_id;
//                 const vid = String(item.variant_id);
//                 if (!lockedPool[bid]) lockedPool[bid] = {};
//                 lockedPool[bid][vid] = (lockedPool[bid][vid] || 0) + item.quantity;
//             });
//             const keepLocked = {}; // { bid: { vid: count_to_keep } }
//             validCombos.forEach(combo => {
//                 const bid = combo.bundleId;
//                 if (!lockedPool[bid]) return;
//                 if (combo.same) {
//                     const v1 = combo.v1;
//                     if ((lockedPool[bid][v1] || 0) >= 2) {
//                         lockedPool[bid][v1] -= 2;
//                         if (!keepLocked[bid]) keepLocked[bid] = {};
//                         keepLocked[bid][v1] = (keepLocked[bid][v1] || 0) + 2;
//                     }
//                 } else {
//                     const v1 = combo.v1;
//                     const v2 = combo.v2;
//                     if ((lockedPool[bid][v1] || 0) >= 1 && (lockedPool[bid][v2] || 0) >= 1) {
//                         lockedPool[bid][v1] -= 1;
//                         lockedPool[bid][v2] -= 1;
//                         if (!keepLocked[bid]) keepLocked[bid] = {};
//                         keepLocked[bid][v1] = (keepLocked[bid][v1] || 0) + 1;
//                         keepLocked[bid][v2] = (keepLocked[bid][v2] || 0) + 1;
//                     }
//                 }
//             });
//             const toRemoveOrReduce = []; // { key, targetQty }
//             const currentCount = {};
//             lockedLines.forEach(item => {
//                 const bid = item.properties._cs_bundle_id;
//                 const vid = String(item.variant_id);
//                 const bidKeeps = keepLocked[bid] || {};
//                 const maxAllowed = bidKeeps[vid] || 0;
//                 if (!currentCount[bid]) currentCount[bid] = {};
//                 const alreadyCounted = currentCount[bid][vid] || 0;
//                 if (alreadyCounted >= maxAllowed) {
//                     toRemoveOrReduce.push({ key: item.key, targetQty: 0 });
//                 } else if ((alreadyCounted + item.quantity) > maxAllowed) {
//                     const allowedForThisLine = maxAllowed - alreadyCounted;
//                     toRemoveOrReduce.push({ key: item.key, targetQty: allowedForThisLine });
//                     currentCount[bid][vid] = maxAllowed;
//                 } else {
//                     currentCount[bid][vid] = alreadyCounted + item.quantity;
//                 }
//             });
//             let changed = false;

//             for (const { key, targetQty } of toRemoveOrReduce) {
//                 const item = cartItems.find(i => i.key === key);
//                 if (!item) continue;
//                 changed = true;
//                 const fc = await getCart();
//                 const fresh = fc.items.find(i => i.key === key);
//                 if (!fresh) continue;
//                 const lineIdx = fc.items.indexOf(fresh) + 1;
//                 if (targetQty === 0) {
//                     const props = { ...(fresh.properties || {}), "_cs_bundle_id": "" };
//                     await originalFetch("/cart/change.js", {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         [INTERNAL]: true,
//                         body: JSON.stringify({ line: lineIdx, quantity: fresh.quantity, properties: props })
//                     });
//                     console.log(`[BundleDiscount] ✗ REMOVED orphan → "${fresh.title}"`);
//                 } else {
//                     console.log(`[BundleDiscount] ✄ REDUCING locked qty → "${fresh.title}" to ${targetQty}`);
//                     const remainder = fresh.quantity - targetQty;
//                     await originalFetch("/cart/change.js", {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         [INTERNAL]: true,
//                         body: JSON.stringify({ line: lineIdx, quantity: targetQty })
//                     });
//                     if (remainder > 0) {
//                         const propsFree = { ...(fresh.properties || {}), "_cs_bundle_id": "" };
//                         await originalFetch("/cart/add.js", {
//                             method: "POST",
//                             headers: { "Content-Type": "application/json" },
//                             [INTERNAL]: true,
//                             body: JSON.stringify({ items: [{ id: fresh.variant_id, quantity: remainder, properties: propsFree }] })
//                         });
//                     }
//                 }
//             }
//             const cart2 = changed ? await getCart() : cart;
//             const cartItems2 = cart2.items;
//             const isFree2 = i => !i.properties?._cs_bundle_id || i.properties._cs_bundle_id === "";
//             const freeLines2 = cartItems2.filter(isFree2);
//             if (freeLines2.length === 0) {
//                 if (changed) {
//                     const updated = await getCart();
//                     lastQtySignature = buildQtySignature(updated);
//                     lastFullSignature = buildFullSignature(updated);
//                     await refreshSideCart();
//                 } else {
//                     lastQtySignature = qtySig;
//                     lastFullSignature = fullSig;
//                 }
//                 return;
//             }
//             const consumedQty = {};
//             cartItems2.filter(i => i.properties?._cs_bundle_id && i.properties._cs_bundle_id !== "").forEach(item => {
//                 const vid = String(item.variant_id);
//                 consumedQty[vid] = (consumedQty[vid] || 0) + item.quantity;
//             });

//             const totalQty2 = {};
//             cartItems2.forEach(item => {
//                 const vid = String(item.variant_id);
//                 totalQty2[vid] = (totalQty2[vid] || 0) + item.quantity;
//             });
//             const remaining = {};
//             Object.keys(totalQty2).forEach(vid => {
//                 const avail = (totalQty2[vid] || 0) - (consumedQty[vid] || 0);
//                 if (avail > 0) remaining[vid] = avail;
//             });
//             const matchedCombos = [];
//             for (const bundle of bundles) {
//                 const bundleId = String(bundle.bundleId || "").trim();
//                 const v1 = String(bundle.variantId1 || "").trim();
//                 const v2 = String(bundle.variantId2 || "").trim();
//                 if (!bundleId || !v1 || !v2) continue;

//                 if (v1 === v2) {
//                     while ((remaining[v1] || 0) >= 2) {
//                         remaining[v1] -= 2;
//                         matchedCombos.push({ bundleId, v1, v2, same: true });
//                     }
//                 } else {
//                     while ((remaining[v1] || 0) >= 1 && (remaining[v2] || 0) >= 1) {
//                         remaining[v1]--;
//                         remaining[v2]--;
//                         matchedCombos.push({ bundleId, v1, v2, same: false });
//                     }
//                 }
//             }
//             const newAssignments = [];
//             const newlyUsed = {};
//             for (const combo of matchedCombos) {
//                 const { bundleId, v1, v2, same } = combo;
//                 if (same) {
//                     const line = freeLines2.find(i => {
//                         if (String(i.variant_id) !== v1) return false;
//                         const usedOnThisLine = newlyUsed[i.key] || 0;
//                         return (i.quantity - usedOnThisLine) >= 2;
//                     });
//                     if (line) {
//                         newlyUsed[line.key] = (newlyUsed[line.key] || 0) + 2;
//                         const existing = newAssignments.find(a => a.key === line.key && a.bundleId === bundleId);
//                         if (existing) {
//                             existing.qty += 2;
//                         } else {
//                             newAssignments.push({ key: line.key, bundleId, qty: 2 });
//                         }
//                     }
//                 } else {
//                     const line1 = freeLines2.find(i => {
//                         if (String(i.variant_id) !== v1) return false;
//                         const used = newlyUsed[i.key] || 0;
//                         return (i.quantity - used) >= 1;
//                     });
//                     const line2 = freeLines2.find(i => {
//                         if (String(i.variant_id) !== v2) return false;
//                         const used = newlyUsed[i.key] || 0;
//                         return (i.quantity - used) >= 1;
//                     });
//                     if (line1 && line2) {
//                         newlyUsed[line1.key] = (newlyUsed[line1.key] || 0) + 1;
//                         newlyUsed[line2.key] = (newlyUsed[line2.key] || 0) + 1;

//                         [line1, line2].forEach(l => {
//                             const existing = newAssignments.find(a => a.key === l.key && a.bundleId === bundleId);
//                             if (existing) {
//                                 existing.qty += 1;
//                             } else {
//                                 newAssignments.push({ key: l.key, bundleId, qty: 1 });
//                             }
//                         });
//                     }
//                 }
//             }
//             const assignmentsByKey = {};
//             newAssignments.forEach(a => {
//                 if (!assignmentsByKey[a.key]) assignmentsByKey[a.key] = [];
//                 assignmentsByKey[a.key].push(a);
//             });
//             for (const [key, assignments] of Object.entries(assignmentsByKey)) {
//                 const item = cartItems2.find(i => i.key === key);
//                 if (!item) continue;
//                 changed = true;
//                 const fc = await getCart();
//                 const fresh = fc.items.find(i => i.key === key);
//                 if (!fresh) continue;
//                 const lineIdx = fc.items.indexOf(fresh) + 1;
//                 const totalBundledQty = assignments.reduce((sum, a) => sum + a.qty, 0);
//                 const remainder = fresh.quantity - totalBundledQty;
//                 if (remainder === 0 && assignments.length === 1) {
//                     const props = { ...(fresh.properties || {}), "_cs_bundle_id": assignments[0].bundleId };
//                     await originalFetch("/cart/change.js", {
//                         method: "POST", headers: { "Content-Type": "application/json" }, [INTERNAL]: true,
//                         body: JSON.stringify({ line: lineIdx, quantity: fresh.quantity, properties: props })
//                     });
//                     console.log(`[BundleDiscount] ✓ NEW → "${fresh.title}" → bundle: ${assignments[0].bundleId} (Bundled: ${assignments[0].qty})`);
//                 } else {
//                     let baseQty, baseProps;
//                     let startingAssignIdx = 0;
//                     if (remainder > 0) {
//                         baseQty = remainder;
//                         baseProps = { ...(fresh.properties || {}), "_cs_bundle_id": "" };
//                     } else {
//                         baseQty = assignments[0].qty;
//                         baseProps = { ...(fresh.properties || {}), "_cs_bundle_id": assignments[0].bundleId };
//                         startingAssignIdx = 1;
//                         console.log(`[BundleDiscount] ✓ NEW → "${fresh.title}" → bundle: ${assignments[0].bundleId} (Bundled: ${assignments[0].qty})`);
//                     }
//                     await originalFetch("/cart/change.js", {
//                         method: "POST", headers: { "Content-Type": "application/json" }, [INTERNAL]: true,
//                         body: JSON.stringify({ line: lineIdx, quantity: baseQty, properties: baseProps })
//                     });
//                     for (let i = startingAssignIdx; i < assignments.length; i++) {
//                         const a = assignments[i];
//                         const aProps = { ...(fresh.properties || {}), "_cs_bundle_id": a.bundleId };
//                         await originalFetch("/cart/add.js", {
//                             method: "POST", headers: { "Content-Type": "application/json" }, [INTERNAL]: true,
//                             body: JSON.stringify({ items: [{ id: fresh.variant_id, quantity: a.qty, properties: aProps }] })
//                         });
//                         console.log(`[BundleDiscount] ✓ NEW → "${fresh.title}" → bundle: ${a.bundleId} (Bundled: ${a.qty})`);
//                     }
//                 }
//             }
//             if (changed) {
//                 const updated = await getCart();
//                 lastQtySignature = buildQtySignature(updated);
//                 lastFullSignature = buildFullSignature(updated);
//                 await refreshSideCart();
//             } else {
//                 if (qtySig !== lastQtySignature && lastQtySignature !== null) {
//                     await refreshSideCart();
//                 }
//                 lastQtySignature = qtySig;
//                 lastFullSignature = fullSig;
//             }

//         } catch (err) {
//             console.error("[BundleDiscount] Error:", err);
//         } finally {
//             if (!bundleRefreshInProgress) {
//                 toggleCartLoading(false);
//             }
//             isProcessing = false;
//             if (pendingCheck) {
//                 pendingCheck = false;
//                 setTimeout(() => checkAndApplyBundle().catch(console.error), 500);
//             }
//         }
//     }
//     async function refreshSideCart() {
//         try {
//             bundleRefreshInProgress = true;
//             if (typeof window.fire_cart_data_final === "function") {
//                 window.fire_cart_data_final();
//                 console.log("[BundleDiscount] ✓ fire_cart_data_final() called");
//             } else if (typeof window.fire_cart_data === "function") {
//                 window.fire_cart_data();
//                 console.log("[BundleDiscount] ✓ fire_cart_data() called");
//             } else {
//                 console.warn("[BundleDiscount] fire_cart_data_final not available");
//             }
//             const drawerEl = document.querySelector("cart-drawer");
//             const route = window.location.pathname === "/cart" ? "/cart" : "/";
//             const sectionId = drawerEl?.dataset?.section || "cart-drawer";
//             try {
//                 const res = await originalFetch(`${route}?sections=${sectionId}`, { [INTERNAL]: true });
//                 if (res.ok) {
//                     const data = await res.json();
//                     const html = data[sectionId];
//                     if (html) {
//                         const parser = new DOMParser();
//                         const newDoc = parser.parseFromString(html, "text/html");
//                         const regions = [
//                             ".cart-drawer__items",
//                             "#CartDrawer-CartItems",
//                             "#cart-items",
//                             "cart-items",
//                             ".cart-items",
//                             "[data-cart-items]",
//                             ".cart-drawer__inner",
//                             ".cart-drawer__footer",
//                             ".cart__footer",
//                             "[data-cart-totals]"
//                         ];
//                         let refreshedRegions = [];
//                         for (const sel of regions) {
//                             const newEl = newDoc.querySelector(sel);
//                             const currEl = document.querySelector(sel);                    
//                             const isChildOfReplaced = refreshedRegions.some(parentSel => {
//                                 const parent = document.querySelector(parentSel);
//                                 return parent && parent.contains(currEl);
//                             });
//                             if (newEl && currEl && !isChildOfReplaced) {
//                                 currEl.innerHTML = newEl.innerHTML;
//                                 refreshedRegions.push(sel);
//                             }
//                         }
//                         if (bundleLoading) toggleCartLoading(true);
//                         console.log(refreshedRegions.length > 0
//                             ? `[BundleDiscount] ✓ Side cart HTML refreshed (${sectionId}): ` + refreshedRegions.join(", ")
//                             : "[BundleDiscount] No regions matched for HTML replacement");
//                     }
//                 }
//             } catch (secErr) {
//                 console.warn("[BundleDiscount] Section HTML refresh failed:", secErr.message);
//             }
//             setTimeout(() => {
//                 bundleRefreshInProgress = false;
//                 toggleCartLoading(false);
//             }, 1200);
//         } catch (err) {
//             bundleRefreshInProgress = false;
//             toggleCartLoading(false);
//             console.warn("[BundleDiscount] refreshSideCart error:", err.message);
//         }
//     }
// })();