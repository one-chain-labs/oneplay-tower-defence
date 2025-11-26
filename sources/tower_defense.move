module tower_defense::game {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;

    // ===== Errors =====
    const EInsufficientPayment: u64 = 1;
    const EInvalidWaveCount: u64 = 3;
    const ENotOwner: u64 = 4;
    const EListingNotFound: u64 = 5;
    const EInvalidPrice: u64 = 6;
    const EChallengeFullOrClosed: u64 = 7;
    const EInsufficientPrizePool: u64 = 8;

    // ===== Constants =====
    const MINT_COST: u64 = 1_000_000; // 0.001 SUI
    const GAME_COST: u64 = 500_000; // 0.0005 SUI
    const MAX_WAVES: u8 = 5;

    // ===== Structs =====
    
    /// Global game state
    public struct GameState has key {
        id: UID,
        treasury: Balance<SUI>,
        total_towers_minted: u64,
        total_games_played: u64,
    }

    /// Tower NFT with random attributes
    public struct TowerNFT has key, store {
        id: UID,
        name: vector<u8>,
        damage: u64,
        range: u64,
        fire_rate: u64,
        rarity: u8,
        minted_at: u64,
    }

    /// Monster NFT with random attributes
    public struct MonsterNFT has key, store {
        id: UID,
        name: vector<u8>,
        hp: u64,
        speed: u64,
        monster_type: u8, // 1=normal, 2=fast, 3=tank
        rarity: u8,
        minted_at: u64,
    }

    /// Custom Challenge created by players
    public struct Challenge has key, store {
        id: UID,
        creator: address,
        monster: MonsterNFT,
        prize_pool: Balance<SUI>,
        entry_fee: u64,
        max_winners: u64,
        current_winners: u64,
        created_at: u64,
    }

    /// Marketplace listing
    public struct Listing has key, store {
        id: UID,
        tower: TowerNFT,
        price: u64,
        seller: address,
    }

    // ===== Events =====
    
    public struct TowerMintedEvent has copy, drop {
        tower_id: ID,
        owner: address,
        damage: u64,
        range: u64,
        fire_rate: u64,
        rarity: u8,
    }

    public struct GameCompletedEvent has copy, drop {
        player: address,
        tower_id: ID,
        waves_cleared: u8,
        reward: u64,
        timestamp: u64,
    }

    public struct TowerListedEvent has copy, drop {
        listing_id: ID,
        tower_id: ID,
        seller: address,
        price: u64,
    }

    public struct TowerSoldEvent has copy, drop {
        listing_id: ID,
        tower_id: ID,
        seller: address,
        buyer: address,
        price: u64,
    }

    public struct ListingCancelledEvent has copy, drop {
        listing_id: ID,
        seller: address,
    }

    public struct MonsterMintedEvent has copy, drop {
        monster_id: ID,
        owner: address,
        hp: u64,
        speed: u64,
        monster_type: u8,
        rarity: u8,
    }

    public struct ChallengeCreatedEvent has copy, drop {
        challenge_id: ID,
        creator: address,
        monster_id: ID,
        prize_pool: u64,
        entry_fee: u64,
        max_winners: u64,
    }

    public struct ChallengeCompletedEvent has copy, drop {
        challenge_id: ID,
        player: address,
        success: bool,
        reward: u64,
    }

    // ===== Init =====
    
    fun init(ctx: &mut TxContext) {
        let game_state = GameState {
            id: object::new(ctx),
            treasury: balance::zero(),
            total_towers_minted: 0,
            total_games_played: 0,
        };
        transfer::share_object(game_state);
    }

    // ===== Public Functions =====
    
    /// Mint a random tower NFT
    public entry fun mint_tower(
        game_state: &mut GameState,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let paid_amount = coin::value(&payment);
        assert!(paid_amount >= MINT_COST, EInsufficientPayment);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game_state.treasury, payment_balance);

        let (damage, range, fire_rate, rarity) = generate_random_stats(ctx);

        let tower = TowerNFT {
            id: object::new(ctx),
            name: b"Battle Tower",
            damage,
            range,
            fire_rate,
            rarity,
            minted_at: ctx.epoch_timestamp_ms(),
        };

        let tower_id = object::id(&tower);
        game_state.total_towers_minted = game_state.total_towers_minted + 1;

        event::emit(TowerMintedEvent {
            tower_id,
            owner: ctx.sender(),
            damage,
            range,
            fire_rate,
            rarity,
        });

        transfer::public_transfer(tower, ctx.sender());
    }

    /// Play game and submit result (combined function)
    public entry fun play_and_submit(
        game_state: &mut GameState,
        tower: &TowerNFT,
        payment: Coin<SUI>,
        waves_cleared: u8,
        ctx: &mut TxContext
    ) {
        // Validate payment
        let paid_amount = coin::value(&payment);
        assert!(paid_amount >= GAME_COST, EInsufficientPayment);
        assert!(waves_cleared <= MAX_WAVES, EInvalidWaveCount);

        // Add payment to treasury
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game_state.treasury, payment_balance);

        // Try to mint reward tower based on waves cleared
        let reward_tower_id = try_mint_reward_tower(game_state, waves_cleared, ctx);

        game_state.total_games_played = game_state.total_games_played + 1;

        event::emit(GameCompletedEvent {
            player: ctx.sender(),
            tower_id: object::id(tower),
            waves_cleared,
            reward: if (reward_tower_id != 0) { 1 } else { 0 }, // 1 if got tower, 0 if not
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    /// Try to mint a reward tower based on performance
    fun try_mint_reward_tower(
        game_state: &mut GameState,
        waves_cleared: u8,
        ctx: &mut TxContext
    ): u64 {
        // Calculate drop chance based on waves cleared
        let (drop_chance, min_rarity) = if (waves_cleared >= 5) {
            (80, 3) // 80% chance, min Epic (3-4)
        } else if (waves_cleared >= 4) {
            (50, 2) // 50% chance, min Rare (2-4)
        } else if (waves_cleared >= 3) {
            (30, 2) // 30% chance, min Rare (2-3)
        } else if (waves_cleared >= 2) {
            (20, 1) // 20% chance, Common-Rare (1-2)
        } else {
            (0, 1) // No reward
        };

        if (drop_chance == 0) {
            return 0
        };

        // Roll for drop
        let random = pseudo_random(ctx);
        let drop_roll = random % 100;

        if (drop_roll >= drop_chance) {
            return 0 // No drop
        };

        // Generate reward tower with guaranteed minimum rarity
        let (damage, range, fire_rate, rarity) = generate_reward_tower_stats(ctx, waves_cleared, min_rarity);

        let reward_tower = TowerNFT {
            id: object::new(ctx),
            name: b"Reward Tower",
            damage,
            range,
            fire_rate,
            rarity,
            minted_at: ctx.epoch_timestamp_ms(),
        };

        let tower_id = object::id(&reward_tower);
        game_state.total_towers_minted = game_state.total_towers_minted + 1;

        event::emit(TowerMintedEvent {
            tower_id,
            owner: ctx.sender(),
            damage,
            range,
            fire_rate,
            rarity,
        });

        transfer::public_transfer(reward_tower, ctx.sender());

        1 // Return non-zero to indicate success
    }

    /// Generate reward tower stats with minimum rarity
    fun generate_reward_tower_stats(ctx: &mut TxContext, waves_cleared: u8, min_rarity: u8): (u64, u64, u64, u8) {
        let random = pseudo_random(ctx);
        
        // Determine rarity based on waves and minimum
        let rarity = if (waves_cleared >= 5) {
            // Wave 5: 50% Epic, 50% Legendary
            if (random % 2 == 0) { 3 } else { 4 }
        } else if (waves_cleared >= 4) {
            // Wave 4: 30% Rare, 50% Epic, 20% Legendary
            let roll = random % 100;
            if (roll < 30) { 2 } else if (roll < 80) { 3 } else { 4 }
        } else if (waves_cleared >= 3) {
            // Wave 3: 50% Rare, 50% Epic
            if (random % 2 == 0) { 2 } else { 3 }
        } else {
            // Wave 1-2: 70% Common, 30% Rare
            if (random % 10 < 7) { 1 } else { 2 }
        };

        // Base stats by rarity
        let (base_damage, base_range, base_fire_rate) = if (rarity == 1) {
            (15, 100, 1000)
        } else if (rarity == 2) {
            (25, 120, 900)
        } else if (rarity == 3) {
            (40, 140, 800)
        } else {
            (60, 160, 700)
        };

        // Add variance
        let damage_variance = (random % 8) + 1;
        let range_variance = (random % 20) + 1;
        let fire_rate_variance = (random % 200) + 1;

        let damage = base_damage + damage_variance;
        let range = base_range + range_variance;
        let fire_rate = if (base_fire_rate > fire_rate_variance) {
            base_fire_rate - fire_rate_variance
        } else {
            base_fire_rate
        };

        (damage, range, fire_rate, rarity)
    }

    // ===== Helper Functions =====
    
    fun generate_random_stats(ctx: &mut TxContext): (u64, u64, u64, u8) {
        let random = pseudo_random(ctx);
        
        let rarity_roll = random % 100;
        let rarity = if (rarity_roll < 50) {
            1
        } else if (rarity_roll < 80) {
            2
        } else if (rarity_roll < 95) {
            3
        } else {
            4
        };

        let (base_damage, base_range, base_fire_rate) = if (rarity == 1) {
            (15, 100, 1000)
        } else if (rarity == 2) {
            (25, 120, 900)
        } else if (rarity == 3) {
            (40, 140, 800)
        } else {
            (60, 160, 700)
        };

        let damage_variance = (random % 8) + 1;
        let range_variance = (random % 20) + 1;
        let fire_rate_variance = (random % 200) + 1;

        let damage = base_damage + damage_variance;
        let range = base_range + range_variance;
        let fire_rate = if (base_fire_rate > fire_rate_variance) {
            base_fire_rate - fire_rate_variance
        } else {
            base_fire_rate
        };

        (damage, range, fire_rate, rarity)
    }



    fun pseudo_random(ctx: &mut TxContext): u64 {
        let uid = object::new(ctx);
        let random_bytes = object::uid_to_bytes(&uid);
        object::delete(uid);
        
        let mut result: u64 = 0;
        let mut i = 0;
        while (i < 8 && i < random_bytes.length()) {
            result = (result << 8) | (*random_bytes.borrow(i) as u64);
            i = i + 1;
        };
        result
    }

    // ===== View Functions =====
    
    public fun get_tower_stats(tower: &TowerNFT): (u64, u64, u64, u8) {
        (tower.damage, tower.range, tower.fire_rate, tower.rarity)
    }

    public fun get_treasury_balance(game_state: &GameState): u64 {
        balance::value(&game_state.treasury)
    }

    // ===== Marketplace Functions =====

    /// List a tower for sale
    public entry fun list_tower(
        tower: TowerNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);

        let listing = Listing {
            id: object::new(ctx),
            tower,
            price,
            seller: ctx.sender(),
        };

        let listing_id = object::id(&listing);
        let tower_id = object::id(&listing.tower);

        event::emit(TowerListedEvent {
            listing_id,
            tower_id,
            seller: ctx.sender(),
            price,
        });

        transfer::share_object(listing);
    }

    /// Buy a listed tower
    public entry fun buy_tower(
        listing: Listing,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let Listing { id, tower, price, seller } = listing;
        
        let paid_amount = coin::value(&payment);
        assert!(paid_amount >= price, EInsufficientPayment);

        // Transfer payment to seller
        transfer::public_transfer(payment, seller);

        // Transfer tower to buyer
        let tower_id = object::id(&tower);
        let listing_id = object::uid_to_inner(&id);

        event::emit(TowerSoldEvent {
            listing_id,
            tower_id,
            seller,
            buyer: ctx.sender(),
            price,
        });

        transfer::public_transfer(tower, ctx.sender());
        object::delete(id);
    }

    /// Cancel a listing
    public entry fun cancel_listing(
        listing: Listing,
        ctx: &mut TxContext
    ) {
        let Listing { id, tower, price: _, seller } = listing;
        
        assert!(ctx.sender() == seller, ENotOwner);

        let listing_id = object::uid_to_inner(&id);

        event::emit(ListingCancelledEvent {
            listing_id,
            seller,
        });

        transfer::public_transfer(tower, seller);
        object::delete(id);
    }

    // ===== Monster NFT Functions =====

    /// Mint a random monster NFT
    public entry fun mint_monster(
        game_state: &mut GameState,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let paid_amount = coin::value(&payment);
        assert!(paid_amount >= MINT_COST, EInsufficientPayment);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game_state.treasury, payment_balance);

        let (hp, speed, monster_type, rarity) = generate_random_monster_stats(ctx);

        let monster = MonsterNFT {
            id: object::new(ctx),
            name: b"Battle Monster",
            hp,
            speed,
            monster_type,
            rarity,
            minted_at: ctx.epoch_timestamp_ms(),
        };

        let monster_id = object::id(&monster);

        event::emit(MonsterMintedEvent {
            monster_id,
            owner: ctx.sender(),
            hp,
            speed,
            monster_type,
            rarity,
        });

        transfer::public_transfer(monster, ctx.sender());
    }

    /// Generate random monster stats
    fun generate_random_monster_stats(ctx: &mut TxContext): (u64, u64, u8, u8) {
        let random = pseudo_random(ctx);
        
        // Determine rarity (same as tower)
        let rarity_roll = random % 100;
        let rarity = if (rarity_roll < 50) {
            1 // Common 50%
        } else if (rarity_roll < 80) {
            2 // Rare 30%
        } else if (rarity_roll < 95) {
            3 // Epic 15%
        } else {
            4 // Legendary 5%
        };

        // Determine monster type
        let type_roll = (random / 100) % 3;
        let monster_type = if (type_roll == 0) {
            1 // Normal
        } else if (type_roll == 1) {
            2 // Fast
        } else {
            3 // Tank
        };

        // Base stats by type and rarity
        let (base_hp, base_speed) = if (monster_type == 1) {
            // Normal: balanced
            (50, 150)
        } else if (monster_type == 2) {
            // Fast: low HP, high speed
            (30, 300)
        } else {
            // Tank: high HP, low speed
            (150, 80)
        };

        // Rarity multiplier
        let rarity_multiplier = if (rarity == 1) {
            100
        } else if (rarity == 2) {
            120
        } else if (rarity == 3) {
            150
        } else {
            200
        };

        let hp = (base_hp * rarity_multiplier) / 100 + (random % 10);
        let speed = (base_speed * rarity_multiplier) / 100 + (random % 20);

        (hp, speed, monster_type, rarity)
    }

    // ===== Challenge Functions =====

    /// Create a custom challenge
    public entry fun create_challenge(
        monster: MonsterNFT,
        initial_prize: Coin<SUI>,
        entry_fee: u64,
        max_winners: u64,
        ctx: &mut TxContext
    ) {
        assert!(entry_fee > 0, EInvalidPrice);
        assert!(max_winners > 0, EInvalidPrice);

        let prize_amount = coin::value(&initial_prize);
        let prize_balance = coin::into_balance(initial_prize);

        let challenge = Challenge {
            id: object::new(ctx),
            creator: ctx.sender(),
            monster,
            prize_pool: prize_balance,
            entry_fee,
            max_winners,
            current_winners: 0,
            created_at: ctx.epoch_timestamp_ms(),
        };

        let challenge_id = object::id(&challenge);
        let monster_id = object::id(&challenge.monster);

        event::emit(ChallengeCreatedEvent {
            challenge_id,
            creator: ctx.sender(),
            monster_id,
            prize_pool: prize_amount,
            entry_fee,
            max_winners,
        });

        transfer::share_object(challenge);
    }

    /// Play a challenge
    public entry fun play_challenge(
        challenge: &mut Challenge,
        payment: Coin<SUI>,
        success: bool,
        ctx: &mut TxContext
    ) {
        // Check if challenge is still open
        assert!(challenge.current_winners < challenge.max_winners, EChallengeFullOrClosed);

        // Validate payment
        let paid_amount = coin::value(&payment);
        assert!(paid_amount >= challenge.entry_fee, EInsufficientPayment);

        // Add entry fee to prize pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut challenge.prize_pool, payment_balance);

        let reward = if (success) {
            // Calculate reward: prize_pool / max_winners
            let total_pool = balance::value(&challenge.prize_pool);
            let reward_amount = total_pool / challenge.max_winners;
            
            assert!(reward_amount > 0, EInsufficientPrizePool);
            
            // Take reward from pool
            let reward_balance = balance::split(&mut challenge.prize_pool, reward_amount);
            let reward_coin = coin::from_balance(reward_balance, ctx);
            
            // Transfer reward to player
            transfer::public_transfer(reward_coin, ctx.sender());
            
            challenge.current_winners = challenge.current_winners + 1;
            
            reward_amount
        } else {
            // Failed - no reward, entry fee stays in pool
            0
        };

        event::emit(ChallengeCompletedEvent {
            challenge_id: object::id(challenge),
            player: ctx.sender(),
            success,
            reward,
        });
    }

    /// Cancel challenge and return remaining funds
    public entry fun cancel_challenge(
        challenge: Challenge,
        ctx: &mut TxContext
    ) {
        let Challenge { 
            id, 
            creator, 
            monster, 
            prize_pool, 
            entry_fee: _, 
            max_winners: _, 
            current_winners: _,
            created_at: _,
        } = challenge;
        
        assert!(ctx.sender() == creator, ENotOwner);

        // Return remaining prize pool to creator
        let remaining = balance::value(&prize_pool);
        if (remaining > 0) {
            let prize_coin = coin::from_balance(prize_pool, ctx);
            transfer::public_transfer(prize_coin, creator);
        } else {
            balance::destroy_zero(prize_pool);
        };

        // Return monster to creator
        transfer::public_transfer(monster, creator);
        
        object::delete(id);
    }
}
