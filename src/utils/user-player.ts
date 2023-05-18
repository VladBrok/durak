import assert from "assert";
import { IPlayer } from "./config";

export function userPlayer(players: IPlayer[]): IPlayer {
  const player = players.find((pl) => pl.isUser);
  assert(player);
  return player;
}
