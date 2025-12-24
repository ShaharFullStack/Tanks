// ============================================
// SHOP.JS - Shop System
// ============================================

const Shop = {
    isOpen: false,

    // Open shop
    open() {
        this.isOpen = true;
        GameState.turnState = CONFIG.TURN_STATES.SHOP;
        this.render();
        document.getElementById('shop-overlay').classList.add('show');
    },

    // Close shop
    close() {
        this.isOpen = false;
        document.getElementById('shop-overlay').classList.remove('show');
        TurnSystem.startNextRound();
    },

    // Render shop UI
    render() {
        const container = document.getElementById('shop-items');
        container.innerHTML = '';

        WEAPONS.forEach((weapon, index) => {
            const owned = GameState.inventory[weapon.id];
            const canAfford = GameState.credits >= weapon.price;
            const isFree = weapon.price === 0;

            const item = document.createElement('div');
            item.className = 'shop-item' + (canAfford || isFree ? '' : ' disabled');
            item.innerHTML = `
                <div class="shop-item-name">${weapon.name}</div>
                <div class="shop-item-desc">${weapon.description}</div>
                <div class="shop-item-stats">
                    <span>DMG: ${weapon.damage}</span>
                    <span>RAD: ${weapon.radius}</span>
                </div>
                <div class="shop-item-footer">
                    <span class="shop-item-owned">Owned: ${owned === Infinity ? '∞' : owned}</span>
                    <span class="shop-item-price">${isFree ? 'FREE' : '$' + weapon.price.toLocaleString()}</span>
                </div>
            `;

            if (!isFree && canAfford) {
                item.addEventListener('click', () => this.buyWeapon(index));
            }

            container.appendChild(item);
        });

        // Update credits display in shop
        document.getElementById('shop-credits').textContent = '$' + GameState.credits.toLocaleString();
    },

    // Buy weapon
    buyWeapon(index) {
        const weapon = WEAPONS[index];

        if (GameState.spendCredits(weapon.price)) {
            GameState.addAmmo(weapon.id, 1);
            UI.showMessage(`PURCHASED ${weapon.name}!`);
            this.render();
        }
    },

    // Buy multiple of same weapon
    buyMultiple(index, count) {
        const weapon = WEAPONS[index];
        const totalCost = weapon.price * count;

        if (GameState.spendCredits(totalCost)) {
            GameState.addAmmo(weapon.id, count);
            this.render();
        }
    }
};
