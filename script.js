/********************************************************
			* GAME VARIABLES
			********************************************************/
            const trump = document.getElementById('trump');
            const coinCount = document.getElementById('coinCount');
            let stageHeight = window.innerHeight;
            let stageWidth = window.innerWidth;
            // Trump jump mechanics
            let trumpBottom = 0;
            let velocity = 0;
            let gravity = -0.6;
            let jumpForce = 12;
            let jumpsInAir = 0;
            // Item mechanics: coin bags and Biden
            let coinsCollected = 0;
            const items = []; // Items that haven't yet collided with Trump
            const bouncingBiden = []; // Biden objects that have been hit (and may later be re-hit)
            const itemSpeed = 3; // Horizontal speed for items before collision
            const spawnIntervalMs = 1000;
            const gravityBiden = 0.6; // Gravity applied to bouncing Biden
            /********************************************************
                * INPUT EVENT LISTENERS: SPACE + LEFT-CLICK
                ********************************************************/
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space') {
                    e.preventDefault();
                    jump();
                }
            });
            window.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    jump();
                }
            });
    
            function jump() {
                velocity = jumpForce;
                jumpsInAir++;
            }
            /********************************************************
                * SPAWN ITEMS (COIN BAGS OR BIDEN)
                ********************************************************/
            function spawnItem() {
                // 20% chance to spawn Biden; 80% chance for a coin bag.
                const isBiden = Math.random() < 0.2;
                const startY = Math.floor(Math.random() * (stageHeight - 50)) + 25;
                if (isBiden) {
                    const biden = document.createElement('img');
                    biden.src = "https://i.imgur.com/oCEOCzg.png";
                    biden.className = 'biden';
                    biden.style.top = startY + 'px';
                    biden.style.left = stageWidth + 'px';
                    document.body.appendChild(biden);
                    items.push({
                        el: biden,
                        x: stageWidth,
                        y: startY,
                        type: 'biden'
                    });
                } else {
                    const coin = document.createElement('span');
                    coin.className = 'coin';
                    coin.textContent = '💰';
                    coin.style.top = startY + 'px';
                    coin.style.left = stageWidth + 'px';
                    document.body.appendChild(coin);
                    items.push({
                        el: coin,
                        x: stageWidth,
                        y: startY,
                        type: 'coin'
                    });
                }
            }
            setInterval(spawnItem, spawnIntervalMs);
            /********************************************************
                * DOLLAR BILL ANIMATION FUNCTION (for coin bag collection)
                ********************************************************/
            function spawnDollarBills(startX, startY) {
                const numberOfBills = 3;
                for (let i = 0; i < numberOfBills; i++) {
                    const dollarBill = document.createElement('span');
                    dollarBill.className = 'dollar-bill';
                    dollarBill.textContent = '💵';
                    dollarBill.style.left = startX + 'px';
                    dollarBill.style.top = startY + 'px';
                    dollarBill.style.opacity = '1';
                    document.body.appendChild(dollarBill);
                    // Force reflow so the starting position is registered.
                    void dollarBill.offsetWidth;
                    const angle = Math.random() * 2 * Math.PI;
                    const distance = 50 + Math.random() * 50;
                    const offsetX = Math.cos(angle) * distance;
                    const offsetY = Math.sin(angle) * distance;
                    dollarBill.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                    dollarBill.style.opacity = '0';
                    setTimeout(() => {
                        dollarBill.remove();
                    }, 1000);
                }
            }
            /********************************************************
                * GAME LOOP: Update Trump, Items, and Bouncing Biden
                ********************************************************/
            function gameLoop() {
                // ----- Update Trump's Jump Mechanics -----
                velocity += gravity;
                trumpBottom += velocity;
                if (trumpBottom <= 0) {
                    trumpBottom = 0;
                    velocity = 0;
                    jumpsInAir = 0;
                }
                trump.style.bottom = trumpBottom + 'px';
                // ----- Update Items (Coin Bags and Pre-Collision Biden) -----
                for (let i = items.length - 1; i >= 0; i--) {
                    const item = items[i];
                    item.x -= itemSpeed;
                    item.el.style.left = item.x + 'px';
                    if (item.x < -100) {
                        item.el.remove();
                        items.splice(i, 1);
                        continue;
                    }
                    const trumpRect = trump.getBoundingClientRect();
                    const itemRect = item.el.getBoundingClientRect();
                    if (
                        trumpRect.left < itemRect.right &&
                        trumpRect.right > itemRect.left &&
                        trumpRect.top < itemRect.bottom &&
                        trumpRect.bottom > itemRect.top
                    ) {
                        if (item.type === 'coin') {
                            const centerX = itemRect.left + itemRect.width / 2;
                            const centerY = itemRect.top + itemRect.height / 2;
                            spawnDollarBills(centerX, centerY);
                            coinsCollected++;
                            coinCount.textContent = coinsCollected;
                            item.el.remove();
                            items.splice(i, 1);
                        } else if (item.type === 'biden') {
                            // Calculate bounce impulse for Biden.
                            const trumpRect = trump.getBoundingClientRect();
                            const bidenRect = itemRect;
                            const trumpCenterX = trumpRect.left + trumpRect.width / 2;
                            const trumpCenterY = trumpRect.top + trumpRect.height / 2;
                            const bidenCenterX = bidenRect.left + bidenRect.width / 2;
                            const bidenCenterY = bidenRect.top + bidenRect.height / 2;
                            let diffX = bidenCenterX - trumpCenterX;
                            let diffY = bidenCenterY - trumpCenterY;
                            const mag = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
                            diffX /= mag;
                            diffY /= mag;
                            const bounceSpeed = 10;
                            const initialVx = diffX * bounceSpeed;
                            const initialVy = -10; // upward impulse
                            bouncingBiden.push({
                                el: item.el,
                                x: item.x,
                                y: item.y,
                                vx: initialVx,
                                vy: initialVy,
                                rolling: false, // Not on the ground yet.
                                landedTime: null // To be set when Biden lands.
                            });
                            items.splice(i, 1);
                        }
                    }
                }
                // ----- Update Bouncing Biden (Physics Simulation & Re-Hit Detection) -----
                for (let i = bouncingBiden.length - 1; i >= 0; i--) {
                    const biden = bouncingBiden[i];
                    const bidenWidth = biden.el.offsetWidth;
                    const bidenHeight = biden.el.offsetHeight;
                    const groundY = stageHeight - bidenHeight;
                    if (!biden.rolling) {
                        // Apply gravity while Biden is in the air.
                        biden.vy += gravityBiden;
                        biden.x += biden.vx;
                        biden.y += biden.vy;
                        if (biden.y >= groundY) {
                            // Biden lands on the ground.
                            biden.y = groundY;
                            biden.vy = 0;
                            biden.rolling = true;
                            biden.landedTime = Date.now();
                        }
                    } else {
                        // Once on the ground, check if Trump hits Biden again.
                        const trumpRect = trump.getBoundingClientRect();
                        const bidenRect = biden.el.getBoundingClientRect();
                        if (
                            trumpRect.left < bidenRect.right &&
                            trumpRect.right > bidenRect.left &&
                            trumpRect.top < bidenRect.bottom &&
                            trumpRect.bottom > bidenRect.top
                        ) {
                            // Recalculate bounce impulse on re-hit.
                            const trumpCenterX = trumpRect.left + trumpRect.width / 2;
                            const trumpCenterY = trumpRect.top + trumpRect.height / 2;
                            const bidenCenterX = bidenRect.left + bidenRect.width / 2;
                            const bidenCenterY = bidenRect.top + bidenRect.height / 2;
                            let diffX = bidenCenterX - trumpCenterX;
                            let diffY = bidenCenterY - trumpCenterY;
                            const mag = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
                            diffX /= mag;
                            diffY /= mag;
                            const bounceSpeed = 10;
                            biden.vx = diffX * bounceSpeed;
                            biden.vy = -10; // upward impulse
                            biden.rolling = false; // switch back to "in-air" state
                            biden.landedTime = null;
                        }
                        // Despawn Biden if he has been on the ground for 5 seconds.
                        if (biden.landedTime && Date.now() - biden.landedTime >= 5000) {
                            biden.el.remove();
                            bouncingBiden.splice(i, 1);
                            continue;
                        }
                    }
                    // Constrain Biden to stay within the horizontal window bounds.
                    if (biden.x < 0) {
                        biden.x = 0;
                        biden.vx = -biden.vx;
                    } else if (biden.x + bidenWidth > stageWidth) {
                        biden.x = stageWidth - bidenWidth;
                        biden.vx = -biden.vx;
                    }
                    biden.el.style.top = biden.y + 'px';
                    biden.el.style.left = biden.x + 'px';
                }
                requestAnimationFrame(gameLoop);
            }
            requestAnimationFrame(gameLoop);
            /********************************************************
                * HANDLE WINDOW RESIZE (optional)
                ********************************************************/
            window.addEventListener('resize', () => {
                stageHeight = window.innerHeight;
                stageWidth = window.innerWidth;
            });