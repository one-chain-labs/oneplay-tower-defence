<div align="center">

# 🏰 Tower Defense GameFi

### *A Revolutionary Blockchain Tower Defense Game on Sui Network*

[![Sui Network](https://img.shields.io/badge/Sui-Network-4DA2FF?style=for-the-badge&logo=sui&logoColor=white)](https://sui.io)
[![Move](https://img.shields.io/badge/Move-Smart%20Contract-FF5733?style=for-the-badge)](https://docs.sui.io/build/move)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[🎮 Play Now](https://tower-crash-fnix.vercel.app) • [📹 Watch Demo](https://www.youtube.com/watch?v=XD25M8ozAd8) • [📖 Documentation](#-game-features) • [🚀 Quick Start](#-quick-start)

</div>

---

## 🌟 Overview

**Tower Defense GameFi** is a fully on-chain tower defense game that combines classic gaming mechanics with blockchain technology. Players can mint NFT towers and monsters, engage in strategic gameplay, create challenges, trade assets on the marketplace, and earn real rewards!

### ✨ Key Highlights

- 🎮 **Full-Featured Tower Defense** - Classic gameplay with 5 progressive waves
- 🗼 **NFT Tower System** - Unique towers with randomized stats and 4 rarity tiers
- 👹 **Monster NFTs** - Create and use monsters for custom challenges
- 💰 **Play-to-Earn** - Earn NFT rewards based on performance
- 🏪 **P2P Marketplace** - Trade towers directly with other players
- ⚔️ **Challenge Mode** - Create and participate in player-made challenges
- 🎵 **Immersive Experience** - Background music and sound effects
- 📱 **Responsive Design** - Play on desktop or mobile devices

---

## 🎮 Game Features

<table>
<tr>
<td width="50%">

### � Towetr NFT System

**Lucky Draw Mechanism**
- 💎 Pay **0.001 SUI** to mint a random tower
- 🎲 Provably fair randomness using Sui's UID
- 📊 4 rarity tiers with different drop rates
- ⚡ Instant minting and ownership

**Tower Attributes**
- ⚔️ **Damage**: Attack power (15-68)
- 🎯 **Range**: Attack distance (100-160)
- ⏱️ **Fire Rate**: Attack speed (700-1000ms)
- 🌈 **Rarity**: Affects all stats

**Rarity Distribution**
| Rarity | Drop Rate | Power Level |
|--------|-----------|-------------|
| ⚪ Common | 50% | ⭐ |
| 🔵 Rare | 30% | ⭐⭐ |
| 🟣 Epic | 15% | ⭐⭐⭐ |
| 🟡 Legendary | 5% | ⭐⭐⭐⭐ |

</td>
<td width="50%">

### 👹 Monster NFT System

**Monster Draw**
- 🎃 Pay **0.001 SUI** to mint a random monster
- 🎭 3 unique monster types
- 💪 Varying stats based on type
- 🎯 Use for creating challenges

**Monster Types**
- 👹 **Normal**: Balanced HP and speed
- ⚡ **Fast**: High speed, lower HP
- 🛡️ **Tank**: High HP, slower speed

**Monster Attributes**
- ❤️ **HP**: Health points
- 🏃 **Speed**: Movement speed
- 🎨 **Type**: Determines behavior
- 💎 **Rarity**: Common to Legendary

</td>
</tr>
</table>

### 🎯 Tower Defense Gameplay

**Game Flow**
1. 💰 Pay **0.0005 SUI** to start a game session
2. 🗼 Select a tower from your inventory
3. 🎮 Place towers strategically on the map
4. 👾 Defend against 5 waves of monsters
5. 🏆 Earn NFT rewards based on performance

**Wave System**
- 🌊 **5 Progressive Waves** - Increasing difficulty
- 👹 **Multiple Monster Types** - Different speeds and HP
- 💰 **Dynamic Rewards** - Better performance = better rewards
- ⏱️ **Real-time Combat** - Fast-paced action

**Reward Structure**
```
Wave 2 Cleared → 20% NFT drop chance (Common-Rare)
Wave 3 Cleared → 30% NFT drop chance (Rare-Epic)
Wave 4 Cleared → 50% NFT drop chance (Rare-Legendary)
Wave 5 Cleared → 80% NFT drop chance (Epic-Legendary)
```

### 🏪 Marketplace

**Trading Features**
- 📝 **List Towers**: Set your own price in SUI
- 🛒 **Buy Towers**: Purchase from other players
- ❌ **Cancel Listings**: Remove anytime before sale
- 💸 **Direct P2P**: No platform fees
- 🔍 **Browse Inventory**: Filter by rarity and stats

**Market Dynamics**
- Real-time price discovery
- Transparent transaction history
- Secure on-chain settlements
- Instant ownership transfer

### ⚔️ Challenge System

**Create Challenges**
- 👹 Use your Monster NFT as the boss
- 💰 Set initial prize pool
- 🎫 Define entry fee
- 👥 Set maximum winners
- 📊 Track challenge statistics

**Play Challenges**
- 🎮 Pay entry fee to participate
- 🗼 Use your towers to defeat the monster
- 🏆 Winners share the prize pool
- 📈 Earn reputation and rewards

**Challenge Economics**
```
Entry Fee × Players = Total Pool
Prize Pool = Initial Prize + Entry Fees
Winners Share = Total Pool ÷ Number of Winners
```

---

## 🚀 Quick Start

### 📋 Prerequisites

Before you begin, ensure you have the following installed:

- ✅ [Sui CLI](https://docs.sui.io/build/install) - For smart contract deployment
- ✅ [Node.js 18+](https://nodejs.org/) - For running the frontend
- ✅ [Git](https://git-scm.com/) - For cloning the repository
- ✅ Sui Wallet Extension - [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet) or [Suiet](https://suiet.app/)
- ✅ Testnet SUI - Get free tokens from [Sui Faucet](https://faucet.sui.io)

### 🎮 Play Now (Easiest)

Just visit our deployed version:
👉 **[https://tower-crash-fnix.vercel.app](https://tower-crash-fnix.vercel.app)**

Watch the demo video:
📹 **[YouTube Demo](https://www.youtube.com/watch?v=XD25M8ozAd8)**

1. Connect your Sui wallet
2. Get testnet SUI from the faucet
3. Start playing!

### 💻 Local Development

#### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/tower-defense-gamefi.git
cd tower-defense-gamefi
```

#### Step 2: Deploy Smart Contract

```bash
# Build the Move package
sui move build

# Deploy to testnet
sui client publish --gas-budget 100000000

# 📝 Save these values from the output:
# - Package ID
# - GameState Object ID
```

#### Step 3: Configure Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your values:
# NEXT_PUBLIC_PACKAGE_ID=your_package_id_here
# NEXT_PUBLIC_GAME_STATE_ID=your_game_state_id_here
```

#### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

### 🔧 Build for Production

```bash
# Build the frontend
npm run build

# Start production server
npm start
```

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

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### ⛓️ Blockchain Layer

- **[Sui Network](https://sui.io)** - High-performance L1 blockchain
- **[Move Language](https://docs.sui.io/build/move)** - Secure smart contract language
- **Sui Framework** - Standard library and utilities
- **Object-Centric Model** - Efficient asset management
- **Parallel Execution** - Fast transaction processing

### 🎨 Frontend Stack

- **[Next.js 14](https://nextjs.org)** - React framework with App Router
- **[React 18](https://react.dev)** - UI library with latest features
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **[@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit)** - Sui wallet integration
- **[@tanstack/react-query](https://tanstack.com/query)** - Data fetching and caching

</td>
<td width="50%">

### 🔧 Development Tools

- **Sui CLI** - Contract deployment and testing
- **Vercel** - Frontend hosting and deployment
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting

### 🎮 Game Engine

- **HTML5 Canvas** - 2D rendering
- **Custom Game Loop** - 60 FPS gameplay
- **Collision Detection** - Precise hit detection
- **Pathfinding** - Monster movement AI
- **Audio System** - Background music and SFX

### 📦 Key Dependencies

```json
{
  "@mysten/sui": "^1.0.0",
  "@mysten/dapp-kit": "^0.14.0",
  "next": "14.2.0",
  "react": "^18.3.0",
  "typescript": "^5.0.0"
}
```

</td>
</tr>
</table>

---

## 📊 Economic Model & Tokenomics

### 💰 Revenue Streams

<table>
<tr>
<td width="33%">

**🗼 Tower Minting**
- Cost: **0.001 SUI**
- Goes to: Game Treasury
- Purpose: NFT creation
- Frequency: Unlimited

</td>
<td width="33%">

**👹 Monster Minting**
- Cost: **0.001 SUI**
- Goes to: Game Treasury
- Purpose: Challenge creation
- Frequency: Unlimited

</td>
<td width="33%">

**🎮 Game Sessions**
- Cost: **0.0005 SUI**
- Goes to: Reward Pool
- Purpose: Play-to-earn
- Frequency: Per game

</td>
</tr>
</table>

### 🔄 Economic Flow

```
Player Spending → Treasury → Reward Pool → Player Earnings
     ↓              ↓            ↓              ↓
  Minting      Development   NFT Drops    Marketplace
  Gaming       Operations    Challenges   Trading
```

### 💎 Value Proposition

**For Players:**
- 🎮 Fun and engaging gameplay
- 💰 Earn valuable NFTs
- 📈 Trade for profit
- 🏆 Compete in challenges

**For Collectors:**
- 🎨 Unique NFT assets
- 📊 Rarity-based value
- 💱 Liquid marketplace
- 🔄 Utility in gameplay

**For Investors:**
- 🌱 Growing ecosystem
- 📈 Deflationary mechanics
- 🎯 Real utility
- 🔒 On-chain security

### 📈 Sustainability Model

1. **Treasury Management**
   - 60% → Reward pool for players
   - 30% → Development and operations
   - 10% → Marketing and growth

2. **Deflationary Mechanics**
   - NFTs burned in special events
   - Limited edition releases
   - Rarity-based scarcity

3. **Growth Incentives**
   - Referral rewards (coming soon)
   - Tournament prizes
   - Seasonal events

---

## 🎮 Game Mechanics Deep Dive

### 🎲 Provably Fair Randomness

Our game uses Sui's built-in randomness for fair NFT generation:

```move
// Pseudocode for random generation
let random_value = object::uid_to_bytes(&tower.id);
let rarity = calculate_rarity(random_value);
let stats = generate_stats(rarity, random_value);
```

**Key Features:**
- ✅ On-chain randomness using object UID
- ✅ Transparent and verifiable
- ✅ Cannot be manipulated or predicted
- ✅ Fair distribution across all players

### ⚔️ Combat System

**Tower Mechanics**
- 🎯 **Auto-targeting**: Towers automatically target nearest monster
- 💥 **Damage Calculation**: Base damage × rarity multiplier
- 📏 **Range Check**: Monsters must be within tower range
- ⏱️ **Fire Rate**: Cooldown between attacks

**Monster Behavior**
- 🛣️ **Pathfinding**: Follow predefined path to base
- 💨 **Speed Variation**: Different types move at different speeds
- ❤️ **Health System**: Take damage until HP reaches 0
- 🎯 **Wave Spawning**: Timed spawns with increasing difficulty

### 📊 Stat Calculation Formula

```javascript
// Rarity Multipliers
Common:    1.0x base stats
Rare:      1.5x base stats
Epic:      2.5x base stats
Legendary: 4.0x base stats

// Example: Legendary Tower
Damage:    15-23 base → 60-92 actual
Range:     100-120 base → 400-480 actual
Fire Rate: 700-1000ms (lower is better)
```

### 🏆 Reward Algorithm

```
Drop Chance = Base Rate × Wave Multiplier × Rarity Weight

Wave 2: 20% × (Common: 70%, Rare: 30%)
Wave 3: 30% × (Rare: 60%, Epic: 40%)
Wave 4: 50% × (Rare: 40%, Epic: 40%, Legendary: 20%)
Wave 5: 80% × (Epic: 50%, Legendary: 50%)
```

## 🔗 Deployed Contract

**Network**: Sui Testnet

**Package ID**: `0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec`

**GameState**: `0xca88a092ca23c88f2ef2fa936fced6d058c035fb61ddf7b7dd86c4c1c8169c5e`

**Explorer**: [View on Suiscan](https://suiscan.xyz/testnet/object/0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec)

---

## 🎯 Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] Smart contract development in Move
- [x] Core tower defense gameplay
- [x] NFT minting system (Towers & Monsters)
- [x] Wallet integration
- [x] Basic UI/UX design

### ✅ Phase 2: GameFi Features (Completed)
- [x] Play-to-earn mechanics
- [x] Reward distribution system
- [x] P2P marketplace
- [x] Challenge creation system
- [x] Game history tracking
- [x] Responsive design

### 🚧 Phase 3: Enhancement (In Progress)
- [x] Background music and SFX
- [x] Visual polish and animations
- [ ] Leaderboard system
- [ ] Achievement badges
- [ ] Player profiles
- [ ] Social features

### 🔮 Phase 4: Expansion (Q1 2025)
- [ ] Guild system
- [ ] Tournament mode
- [ ] Referral program
- [ ] Staking mechanism
- [ ] Special event boxes
- [ ] Limited edition NFTs

### 🚀 Phase 5: Scale (Q2 2025)
- [ ] Mobile app (iOS & Android)
- [ ] Cross-chain bridge
- [ ] Mainnet deployment
- [ ] DAO governance
- [ ] Community treasury
- [ ] Partner integrations

### 🌟 Future Vision
- [ ] Metaverse integration
- [ ] VR/AR support
- [ ] AI-powered opponents
- [ ] User-generated content
- [ ] Esports tournaments

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🐛 Report Bugs
Found a bug? [Open an issue](https://github.com/yourusername/tower-defense-gamefi/issues) with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### 💡 Suggest Features
Have an idea? We'd love to hear it!
- Open a feature request
- Describe the use case
- Explain the benefits

### 🔧 Submit Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📝 Improve Documentation
- Fix typos
- Add examples
- Clarify instructions
- Translate to other languages

---

## 🏆 Built For

<div align="center">

### OneChain OneHack 2.0 - GameFi Track

*Showcasing the power of Sui blockchain for gaming*

</div>

---

## � Importan&t Links

<table>
<tr>
<td width="100%">

### � Linkse

- 🌐 **Website**: [tower-crash-fnix.vercel.app](https://tower-crash-fnix.vercel.app)
- � **Diemo Video**: [Watch on YouTube](https://www.youtube.com/watch?v=XD25M8ozAd8)
- 📱 **GitHub**: [View source](https://github.com/yourusername/tower-defense-gamefi)
- 🎮 **Play**: [Launch game](https://tower-crash-fnix.vercel.app)
- 📊 **Explorer**: [View contract](https://suiscan.xyz/testnet/object/0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec)

</td>
</tr>
</table>

---

## 🎊 Acknowledgments

We'd like to thank:

- 🙏 **[Sui Foundation](https://sui.io)** - For building an amazing blockchain platform
- 💙 **[Mysten Labs](https://mystenlabs.com)** - For excellent developer tools and documentation
- 🎯 **[OneChain](https://onechain.com)** - For hosting OneHack 2.0 and supporting innovation
- 🎨 **Our Community** - For feedback, testing, and support
- 🌟 **Open Source Contributors** - For making this project better

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - Copyright (c) 2024 Tower Defense GameFi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

---

## ⚠️ Disclaimer

This is a testnet project built for educational and demonstration purposes. 

- 🧪 Currently deployed on **Sui Testnet**
- 💰 Uses **test SUI tokens** with no real value
- 🔒 Smart contracts are **not audited**
- 🎮 Play at your own risk
- 📝 Not financial advice

---

<div align="center">

## 🌟 Star Us!

If you like this project, please give it a ⭐ on GitHub!

### **Have fun and may fortune favor you!** 🍀✨

Made with ❤️ by the Tower Defense GameFi Team

[🎮 Play Now](https://tower-crash-fnix.vercel.app) • [📹 Watch Demo](https://www.youtube.com/watch?v=XD25M8ozAd8) • [⭐ Star on GitHub](https://github.com/yourusername/tower-defense-gamefi)

---

*Built on Sui • Powered by Move • Secured by Blockchain*

</div>
