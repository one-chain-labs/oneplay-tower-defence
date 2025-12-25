// Tower Defense Game Constants (OneChain Testnet)


// export const PACKAGE_ID="0x1d52970fc53063e28cde8f486d13931cb544797575b3d13ff9e2ac5d77115614"
// export const GAME_STATE_ID="0xc25525090247125904993085f337cd2ca23b3db44e424d65aace443791149133"
// export const TOKEN_TREASURY_ID="0x2ff8a7f161933b1d2986cd65a5941b8b1abf42c0ab6cbd91b2e906204ccb83e8"

export const PACKAGE_ID=process.env.NEXT_PUBLIC_PACKAGE_ID || ''
export const GAME_STATE_ID=process.env.NEXT_PUBLIC_GAME_STATE_ID || ''
export const TOKEN_TREASURY_ID=process.env.NEXT_PUBLIC_TOKEN_TREASURY_ID || ''

export const MINT_COST = 1_000_000_000; // 1 GAME to mint tower NFT (in smallest units)
export const GAME_COST = 500_000_000; // 0.5 GAME to play game (in smallest units)
export const MAX_WAVES = 5;

// export const MINT_COST = 1_000_000_000; // 1 GAME to mint tower NFT (in smallest units)
// export const GAME_COST = 500_000_000; // 0.5 GAME to play game (in smallest units)
// export const MAX_WAVES = 5;

// Game rewards
export const REWARDS = {
  3: 0.00075,  // 150%
  4: 0.001,    // 200%
  5: 0.0015,   // 300%
};
