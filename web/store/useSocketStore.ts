import create from 'zustand'
import io, { Socket } from 'socket.io-client'
import useConsumerStore from './RTC/useConsumerStore'
import { ProducerList } from './RTC/types'

type SocketStore = {
	socket: Socket
	initSockets: () => void
	request: <T>(type: string, data: unknown) => Promise<T>
}

const consumerStore = useConsumerStore()

const useSocketStore = create<SocketStore>((_, get) => ({
	socket: io(),
	request: <T>(type: string, data: unknown): Promise<T> => {
		return new Promise((resolve, reject) => {
			get().socket.emit(type, data, (result) => {
				if (result.error) reject(result)
				resolve(result)
			})
		})
	},
	initSockets: () => {
		get().socket.on('consumerClosed', ({ consumerId }) => {
			console.log('closing consumer: ', consumerId)
			consumerStore.removeConsumer(consumerId)
		})

		get().socket.on('newProducers', async (data: ProducerList) => {
			console.log('new producers', data)
			for (const { producerId } of data) {
				consumerStore.consume(producerId)
			}
		})

		get().socket.on('disconnect', () => {
			exit(true)
		})
	}
}))

export default useSocketStore
