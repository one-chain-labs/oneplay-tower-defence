import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, GAME_STATE_ID } from './constants';

// Mint a random tower NFT
export function mintTower(tx: Transaction, paymentAmount: number) {
  const [coin] = tx.splitCoins(tx.gas, [paymentAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::game::mint_tower`,
    arguments: [tx.object(GAME_STATE_ID), coin],
  });
}

// Play game and submit result (combined function)
// Note: This function takes ownership of the tower NFT
// If player fails (0 waves), tower is destroyed
// If player succeeds (1+ waves), tower is returned
export function playAndSubmit(
  tx: Transaction,
  towerNftId: string,
  paymentAmount: number,
  wavesCleared: number
) {
  const [coin] = tx.splitCoins(tx.gas, [paymentAmount]);

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
