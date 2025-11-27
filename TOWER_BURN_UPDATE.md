# 🔥 Tower Burn Mechanism Update

## 📋 Changes Made

### 1. Smart Contract Update
- Modified `play_and_submit` function to **burn tower on failure**
- If player clears 0 waves → Tower is destroyed permanently
- If player clears 1+ waves → Tower is returned to player

### 2. New Contract Addresses
```
Package ID:    0xfdec11104d2e3231fbd4406751cbd57d8147ffd3f3e598f4e2ae0b09d224c961
Game State ID: 0x7e8c26af167e8991b456da581e822b232eb1297d9d705e588c39bd8b92d859dc
```

### 3. Frontend Updated
- `frontend/lib/constants.ts` - Updated with new contract addresses

## 🚀 How to Test

### Step 1: Clear Browser Cache
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache completely

### Step 2: Mint New Tower
1. Go to homepage
2. Click "🎲 Mint Random Tower"
3. Confirm transaction
4. **Important**: Only towers minted with the NEW contract will work!

### Step 3: Test Failure Scenario (Tower Should Burn)
1. Select the newly minted tower
2. Click "Play Game"
3. **Don't place any towers** or place them poorly
4. Let enemies pass through
5. Lives reach 0 → Game Over
6. Click "Submit Result"
7. ✅ **Tower should disappear from your inventory**

### Step 4: Test Success Scenario (Tower Should Return)
1. Mint another tower
2. Play game properly
3. Clear at least 1 wave
4. Submit result
5. ✅ **Tower should still be in your inventory**

## ⚠️ Important Notes

1. **Old towers won't work** - Towers minted before this update are from the old contract
2. **Must use new towers** - Only towers minted after the update will be burned on failure
3. **Check your wallet** - After failure, the tower object should be deleted from blockchain

## 🎮 Game Mechanics

### Failure (0 waves cleared)
- 💀 Tower is destroyed (burned)
- ❌ No rewards
- 💸 Lose game fee (0.0005 SUI)

### Success (1+ waves cleared)
- ✅ Tower returned to player
- 🎁 Chance for NFT reward:
  - Wave 1: 0%
  - Wave 2: 20% (Common/Rare)
  - Wave 3: 30% (Rare/Epic)
  - Wave 4: 50% (Rare/Epic/Legendary)
  - Wave 5: 80% (Epic/Legendary)

## 🔍 Verification

To verify the tower was burned:
1. Check Sui Explorer: https://suiscan.xyz/testnet/home
2. Search for your tower's Object ID
3. After failure, it should show as "Deleted" or not found

## 📝 Contract Code Reference

```move
// If player failed (0 waves cleared), destroy the tower
if (waves_cleared == 0) {
    let TowerNFT { 
        id, 
        name: _, 
        damage: _, 
        range: _, 
        fire_rate: _, 
        rarity: _,
        minted_at: _,
    } = tower;
    object::delete(id);
} else {
    // Player succeeded - return tower to owner
    transfer::public_transfer(tower, ctx.sender());
};
```
