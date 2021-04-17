import create from 'zustand'
import io, { Socket } from 'socket.io-client'
import useConsumerStore from './RTC/useConsumerStore'
import { ProducerList } from './RTC/types'
import useRoomStore from './useRoomStore'

type SocketStore = {
	socket: Socket
	initSockets: () => void
	request: <T>(type: string, data: unknown) => Promise<T>
}

const useSocketStore = create<SocketStore>((_, get) => {
	const opts = {
		path: '/server',
		transports: ['websocket']
	}

	const url = `http://localhost:5000`
	const socket = io(url, opts)
	const request = <T>(type: string, data: unknown): Promise<T> => {
		return new Promise((resolve, reject) => {
			get().socket.emit(type, data, (result) => {
				if (result && result.error) reject(result)
				resolve(result)
			})
		})
	}
	const initSockets = () => {
		get().socket.on('consumerClosed', ({ consumerId }) => {
			console.log('closing consumer: ', consumerId)
			useConsumerStore.getState().removeConsumer(consumerId)
		})

		// FIXME: this is the function that should be called to begin consuming
		get().socket.on('newProducers', async (data: ProducerList) => {
			console.log('new producers', data)
			for (const { producerId } of data) {
				useConsumerStore.getState().consume(producerId)
			}
		})

		get().socket.on('disconnect', () => {
			useRoomStore.getState().exit(true)
		})
	}

	return { socket, request, initSockets }
})

export default useSocketStore
