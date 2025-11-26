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
export function playAndSubmit(
  tx: Transaction,
  towerNftId: string,
  paymentAmount: number,
  wavesCleared: number
) {
  const [coin] = tx.splitCoins(tx.gas, [paymentAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::game::play_and_submit`,
    arguments: [
      tx.object(GAME_STATE_ID),
      tx.object(towerNftId),
      coin,
      tx.pure.u8(wavesCleared),
    ],
  });
}
