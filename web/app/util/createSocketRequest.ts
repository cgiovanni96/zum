import { Socket } from 'socket.io-client'

const createSocketRequest = (socket: Socket) => {
	return function request(type, data = {}): Promise<any> {
		return new Promise((resolve) => {
			socket.emit(type, data, resolve)
		})
	}
}

export default createSocketRequest
