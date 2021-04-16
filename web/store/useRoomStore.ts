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
	consumers?: Map<string, Consumer>
	producers?: Map<string, Producer>
	personalStream: RoomStream
	remoteStreams: RoomStream[]
	initializeRoom: (id: string, name: string) => void
	exit: (offline: boolean) => void
}

const useRoomStore = create<RoomState>((set) => {
	const socketStore = useSocketStore()
	const deviceStore = useDeviceStore()
	const rtcStore = useRtcStore()
	const consumerStore = useConsumerStore()
	const producerStore = useProducerStore()

	const initializeRoom = async (id: string, name: string) => {
		set(() => ({ id, name }))
		await createRoom(id)
		await join(id, name)
	}

	const createRoom = async (roomId: string) => {
		try {
			await socketStore.request('createRoom', { roomId })
		} catch (e) {
			console.error(e)
		}
	}

	const join = async (id: string, name: string) => {
		try {
			await socketStore.request('join', { name, id })
			const data = await socketStore.request<RtpCapabilities>(
				'getRouterRtpCapabilities',
				{}
			)
			await deviceStore.loadDevice(data)
			await rtcStore.initTransports()
			socketStore.socket.emit('getProducers')
		} catch (error) {
			console.error(error)
		}
	}

	const exit = async (offline = false) => {
		const clean = () => {
			consumerStore.consumerTransport.close()
			producerStore.producerTransport.close()
			socketStore.socket.off('disconnect')
			socketStore.socket.off('newProducers')
			socketStore.socket.off('consumerClosed')
		}

		if (!offline) {
			try {
				await socketStore.request('exitRoom', {})
			} catch (e) {
				console.error(e)
			}
		}
		clean()
	}

	return {
		id: '',
		name: '',
		personalStream: null,
		remoteStreams: [],
		initializeRoom,
		exit
	}
})

export default useRoomStore
