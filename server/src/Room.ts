import { Router } from 'mediasoup/lib/Router'
import {
	MediaKind,
	RtpCapabilities,
	RtpCodecCapability,
	RtpParameters
} from 'mediasoup/lib/RtpParameters'
import {
	DtlsParameters,
	DtlsState,
	WebRtcTransport
} from 'mediasoup/lib/WebRtcTransport'
import { Worker } from 'mediasoup/lib/Worker'
import { Server } from 'socket.io'

import config from './soup/config'
import Peer from './Peer'
import {
	JSONResponse,
	Params,
	ProducerList,
	WebRtcTranportParams
} from './soup/types'

export default class Room {
	id: string
	router: Router
	peers: Map<string, Peer>
	io: Server

	constructor(room_id: string, worker: Worker, io: Server) {
		this.id = room_id
		this.peers = new Map<string, Peer>()
		this.io = io
		this.getRouter(worker).then((router) => (this.router = router))
	}

	async getRouter(worker: Worker): Promise<Router> {
		const codecs: RtpCodecCapability[] = config.mediasoup.router.mediaCodecs
		const router: Router = await worker.createRouter({ mediaCodecs: codecs })
		return router
	}

	addPeer(peer: Peer) {
		this.peers.set(peer.id, peer)
	}

	getProducerListForPeer(): ProducerList {
		const producerList: ProducerList = []
		this.peers.forEach((peer) => {
			peer.producers.forEach((producer) => {
				producerList.push({ producerId: producer.id })
			})
		})

		return producerList
	}

	getRtpCapabilities(): RtpCapabilities {
		return this.router.rtpCapabilities
	}

	async createWebRtcTranport(socketId: string): Promise<WebRtcTranportParams> {
		const {
			initialAvailableOutgoingBitrate,
			maxIncomingBitrate,
			listenIps
		} = config.mediasoup.webRtcTransport

		const transport: WebRtcTransport = await this.router.createWebRtcTransport({
			listenIps,
			initialAvailableOutgoingBitrate,
			enableUdp: true,
			enableTcp: true,
			enableSctp: true
		})

		if (maxIncomingBitrate)
			await transport.setMaxIncomingBitrate(maxIncomingBitrate)

		const closedMessage = `--- transport closed --- ${
			this.peers.get(socketId)?.name
		} closed`

		transport.on('dtlsstatechange', (dtlsState: DtlsState) => {
			if (dtlsState === 'closed') console.log(closedMessage)
		})

		transport.on('close', () => {
			console.log(closedMessage)
		})

		console.log(`---adding tranport---${transport.id}`)

		this.peers.get(socketId)?.addTransport(transport)

		return {
			params: {
				id: transport.id,
				iceParameters: transport.iceParameters,
				iceCandidates: transport.iceCandidates,
				dtlsParameters: transport.dtlsParameters
			}
		}
	}

	async connectPeerTransport(
		socketId: string,
		transportId: string,
		dtlsParameters: DtlsParameters
	) {
		if (!this.peers.has(socketId)) return
		await this.peers
			.get(socketId)
			?.connectTransport(transportId, dtlsParameters)
	}

	async produce(
		socketId: string,
		transportId: string,
		rtpParameters: RtpParameters,
		kind: MediaKind
	) {
		return new Promise(async (resolve, reject) => {
			const producer = await this.peers
				.get(socketId)
				?.createProducer(transportId, rtpParameters, kind)

			if (!producer) {
				reject('No Producer')
				return
			}
			resolve(producer.id)
			this.broadCast(socketId, 'newProducers', [
				{
					producerId: producer.id,
					producerSockerId: socketId
				}
			])
		})
	}

	async consume(
		socketId: string,
		transportId: string,
		producerId: string,
		rtpCapabilities: RtpCapabilities,
		kind: MediaKind
	): Promise<Params | undefined> {
		if (!this.router.canConsume({ producerId, rtpCapabilities })) {
			console.error('Can not consume')
			return
		}

		let consumer = await this.peers
			.get(socketId)
			?.createConsumer(transportId, producerId, rtpCapabilities, kind)

		consumer?.consumer.on('producerclose', () => {
			if (!consumer) return
			console.log(
				`--- consumer closed --- due to producerclose event name:${this.peers.get(
					socketId
				)} consumer_id: ${consumer.consumer.id}`
			)

			this.io
				.to(socketId)
				.emit('consumerClosed', { consumerId: consumer.consumer.id })
		})

		return consumer?.params
	}

	async removePeer(socketId: string) {
		this.peers.get(socketId)?.close()
		this.peers.delete(socketId)
	}

	closeProducer(socketId: string, producerId: string) {
		this.peers.get(socketId)?.closeProducer(producerId)
	}

	broadCast(socketId: string, message: string, data: any) {
		for (let otherID of Array.from(this.peers.keys()).filter(
			(id) => id !== socketId
		)) {
			this.send(otherID, message, data)
		}
	}

	send(socketId: string, message: string, data: any) {
		this.io.to(socketId).emit(message, data)
	}

	getPeers(): Map<string, Peer> {
		return this.peers
	}

	toJson(): JSONResponse {
		return {
			id: this.id,
			peers: JSON.stringify([...this.peers])
		}
	}
}
