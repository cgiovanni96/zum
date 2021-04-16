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
	const roomStore = useRoomStore()
	const device = useDeviceStore((state) => state.device)
	const socketStore = useSocketStore()

	const initConsumerTransport = async () => {
		const data = await socketStore.request<TransportOptions>(
			RequestType.createTransport,
			{
				forceTcp: false
			}
		)

		set(() => ({
			consumerTransport: device.createRecvTransport(data)
		}))

		get().consumerTransport.on(
			RequestType.connect,
			({ dtlsParameters }: DtlsArgs, cb, errBack) => {
				socketStore
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

		roomStore.consumers.set(consumer.id, consumer)

		const newRemoteStreams: RoomStream = { id: consumer.id, stream, type: null }

		newRemoteStreams.type =
			kind === MediaType.video ? MediaType.video : MediaType.audio

		roomStore.remoteStreams.push(newRemoteStreams)

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
		const { rtpCapabilities } = device

		const data: ConsumeData = await socketStore.request<ConsumeData>(
			'consume',
			{
				rtpCapabilities,
				transportId: get().consumerTransport.id,
				producerId
			}
		)

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
		const stream = roomStore.remoteStreams[id].stream

		stream.getTracks().forEach((track) => track.stop())
		roomStore.remoteStreams[id] = null

		roomStore.consumers.delete(consumerId)
	}

	return {
		consumerTransport: null,
		initConsumerTransport,
		consume,
		removeConsumer
	}
})

export default useConsumerStore
