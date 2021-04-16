import { Producer, ProducerOptions } from 'mediasoup-client/lib/Producer'
import { Transport, TransportOptions } from 'mediasoup-client/lib/Transport'
import create from 'zustand'
import useDeviceStore from '../useDeviceStore'
import useRoomStore from '../useRoomStore'
import useSocketStore from '../useSocketStore'
import { MediaType, RequestType, DtlsArgs, ProduceTransportArgs } from './types'

type ProducerStore = {
	producerTransport: Transport
	producerLabel?: Map<string, string>
	initProducerTransport: () => void
	produce: (kind: MediaType, deviceId?: string) => void
}

const useProducerStore = create<ProducerStore>((set, get) => {
	const socketStore = useSocketStore()
	const device = useDeviceStore((state) => state.device)
	const roomStore = useRoomStore()

	const initProducerTransport = async () => {
		const data = await socketStore.request<TransportOptions>(
			RequestType.createTransport,
			{
				forceTcp: false,
				rtpCapabilities: device.rtpCapabilities
			}
		)

		set(() => ({
			producerTransport: device.createSendTransport(data)
		}))

		get().producerTransport.on(
			'connect',
			({ dtlsParameters }: DtlsArgs, cb, errBack) => {
				socketStore
					.request(RequestType.connectTransport, {
						dtlsParameters,
						transportId: data.id
					})
					.then(cb)
					.catch(errBack)
			}
		)

		get().producerTransport.on(
			RequestType.produceTransport,
			async ({ kind, rtpParameters }: ProduceTransportArgs, cb, errBack) => {
				try {
					const data = await socketStore.request<{ producerId: string }>(
						RequestType.produceTransport,
						{
							transportId: get().producerTransport.id,
							kind,
							rtpParameters
						}
					)
					cb({ id: data.producerId })
				} catch (error) {
					errBack(error)
				}
			}
		)

		get().producerTransport.on(RequestType.connectionChange, (state) => {
			switch (state) {
				case 'connecting':
					break
				case 'connected':
					break
				case 'failed':
					get().producerTransport.close()
					break
				default:
					break
			}
		})
	}

	const produce = async (kind: MediaType, deviceId?: string) => {
		let mediaConstraints = {}

		let type: string

		switch (kind) {
			case MediaType.audio:
				type = MediaType.audio
				mediaConstraints = {
					audio: {
						deviceId
					},
					video: false
				}
				break
			case MediaType.video:
				type = MediaType.video
				mediaConstraints = {
					audio: false,
					video: {
						deviceId,
						width: {
							min: 640,
							ideal: 1920
						},
						height: {
							min: 400,
							ideal: 1080
						}
					}
				}
				break
			case MediaType.screen:
				type = MediaType.screen
				mediaConstraints = {}
				break
			default:
				return
		}

		if (device.canProduce(MediaType.video) && type === MediaType.video) {
			console.error('cannot produce video')
			return
		}
		if (get().producerLabel.has(type)) {
			console.warn(`producer already already exists for this type ${type}`)
			return
		}

		console.log('mediaconstraint: ', mediaConstraints)
		let stream: MediaStream
		try {
			stream =
				type === MediaType.screen
					? //@ts-ignore
					  await navigator.mediaDevices.getDisplayMedia()
					: await navigator.mediaDevices.getUserMedia(mediaConstraints)
			console.log(navigator.mediaDevices.getSupportedConstraints())

			const track: MediaStreamTrack =
				type === MediaType.audio
					? stream.getAudioTracks()[0]
					: stream.getVideoTracks()[0]

			const params: ProducerOptions = { track }
			if (type === MediaType.video) {
				params.encodings = [
					{
						rid: 'r0',
						maxBitrate: 100000,
						scalabilityMode: 'S1T3'
					},
					{
						rid: 'r1',
						maxBitrate: 300000,
						scalabilityMode: 'S1T3'
					},
					{
						rid: 'r2',
						maxBitrate: 900000,
						scalabilityMode: 'S1T3'
					}
				]

				params.codecOptions = {
					videoGoogleStartBitrate: 1000
				}
			}

			const producer: Producer = await get().producerTransport.produce(params)

			console.log('producer', producer)

			roomStore.producers.set(producer.id, producer)

			// TODO: set local video element

			producer.on('trackended', () => {
				closeProducer(kind)
			})

			producer.on('transportclose', () => {
				console.log('producer transport close')
				// TODO: stop tracks for the local video
				if (type !== MediaType.audio) return
				roomStore.producers.delete(producer.id)
			})

			producer.on('close', () => {
				console.log('closing producer')
				// TODO: stop tracks for the local video
				if (type === MediaType.audio) return
				roomStore.producers.delete(producer.id)
			})
		} catch (e) {
			console.error(e)
		}

		const closeProducer = (kind: MediaType) => {
			if (!get().producerLabel.has(kind)) {
				console.log('There is no producer for the type: ', kind)
				return
			}
			const producerId = get().producerLabel.get(kind)
			console.log('producerId: ', producerId)

			socketStore.socket.emit('producerClosed', { producerId })
			roomStore.producers.get(producerId).close()
			roomStore.producers.delete(producerId)
			get().producerLabel.delete(kind)

			if (kind === MediaType.audio) {
				//TODO: stop local video tracks
			}
		}
	}

	return {
		producerTransport: null,
		producerLabel: null,
		initProducerTransport,
		produce
	}
})

export default useProducerStore
