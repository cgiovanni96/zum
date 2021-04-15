import { Consumer } from 'mediasoup/lib/Consumer'
import { Producer } from 'mediasoup/lib/Producer'
import {
	MediaKind,
	RtpCapabilities,
	RtpParameters
} from 'mediasoup/lib/RtpParameters'
import { Transport } from 'mediasoup/lib/Transport'
import { DtlsParameters } from 'mediasoup/lib/WebRtcTransport'
import { CreateConsumer } from './soup/types'

export default class Peer {
	id: string
	name: string
	transports: Map<string, Transport>
	consumers: Map<string, Consumer>
	producers: Map<string, Producer>

	constructor(socketId: string, name: string) {
		this.id = socketId
		this.name = name
		this.transports = new Map<string, Transport>()
		this.consumers = new Map<string, Consumer>()
		this.producers = new Map<string, Producer>()
	}

	addTransport(transport: Transport) {
		this.transports.set(transport.id, transport)
	}

	async connectTransport(transportId: string, dtlsParameters: DtlsParameters) {
		if (!this.transports.has(transportId)) return
		await this.transports.get(transportId)?.connect({ dtlsParameters })
	}

	async createProducer(
		transportId: string,
		rtpParameters: RtpParameters,
		kind: MediaKind
	): Promise<Producer | undefined> {
		const producer = await this.transports
			.get(transportId)
			?.produce({ kind, rtpParameters })

		if (!producer) return undefined

		this.producers.set(producer.id, producer)

		producer.on('transportclose', () => {
			console.log(
				`---producer transport clonse --- name: ${this.name} producer_id: ${producer.id}`
			)
			producer.close()
			this.producers.delete(producer.id)
		})

		return producer
	}

	async createConsumer(
		transportId: string,
		producerId: string,
		rtpCapabilities: RtpCapabilities,
		kind: MediaKind
	): Promise<CreateConsumer | undefined> {
		const consumerTransport = this.transports.get(transportId)
		if (!consumerTransport) return

		let consumer: Consumer
		try {
			consumer = await consumerTransport.consume({
				producerId,
				rtpCapabilities,
				paused: kind === 'video'
			})
		} catch (error) {
			console.error('consume failed', error)
			return
		}

		if (consumer.type === 'simulcast')
			await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 })

		this.consumers.set(consumer.id, consumer)

		consumer.on('transportclose', () => {
			console.log(
				`--- consumer transport close --- name: ${this.name} consumer_id: ${consumer.id}`
			)
			consumer.close()
			this.consumers.delete(consumer.id)
		})

		return {
			consumer,
			params: {
				producerId,
				id: consumer.id,
				kind: consumer.kind,
				rtpParameters: consumer.rtpParameters,
				type: consumer.type,
				producerPaused: consumer.producerPaused
			}
		}
	}

	closeProducer(producerId: string) {
		try {
			this.producers.get(producerId)?.close()
		} catch (error) {
			console.warn(error)
		}
		this.producers.delete(producerId)
	}

	getProducer(producerId: string): Producer | undefined {
		return this.producers.get(producerId)
	}

	close() {
		this.transports.forEach((transport) => transport.close())
	}

	removeConsumer(consumerId: string) {
		this.consumers.delete(consumerId)
	}
}
