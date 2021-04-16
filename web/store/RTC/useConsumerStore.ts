import { RoomStream } from './../useRoomStore'
import { Consumer } from 'mediasoup-client/lib/Consumer'
import { Transport, TransportOptions } from 'mediasoup-client/lib/Transport'
import create from 'zustand'
import useDeviceStore from '../useDeviceStore'
import useRoomStore from '../useRoomStore'
import useSocketStore from '../useSocketStore'
import {
	ConsumeData,
	DtlsArgs,
	GetConsumeData,
	MediaType,
	RequestType
} from './types'

type ConsumerStore = {
	consumerTransport: Transport
	initConsumerTransport: () => void
	consume: (producerId: string) => void
	removeConsumer: (consumerId: string) => void
}

const useConsumerStore = create<ConsumerStore>((set, get) => {
	const initConsumerTransport = async () => {
		const data = await useSocketStore
			.getState()
			.request<TransportOptions>(RequestType.createTransport, {
				forceTcp: false
			})

		set(() => ({
			consumerTransport: useDeviceStore
				.getState()
				.device.createRecvTransport(data)
		}))

		get().consumerTransport.on(
			RequestType.connect,
			({ dtlsParameters }: DtlsArgs, cb, errBack) => {
				useSocketStore
					.getState()
					.request(RequestType.connectTransport, {
						transportId: get().consumerTransport.id,
						dtlsParameters
					})
					.then(cb)
					.catch(errBack)
			}
		)
	}

	const consume = async (producerId: string) => {
		const { consumer, stream, kind } = await getConsumeStream(producerId)

		useRoomStore.getState().consumers.set(consumer.id, consumer)

		const newRemoteStreams: RoomStream = { id: consumer.id, stream, type: null }

		newRemoteStreams.type =
			kind === MediaType.video ? MediaType.video : MediaType.audio

		useRoomStore.getState().remoteStreams.push(newRemoteStreams)

		consumer.on('trackended', () => {
			removeConsumer(consumer.id)
		})

		consumer.on('transportclose', () => {
			removeConsumer(consumer.id)
		})
	}

	const getConsumeStream = async (
		producerId: string
	): Promise<GetConsumeData> => {
		const { rtpCapabilities } = useDeviceStore.getState().device

		const data: ConsumeData = await useSocketStore
			.getState()
			.request<ConsumeData>('consume', {
				rtpCapabilities,
				transportId: get().consumerTransport.id,
				producerId
			})

		const { id, kind, rtpParameters } = data

		const consumer: Consumer = await get().consumerTransport.consume({
			id,
			producerId,
			kind,
			rtpParameters
		})

		const stream = new MediaStream()

		stream.addTrack(consumer.track)

		return { consumer, stream, kind }
	}

	const removeConsumer = (consumerId: string) => {
		const id = Number(consumerId)
		const stream = useRoomStore.getState().remoteStreams[id].stream

		stream.getTracks().forEach((track) => track.stop())
		useRoomStore.getState().remoteStreams[id] = null

		useRoomStore.getState().consumers.delete(consumerId)
	}

	return {
		consumerTransport: null,
		initConsumerTransport,
		consume,
		removeConsumer
	}
})

export default useConsumerStore
