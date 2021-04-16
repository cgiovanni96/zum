import { Consumer } from 'mediasoup-client/lib/Consumer'
import { Producer } from 'mediasoup-client/lib/Producer'
import { MediaKind, RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'
import create from 'zustand'
import useConsumerStore from './RTC/useConsumerStore'
import useProducerStore from './RTC/useProducerStore'
import useRtcStore from './RTC/useRtcStore'
import useDeviceStore from './useDeviceStore'
import useSocketStore from './useSocketStore'

export type RoomStream = {
	id: string
	type: MediaKind
	stream: MediaStream
}

type RoomState = {
	id: string
	name: string
	consumers: Map<string, Consumer>
	producers: Map<string, Producer>
	personalStream: RoomStream
	remoteStreams: RoomStream[]
	setPersonalStream: (id: string, stream: MediaStream, type: MediaKind) => void
	initializeRoom: (id: string, name: string) => void
	exit: (offline: boolean) => void
}

const useRoomStore = create<RoomState>((set) => {
	const initializeRoom = async (id: string, name: string) => {
		set(() => ({ id, name }))
		await createRoom(id)
		await join(id, name)
	}

	const createRoom = async (roomId: string) => {
		try {
			await useSocketStore.getState().request('createRoom', { roomId })
		} catch (e) {
			console.error(e)
		}
	}

	const join = async (roomId: string, name: string) => {
		try {
			await useSocketStore.getState().request('join', { roomId, name })

			const data = await useSocketStore
				.getState()
				.request<RtpCapabilities>('getRouterCapabilities', {})
			await useDeviceStore.getState().loadDevice(data)
			await useRtcStore.getState().initTransports()
			useSocketStore.getState().socket.emit('getProducers')
		} catch (error) {
			console.error(error)
		}
	}

	const exit = async (offline = false) => {
		const clean = () => {
			useConsumerStore.getState().consumerTransport.close()
			useProducerStore.getState().producerTransport.close()
			useSocketStore.getState().socket.off('disconnect')
			useSocketStore.getState().socket.off('newProducers')
			useSocketStore.getState().socket.off('consumerClosed')
		}

		if (!offline) {
			try {
				await useSocketStore.getState().request('exitRoom', {})
			} catch (e) {
				console.error(e)
			}
		}
		clean()
	}

	const setPersonalStream = (
		id: string,
		stream: MediaStream,
		type: MediaKind
	) => {
		set(() => ({
			personalStream: {
				id,
				stream,
				type
			}
		}))
	}

	return {
		id: '',
		name: '',
		producers: new Map<string, Producer>(),
		consumers: new Map<string, Consumer>(),
		personalStream: null,
		remoteStreams: [],
		setPersonalStream,
		initializeRoom,
		exit
	}
})

export default useRoomStore
