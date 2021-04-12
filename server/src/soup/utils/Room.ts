import { Router, Worker } from 'mediasoup/lib/types'
import MyPeer from './Peer'

// export type Then<T> = T extends PromiseLike<infer U> ? U : T

export type RoomState = Record<string, MyPeer>

export type Rooms = Record<
	string,
	{ worker: Worker; router: Router; state: RoomState }
>
