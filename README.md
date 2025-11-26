# 🏰 Tower Defense GameFi

A blockchain-based tower defense game built on Sui Network. Mint NFT towers, battle monsters, earn rewards, and trade on the marketplace!

![Sui Network](https://img.shields.io/badge/Sui-Network-blue)
![Move](https://img.shields.io/badge/Move-Smart%20Contract-orange)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Game Features

### 🗼 Tower NFTs
- **Mint Random Towers** - Pay 0.001 SUI to get a tower with random stats
- **4 Rarity Levels** - Common (50%), Rare (30%), Epic (15%), Legendary (5%)
- **Unique Attributes** - Each tower has damage, range, and fire rate stats
- **Play to Earn** - Use towers to play and earn more NFT rewards

### 👹 Monster NFTs
- **Mint Random Monsters** - Create unique monster NFTs
- **3 Monster Types** - Normal (balanced), Fast (high speed), Tank (high HP)
- **Create Challenges** - Use monsters to challenge other players

### 🎯 Tower Defense Game
- **Pay to Play** - 0.0005 SUI per game session
- **5 Wave System** - Clear waves to earn NFT rewards
- **Progressive Rewards**:
  - 2 waves: 20% drop chance (Common-Rare)
  - 3 waves: 30% drop chance (Rare-Epic)
  - 4 waves: 50% drop chance (Rare-Legendary)
  - 5 waves: 80% drop chance (Epic-Legendary)

### 🏪 Marketplace
- **List Towers** - Sell your towers at any price
- **Buy Towers** - Purchase towers from other players
- **Cancel Anytime** - Remove your listings whenever you want

### 🎁 Challenge System
- **Create Challenges** - Use monster NFTs to create custom challenges
- **Set Prize Pool** - Add initial prize and set entry fee
- **Earn Rewards** - Winners share the prize pool

## 🚀 Quick Start

### Prerequisites
- [Sui CLI](https://docs.sui.io/build/install) installed
- [Node.js](https://nodejs.org/) 18+ installed
- Sui wallet with testnet SUI ([Get from faucet](https://faucet.sui.io))

### 1. Deploy Smart Contract

```bash
# Build and deploy
sui move build
sui client publish --gas-budget 100000000

# Save the Package ID and GameState object ID
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local and add:
# NEXT_PUBLIC_PACKAGE_ID=your_package_id
# NEXT_PUBLIC_GAME_STATE_ID=your_game_state_id

# Start development server
npm run dev
```

Visit `http://localhost:3000` to play!

## 📁 Project Structure

```
tower-defense-gamefi/
├── sources/
│   └── tower_defense.move      # Main smart contract
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Home page (mint & play)
│   │   ├── play/               # Game page
│   │   ├── market/             # Marketplace
│   │   ├── challenges/         # Monster & challenges
│   │   └── history/            # Game history
│   ├── lib/
│   │   ├── contracts.ts        # Contract interactions
│   │   └── constants.ts        # Configuration
│   └── package.json
├── Move.toml                   # Move package config
├── deploy.bat                  # Deployment script
└── README.md
```

## 🎯 How to Play

1. **Connect Wallet** - Connect your Sui wallet (Sui Wallet, Suiet, etc.)
2. **Mint Tower** - Pay 0.001 SUI to get a random tower NFT
3. **Select Tower** - Choose a tower from your inventory
4. **Play Game** - Pay 0.0005 SUI to start the tower defense game
5. **Earn Rewards** - Clear waves to earn more tower NFTs!
6. **Trade** - List your towers on the marketplace or buy from others

## 💎 NFT Rarity System

| Rarity | Drop Rate | Damage Range | Color |
|--------|-----------|--------------|-------|
| ⚪ Common | 50% | 15-23 | Gray |
| 🔵 Rare | 30% | 25-33 | Blue |
| 🟣 Epic | 15% | 40-48 | Purple |
| 🟡 Legendary | 5% | 60-68 | Yellow |

## 🔧 Smart Contract Functions

### Player Functions
- `mint_tower()` - Mint a random tower NFT
- `mint_monster()` - Mint a random monster NFT
- `play_and_submit()` - Play game and submit results
- `list_tower()` - List tower for sale
- `buy_tower()` - Buy a listed tower
- `cancel_listing()` - Cancel your listing
- `create_challenge()` - Create a challenge with monster
- `play_challenge()` - Participate in a challenge
- `cancel_challenge()` - Cancel your challenge

### View Functions
- `get_tower_stats()` - Get tower attributes
- `get_treasury_balance()` - View game treasury

## 🛠️ Tech Stack

**Smart Contract**
- Move Language
- Sui Framework
- Sui Testnet

**Frontend**
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- @mysten/dapp-kit
- @tanstack/react-query

## 📊 Economic Model

### Revenue Streams
- Tower minting: 0.001 SUI per mint
- Game sessions: 0.0005 SUI per play
- Marketplace fees: Direct P2P (no platform fee)
- Challenge entry fees: Set by creators

### Reward Distribution
- NFT rewards based on performance
- Challenge prize pools shared among winners
- Sustainable treasury management

## 🎮 Game Mechanics

### Random Number Generation
- Uses Sui's object UID for randomness
- Fair and transparent
- Cannot be manipulated

### Tower Stats
- **Damage**: Attack power (15-68)
- **Range**: Attack distance (100-160)
- **Fire Rate**: Attack speed (700-1000ms)

### Monster Stats
- **HP**: Health points (varies by type)
- **Speed**: Movement speed (varies by type)
- **Type**: Normal, Fast, or Tank

## 🔗 Deployed Contract

**Network**: Sui Testnet

**Package ID**: `0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec`

**GameState**: `0xca88a092ca23c88f2ef2fa936fced6d058c035fb61ddf7b7dd86c4c1c8169c5e`

**Explorer**: [View on Suiscan](https://suiscan.xyz/testnet/object/0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec)

## 🎯 Roadmap

- [x] Core tower defense game
- [x] NFT minting system
- [x] Marketplace
- [x] Challenge system
- [ ] Leaderboard
- [ ] Referral system
- [ ] Badge crafting
- [ ] Special event boxes
- [ ] Mobile app
- [ ] Mainnet deployment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🏆 Built For

OneChain OneHack 2.0 - GameFi Track

## 📞 Support

For questions or support, please open an issue on GitHub.

## 🎊 Acknowledgments

- Sui Foundation for the amazing blockchain platform
- Mysten Labs for the excellent developer tools
- OneChain for hosting the hackathon

---

**Have fun and may fortune favor you!** 🍀✨
