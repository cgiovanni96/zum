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
	const initProducerTransport = async () => {
		const data = await useSocketStore
			.getState()
			.request<TransportOptions>(RequestType.createTransport, {
				forceTcp: false,
				rtpCapabilities: useDeviceStore.getState().device.rtpCapabilities
			})

		set(() => ({
			producerTransport: useDeviceStore
				.getState()
				.device.createSendTransport(data)
		}))

		get().producerTransport.on(
			'connect',
			({ dtlsParameters }: DtlsArgs, cb, errBack) => {
				useSocketStore
					.getState()
					.request(RequestType.connectTransport, {
						transportId: data.id,
						dtlsParameters
					})
					.then(cb)
					.catch(errBack)
			}
		)

		get().producerTransport.on(
			'produce',
			async ({ kind, rtpParameters }: ProduceTransportArgs, cb, errBack) => {
				try {
					const data = await useSocketStore
						.getState()
						.request<{ producerId: string }>(RequestType.produceTransport, {
							transportId: get().producerTransport.id,
							kind,
							rtpParameters
						})
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

		// FIXME: device and producerLabel are null here - why??

		// if (
		// 	useDeviceStore.getState().device.canProduce(MediaType.video) &&
		// 	type === MediaType.video
		// ) {
		// 	console.error('cannot produce video')
		// 	return
		// }
		// if (get().producerLabel.has(type)) {
		// 	console.warn(`producer already already exists for this type ${type}`)
		// 	return
		// }

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

			useRoomStore.getState().producers.set(producer.id, producer)

			if (type !== MediaType.audio)
				useRoomStore.getState().setPersonalStream(producer.id, stream, 'video')

			producer.on('trackended', () => {
				closeProducer(kind)
			})

			producer.on('transportclose', () => {
				console.log('producer transport close')
				stopTrack(kind)
				useRoomStore.getState().producers.delete(producer.id)
			})

			producer.on('close', () => {
				console.log('closing producer')
				stopTrack(kind)
				useRoomStore.getState().producers.delete(producer.id)
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

			useSocketStore.getState().socket.emit('producerClosed', { producerId })
			useRoomStore.getState().producers.get(producerId).close()
			useRoomStore.getState().producers.delete(producerId)
			get().producerLabel.delete(kind)

			stopTrack(kind)
		}
	}

	const stopTrack = (type: MediaType) => {
		if (type !== MediaType.audio) {
			useRoomStore
				.getState()
				.personalStream.stream.getTracks()
				.forEach((track) => track.stop)
			useRoomStore.getState().personalStream = null
		}
	}

	return {
		producerTransport: null,
		producerLabel: new Map<string, string>(),
		initProducerTransport,
		produce
	}
})

export default useProducerStore
