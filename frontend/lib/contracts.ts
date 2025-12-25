import { Transaction } from '@onelabs/sui/transactions';
import { PACKAGE_ID, GAME_STATE_ID, TOKEN_TREASURY_ID } from './constants';

// Claim free GAME tokens from faucet
export function claimFaucet(tx: Transaction) {
  tx.moveCall({
    target: `${PACKAGE_ID}::game::claim_faucet`,
    arguments: [
      tx.object(TOKEN_TREASURY_ID),
    ],
  });
}

// Mint a random tower NFT
export function mintTower(tx: Transaction, gameTokenObjectId: string, paymentAmount: number) {
  const [coin] = tx.splitCoins(tx.object(gameTokenObjectId), [paymentAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::game::mint_tower`,
    arguments: [
      tx.object(GAME_STATE_ID),
      coin,
    ],
  });
}

// Mint a random monster NFT
export function mintMonster(tx: Transaction, gameTokenObjectId: string, paymentAmount: number) {
  const [coin] = tx.splitCoins(tx.object(gameTokenObjectId), [paymentAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::game::mint_monster`,
    arguments: [
      tx.object(GAME_STATE_ID),
      coin,
    ],
  });
}

// Play game and submit result (combined function)
// Note: This function takes ownership of the tower NFT
// If player fails (< 5 waves), tower is destroyed
// If player succeeds (5 waves), tower is returned
export function playAndSubmit(
  tx: Transaction,
  towerNftId: string,
  gameTokenObjectId: string,
  paymentAmount: number,
  wavesCleared: number
) {
  const [coin] = tx.splitCoins(tx.object(gameTokenObjectId), [paymentAmount]);

  // Transfer tower ownership to the contract
  // The contract will either destroy it (failure) or return it (success)
  tx.moveCall({
    target: `${PACKAGE_ID}::game::play_and_submit`,
    arguments: [
      tx.object(GAME_STATE_ID),
      tx.object(towerNftId), // This passes ownership, not just a reference
      coin,
      tx.pure.u8(wavesCleared),
    ],
  });
}
